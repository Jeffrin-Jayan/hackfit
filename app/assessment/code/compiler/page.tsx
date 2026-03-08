"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QuestionBox } from "../components/QuestionBox";
import { CodeEditor } from "../components/CodeEditor";
import { Timer } from "../components/Timer";
import { useCodingTimer } from "../hooks/useCodingTimer";
import { useCodeMonitor } from "../hooks/useCodeMonitor";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TestCase {
  input: string;
  expected: string;
}

// result object returned after running a test case
interface TestResult extends TestCase {
  output: string;
  passed: boolean;
}

interface QuestionPayload {
  question: string;
  exampleInput: string;
  exampleOutput: string;
  constraints: string;
  testCases?: TestCase[];
}

export default function CompilerChallengePage() {

  const router = useRouter();

  const { phase, timeLeft, editorLocked } = useCodingTimer();
  const { state: monitorState, cheatScore } = useCodeMonitor();

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start coding here");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [allPassed, setAllPassed] = useState(false);

  const [frozen, setFrozen] = useState(false);
  const [freezeMessage, setFreezeMessage] = useState<string | null>(null);
  const [pasteWarning, setPasteWarning] = useState<string | null>(null);

  // GLOBAL ERROR LOGGER (Fix for [object Object])
  useEffect(() => {

    const handlePromiseError = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
          ? reason.message
          : JSON.stringify(reason);
      console.error("Unhandled promise rejection:", msg);
    };

    const handleRuntimeError = (event: ErrorEvent) => {
      const err = event.error || event.message;
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : JSON.stringify(err);
      console.error("Runtime error:", msg);
    };

    window.addEventListener("unhandledrejection", handlePromiseError);
    window.addEventListener("error", handleRuntimeError);

    return () => {
      window.removeEventListener("unhandledrejection", handlePromiseError);
      window.removeEventListener("error", handleRuntimeError);
    };

  }, []);

  // LANGUAGE TEMPLATE
  useEffect(() => {

    const templates: Record<string, string> = {
      javascript: "// start coding in JavaScript",
      python: "# start coding in Python",
      cpp: "// start coding in C++",
      java: "// start coding in Java",
    };

    setCode(templates[language] || "");

  }, [language]);

  // FETCH QUESTION
  useEffect(() => {

    async function fetchQuestion() {

      setQuestionLoading(true);
      setQuestionError(null);

      try {

        const resp = await fetch(`${BACKEND_URL}/api/v1/question`);

        let data: any = null;

        try {
          data = await resp.json();
        } catch {
          throw new Error("Invalid JSON from question API");
        }

        if (!resp.ok) {
          throw new Error(
            data?.error || data?.message || "Failed to fetch question"
          );
        }

        setQuestion(data);

      } catch (err: any) {

        console.error("Question fetch error:", err);

        setQuestionError(
          err?.message || "Unable to load question"
        );

      } finally {

        setQuestionLoading(false);

      }

    }

    fetchQuestion();

  }, [BACKEND_URL]);

  // DISABLE COPY / PASTE globally, show warning via onPasteAttempt
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("contextmenu", prevent);

    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("contextmenu", prevent);
    };
  }, []);

  // FREEZE EDITOR ON suspicious events
  useEffect(() => {
    if (
      monitorState.tabSwitchCount > 0 ||
      monitorState.devtoolsCount > 0 ||
      cheatScore > 5
    ) {
      setFrozen(true);
    }
  }, [monitorState, cheatScore]);

  // show a warning when a paste attempt is captured by monitor
  useEffect(() => {
    if (monitorState.pasteCount > 0) {
      setPasteWarning("Copy/paste is not allowed during the assessment.");
    }
  }, [monitorState.pasteCount]);

  // clear paste warning after a few seconds
  useEffect(() => {
    if (pasteWarning) {
      const id = setTimeout(() => setPasteWarning(null), 3000);
      return () => clearTimeout(id);
    }
  }, [pasteWarning]);

  // compute freeze message when editor becomes frozen
  useEffect(() => {
    if (frozen) {
      let msg = "The editor is now frozen.";
      if (monitorState.tabSwitchCount > 0) {
        msg = "You attempted to switch tabs. The editor is now frozen.";
      } else if (monitorState.devtoolsCount > 0) {
        msg = "Devtools opened — the editor is now frozen.";
      } else if (cheatScore > 5) {
        msg = "Suspicious behavior detected. The editor is now frozen.";
      }
      setFreezeMessage(msg);
    }
  }, [frozen, monitorState, cheatScore]);

  // SUBMIT CODE
  const handleSubmit = useCallback(async () => {

    if (frozen) {
      setSubmitError("Cheating detected. Submission blocked.");
      return;
    }

    if (submitting) return;

    if (!code.trim()) {
      setSubmitError("Please write code before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          source_code: code,
        }),
      });

      let result: any = null;
      try {
        result = await resp.json();
      } catch {
        throw new Error("Compiler returned invalid JSON");
      }

      if (!resp.ok) {
        console.error("Compiler API error:", result);
        const errText = result?.error || result?.message || JSON.stringify(result);
        throw new Error(String(errText));
      }

      const resultObj = {
        submittedCode: code,
        compileResult: result,
        cheatScore,
        timeUsed: 15 * 60 - timeLeft,
        language,
      };

      sessionStorage.setItem("codeResult", JSON.stringify(resultObj));
      router.push("/assessment/code/results");
    } catch (err: any) {
      console.error("Submission error:", err);
      setSubmitError(err?.message || String(err) || "Compilation failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    code,
    language,
    cheatScore,
    timeLeft,
    router,
    submitting,
    frozen,
    BACKEND_URL,
  ]);

  // AUTO SUBMIT
  useEffect(() => {

    if (phase === "ended" && !submitting) {
      handleSubmit();
    }

  }, [phase, submitting, handleSubmit]);

  // RUN TEST CASES
  const normalizeOutput = (s: string) => {
    if (s == null) return "";
    let str = String(s).trim();
    // strip whitespace/newlines
    str = str.replace(/\s+/g, "");
    // remove surrounding quotes if present
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }
    // try to convert arrays to canonical form
    try {
      const v = JSON.parse(str);
      if (Array.isArray(v)) {
        return JSON.stringify(v);
      }
    } catch {}
    return str;
  };

  const runTests = useCallback(async () => {
    console.log("Test button clicked");
    if (!question?.testCases) {
      console.log("no test cases available");
      return;
    }

    const results: TestResult[] = [];

    for (const tc of question.testCases) {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/v1/compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            source_code: code,
            stdin: tc.input,
          }),
        });

        let json: any = null;
        try {
          json = await resp.json();
        } catch {
          throw new Error("Compiler returned invalid JSON");
        }

        console.log("compile response", json);

        if (!resp.ok) {
          const errText = json?.error || json?.message || JSON.stringify(json);
          throw new Error(String(errText));
        }

        const output = (json?.stdout || "").trim();
        const normOut = normalizeOutput(output);
        const normExp = normalizeOutput(tc.expected);
        console.log("tc", tc, "output", output, "normOut", normOut, "normExp", normExp);
        const passed = normOut === normExp;

        results.push({ ...tc, output, passed });
      } catch (err: any) {
        console.error("Test case error:", err);
        results.push({ ...tc, output: "", passed: false });
      }
    }

    console.log("storing results", results);
    setTestResults(results);
    setAllPassed(results.every((r) => r.passed));
  }, [question, language, code, BACKEND_URL]);

  const onPasteAttempt = () => {
    console.warn("Paste attempt detected");
    // notify monitor hook
    window.dispatchEvent(new Event("assessment-paste-attempt"));
    setPasteWarning("Copy/paste is not allowed during the assessment.");
  };

  return (

    <div className="min-h-screen bg-background p-4">

      <div className="max-w-4xl mx-auto space-y-4">

        <div className="flex justify-between items-center">

          <h1 className="text-2xl font-bold">
            Coding Assessment
          </h1>

          <Timer
            timeLeft={timeLeft}
            phase={phase}
          />

        </div>

        {cheatScore > 5 && (
          <Alert variant="destructive">
            <AlertDescription>
              AI assistance or suspicious behavior detected.
            </AlertDescription>
          </Alert>
        )}
        {pasteWarning && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              {pasteWarning}
            </AlertDescription>
          </Alert>
        )}
        {freezeMessage && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              {freezeMessage}
            </AlertDescription>
          </Alert>
        )}
        {/* show a note during reading phase */}
        {editorLocked && !frozen && phase === "reading" && (
          <Alert variant="default" className="mt-2">
            <AlertDescription>
              The editor is locked during the reading phase. It will unlock when coding begins.
            </AlertDescription>
          </Alert>
        )}

        {questionLoading ? (
          <p>Loading question...</p>
        ) : questionError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {questionError}
            </AlertDescription>
          </Alert>
        ) : question ? (
          <QuestionBox
            question={question.question}
            exampleInput={question.exampleInput}
            exampleOutput={question.exampleOutput}
            constraints={question.constraints}
          />
        ) : null}

        <div className="flex items-center gap-4">

          <label>Language:</label>

          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value)
            }
            className="border rounded px-2 py-1"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          <Badge>
            {phase === "reading"
              ? "Reading"
              : phase === "coding"
              ? "Coding"
              : "Ended"}
          </Badge>

        </div>

        <CodeEditor
          value={code}
          language={language}
          onChange={setCode}
          onPasteAttempt={onPasteAttempt}
          locked={frozen || editorLocked}
        />

        <div className="flex justify-end gap-2">

          <Button
            variant="outline"
            onClick={runTests}
            disabled={submitting || frozen}
          >
            Test
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !allPassed ||
              frozen ||
              phase !== "coding"
            }
          >
            {submitting
              ? "Submitting..."
              : "Submit"}
          </Button>

        </div>

        {testResults.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold">
              Test Results
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Input</th>
                    <th className="border px-2 py-1">
                      Expected
                    </th>
                    <th className="border px-2 py-1">
                      Output
                    </th>
                    <th className="border px-2 py-1">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">
                        {r.input}
                      </td>
                      <td className="border px-2 py-1">
                        {r.expected}
                      </td>
                      <td className="border px-2 py-1">
                        {r.output}
                      </td>
                      <td className="border px-2 py-1">
                        {r.passed ? (
                          <span className="text-green-600">
                            Pass
                          </span>
                        ) : (
                          <span className="text-red-600">
                            Fail
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>
              {submitError}
            </AlertDescription>
          </Alert>
        )}

      </div>

    </div>
  );

}