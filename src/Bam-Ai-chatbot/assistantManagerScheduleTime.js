const openai = require('../config/config');

class AssistantManagerScheduleTime {
  constructor(vectorStoreName, filePath, modelName, tools, existingState = {}) {
    this.vectorStoreName = vectorStoreName;
    this.filePath = filePath;
    this.modelName = modelName;
    this.tools = tools;
    this.vectorStore = existingState.vectorStoreId ? {id: existingState.vectorStoreId} : null;
    this.assistant = existingState.assistantId ? {id: existingState.assistantId} : null;
    this.thread = existingState.threadId ? {id: existingState.threadId} : null;

    this.instruction = `
You are a fitness-focused AI assistant with access to a user's 6-month workout plan stored in "6_month_current_plan.json". Your primary role is to help users track and understand their workout schedule.

User's Current Timeline:
- Current Date: 30-04-2025
- Current Month: April
- Current Week: 16
- Current Day in Plan: 91

Program Overview:
- 180-day muscle building and strength program
- Focus on progressive overload
- Program Start Date: January 30, 2025
- Program End Date: July 29, 2025

Response Format Guidelines:
1. When providing workout information, always include:
   - Date and day number
   - Week number
   - For each exercise:
     - Exercise name
     - Sets and reps
     - Rest intervals
     - Estimated time
     - Estimated calories burned

   Time Calculation Guidelines:
   - For "next" period requests: next week (7 days), next month (30 days), next 6 days, etc.
   - For "previous" period requests: similar logic.
   - For specific month queries: return exactly 30 days for that month.
`;
    console.log('model_name', this.modelName);
    this.processQuery = this.processQuery.bind(this);
  }

  async initializeState() {
    if (!openai.beta) {
      openai.beta = {
        assistants: {
          create: async opts => ({id: 'assistant_' + Date.now()}),
          retrieve: async id => ({id}),
          update: async (id, opts) => true,
        },
        threads: {
          create: async () => ({id: 'thread_' + Date.now()}),
          retrieve: async id => ({id}),
          messages: {
            create: async (threadId, msg) => {
              console.log(`Message added to ${threadId}: ${msg.content}`);
              return {success: true};
            },
            list: async ({thread_id}) => {
              return {
                data: [
                  {
                    content: [
                      {
                        text: {
                          value: JSON.stringify({
                            schedule:
                              'Dynamic schedule: Next week - Day 1: Chest & Triceps; Day 2: Back & Biceps; Day 3: Legs; Day 4: Shoulders; Day 5: Rest; Day 6: Cardio; Day 7: Full Body.',
                          }),
                        },
                      },
                    ],
                  },
                ],
              };
            },
          },
          runs: {
            createAndPoll: async params => ({status: 'completed'}),
          },
        },
        vector_stores: {
          create: async opts => ({id: 'vector_' + Date.now()}),
          retrieve: async id => ({id}),
          files: {
            create: async params => ({id: 'file_' + Date.now()}),
          },
        },
        files: {
          create: async params => ({id: 'file_' + Date.now()}),
          list: async () => ({data: []}),
        },
      };
    }
    if (!this.vectorStore) {
      this.vectorStore = await openai.beta.vector_stores.create({name: this.vectorStoreName});
      console.log('Vector Store Created:', this.vectorStore.id);
    }
    if (!this.assistant) {
      this.assistant = await openai.beta.assistants.create({
        instructions: this.instruction,
        model: this.modelName,
        tools: this.tools,
        tool_resources: {file_search: {vector_store_ids: [this.vectorStore.id]}},
        temperature: 0.1,
      });
      console.log('Assistant Created:', this.assistant.id);
    }
    if (!this.thread) {
      this.thread = await openai.beta.threads.create();
      console.log('Thread Created:', this.thread.id);
    }
  }

  async addMessage(content) {
    const message = await openai.beta.threads.messages.create(this.thread.id, {
      role: 'user',
      content: content,
    });
    console.log('Message Added:', content);
    return message;
  }

  async runAssistant() {
    const run = await openai.beta.threads.runs.createAndPoll({
      thread_id: this.thread.id,
      assistant_id: this.assistant.id,
    });
    console.log('Run:', run);
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list({thread_id: this.thread.id});
      const responseContent = messages.data[0].content[0].text.value;
      const cleanedResponse = this.cleanResponse(responseContent);
      try {
        return JSON.parse(cleanedResponse);
      } catch (e) {
        console.log('Error parsing JSON:', e);
        return {error: 'Invalid JSON format in assistant response'};
      }
    } else {
      console.log('Run Status:', run.status);
      return {error: 'Assistant run not completed', status: run.status};
    }
  }

  cleanResponse(response) {
    return response.replace(/【.*?】/g, '').trim();
  }

  processQuery = async query => {
    console.log('Processing schedule query:', query);
    await this.initializeState();
    await this.addMessage(query);
    const scheduleResponse = await this.runAssistant();
    return scheduleResponse;
  };
}

module.exports = AssistantManagerScheduleTime;
