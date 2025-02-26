// const mongoose = require('mongoose');
// const {openai} = require('../config/config');
// const {User} = require('../models');

// const createVectorStore = async () => {
//   try {
//     const initialFileIds = [];
//     const vectorStore = await openai.beta.vectorStores.create({
//       name: 'Fitness Data',
//       file_ids: initialFileIds,
//     });

//     console.log('Vector store created:', vectorStore);
//     if (!vectorStore.id) {
//       throw new Error('Vector store creation failed: No ID returned');
//     }

//     const existingFiles = await openai.files.list({purpose: 'assistants'});

//     const fileIds = [];
//     const requiredFiles = [
//       'Updated_Basic_Exercises.json',
//       'Updated_Intermediate_Exercises.json',
//       'Advanced_Exercises_Final_Updated.json',
//     ];

//     for (const fileName of requiredFiles) {
//       const file = existingFiles.data.find(f => f.filename === fileName);
//       if (file) {
//         fileIds.push(file.id);
//       } else {
//         console.error(`File ${fileName} not found in OpenAI files`);
//       }
//     }

//     return vectorStore;
//   } catch (error) {
//     console.error('Error creating vector store:', error);
//     throw error;
//   }
// };

// const createAssistant = async userLevel => {
//   try {
//     const level = userLevel || 'Basic';

//     const assistant = await openai.beta.assistants.create({
//       name: 'Fitness Assistant',
//       instructions: `
//         You are a fitness assistant designed to help users achieve their fitness goals. Your responses should be humanized and efficient, especially for casual queries. If the query is not related to fitness, politely decline to answer.

//         1. Casual Queries: Handle friendly greetings naturally.
//         2. Non-Fitness Queries: Politely decline if the query is unrelated to fitness.
//         3. Fitness-Related Queries Without Plan Requests: Provide clear, conversational answers to fitness-related queries that don't request a workout plan.

//         **User Level:**
//         ${level}

//         4. Workout Plan Requests:
//         - When a user requests a workout plan, first analyze the duration mentioned.
//         - If the query specifies a duration using terms such as "week", "month", or "quarter", convert the duration to days only. For example, "4 weeks" must be converted to "28 days", "2 months" to "60 days" (or a similar day-based approximation).
//         - **If the converted duration is less than or equal to 30 days, generate a plan for that exact number of days without any additional instructions.**
//         - **If the converted duration exceeds 30 days, generate only a 30-day plan and then append an instruction at the end of the response stating: "Instruction: Repeat this workout plan for the remaining X days," where X is the difference between the requested duration (converted to days) and 30 days.**
//         - **If no duration is specified, generate a default 30-day plan**.
//         - Select exercises based on the user's level:
//             - If the user's level is **Basic**, fetch exercises from "Updated_Basic_Exercises.json".
//             - If the user's level is **Intermediate**, fetch exercises from "Updated_Intermediate_Exercises.json".
//             - If the user's level is **Advanced**, fetch exercises from "Advanced_Exercises_Final_Updated.json".

//         5. Unrealistic Goal Handling:
//         - If the user's goal is unrealistic (e.g., "I want to lose 50 kg in 1 month"), first explain in a friendly and supportive manner why it is unrealistic and outline a feasible approach with realistic milestones.
//         - Immediately generate a workout plan for the first 30 days following the output format.
//         - Append an instruction message at the end stating: "Instruction: First, follow this 30-day plan. Then, for the remaining X days, gradually increase sets or reps to help achieve your goal," where X is the number of days beyond the initial 30 days as per the user's original request.

//         6. Data Sources:
//         - User model: Stores user info (age, weight, fitness level, preferences, etc.)
//         - "Updated_Basic_Exercises.json", "Updated_Intermediate_Exercises.json", "Advanced_Exercises_Final_Updated.json": Exercise lists based on user level.
//         - When available, prioritize BMI and body fat data from the user model.

//         7. Output Format (Strict JSON format, no extra text):
//         {
//             "description": "One-line description of the purpose of the plan",
//             "workout_plan": {
//                 "Day 1": [
//                     {
//                         "_id": "Fetch only the numeric Id from the respective level-based exercise file (for example, '26')",
//                         "sets": "Determine the number of sets based on the user's details and goal (for example, 2 or 3-4)",
//                         "reps": "Determine the repetition range appropriate for the exercise (for example, '10-12' or '15-20 minutes' for cardio)",
//                         "interval": "Specify the rest interval (for example, '60 seconds' or '2 min') or note 'continuous' if applicable",
//                         "estimated_time": "Provide an estimated time for the exercise (for example, '20 minutes')",
//                         "estimated_calories": "Provide an estimated calorie burn for the exercise (for example, 150)"
//                     }
//                 ],
//                 "Day 2": [
//                     "... // Continue for each day based on the converted (or default) duration"
//                 ],
//                 "..."
//             },
//             "instruction": "If applicable, include an instruction message here as specified in the guidelines."
//         }

//         Ensure that:
//         - If the user query mentions a duration using "week", "month", or "quarter", convert that duration into days and structure the plan using only day-based keys.
//         - If the requested duration is less than or equal to 30 days, generate a plan for that exact number of days without appending any extra instruction.
//         - If the requested duration exceeds 30 days, generate only a 30-day plan and include an instruction message for the remaining days.
//         - In the case of an unrealistic goal, first explain why the goal is unrealistic and how to approach it realistically, then generate a 30-day plan followed by an instruction message for additional days.
//         - Do not output any keys like "Week 1", "Month 1", or similar.
//         - Do not use fixed values (e.g., sets: 1) for all parameters; determine each parameter dynamically based on the user's details and fitness goal.
//         - Your response must be in valid JSON format with no extra text.
//         - **If no duration is specified, generate a default 30-day plan**.

//         Handling BMI and Body Fat Data:
//         - Use the following values from the user's profile as the correct parameters:
//             - **BMI: Use the bmi value from the user model**
//             - **Body Fat: Use the bodyFat value from the user model**

//         Consider weight in (lbs) and Height in (cm).
//         Always fetch exercises from the correct level-based file to personalize plans.
//       `,
//       model: 'gpt-4o-mini',
//       tools: [{type: 'file_search'}],
//       temperature: 0.1,
//     });

//     return assistant;
//   } catch (error) {
//     console.error('Error creating assistant:', error);
//     throw error;
//   }
// };

// const createThread = async () => {
//   try {
//     return await openai.beta.threads.create();
//   } catch (error) {
//     console.error('Error creating thread:', error);
//     throw error;
//   }
// };

// const updateAssistantWithVectorStore = async (assistantId, vectorStoreId) => {
//   try {
//     await openai.beta.assistants.update(assistantId, {
//       tool_resources: {
//         file_search: {
//           vector_store_ids: [vectorStoreId],
//         },
//       },
//     });
//   } catch (error) {
//     console.error('Error updating assistant with vector store:', error);
//     throw error;
//   }
// };

// const processQuery = async (threadId, assistantId, query, userId) => {
//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       throw new Error('User not found');
//     }
//     await openai.beta.threads.messages.create(threadId, {
//       role: 'user',
//       content: `User Information:
//         Name: ${user.name || 'N/A'}
//         Weight: ${user.weight || 'N/A'}
//         Height: ${user.height || 'N/A'}
//         BMI: ${user.bmi || 'N/A'}
//         Body Fat: ${user.bodyFat || 'N/A'}
//         Gender: ${user.gender || 'N/A'}

//         User Query: ${query}`,
//     });

//     const run = await openai.beta.threads.runs.create(threadId, {assistant_id: assistantId});

//     let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
//     const maxAttempts = 60;
//     let attempts = 0;

//     while (
//       runStatus.status !== 'completed' &&
//       runStatus.status !== 'failed' &&
//       runStatus.status !== 'cancelled' &&
//       attempts < maxAttempts
//     ) {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
//       attempts++;
//     }

//     if (runStatus.status === 'completed') {
//       const messages = await openai.beta.threads.messages.list(threadId);

//       const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');

//       if (assistantMessages.length > 0) {
//         const content = assistantMessages[0].content.find(c => c.type === 'text')?.text?.value;

//         if (!content) {
//           throw new Error('No text content found in assistant response');
//         }

//         return content;
//       } else {
//         throw new Error('No assistant messages found');
//       }
//     } else if (runStatus.status === 'requires_action') {
//       console.log('Run requires action:', runStatus.required_action);
//       throw new Error('Run requires action, not implemented in this version');
//     } else {
//       throw new Error(`Run failed with status: ${runStatus.status}`);
//     }
//   } catch (error) {
//     console.error('Error processing query:', error);
//     throw error;
//   }
// };
// const storeWorkoutPlan = async (userId, workoutPlan) => {
//   try {
//     const WorkoutPlan = mongoose.model(
//       'WorkoutPlan',
//       new mongoose.Schema({
//         user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//         description: String,
//         workoutPlan: Object,
//         instruction: String,
//         createdAt: {type: Date, default: Date.now},
//       }),
//       'workoutplans'
//     );

//     await WorkoutPlan.create({
//       user: userId,
//       description: workoutPlan.description,
//       workoutPlan: workoutPlan.workout_plan,
//       instruction: workoutPlan.instruction,
//     });
//   } catch (error) {
//     console.error('Error storing workout plan:', error);
//   }
// };

// module.exports = {
//   createVectorStore,
//   createAssistant,
//   createThread,
//   updateAssistantWithVectorStore,
//   processQuery,
//   storeWorkoutPlan,
// };

const mongoose = require('mongoose');
const {openai} = require('../config/config');
const {User} = require('../models');

const cache = {
  exerciseFiles: {},
  assistants: {},
  vectorStores: {},
};

const initializeResources = async userLevel => {
  const cacheKey = `assistant_${userLevel || 'Basic'}`;

  if (cache.assistants[cacheKey]) {
    return {
      vectorStore: cache.vectorStores[cacheKey],
      assistant: cache.assistants[cacheKey],
      thread: await createThread(),
    };
  }

  const vectorStore = await createVectorStore();
  const assistant = await createAssistant(userLevel);
  cache.vectorStores[cacheKey] = vectorStore;
  cache.assistants[cacheKey] = assistant;
  await updateAssistantWithVectorStore(assistant.id, vectorStore.id);

  return {
    vectorStore,
    assistant,
    thread: await createThread(),
  };
};

const createVectorStore = async () => {
  try {
    const initialFileIds = [];
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'Fitness Data',
      file_ids: initialFileIds,
    });

    if (!vectorStore.id) {
      throw new Error('Vector store creation failed: No ID returned');
    }

    if (!cache.exerciseFiles.fileIds) {
      const existingFiles = await openai.files.list({purpose: 'assistants'});

      const fileIds = [];
      const requiredFiles = [
        'Updated_Basic_Exercises.json',
        'Updated_Intermediate_Exercises.json',
        'Advanced_Exercises_Final_Updated.json',
      ];

      for (const fileName of requiredFiles) {
        const file = existingFiles.data.find(f => f.filename === fileName);
        if (file) {
          fileIds.push(file.id);
        } else {
          console.error(`File ${fileName} not found in OpenAI files`);
        }
      }

      cache.exerciseFiles.fileIds = fileIds;
    }

    return vectorStore;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
};

const createAssistant = async userLevel => {
  try {
    const level = userLevel || 'Basic';
    const cacheKey = `assistant_${level}`;
    if (cache.assistants[cacheKey]) {
      return cache.assistants[cacheKey];
    }

    const assistant = await openai.beta.assistants.create({
      name: 'Fitness Assistant',
      instructions: `
        You are a fitness assistant designed to help users achieve their fitness goals. Your responses should be humanized and efficient, especially for casual queries. If the query is not related to fitness, politely decline to answer.

        1. Casual Queries: Handle friendly greetings naturally.
        2. Non-Fitness Queries: Politely decline if the query is unrelated to fitness.
        3. Fitness-Related Queries Without Plan Requests: Provide clear, conversational answers to fitness-related queries that don't request a workout plan.
        
        **User Level:**
        ${level}
        
        4. Workout Plan Requests:
        - When a user requests a workout plan, first analyze the duration mentioned.
        - If the query specifies a duration using terms such as "week", "month", or "quarter", convert the duration to days only. For example, "4 weeks" must be converted to "28 days", "2 months" to "60 days" (or a similar day-based approximation).
        - **IMPORTANT: NEVER GENERATE A PLAN FOR MORE THAN 30 DAYS. THIS IS A STRICT REQUIREMENT.**
        - **If the converted duration is less than or equal to 30 days, generate a plan for that exact number of days without any additional instructions.**
        - **If the converted duration exceeds 30 days, generate ONLY a 30-day plan and then append an instruction at the end of the response stating: "Instruction: Repeat this workout plan for the remaining X days," where X is the difference between the requested duration (converted to days) and 30 days.**
        - **If no duration is specified, generate a default 30-day plan**.
        - Select exercises based on the user's level:
            - If the user's level is **Basic**, fetch exercises from "Updated_Basic_Exercises.json".
            - If the user's level is **Intermediate**, fetch exercises from "Updated_Intermediate_Exercises.json".
            - If the user's level is **Advanced**, fetch exercises from "Advanced_Exercises_Final_Updated.json".
        
        5. Unrealistic Goal Handling:
        - If the user's goal is unrealistic (e.g., "I want to lose 50 kg in 1 month"), first explain in a friendly and supportive manner why it is unrealistic and outline a feasible approach with realistic milestones.
        - Immediately generate a workout plan for the first 30 days following the output format.
        - Append an instruction message at the end stating: "Instruction: First, follow this 30-day plan. Then, for the remaining X days, gradually increase sets or reps to help achieve your goal," where X is the number of days beyond the initial 30 days as per the user's original request.
        
        6. Data Sources:
        - User model: Stores user info (age, weight, fitness level, preferences, etc.)
        - "Updated_Basic_Exercises.json", "Updated_Intermediate_Exercises.json", "Advanced_Exercises_Final_Updated.json": Exercise lists based on user level.
        - When available, prioritize BMI and body fat data from the user model.
        
        7. Output Format (Strict JSON format, no extra text):
        {
            "description": "One-line description of the purpose of the plan",
            "workout_plan": {
                "Day 1": [
                    {
                        "_id": "Fetch only the numeric Id from the respective level-based exercise file (for example, '26')",
                        "sets": "Determine the number of sets based on the user's details and goal (for example, 2 or 3-4)",
                        "reps": "Determine the repetition range appropriate for the exercise (for example, '10-12' or '15-20 minutes' for cardio)",
                        "interval": "Specify the rest interval (for example, '60 seconds' or '2 min') or note 'continuous' if applicable",
                        "estimated_time": "Provide an estimated time for the exercise (for example, '20 minutes')",
                        "estimated_calories": "Provide an estimated calorie burn for the exercise (for example, 150)"
                    }
                ],
                "Day 2": [
                    "... // Continue for each day based on the converted (or default) duration"
                ],
                "..."
            },
            "instruction": "If applicable, include an instruction message here as specified in the guidelines."
        }
        
        Ensure that:
        - **YOU MUST NEVER GENERATE A PLAN FOR MORE THAN 30 DAYS, EVEN IF THE USER REQUESTS MORE.**
        - If the user query mentions a duration using "week", "month", or "quarter", convert that duration into days and structure the plan using only day-based keys.
        - If the requested duration is less than or equal to 30 days, generate a plan for that exact number of days without appending any extra instruction.
        - If the requested duration exceeds 30 days, generate ONLY a 30-day plan (no more than 30 days) and include an instruction message for the remaining days.
        - In the case of an unrealistic goal, first explain why the goal is unrealistic and how to approach it realistically, then generate a 30-day plan followed by an instruction message for additional days.
        - Do not output any keys like "Week 1", "Month 1", or similar.
        - Do not use fixed values (e.g., sets: 1) for all parameters; determine each parameter dynamically based on the user's details and fitness goal.
        - Your response must be in valid JSON format with no extra text.
        - **If no duration is specified, generate a default 30-day plan**.
        
        Handling BMI and Body Fat Data:
        - Use the following values from the user's profile as the correct parameters:
            - **BMI: Use the bmi value from the user model**
            - **Body Fat: Use the bodyFat value from the user model**
        
        Consider weight in (lbs) and Height in (cm).
        Always fetch exercises from the correct level-based file to personalize plans.
      `,
      model: 'gpt-4o-mini',
      tools: [{type: 'file_search'}],
      temperature: 0.1,
    });

    cache.assistants[cacheKey] = assistant;
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
    await openai.beta.assistants.update(assistantId, {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
    });
  } catch (error) {
    console.error('Error updating assistant with vector store:', error);
    throw error;
  }
};

const processQuery = async (threadId, assistantId, query, userId) => {
  try {
    const userPromise = User.findById(userId);

    const user = await userPromise;
    if (!user) {
      throw new Error('User not found');
    }

    const durationMatch = query.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
    let requestedDuration = null;
    let modifiedQuery = query;

    if (durationMatch) {
      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();

      if (unit.includes('week')) {
        requestedDuration = amount * 7;
      } else if (unit.includes('month')) {
        requestedDuration = amount * 30;
      } else {
        requestedDuration = amount;
      }

      if (requestedDuration > 30) {
        modifiedQuery = `${query} (NOTE: Only generate a 30-day plan with instructions for the remaining ${requestedDuration -
          30} days)`;
      }
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

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    const maxAttempts = 60;
    let attempts = 0;
    let delay = 500;

    while (
      runStatus.status !== 'completed' &&
      runStatus.status !== 'failed' &&
      runStatus.status !== 'cancelled' &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, delay));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;

      if (delay < 2000) {
        delay = Math.min(delay * 1.5, 2000);
      }
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId, {
        limit: 1,
        order: 'desc',
      });

      if (messages.data.length > 0) {
        const content = messages.data[0].content.find(c => c.type === 'text')?.text?.value;

        if (!content) {
          throw new Error('No text content found in assistant response');
        }

        let processedContent = content;

        if (requestedDuration && requestedDuration > 30) {
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');

          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
              const jsonString = content.substring(firstBrace, lastBrace + 1);
              const parsedJSON = JSON.parse(jsonString);

              const workoutPlan = parsedJSON.workout_plan || {};
              const days = Object.keys(workoutPlan).filter(key => key.startsWith('Day '));

              if (days.length > 30) {
                const filteredPlan = {};
                for (let i = 1; i <= 30; i++) {
                  const dayKey = `Day ${i}`;
                  if (workoutPlan[dayKey]) {
                    filteredPlan[dayKey] = workoutPlan[dayKey];
                  }
                }

                parsedJSON.workout_plan = filteredPlan;
                if (!parsedJSON.instruction) {
                  parsedJSON.instruction = `Repeat this workout plan for the remaining ${requestedDuration - 30} days.`;
                }

                const introText = content.substring(0, firstBrace);
                processedContent = introText + JSON.stringify(parsedJSON, null, 2);
              }
            } catch (error) {
              console.error('Error post-processing JSON response:', error);
            }
          }
        }

        return processedContent;
      } else {
        throw new Error('No assistant messages found');
      }
    } else if (runStatus.status === 'requires_action') {
      console.log('Run requires action:', runStatus.required_action);
      throw new Error('Run requires action, not implemented in this version');
    } else {
      throw new Error(`Run failed with status: ${runStatus.status}`);
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

module.exports = {
  createVectorStore,
  createAssistant,
  createThread,
  updateAssistantWithVectorStore,
  processQuery,
  storeWorkoutPlan,
  initializeResources,
};
