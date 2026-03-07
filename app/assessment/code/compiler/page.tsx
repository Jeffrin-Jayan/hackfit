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

interface QuestionPayload {
  question: string;
  exampleInput: string;
  exampleOutput: string;
  constraints: string;
}

export default function CompilerChallengePage() {

  const router = useRouter();
  const { phase, timeLeft } = useCodingTimer();
  const { cheatScore } = useCodeMonitor();

  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start coding here");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);


  // language templates
  useEffect(() => {

    const templates: Record<string, string> = {
      javascript: "// start coding in JavaScript",
      python: "# start coding in Python",
      cpp: "// start coding in C++",
      java: "// start coding in Java",
    };

    setCode(templates[language] || "");

  }, [language]);


  // fetch question
  useEffect(() => {

    async function fetchQuestion() {

      setQuestionLoading(true);
      setQuestionError(null);

      try {

        const resp = await fetch("/api/question?difficulty=easy&topic=general");

        if (!resp.ok) {
          throw new Error("Failed to fetch question");
        }

        const data = await resp.json();

        setQuestion(data);

      } catch (err: any) {

        console.error("Question fetch error:", err);
        setQuestionError(err.message || "Unable to load question");

      } finally {

        setQuestionLoading(false);

      }

    }

    fetchQuestion();

  }, []);


  // disable copy paste
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


  const handleSubmit = useCallback(async () => {

    if (submitting) return;

    if (!code || code.trim() === "") {
      setSubmitError("Please write code before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {

      const resp = await fetch("http://localhost:8000/compile", {

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

        throw new Error("Compiler returned invalid response");

      }


      if (!resp.ok) {

        console.error("Compiler API error:", result);

        throw new Error(
          result?.error || result?.message || "Compilation failed"
        );

      }


      const resultObj = {

        submittedCode: code,
        compileResult: result,
        cheatScore,
        timeUsed: 15 * 60 - timeLeft,
        language,

      };


      if (typeof window !== "undefined") {

        sessionStorage.setItem(
          "codeResult",
          JSON.stringify(resultObj)
        );

      }


      router.push("/assessment/code/results");


    } catch (err: any) {

      console.error("Submission error:", err);

      setSubmitError(
        err.message || "Compilation failed"
      );

    } finally {

      setSubmitting(false);

    }

  }, [code, language, cheatScore, timeLeft, router, submitting]);


  // auto submit when timer ends
  useEffect(() => {

    if (phase === "ended") {

      handleSubmit();

    }

  }, [phase, handleSubmit]);


  const onPasteAttempt = () => {

    console.warn("Paste attempt detected");

  };


  return (

    <div className="min-h-screen bg-background p-4">

      <div className="max-w-4xl mx-auto space-y-4">

        <div className="flex justify-between items-center">

          <h1 className="text-2xl font-bold">
            Coding Assessment
          </h1>

          <Timer timeLeft={timeLeft} phase={phase} />

        </div>


        {cheatScore > 5 && (

          <Alert variant="destructive">

            <AlertDescription>

              AI assistance detected. This assessment may be invalid.

            </AlertDescription>

          </Alert>

        )}


        {questionLoading ? (

          <p>Loading question…</p>

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

          <label className="font-medium">
            Language:
          </label>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border rounded px-2 py-1"
          >

            <option value="javascript">
              JavaScript
            </option>

            <option value="python">
              Python
            </option>

            <option value="cpp">
              C++
            </option>

            <option value="java">
              Java
            </option>

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
        />


        <div className="flex justify-end">

          <Button
            onClick={handleSubmit}
            disabled={submitting || !!questionError}
          >

            {submitting
              ? "Submitting..."
              : "Submit"}

          </Button>

        </div>


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