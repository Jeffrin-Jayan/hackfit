import React from "react";

interface QuestionProps {
  question: string;
  exampleInput: string;
  exampleOutput: string;
  constraints: string;
  difficulty?: string;
  topic?: string;
}

export function QuestionBox({ question, exampleInput, exampleOutput, constraints, difficulty, topic }: QuestionProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-2">Question</h2>
      {difficulty && <p className="text-sm text-muted-foreground">Difficulty: {difficulty}</p>}
      {topic && <p className="text-sm text-muted-foreground">Topic: {topic}</p>}
      <p className="whitespace-pre-line mt-2">{question}</p>
      <div className="mt-4 space-y-1 text-sm">
        <div>
          <strong>Input Example:</strong> <code>{exampleInput}</code>
        </div>
        <div>
          <strong>Output Example:</strong> <code>{exampleOutput}</code>
        </div>
        <div>
          <strong>Constraints:</strong> <code>{constraints}</code>
        </div>
      </div>
    </div>
  );
}
