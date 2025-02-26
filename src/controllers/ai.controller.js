const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const {WorkoutState} = require('../models/WorkoutState.model');
const {openai} = require('../config/config');

const {
  createVectorStore,
  createAssistant,
  createThread,
  updateAssistantWithVectorStore,
  processQuery,
  storeWorkoutPlan,
} = require('../Bam-Ai-chatbot/simpleQAAssistant');

const processFitnessQuery = async (req, res) => {
  try {
    const {query, fitnessLevel} = req.body;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({error: 'No query provided'});
    }

    let workoutState = await WorkoutState.findOne({user: userId});
    if (!workoutState) {
      const vectorStore = await createVectorStore();
      const assistant = await createAssistant(fitnessLevel);
      const thread = await createThread();

      workoutState = new WorkoutState({
        user: userId,
        assistantId: assistant.id,
        threadId: thread.id,
        vectorStoreId: vectorStore.id,
      });
      await workoutState.save();
      await updateAssistantWithVectorStore(assistant.id, vectorStore.id);
    } else {
      try {
        await verifyVectorStore(workoutState.vectorStoreId);
        await verifyAssistant(workoutState.assistantId);
        await verifyThread(workoutState.threadId);
      } catch (err) {
        console.error('Error verifying resources:', err);
        const vectorStore = await createVectorStore();
        const assistant = await createAssistant(fitnessLevel);
        const thread = await createThread();

        workoutState.assistantId = assistant.id;
        workoutState.threadId = thread.id;
        workoutState.vectorStoreId = vectorStore.id;
        await workoutState.save();
        await updateAssistantWithVectorStore(assistant.id, vectorStore.id);
      }
    }

    const rawResponse = await processQuery(workoutState.threadId, workoutState.assistantId, query, userId);

    let structuredResponse;
    const firstBrace = rawResponse.indexOf('{');
    const lastBrace = rawResponse.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonString = rawResponse.substring(firstBrace, lastBrace + 1);
      try {
        const parsedJSON = JSON.parse(jsonString);
        const introText = rawResponse.substring(0, firstBrace).trim();
        structuredResponse = {
          // introduction: introText || null,
          workout_plan: parsedJSON,
        };
      } catch (error) {
        console.error('Error parsing JSON block:', error);
        structuredResponse = rawResponse;
      }
    } else {
      structuredResponse = rawResponse;
    }

    if (typeof structuredResponse === 'object' && structuredResponse.workout_plan) {
      try {
        await storeWorkoutPlan(userId, structuredResponse);
      } catch (error) {
        console.error('Error storing workout plan:', error);
      }
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
module.exports = {processFitnessQuery, deleteAllFile, deleteAllVectorStore, getAllVectorStore, getFiles};
