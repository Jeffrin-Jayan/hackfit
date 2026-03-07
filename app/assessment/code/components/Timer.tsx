import React from "react";

interface TimerProps {
  timeLeft: number;
  phase: "reading" | "coding" | "ended";
}

export function Timer({ timeLeft, phase }: TimerProps) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <div className="text-center p-2">
      <div className="text-sm text-muted-foreground">{phase === "reading" ? "Reading" : phase === "coding" ? "Coding" : "Finished"} phase</div>
      <div className="text-2xl font-mono">
        {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
      </div>
    </div>
  );
}
