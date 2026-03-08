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
  // pick a random task type
  const types = [
    "sumArray",
    "reverseString",
    "maxNumber",
    "countVowels",
    "twoSum",
  ];
  const type = types[Math.floor(Math.random() * types.length)];

  let question = "";
  let exampleInput = "";
  let exampleOutput = "";
  let constraints = "Time complexity O(n)",
    testCases = [];

  const makeNumberArray = () => {
    const len = 1 + Math.floor(Math.random() * 5);
    return Array.from({ length: len }, () => Math.floor(Math.random() * 10));
  };

  const norm = (v) => JSON.stringify(v);

  switch (type) {
    case "sumArray":
      question = "Given an array of numbers, return the sum.";
      exampleInput = "[1,2,3]";
      exampleOutput = "6";
      testCases = Array.from({ length: 3 }, () => {
        const arr = makeNumberArray();
        return { input: norm(arr), expected: String(arr.reduce((a, b) => a + b, 0)) };
      });
      break;
    case "reverseString":
      question = "Given a string, return it reversed.";
      exampleInput = "\"hello\"";
      exampleOutput = "\"olleh\"";
      testCases = ["hello", "abcd", ""].map((s) => ({ input: JSON.stringify(s), expected: JSON.stringify(s.split("").reverse().join("")) }));
      break;
    case "maxNumber":
      question = "Return the maximum number in an array.";
      exampleInput = "[1,5,3]";
      exampleOutput = "5";
      testCases = Array.from({ length: 3 }, () => {
        const arr = makeNumberArray();
        return { input: norm(arr), expected: String(Math.max(...arr)) };
      });
      break;
    case "countVowels":
      question = "Count the number of vowels in a string.";
      exampleInput = "\"hello\"";
      exampleOutput = "2";
      testCases = ["hello", "aeiou", "xyz"].map((s) => ({ input: JSON.stringify(s), expected: String((s.match(/[aeiou]/gi) || []).length) }));
      break;
    case "twoSum":
      question = "Given an array and target value, return two indices whose values add to target (JSON: {arr:[...],target:5}).";
      exampleInput = "{\"arr\":[1,2,3],\"target\":4}";
      exampleOutput = "[0,2]";
      testCases = Array.from({ length: 3 }, () => {
        const arr = makeNumberArray();
        const target = arr[Math.floor(Math.random() * arr.length)] + arr[Math.floor(Math.random() * arr.length)];
        // naive solution for expected
        let out = [];
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] + arr[j] === target) {
              out = [i, j];
              break;
            }
          }
          if (out.length) break;
        }
        return { input: JSON.stringify({ arr, target }), expected: norm(out) };
      });
      break;
    default:
      question = `Solve ${topic} problem #${id} (${difficulty}). Write a function that ...`;
      exampleInput = "[1,2,3]";
      exampleOutput = "[6]";
      testCases = [
        { input: "[1,2,3]", expected: "[6]" },
        { input: "[2,2]", expected: "[4]" },
        { input: "[]", expected: "[0]" },
      ];
  }

  return {
    question,
    exampleInput,
    exampleOutput,
    constraints,
    testCases,
  };
}

/**
 * Generate or retrieve a unique coding question based on difficulty/topic.
 * @param {{difficulty:string,topic:string}} options
 */
export async function getCodingQuestion({ difficulty = "easy", topic = "general" }) {
  // try to generate using AI if key exists
  let problem;
  // try to generate via AI if we have any LLM key configured
  if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      const prompt = `Generate a coding interview problem with difficulty ${difficulty} and topic ${topic}. Return JSON format with:
{
  question: string,
  exampleInput: string,
  exampleOutput: string,
  constraints: string,
  testCases: [
    { input: string, expected: string },
    { input: string, expected: string },
    { input: string, expected: string }
  ]
}

The problem must be solvable using stdin input and stdout output. Test cases must match the expected solution.`;
      const text = await generateText(prompt);
      const obj = JSON.parse(text);
      problem = {
        question: obj.question,
        exampleInput: obj.exampleInput,
        exampleOutput: obj.exampleOutput,
        constraints: obj.constraints,
        testCases: obj.testCases || [],
      };
    } catch (err) {
      console.error("AI generation failed, falling back to mock", err);
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
