const {openai} = require('../config/config');
const mongoose = require('mongoose');
const {User} = require('../models');
const {createThread} = require('./simpleQAAssistant');
const {addChatEntry} = require('../services/chatHistory.service');

const waitForRunToComplete = async (threadId, runId, maxAttempts = 30, delay = 500) => {
  let attempts = 0;
  let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
  while (
    runStatus.status !== 'completed' &&
    runStatus.status !== 'failed' &&
    runStatus.status !== 'cancelled' &&
    attempts < maxAttempts
  ) {
    await new Promise(resolve => setTimeout(resolve, delay));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    attempts++;
    delay = Math.min(delay * 1.5, 2000);
  }
  return runStatus;
};

const detectScheduleQuery = async query => {
  try {
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Query: ${query}
      
Is this query asking about an existing workout plan? Please respond with only "YES" or "NO".

Examples for YES (existing plan):
- "What exercises should I do on day 3?"
- "Can you explain the workout for tomorrow?"
- "What's my workout plan for tomorrow?"
- "What's my workout plan for tommorow?" 
- "Whats my wrokout plan for tommorow"
- "How do I perform the bench press in my plan?"
- "Whats my wrokout plan for next week?" -> YES
- "What's my workout plan for this month?" -> YES
- "Whats my wrokout plan for next month?" -> YES
- "so is my plan currently fat loss oriented ?" -> YES

Examples for NO (new plan):
- "Workout plan for seven days"
- "Create a new workout plan for me"
- "I want a workout plan for weight loss"`,
    });

    const classifierAssistantId = await createClassifierAssistant();

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: classifierAssistantId,
      instructions:
        "Determine if the query is about an existing workout plan. Look for time references like 'today', 'tomorrow', 'next', 'week', or 'month' (even if misspelled). Respond with ONLY 'YES' or 'NO'.",
    });

    const runStatus = await waitForRunToComplete(thread.id, run.id);
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id, {limit: 1, order: 'desc'});
      const content = messages.data[0].content.find(c => c.type === 'text')?.text?.value;
      // console.log(`[detectScheduleQuery] Classifier raw response: "${content}"`);
      try {
        await openai.beta.threads.del(thread.id);
      } catch (cleanupError) {
        console.log('Non-critical error cleaning up classification thread:', cleanupError);
      }
      return content
        ?.trim()
        .toUpperCase()
        .includes('YES');
    }
    return false;
  } catch (error) {
    console.error('Error in schedule query detection:', error);
    return false;
  }
};

const createClassifierAssistant = async () => {
  const assistant = await openai.beta.assistants.create({
    name: 'Query Classifier',
    instructions: `
      You are a classifier for workout queries.
      
      Your task is to determine whether a user query is asking about details of an existing workout plan (i.e. a schedule-related inquiry) or if it is asking for a new workout plan to be generated.
      
      Respond with ONLY "YES" if the query is about an existing workout plan. Respond with ONLY "NO" if the query is asking for a new workout plan.
      
      Classify as "YES" if the query includes any time-related references or indicators that it is asking about an existing plan. These include (but are not limited to):
      - The words "today", "tomorrow", "tommorow", or "now"
      - Any reference to "day" followed by a number (e.g., "day 3")
      - Phrases like "next week", "this week", "the coming week", "upcoming week"
      - Phrases like "this month", "next month", or any reference to "month"
      - References such as "day after tomorrow", "in 2 days", "in three days", or "in [number] days"
      - Any mention of a specific date or time period that implies referencing an already generated plan
      
      Classify as "NO" if the query explicitly requests to create, generate, or design a new workout plan, or if it is based on a new goal (e.g., "create a new workout plan", "workout plan for weight loss", "plan for seven days", etc.) without any time-reference indicating an existing schedule.
      
      Examples:
      - "What exercises should I do on day 3?" -> YES
      - "What's my workout plan for today?" -> YES
      - "What's my workout plan for tomorrow?" -> YES
      - "What's my workout plan for next week?" -> YES
      - "What's my workout plan for this week?" -> YES
      - "What's my workout plan for this month?" -> YES
      - "What's my workout plan for the day after tomorrow?" -> YES
      - "How do I perform the bench press in my plan?" -> YES
      - "Workout plan for seven days" -> NO
      - "Create a new workout plan for me" -> NO
      - "I want a workout plan for weight loss" -> NO
      
      Respond with only "YES" or "NO".
    `,
    model: 'gpt-4o-mini',
    temperature: 0.1,
  });
  return assistant.id;
};

const initializeScheduleQueryResourcesSimple = async vStoreId => {
  try {
    const assistant = await openai.beta.assistants.create({
      name: 'Workout Schedule Assistant (Simple)',
      instructions: `
        You are a workout schedule assistant. Your job is to answer schedule-related queries based on the provided current workout plan details.
        Do NOT generate a new workout plan—only reference the existing plan details.

        When answering, provide a clear, human-readable summary of the requested workout day(s). For each day, include the following details for each exercise:
        - Exercise Name
        - Description
        - Sets
        - Reps
        - Equipment
        - Interval
        - Estimated Time
        - Estimated Calories

        Format your answer with headers for each day (e.g., "Workout Plan for Day 1") and list each exercise as a bullet point showing all the details.
        
        Do not reveal any internal calculation details or meta-comments.
      `,
      model: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const thread = await createThread(vStoreId);
    return {assistant, thread};
  } catch (error) {
    console.error('Error initializing simple schedule query resources:', error);
    throw error;
  }
};

const computeTargetDays = (query, formattedPlan) => {
  const startDate = new Date(formattedPlan.startDate);
  const today = new Date();
  const diffMs = today - startDate;
  const currentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  if (/month/i.test(query)) {
    return {start: 1, end: 30};
  }
  if (/next week/i.test(query)) {
    return {start: currentDay + 7, end: currentDay + 13};
  }
  if (/this week/i.test(query)) {
    const weekDay = currentDay % 7;
    let start, end;
    if (weekDay === 0) {
      start = currentDay - 6;
      end = currentDay;
    } else {
      start = currentDay - weekDay + 1;
      end = start + 6;
    }
    return {start, end};
  }
  if (/day after tomorrow/i.test(query)) {
    return {start: currentDay + 2, end: currentDay + 2};
  }
  if (/tomorrow/i.test(query)) {
    return {start: currentDay + 1, end: currentDay + 1};
  }
  if (/today/i.test(query)) {
    return {start: currentDay, end: currentDay};
  }
  return null;
};

const filterWorkoutPlanByDayRange = (formattedPlan, range) => {
  if (!range) return formattedPlan;
  const filteredPlan = {...formattedPlan, workout_days: {}};
  for (let day = range.start; day <= range.end; day++) {
    const key = `Day ${day}`;
    if (formattedPlan.workout_days[key]) {
      filteredPlan.workout_days[key] = formattedPlan.workout_days[key];
    }
  }
  return filteredPlan;
};

const processExistingPlanQuery = async (req, res, userId, query, existingPlan, vStoreId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const {assistant, thread} = await initializeScheduleQueryResourcesSimple(vStoreId);

    const formattedPlan = formatWorkoutPlanForAssistant(existingPlan);
    const targetDays = computeTargetDays(query, formattedPlan);
    const planToSend = targetDays ? filterWorkoutPlanByDayRange(formattedPlan, targetDays) : formattedPlan;

    const enhancedQuery = `
    User Information:
    Name: ${user.name || 'N/A'}
    Weight: ${user.weight || 'N/A'}
    Height: ${user.height || 'N/A'}
    BMI: ${user.bmi || 'N/A'}
    Body Fat: ${user.bodyFat || 'N/A'}
    Gender: ${user.gender || 'N/A'}

    Workout Plan Start Date: ${formattedPlan.startDate}

    User Query: ${query}

    Target Workout Days: ${targetDays ? `Day ${targetDays.start} to Day ${targetDays.end}` : 'Not specified'}

    Current Workout Plan Details:
    ${JSON.stringify(planToSend, null, 2)}

    Please provide a clear and detailed summary for the requested day(s) in plain language. For each workout day, include:
    - The day header (e.g., "Workout Plan for Day 1")
    - For each exercise, list:
    - Exercise Name
    - Description
    - Sets
    - Reps
    - Equipment
    - Interval
    - Estimated Time
    - Estimated Calories

    Do not include any internal calculations or meta-comments in your answer.
    `;
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: enhancedQuery,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {assistant_id: assistant.id});
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    let delay = 500;
    while (
      runStatus.status !== 'completed' &&
      runStatus.status !== 'failed' &&
      runStatus.status !== 'cancelled' &&
      attempts < 60
    ) {
      await new Promise(resolve => setTimeout(resolve, delay));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      delay = Math.min(delay * 1.5, 2000);
    }
    if (runStatus.status !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(thread.id, {limit: 1, order: 'desc'});
    if (messages.data.length === 0) {
      throw new Error('No assistant messages found');
    }
    const content = messages.data[0].content.find(c => c.type === 'text')?.text?.value;
    if (!content) {
      throw new Error('No text content found in assistant response');
    }

    await addChatEntry(userId, query, {introduction: content, workout_plan: null});

    return res.status(200).json({response: {introduction: content, workout_plan: null}});
  } catch (error) {
    console.error('Error processing existing plan query:', error);
    return res.status(500).json({error: 'Failed to process query', details: error.message});
  }
};

const formatWorkoutPlanForAssistant = workoutPlan => {
  const formattedPlan = {
    description: workoutPlan.description,
    instruction: workoutPlan.instruction,
    workout_days: {},
  };

  formattedPlan.startDate = workoutPlan.startDate || workoutPlan.createdAt || 'Not provided';

  if (workoutPlan.workoutPlan && Array.isArray(workoutPlan.workoutPlan)) {
    workoutPlan.workoutPlan.forEach(dayData => {
      formattedPlan.workout_days[`Day ${dayData.day}`] = dayData.workout_list;
    });
  }
  return formattedPlan;
};

module.exports = {
  detectScheduleQuery,
  processExistingPlanQuery,
  initializeScheduleQueryResourcesSimple,
};
