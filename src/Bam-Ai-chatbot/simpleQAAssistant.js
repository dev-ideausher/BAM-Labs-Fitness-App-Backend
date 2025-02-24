const { WorkoutState } = require('../models');
const openai = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class WorkoutAssistant {
  constructor(userId) {
    this.userId = userId;
    this.client = openai;
    this.exerciseFiles = {
      Basic: path.join(__dirname, '..', '..', 'data', 'Updated_Basic_Exercises.json'),
      Intermediate: path.join(__dirname, '..', '..', 'data', 'Updated_Intermediate_Exercises.json'),
      Advanced: path.join(__dirname, '..', '..', 'data', 'Advanced_Exercises_Final_Updated.json'),
    };

    if (!this.client.beta) {
      this.client.beta = {
        assistants: {
          create: async options => {
            return { id: 'assistant_' + Date.now() };
          },
          retrieve: async assistantId => ({ id: assistantId }),
          update: async (assistantId, options) => true,
        },
        threads: {
          create: async () => ({ id: 'thread_' + Date.now() }),
          retrieve: async threadId => ({ id: threadId }),
          messages: {
            create: async (threadId, message) => ({ success: true }),
            list: async threadId => {
              return {
                data: [
                  {
                    content: [
                      {
                        text: {
                          value: '{"description":"Dummy workout plan","workout_plan":{"Day 1":[]},"instruction":""}',
                        },
                      },
                    ],
                  },
                ],
              };
            },
          },
          runs: {
            createAndPoll: async (threadId, options) => ({ status: 'completed' }),
          },
        },
        vector_stores: {
          create: async options => ({ id: 'vector_' + Date.now() }),
          file_batches: {
            uploadAndPoll: async options => ({
              status: 'completed',
              file_counts: options.files ? options.files.length : 0,
            }),
          },
          retrieve: async vectorStoreId => ({ id: vectorStoreId }),
        },
      };
    }
  }

  async initialize() {
    this.state =
      (await WorkoutState.findOne({ user: this.userId })) || new WorkoutState({ user: this.userId });
  }

  async processQuery(query) {
    await this.initialize();

    if (!this.state.assistantId) {
      const assistant = await this.client.beta.assistants.create({
        name: 'Fitness Assistant',
        instructions: this.getInstructions(),
        model: 'gpt-4-turbo',
        tools: [{ type: 'file_search' }],
      });
      this.state.assistantId = assistant.id;
    }

    if (!this.state.threadId) {
      const thread = await this.client.beta.threads.create();
      this.state.threadId = thread.id;
    }

    const { duration, level } = this.parseQuery(query);
    const exerciseData = await this.loadExerciseData(level);
    const plan = this.generatePlan(duration || 30, level, exerciseData);

    await this.state.save();
    return plan;
  }

  parseQuery(query) {
    const durationRegex = /(\d+)\s*-?\s*day/i;
    let duration = 30;
    const durationMatch = query.match(durationRegex);
    if (durationMatch && durationMatch[1]) {
      duration = parseInt(durationMatch[1], 10);
    }

    let level = 'Beginner';
    if (/advanced/i.test(query)) {
      level = 'Advanced';
    } else if (/intermediate/i.test(query)) {
      level = 'Intermediate';
    } else if (/basic/i.test(query)) {
      level = 'Basic';
    }
    return { duration, level };
  }

  async loadExerciseData(level) {
    let filePath;
    if (level === 'Advanced') {
      filePath = this.exerciseFiles.Advanced;
    } else if (level === 'Intermediate') {
      filePath = this.exerciseFiles.Intermediate;
    } else {
      filePath = this.exerciseFiles.Basic;
    }

    try {
      const data = await fs.readFile(filePath, 'utf8');
      let exercises = JSON.parse(data);
      if (!Array.isArray(exercises)) {
        const keys = Object.keys(exercises);
        for (let key of keys) {
          if (Array.isArray(exercises[key])) {
            exercises = exercises[key];
            break;
          }
        }
        if (!Array.isArray(exercises)) {
          exercises = [exercises];
        }
      }
      return exercises;
    } catch (error) {
      console.error(`Error reading exercise file for ${level}:`, error);
      return [];
    }
  }

  generatePlan(duration, level, exerciseData) {
    const planDays = duration > 30 ? 30 : duration;
    const workout_plan = {};

    for (let day = 1; day <= planDays; day++) {
      const exercise = exerciseData.length > 0 ? exerciseData[(day - 1) % exerciseData.length] : {};
      workout_plan[`Day ${day}`] = [
        {
          _id: exercise.Id || `${level}_Exercise_${day}`,
          exercise: exercise.Exercise || 'Unknown Exercise',
          description: exercise.Description || 'No description provided.',
          sets: exercise.sets || (3 + (day % 2)),
          reps: exercise.reps || '10-12',
          interval: exercise.interval || '60 seconds',
          estimated_time: exercise.estimated_time || '30 minutes',
          estimated_calories: exercise.estimated_calories || (200 + day),
        },
      ];
    }
    let instruction = '';
    if (duration > 30) {
      instruction = `Instruction: Repeat this workout plan for the remaining ${duration - 30} days.`;
    }
    return {
      description: `${level} workout plan for ${duration} days`,
      workout_plan,
      instruction,
    };
  }

  getInstructions(userLevel = 'Beginner') {
    return `
You are a fitness assistant designed to help users achieve their fitness goals. Your responses should be humanized and efficient, especially for casual queries. If the query is not related to fitness, politely decline to answer.

1. Casual Queries: Handle friendly greetings naturally.
2. Non-Fitness Queries: Politely decline if the query is unrelated to fitness.
3. Fitness-Related Queries Without Plan Requests: Provide clear, conversational answers to fitness-related queries that don't request a workout plan.

**User Level:**
${userLevel}

4. Workout Plan Requests:
- When a user requests a workout plan, first analyze the duration mentioned.
- If the query specifies a duration using terms such as "week", "month", or "quarter", convert that duration to days.
- **If the converted duration is ≤ 30 days:** Generate an exact day-based plan.
- **If the converted duration is > 30 days:** Generate a 30-day plan and include an instruction to repeat for the remaining days.
- **If no duration is specified:** Generate a default 30-day plan.
- Select exercises from:
  - Basic: "${this.exerciseFiles.Basic}"
  - Intermediate: "${this.exerciseFiles.Intermediate}"
  - Advanced: "${this.exerciseFiles.Advanced}"

5. Unrealistic Goal Handling:
- Explain why the goal is unrealistic.
- Provide a 30-day plan plus progressive instructions.
- Example: "First follow the 30-day plan, then increase intensity."

6. Data Sources Priority:
- Use "user_details.json" for base user info.
- Image analysis data (BMI/body fat) should override manual entries.
- Exercise files by level:
  - Basic: ${this.exerciseFiles.Basic}
  - Intermediate: ${this.exerciseFiles.Intermediate}
  - Advanced: ${this.exerciseFiles.Advanced}

7. STRICT OUTPUT FORMAT (JSON ONLY):
{
  "description": "Plan purpose summary",
  "workout_plan": {
    "Day 1": [
      {
        "_id": "Exercise ID from files",
        "sets": "Dynamic set count",
        "reps": "Rep range/Time",
        "interval": "Rest time",
        "estimated_time": "Exercise duration",
        "estimated_calories": "Calorie estimate"
      }
    ]
    // Continue for subsequent days...
  },
  "instruction": "Repeat guidance when needed"
}

RULES:
- Convert all durations to days (e.g., 1 month = 30 days).
- Use only day-based keys (e.g., "Day X").
- Determine dynamic values based on user metrics.
- The response MUST be strictly valid JSON with NO extra text.
- Use image analysis values (BMI/body fat) from 'user_details.json' as priority.

Units:
- Weight in pounds (lbs)
- Height in centimeters (cm)

IMPORTANT: Your response MUST be valid JSON within a markdown code block:
\`\`\`json
{ ... }
\`\`\`
NO other text or formatting outside the code block!
    `;
  }

  formatResponse(response) {
    try {
      return JSON.parse(response);
    } catch (e) {
      return { error: 'Invalid response format', raw: response };
    }
  }
}

module.exports = WorkoutAssistant;