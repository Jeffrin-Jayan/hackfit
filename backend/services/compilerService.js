// compilerService.js
// Contacts the Judge0 API (or other code execution service) to run source code.
// For simplicity we keep a small mapping of languages to Judge0 language IDs.

import fetch from "node-fetch";

// language -> judge0 id mapping
const LANGUAGE_MAP = {
  javascript: 63, // nodejs 14
  python: 71,     // python3
  cpp: 54,        // cpp17
  java: 62,       // java-openjdk17
};

const JUDGE0_URL = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || "";

/**
 * Execute code using Judge0.
 * @param {string} language
 * @param {string} source_code
 */
export async function compileCode(language, source_code) {
  const langId = LANGUAGE_MAP[language.toLowerCase()];
  if (!langId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // create submission
  const submissionResp = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(JUDGE0_KEY && { "X-RapidAPI-Key": JUDGE0_KEY }),
      ...(JUDGE0_KEY && { "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com" }),
    },
    body: JSON.stringify({
      source_code,
      language_id: langId,
      stdin: "",
    }),
  });

  if (!submissionResp.ok) {
    const errText = await submissionResp.text();
    throw new Error(`Judge0 submission failed: ${errText}`);
  }

  const data = await submissionResp.json();
  // returned object contains stdout, stderr, compile_output, etc.
  return {
    stdout: data.stdout,
    stderr: data.stderr,
    compile_output: data.compile_output,
    status: data.status,
  };
}
