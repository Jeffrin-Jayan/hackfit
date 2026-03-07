// questionService.js
// Simple in-memory question generator. In production this could use a database
// or call to an AI model (Gemini / OpenAI). We try to avoid repeats by keeping
// a cache of previously asked questions in the same process.

import { generateText } from "./gemini_service.js"; // placeholder import

// store questions in memory; each entry is { difficulty, topic, question, exampleInput, exampleOutput, constraints }
const askedQuestions = [];

// create a simple randomizer for mock data when AI isn't available
function _mockProblem(difficulty, topic) {
  const id = askedQuestions.length + 1;
  return {
    question: `Solve ${topic} problem #${id} (${difficulty}). Write a function that ...`,
    exampleInput: "[1,2,3]",
    exampleOutput: "[6]",
    constraints: "Time complexity O(n), use only built‑in data structures",
  };
}

/**
 * Generate or retrieve a unique coding question based on difficulty/topic.
 * @param {{difficulty:string,topic:string}} options
 */
export async function getCodingQuestion({ difficulty = "easy", topic = "general" }) {
  // try to generate using AI if key exists
  let problem;
  if (process.env.GEMINI_API_KEY) {
    try {
      // craft simple prompt for the AI model
      const prompt = `Generate a ${difficulty} coding interview question about ${topic}. Reply with a JSON object containing keys: question, exampleInput, exampleOutput, constraints.`;
      const text = await generateText(prompt);
      const obj = JSON.parse(text);
      problem = {
        question: obj.question,
        exampleInput: obj.exampleInput,
        exampleOutput: obj.exampleOutput,
        constraints: obj.constraints,
      };
    } catch (err) {
      console.error("Failed to generate question via AI, falling back to mock", err);
      problem = _mockProblem(difficulty, topic);
    }
  } else {
    problem = _mockProblem(difficulty, topic);
  }

  // ensure uniqueness; if duplicate, generate again (rudimentary)
  const exists = askedQuestions.find((q) => q.question === problem.question);
  if (exists) {
    // simply append a counter to make it unique
    problem.question += ` (variant ${askedQuestions.length + 1})`;
  }

  askedQuestions.push({ difficulty, topic, ...problem });
  return problem;
}
