const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const {WorkoutState} = require('../models/WorkoutState.model');
const WorkoutAssistant = require('../Bam-Ai-chatbot/simpleQAAssistant');
const AssistantManagerAnalysis = require('../Bam-Ai-chatbot/assistantManagerAnalysis');
// const AssistantManagerScheduleTime = require('../Bam-Ai-chatbot/AssistantManagerScheduleTime');

function getQueryCase(query) {
  if (/analyz|histor|perform/i.test(query)) {
    return 1;
  } else if (
    /schedule|next week|previous week|next month|previous month|today|upcoming|previous\s+\d+\s+days/i.test(query)
  ) {
    return 2;
  }
  return 3;
}

const processWorkoutQuery = catchAsync(async (req, res, next) => {
  try {
    const query = req.body.query;
    const userId = req.user.id;

    let userState = await WorkoutState.findOne({user: userId});
    if (!userState) {
      userState = new WorkoutState({user: userId});
    }

    const state = {
      assistantId: userState.assistantId,
      threadId: userState.threadId,
      vectorStoreId: userState.vectorStoreId,
    };

    let response;
    const queryCase = getQueryCase(query);
    console.log('Query classified as Case', queryCase);
    if (queryCase === 1) {
      const vectorStoreName = 'analysis_vector_store';
      const modelName = 'gpt-4o-mini';
      const tools = [{type: 'file_search'}];
      const analysisManager = new AssistantManagerAnalysis(vectorStoreName, modelName, tools, state);
      response = await analysisManager.processQuery(query);

      userState.assistantId = analysisManager.assistant?.id || userState.assistantId;
      userState.threadId = analysisManager.thread?.id || userState.threadId;
      userState.vectorStoreId = analysisManager.vectorStore?.id || userState.vectorStoreId;
    } else if (queryCase === 2) {
      const vectorStoreName = 'six_month_workout_data';
      const modelName = 'gpt-4o-mini';
      const tools = [{type: 'file_search'}];

      const scheduleManager = new AssistantManagerScheduleTime(vectorStoreName, null, modelName, tools, state);
      response = await scheduleManager.processQuery(query);
      userState.assistantId = scheduleManager.assistant?.id || userState.assistantId;
      userState.threadId = scheduleManager.thread?.id || userState.threadId;
      userState.vectorStoreId = scheduleManager.vectorStore?.id || userState.vectorStoreId;
    } else {
      const workoutAssistant = new WorkoutAssistant(userId, state);
      response = await workoutAssistant.processQuery(query);
      userState.assistantId = workoutAssistant.state?.assistantId || userState.assistantId;
      userState.threadId = workoutAssistant.state?.threadId || userState.threadId;
      userState.vectorStoreId = workoutAssistant.state?.vectorStoreId || userState.vectorStoreId;
    }

    await userState.save();

    return res.status(200).json({
      status: true,
      data: response,
      message: 'Query processed successfully',
    });
  } catch (error) {
    console.error('AI Processing Error:', error);
    next(new ApiError(`AI Processing Failed: ${error.message}`, 500));
  }
});

module.exports = {processWorkoutQuery};
