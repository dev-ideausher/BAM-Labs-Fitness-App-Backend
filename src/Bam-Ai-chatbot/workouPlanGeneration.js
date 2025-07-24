const {openai} = require('../config/config');

async function generateWorkoutPlan(query, exerciseList) {
  try {
    // Format exercises into a summary string
    const workoutSummary = exerciseList
      .map(exercise => {
        return `_id: ${exercise._id}, Exercise name: ${exercise.Exercise},  Description: ${exercise.Description}, Equipments: ${exercise.Equipment}`;
      })
      .join('\n');

    const systemPrompt = `
        Create a personalized workout plan for the user based on the following exercises:
        ${workoutSummary}

        Given the user query use this as context, acknowledge the query and choose exercises accordingly 
        Here is the query :- ${query}

        Instructions:
        - Generate a workout plan for **all days** (no rest days).
        - Each day should have **4-5 exercises**. Choose the exercises that fit the user's goals and query.
        - Provide **recommended weight along with unit** for each exercise that requires weights.
        - Specify the **recommended number of sets and reps** for each exercise, adjusting based on the user's fitness level.
        - Tailor exercise selection based on the user's goals, fitness level, and available equipment.
        - The workout duration should match the user’s exercise session duration, **automatically determined by the AI**.
        - Ensure that the weight, sets, and reps are always included, even if their values are null.

        Provide the response in the following strict JSON format, grouped by days with exercises as values:

        {
          "description": <one-line purpose of the workout plan>,
          "workoutPlan": {
            "Day 1": [
              {
                "_id": "<exercise_id>",
                "name": "<exercise_name>",
                "equipment": "<equipment>",
                "weight": "<recommended_weight_and_unit>",
                "sets": <sets>,
                "reps": "<reps>",
                "calorieBurned": <number>,
                "duration": <time_and_unit>
              },
              {
                "_id": "<exercise_id>",
                "name": "<exercise_name>",
                "equipment": "<equipment>",
                "weight": "<recommended_weight_and_unit>",
                "sets": <sets>,
                "reps": "<reps>",
                "calorieBurned": <number>,
                "duration": <time_and_unit>
              }
            ],
            "Day 2": [
              // More exercises for Day 2...
            ],
            // Repeat for all days (1 to 30)
            "Day 30": [
              // Exercises for Day 30...
            ]
          }
        }

        - **Do not include any additional fields** in the JSON other than the ones mentioned above.
      `;

    let data;
    try {
      const startTime = Date.now();

      // Request completion from OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{role: 'system', content: systemPrompt}],
        max_completion_tokens: 32768,
        temperature: 0.3,
      });

      const endTime = Date.now();
      const timeTakenMs = endTime - startTime;
      console.log(`AI response time: ${timeTakenMs} ms`);
      const responseText = response.choices[0].message.content;

      //   console.log('Raw AI Response:', responseText);

      // Extract the JSON part of the response
      const jsonMatch = responseText.match(/\{.*\}/s); // Using 's' flag to handle multiline JSON
      if (!jsonMatch) {
        throw new Error('No valid JSON found in the response.');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      data = {
        ...parsedResponse,
      };

      // Return the structured workout plan
      return {
        description: data.description,
        plan: data.workoutPlan,
      };
    } catch (error) {
      console.error('Error processing AI response:', error.message);
      throw new Error('Failed to extract or parse JSON from the AI response.');
    }
  } catch (error) {
    throw new Error(`Failed to generate workout plan : ${error.message}`);
  }
}

module.exports = {generateWorkoutPlan};
