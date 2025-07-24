const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const {WorkoutState} = require('../models/WorkoutState.model');
const {openai} = require('../config/config');
const {addChatEntry, getChatHistory, clearChatHistory} = require('../services/chatHistory.service');

const {
  processQuery,
  storeWorkoutPlan,
  initializeResources,
  getWorkoutPlanModel,
  deleteAllThreads,
} = require('../Bam-Ai-chatbot/simpleQAAssistant');
const {detectScheduleQuery, processExistingPlanQuery} = require('../Bam-Ai-chatbot/assistantManagerScheduleTime');

const processFitnessQuery = async (req, res) => {
  let newAssistant;
  let newThread;
  try {
    const {query, fitnessLevel} = req.body;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({error: 'No query provided'});
    }
    const WorkoutPlan = getWorkoutPlanModel();
    const existingPlan = await WorkoutPlan.findOne({user: userId}).sort({createdAt: -1});
    let workoutState = await WorkoutState.findOne({user: userId});

    if (existingPlan) {
      const isScheduleQuery = await detectScheduleQuery(query);
      if (isScheduleQuery) {
        // console.log('Detected schedule query, proceeding with schedule query handling.');
        return await processExistingPlanQuery(req, res, userId, query, existingPlan, workoutState?.vectorStoreId);
      }
    }

    if (!workoutState) {
      const {vectorStore, assistant, thread, fileInfo} = await initializeResources(fitnessLevel);
      // console.log('Creating new workoutState and thread: ---- >', assistant.id, thread.id);
      workoutState = new WorkoutState({
        user: userId,
        fitnessLevel,
        assistantId: assistant.id,
        threadId: thread.id,
        vectorStoreId: vectorStore.id,
        files: fileInfo,
      });
      await workoutState.save();
      newThread = thread.id;
      newAssistant = assistant.id;
    } else {
      newAssistant = workoutState.assistantId;
      newThread = workoutState.threadId;
      if (workoutState.fitnessLevel !== fitnessLevel) {
        // console.log(
        //   `Fitness level changed from ${workoutState.fitnessLevel} to ${fitnessLevel}. Reinitializing resources.`
        // );
        const {vectorStore, assistant, thread, fileInfo} = await initializeResources(fitnessLevel, workoutState);
        workoutState.fitnessLevel = fitnessLevel;
        workoutState.assistantId = assistant.id;
        workoutState.threadId = thread.id;
        workoutState.vectorStoreId = vectorStore.id;
        workoutState.files = fileInfo;
        await workoutState.save();
        newAssistant = assistant.id;
        newThread = thread.id;
      } else {
        try {
          await verifyVectorStore(workoutState.vectorStoreId);
          await verifyAssistant(workoutState.assistantId);
          await verifyThread(workoutState.threadId);
        } catch (err) {
          console.error('Error verifying resources:', err);
          const {vectorStore, assistant, thread, fileInfo} = await initializeResources(fitnessLevel);
          workoutState.assistantId = assistant.id;
          workoutState.threadId = thread.id;
          workoutState.vectorStoreId = vectorStore.id;

          await workoutState.save();
          newAssistant = assistant.id;
          newThread = thread.id;
        }
      }
    }
    // console.log('*****************', newThread, newAssistant, '*****************');
    const rawResponse = await processQuery(newThread, newAssistant, query, userId, workoutState.vectorStoreId);

    let structuredResponse;
    try {
      structuredResponse = JSON.parse(rawResponse);
      if (structuredResponse.response) {
        structuredResponse = structuredResponse.response;
      }
      if (!structuredResponse.workout_plan) {
        structuredResponse = {
          introduction: null,
          workout_plan: structuredResponse,
        };
      }
    } catch (error) {
      const {default: stripJsonComments} = await import('strip-json-comments');
      const cleanedResponse = stripJsonComments(rawResponse);

      const jsonRegex = /(\{[\s\S]*\})/g;
      const matches = cleanedResponse.match(jsonRegex);

      if (matches && matches.length > 0) {
        const jsonString = matches[matches.length - 1];
        try {
          const parsedJSON = JSON.parse(jsonString);
          const introText = cleanedResponse.substring(0, cleanedResponse.indexOf(jsonString)).trim();

          structuredResponse = {
            introduction: introText || null,
            workout_plan: parsedJSON,
          };
        } catch (jsonError) {
          console.error('Error parsing JSON block:', jsonError);
          structuredResponse = {
            introduction: cleanedResponse,
            workout_plan: null,
          };
        }
      } else {
        structuredResponse = {
          introduction: cleanedResponse,
          workout_plan: null,
        };
      }
    }
    if (structuredResponse.workout_plan) {
      try {
        await storeWorkoutPlan(userId, structuredResponse);
      } catch (error) {
        console.error('Error storing workout plan:', error);
      }
    }

    try {
      await addChatEntry(userId, query, structuredResponse);
    } catch (chatError) {
      console.error('Error saving chat entry:', chatError);
    }

    return res.status(200).json({response: structuredResponse});
  } catch (error) {
    console.error('Error processing fitness query:', error);
    return res.status(500).json({error: 'Failed to process query', details: error.message});
  }
};

const verifyVectorStore = async vectorStoreId => {
  const {openai} = require('../config/config');
  return await openai.beta.vectorStores.retrieve(vectorStoreId);
};

const verifyAssistant = async assistantId => {
  const {openai} = require('../config/config');
  return await openai.beta.assistants.retrieve(assistantId);
};

const verifyThread = async threadId => {
  const {openai} = require('../config/config');
  return await openai.beta.threads.retrieve(threadId);
};

const getFiles = catchAsync(async (req, res) => {
  const files = await listUploadedFiles();

  res.status(httpStatus.OK).json({data: files});
});
const listUploadedFiles = async () => {
  try {
    const files = await openai.files.list();
    return files.data || [];
  } catch (error) {
    console.error(`Error listing files: ${error}`);
    return [];
  }
};

const getAllVectorStore = catchAsync(async (req, res) => {
  try {
    const vectorStores = await getAllVectorStores();
    res.status(200).json(vectorStores);
  } catch (error) {
    res.status(500).json({message: 'Failed to fetch vector stores', error: error.message});
  }
});
const getAllVectorStores = async () => {
  try {
    if (!openai.beta || !openai.beta.vectorStores) {
      console.error('OpenAI beta.vectorStores API not available in your SDK version');
      return {data: []};
    }

    const response = await openai.beta.vectorStores.list();
    return {data: response.data || []};
  } catch (error) {
    console.error('Error fetching vector stores:', error);
    throw error;
  }
};

const deleteAllVectorStore = catchAsync(async (req, res) => {
  try {
    const vectorStores = await deleteAllVectorStores();
    res.status(200).json(vectorStores);
  } catch (error) {
    res.status(500).json({message: 'Failed to fetch vector stores', error: error.message});
  }
});

const deleteAllVectorStores = async () => {
  try {
    const response = await openai.beta.vectorStores.list();
    const stores = response?.data || [];

    if (stores.length === 0) {
      console.log('No vector stores to delete.');
      return {message: 'No vector stores found.'};
    }

    console.log(`Deleting ${stores.length} vector stores...`);

    for (const store of stores) {
      await openai.beta.vectorStores.del(store.id);
      console.log(` Deleted vector store: ${store.id}`);
    }

    return {data: stores};
  } catch (error) {
    console.error('Error deleting vector stores:', error);
    throw error;
  }
};

const deleteAllFile = catchAsync(async (req, res) => {
  const files = await deleteAllFiles();

  res.status(200).json({
    message: files.length > 0 ? 'File deletion completed' : 'No files found to delete',
    files,
  });
});

const deleteThreads = catchAsync(async (req, res) => {
  const files = await deleteAllThreads();

  res.status(200).json({
    files,
  });
});

const deleteAllFiles = async () => {
  try {
    const files = await listUploadedFiles();

    if (!files || files.length === 0) {
      console.warn('No files found to delete.');
      return [];
    }

    for (const file of files) {
      await deleteFile(file.id);
      console.log(`Deleted file: ${file.id}`);
    }

    console.log('All files deleted successfully.');
    return;
  } catch (error) {
    throw new Error(' Error deleting files:', error);
  }
};
const deleteFile = async fileId => {
  try {
    await openai.files.del(fileId);
    console.log(`Successfully deleted file: ${fileId}`);
  } catch (error) {
    console.error(`Failed to delete file ${fileId}:`, error);
    throw error;
  }
};
const getChatHistoryFromThread = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        status: false,
        message: 'User not authenticated',
      });
    }
    const userId = req.user._id;
    const workoutState = await WorkoutState.findOne({user: userId});
    if (!workoutState || !workoutState.threadId) {
      return res.status(404).json({
        status: false,
        message: 'No chat history found for this user',
      });
    }

    console.log(`Retrieving chat history for thread: ${workoutState.threadId} for user: ${userId}`);
    const messages = await openai.beta.threads.messages.list(workoutState.threadId);

    const chatHistory = messages.data.map((message, index) => ({
      index: index + 1,
      role: message.role,
      content: message.content,
    }));

    return res.status(200).json({
      status: true,
      data: {chatHistory},
      message: 'Chat history retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving chat history:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to retrieve chat history',
    });
  }
};
const transformChatHistory = entries => {
  return entries.map(entry => ({
    query: entry.query,
    'chat-response': {response: entry.response},
    timestamp: entry.timestamp,
    _id: entry._id,
  }));
};
const getChatHistoryFromDB = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        status: false,
        message: 'User not authenticated',
      });
    }
    const userId = req.user._id;
    const history = await getChatHistory(userId);
    const transformedHistory = transformChatHistory(history);
    return res.status(200).json({
      status: true,
      // data: {chatHistory: history},
      data: {chatHistory: transformedHistory},
      message: 'Chat history retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving chat history from DB:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to retrieve chat history',
    });
  }
};

const clearChatHistoryEndpoint = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        status: false,
        message: 'User not authenticated',
      });
    }
    const userId = req.user._id;
    await clearChatHistory(userId);
    return res.status(200).json({
      status: true,
      message: 'Chat history cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing chat history:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to clear chat history',
    });
  }
};

module.exports = {
  processFitnessQuery,
  deleteAllFile,
  deleteAllVectorStore,
  getAllVectorStore,
  getFiles,
  getChatHistoryFromThread,
  getChatHistoryFromDB,
  clearChatHistoryEndpoint,
  deleteThreads,
};
