const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {openai} = require('../config/config');
const {User} = require('../models');
const Exercise = require('../models/excercise.model');

const resources = {};
let currentLevel = null;

const waitForVectorStoreReady = async (vectorStoreId, maxAttempts = 120, delay = 1000) => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const vs = await openai.beta.vectorStores.retrieve(vectorStoreId);
    console.log(`Polling vector store ${vectorStoreId}: Attempt ${attempts}, file_counts:`, vs.file_counts);
    if (vs.file_counts && vs.file_counts.completed === vs.file_counts.total) {
      console.log(`Vector store ${vectorStoreId} is ready.`);
      return vs;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }
  throw new Error(`Vector store ${vectorStoreId} is not ready after waiting`);
};

const createVectorStore = async userLevel => {
  try {
    const vectorStore = await openai.beta.vectorStores.create({name: 'Fitness Data'});
    console.log(`Created vector store with id: ${vectorStore.id}`);

    const levelMapping = {
      Basic: 'Updated_Basic_Exercises.json',
      Intermediate: 'Updated_Intermediate_Exercises.json',
      Advanced: 'Advanced_Exercises_Final_Updated.json',
    };
    const localFileMapping = {
      Basic: path.join(__dirname, '..', '..', 'data', 'Updated_Basic_Exercises.json'),
      Intermediate: path.join(__dirname, '..', '..', 'data', 'Updated_Intermediate_Exercises.json'),
      Advanced: path.join(__dirname, '..', '..', 'data', 'Advanced_Exercises_Final_Updated.json'),
    };
    const fileStreams = Object.keys(levelMapping)
      .map(level => {
        const filePath = localFileMapping[level];
        if (!fs.existsSync(filePath)) {
          console.error(`File for level ${level} not found at ${filePath}.`);
          return null;
        }
        console.log(`Uploading file for level ${level}: ${levelMapping[level]}`);
        return fs.createReadStream(filePath);
      })
      .filter(Boolean);

    const fileBatch = await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {files: fileStreams});
    console.log(`File batch status: ${fileBatch.status}`);
    console.log(`File counts: ${JSON.stringify(fileBatch.file_counts)}`);

    return vectorStore;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
};

const createAssistant = async (userLevel, vectorStoreId) => {
  try {
    const normalizedLevel = userLevel || 'Basic';
    console.log(`Creating assistant for level: ${normalizedLevel} with vector store ID: ${vectorStoreId}`);

    const assistant = await openai.beta.assistants.create({
      name: 'Fitness Assistant',
      instructions: `
        You are a fitness assistant designed to help users achieve their fitness goals. Your responses should be humanized and efficient. If the query is not related to fitness, politely decline.

        1. Casual Queries: Handle greetings naturally.
        2. Non-Fitness Queries: Politely decline if unrelated.
        3. Fitness-Related Queries: Provide clear answers or generate workout plans.

        **User Level: ${normalizedLevel}**

        4. Workout Plan Requests:
        - Analyze any specified duration (convert weeks/months to days).
        - **NEVER generate a plan for more than 30 days.**
        - If duration ≤ 30 days, generate a plan for that many days.
        - If duration > 30 days, generate a 30-day plan and append: "Instruction: Repeat this workout plan for the remaining X days."
        - If no duration is specified, generate a default 30-day plan.
        - IMPORTANT: Although all exercise files are available, you must ONLY select exercises from the file corresponding to the user level.
          - For Basic users, use "Updated_Basic_Exercises.json".
          - For Intermediate users, use "Updated_Intermediate_Exercises.json".
          - For Advanced users, use "Advanced_Exercises_Final_Updated.json".
          Do not mix exercises from different files.
        
        5. Unrealistic Goals:
         - If the user's goal is unrealistic (e.g., "I want to lose 50 kg in 1 month"), first explain in a friendly and supportive manner why it is unrealistic and outline a feasible approach with realistic milestones.
         - Immediately generate a workout plan for the first 30 days following the output format.
         - Append an instruction message at the end stating: "Instruction: First, follow this 30-day plan. Then, for the remaining X days, gradually increase sets or reps to help achieve your goal," where X is the number of days beyond the initial 30 days as per the user's original request.
        
        6. Data Sources:
        - User details from the user model.
        - The exercise files uploaded in the vector store.
        
        7. Output Format (strict JSON, no extra text):
        {
            "description": "One-line description of the plan",
            "workout_plan": {
                "Day 1": [
                    {
                        "_id": "numeric exercise id",
                        "sets": "dynamic value",
                        "reps": "appropriate range",
                        "interval": "e.g., '60 seconds'",
                        "estimated_time": "e.g., '20 minutes'",
                        "estimated_calories": "e.g., 150"
                    }
                ],
                "Day 2": [ ... ],
                "..."
            },
            "instruction": "Additional instructions if applicable."
        }
        
        Ensure that exercise selection is dynamic (e.g., randomized) and only uses exercises from the correct file based on the user level.
      `,
      model: 'gpt-4o-mini',
      tools: [{type: 'file_search'}],
      temperature: 0.1,
    });

    await updateAssistantWithVectorStore(assistant.id, vectorStoreId);
    return assistant;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
};

const createThread = async () => {
  try {
    return await openai.beta.threads.create();
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

const updateAssistantWithVectorStore = async (assistantId, vectorStoreId) => {
  try {
    if (!vectorStoreId) throw new Error('Vector store ID is null or undefined');
    await openai.beta.assistants.update(assistantId, {
      tool_resources: {
        file_search: {vector_store_ids: [vectorStoreId]},
      },
    });
    console.log(`Successfully updated assistant ${assistantId} with vector store ${vectorStoreId}`);
  } catch (error) {
    console.error('Error updating assistant with vector store:', error);
    throw error;
  }
};

const enrichWorkoutPlan = async workoutPlan => {
  const allowedKeys = [
    // 'Level',
    // 'id',
    'Exercise',
    'Description',
    'sets',
    'reps',
    'Equipment',
    'Main muscle worked',
    'interval',
    'estimated_time',
    'estimated_calories',
  ];
  const defaultValues = {
    interval: '60 seconds',
    estimated_time: '20 minutes',
    estimated_calories: 150,
  };
  const dayKeys = Object.keys(workoutPlan).filter(key => key.startsWith('Day '));
  for (const day of dayKeys) {
    for (let i = 0; i < workoutPlan[day].length; i++) {
      const exerciseEntry = workoutPlan[day][i];
      const exerciseId = Number(exerciseEntry._id);
      let mergedEntry = {...exerciseEntry};
      const exerciseDetails = await Exercise.findOne({id: exerciseId});
      if (exerciseDetails) {
        mergedEntry = {...mergedEntry, ...exerciseDetails.toObject()};
      }
      const filteredEntry = {};
      allowedKeys.forEach(key => {
        if (mergedEntry[key] !== undefined) {
          filteredEntry[key] = mergedEntry[key];
        } else if (defaultValues[key] !== undefined) {
          filteredEntry[key] = defaultValues[key];
        }
      });
      workoutPlan[day][i] = filteredEntry;
    }
  }
  return workoutPlan;
};

const processQuery = async (threadId, assistantId, query, userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const durationMatch = query.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
    let requestedDuration = durationMatch ? parseInt(durationMatch[1]) : 30;
    let modifiedQuery = query;
    if (durationMatch) {
      const unit = durationMatch[2].toLowerCase();
      if (unit.includes('week')) requestedDuration *= 7;
      else if (unit.includes('month')) requestedDuration *= 30;
      if (requestedDuration > 30)
        modifiedQuery = `${query} (NOTE: Only generate a 30-day plan with instructions for the remaining ${requestedDuration -
          30} days)`;
    } else {
      requestedDuration = 30;
    }

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `User Information:
        Name: ${user.name || 'N/A'}
        Weight: ${user.weight || 'N/A'}
        Height: ${user.height || 'N/A'}
        BMI: ${user.bmi || 'N/A'}
        Body Fat: ${user.bodyFat || 'N/A'}
        Gender: ${user.gender || 'N/A'}
        User Query: ${modifiedQuery}`,
    });

    const run = await openai.beta.threads.runs.create(threadId, {assistant_id: assistantId});
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    let delay = 500;
    while (
      runStatus.status !== 'completed' &&
      runStatus.status !== 'failed' &&
      runStatus.status !== 'cancelled' &&
      attempts < 60
    ) {
      await new Promise(resolve => setTimeout(resolve, delay));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
      delay = Math.min(delay * 1.5, 2000);
    }
    if (runStatus.status !== 'completed') throw new Error(`Run failed with status: ${runStatus.status}`);

    const messages = await openai.beta.threads.messages.list(threadId, {limit: 1, order: 'desc'});
    if (messages.data.length === 0) throw new Error('No assistant messages found');
    const content = messages.data[0].content.find(c => c.type === 'text')?.text?.value;
    if (!content) throw new Error('No text content found in assistant response');

    try {
      let parsedJSON = JSON.parse(content);

      if (parsedJSON.workout_plan) {
        const workoutPlan = parsedJSON.workout_plan;
        const days = Object.keys(workoutPlan).filter(key => key.startsWith('Day '));

        if (days.length > 30) {
          const filteredPlan = {};
          for (let i = 1; i <= 30; i++) {
            const dayKey = `Day ${i}`;
            if (workoutPlan[dayKey]) filteredPlan[dayKey] = workoutPlan[dayKey];
          }
          parsedJSON.workout_plan = filteredPlan;
        }

        if (requestedDuration <= 30) {
          delete parsedJSON.instruction;
        } else {
          parsedJSON.instruction = `Repeat this workout plan for the remaining ${requestedDuration - 30} days.`;
        }

        const enrichedPlan = await enrichWorkoutPlan(parsedJSON.workout_plan);
        const transformedPlan = Object.keys(enrichedPlan)
          .filter(key => key.startsWith('Day '))
          .sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]))
          .map(dayKey => ({
            day: dayKey.replace('Day ', ''),
            workout_list: enrichedPlan[dayKey],
          }));

        const responseObj = {
          response: {
            description: parsedJSON.description,
            workout_plan: transformedPlan,
            instruction: parsedJSON.instruction,
          },
        };

        return JSON.stringify(responseObj, null, 2);
      }

      console.log('Successfully parsed response as JSON');
      return JSON.stringify(parsedJSON, null, 2);
    } catch (error) {
      console.log('Failed to parse response directly as JSON, extracting JSON portion');

      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return content;
      }

      const jsonString = content.substring(firstBrace, lastBrace + 1);
      const cleanJsonString = jsonString.replace(/\/\/.*$/gm, '');

      try {
        let parsedJSON = JSON.parse(cleanJsonString);
        const introText = content.substring(0, firstBrace).trim();

        if (introText) {
          parsedJSON = {
            introduction: introText,
            ...parsedJSON,
          };
        }

        if (parsedJSON.workout_plan) {
          const workoutPlan = parsedJSON.workout_plan;
          const days = Object.keys(workoutPlan).filter(key => key.startsWith('Day '));

          if (days.length > 30) {
            const filteredPlan = {};
            for (let i = 1; i <= 30; i++) {
              const dayKey = `Day ${i}`;
              if (workoutPlan[dayKey]) filteredPlan[dayKey] = workoutPlan[dayKey];
            }
            parsedJSON.workout_plan = filteredPlan;
          }

          if (requestedDuration <= 30) {
            delete parsedJSON.instruction;
          } else {
            parsedJSON.instruction = `Repeat this workout plan for the remaining ${requestedDuration - 30} days.`;
          }

          const enrichedPlan = await enrichWorkoutPlan(parsedJSON.workout_plan);
          const transformedPlan = Object.keys(enrichedPlan)
            .filter(key => key.startsWith('Day '))
            .sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]))
            .map(dayKey => ({
              day: dayKey.replace('Day ', ''),
              workout_list: enrichedPlan[dayKey],
            }));

          const responseObj = {
            response: {
              description: parsedJSON.description,
              workout_plan: transformedPlan,
              instruction: parsedJSON.instruction,
            },
          };

          return JSON.stringify(responseObj, null, 2);
        }

        return JSON.stringify(parsedJSON, null, 2);
      } catch (jsonError) {
        console.error('Error parsing extracted JSON:', jsonError);
        return content;
      }
    }
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
};
let WorkoutPlanModel;
const getWorkoutPlanModel = () => {
  if (!WorkoutPlanModel) {
    WorkoutPlanModel = mongoose.model(
      'WorkoutPlan',
      new mongoose.Schema({
        user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        description: String,
        workoutPlan: Object,
        instruction: String,
        createdAt: {type: Date, default: Date.now},
      }),
      'workoutplans'
    );
  }
  return WorkoutPlanModel;
};

const storeWorkoutPlan = async (userId, workoutPlan) => {
  try {
    const WorkoutPlan = getWorkoutPlanModel();
    await WorkoutPlan.create({
      user: userId,
      description: workoutPlan.description,
      workoutPlan: workoutPlan.workout_plan,
      instruction: workoutPlan.instruction,
    });
  } catch (error) {
    console.error('Error storing workout plan:', error);
  }
};

const deleteVectorStore = async vectorStoreId => {
  if (!vectorStoreId) {
    console.error('Cannot delete vector store: No vectorStoreId provided');
    return;
  }

  try {
    try {
      await openai.beta.vectorStores.retrieve(vectorStoreId);
    } catch (retrieveError) {
      console.log(`Vector store ${vectorStoreId} does not exist or is already deleted`);
      return;
    }

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      try {
        await openai.beta.vectorStores.del(vectorStoreId);
        console.log(`Successfully deleted vector store with id: ${vectorStoreId} on attempt ${attempts + 1}`);
        success = true;
      } catch (deleteError) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(`Failed to delete vector store ${vectorStoreId} after ${maxAttempts} attempts:`, deleteError);
          throw deleteError;
        }
        console.log(`Retry ${attempts}/${maxAttempts} to delete vector store ${vectorStoreId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error during vector store deletion process:', error);
    throw error;
  }
};

const initializeResources = async userLevel => {
  const normalizedLevel = userLevel || 'Basic';

  if (currentLevel && currentLevel !== normalizedLevel) {
    const oldResources = resources[currentLevel];
    if (oldResources && oldResources.vectorStore) {
      console.log(`Deleting old vector store for level ${currentLevel} with id ${oldResources.vectorStore.id}`);
      await deleteVectorStore(oldResources.vectorStore.id);
      delete resources[currentLevel];
    }
  }

  currentLevel = normalizedLevel;

  if (resources[normalizedLevel]) {
    return resources[normalizedLevel];
  }

  const vectorStore = await createVectorStore(normalizedLevel);
  await waitForVectorStoreReady(vectorStore.id);
  const assistant = await createAssistant(normalizedLevel, vectorStore.id);
  const thread = await createThread();
  resources[normalizedLevel] = {vectorStore, assistant, thread};
  return resources[normalizedLevel];
};

module.exports = {
  createVectorStore,
  createAssistant,
  createThread,
  updateAssistantWithVectorStore,
  processQuery,
  storeWorkoutPlan,
  initializeResources,
};
