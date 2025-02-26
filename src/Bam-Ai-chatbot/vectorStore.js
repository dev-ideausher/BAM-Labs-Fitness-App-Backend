const fs = require('fs');
const path = require('path');
const util = require('util');
const openai = require('../config/openAi');
const {WorkoutState} = require('../models/WorkoutState.model');
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);

async function uploadFileToVectorStore(jsonlData, userId, userName, fileType = 'workout', existingPlan) {
  try {
    if (existingPlan?.vectorFileId) {
      console.log(` Deleting existing file: ${existingPlan.vectorFileId}`);
      await openai.files.del(existingPlan.vectorFileId);
    }

    const filePath = path.join(__dirname, `${fileType}_plan_${userId}.json`);
    await writeFile(filePath, jsonlData, 'utf-8');

    const fileStream = fs.createReadStream(filePath);

    const fileResponse = await openai.files.create({
      file: fileStream,
      purpose: 'assistants',
    });

    const workoutState = await getOrCreateVectorStore(userId);
    await openai.beta.vectorStores.files.create(workoutState.vectorStoreId, {
      file_id: fileResponse.id,
    });

    console.log(' File uploaded successfully:', {
      fileId: fileResponse.id,
      userId,
      userName,
      fileType,
    });

    console.log(` Cleaning up temporary file: ${filePath}`);
    await unlink(filePath);

    return {fileId: fileResponse.id, userId, userName, fileType};
  } catch (error) {
    console.error('Error uploading file to vector store:', error.message);
    throw error;
  }
}

async function getOrCreateVectorStore(userId) {
  let workoutState = await WorkoutState.findOne({user: userId});
  if (!workoutState) {
    workoutState = new WorkoutState({user: userId});
  }
  if (!workoutState.vectorStoreId) {
    console.log('Creating vector store as not found in WorkoutState.');
    const response = await openai.beta.vectorStores.create({
      name: 'Workout Exercises Store',
    });
    workoutState.vectorStoreId = response.id;
    await workoutState.save();
  }
  return workoutState;
}
async function getOrCreateAssistant(workoutState) {
  if (!workoutState.assistantId) {
    const response = await openai.beta.assistants.create({
      name: 'Workout Assistant',
      instructions:
        'You are a fitness assistant. When answering queries, only consider workout exercise files associated with the given user ID. Do not include meal or diet plans in your responses.',
      model: 'gpt-4o',
      tools: [{type: 'file_search'}],
      tool_resources: {
        file_search: {vector_store_ids: [workoutState.vectorStoreId]},
      },
    });
    workoutState.assistantId = response.id;
    await workoutState.save();
  }
  return workoutState.assistantId;
}

async function getOrCreateThread(userId) {
  let workoutState = await WorkoutState.findOne({user: userId});
  if (!workoutState) {
    workoutState = new WorkoutState({user: userId});
  }
  if (!workoutState.threadId) {
    const response = await openai.beta.threads.create();
    workoutState.threadId = response.id;
    await workoutState.save();
  }
  return workoutState.threadId;
}
async function processQuery(userId, query) {
  const workoutState = await getOrCreateVectorStore(userId);
  const assistantId = await getOrCreateAssistant(workoutState);
  const threadId = await getOrCreateThread(userId);

  await openai.beta.assistants.update(assistantId, {
    instructions: `You are a fitness assistant. When answering queries, only consider files with the user ID: ${userId}. Use workout exercise information. Respond in plain text without referencing file sources.`,
  });

  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: query,
  });

  const run = await openai.beta.threads.runs.createAndPoll(threadId, {
    assistant_id: assistantId,
  });

  console.log('Run status:', run);

  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(threadId);
    if (!messages?.data?.length || !messages.data[0]?.content?.length) {
      console.error('No valid messages received from assistant.');
      return {error: 'No valid response from assistant'};
    }

    const responseText = messages.data[0].content[0].text.value;
    console.log('Assistant response:', responseText);
    return responseText;
  } else {
    throw new Error('Failed to process query');
  }
}
async function getChatHistoryFromThread(threadId) {
  try {
    console.log(`Retrieving chat history for thread: ${threadId}`);
    const messages = await openai.beta.threads.messages.list(threadId);
    messages.data.forEach((message, index) => {
      console.log(` Message ${index + 1} - Role: ${message.role}`);
      console.log(`Content: ${message.content}`);
    });
    return messages.data;
  } catch (error) {
    console.error(' Error retrieving chat history:', error.message);
    throw error;
  }
}

module.exports = {
  processQuery,
  getOrCreateThread,
  getOrCreateAssistant,
  uploadFileToVectorStore,
  getChatHistoryFromThread,
};
