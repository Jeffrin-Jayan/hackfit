import { useState, useEffect, useRef } from "react";

export type Phase = "reading" | "coding" | "ended";

interface UseCodingTimerReturn {
  phase: Phase;
  timeLeft: number; // in seconds
  editorLocked: boolean;
}

export function useCodingTimer(): UseCodingTimerReturn {
  const [phase, setPhase] = useState<Phase>("reading");
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // start timer on mount
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (phase === "reading") {
        setPhase("coding");
        setTimeLeft(15 * 60);
      } else if (phase === "coding") {
        setPhase("ended");
        setTimeLeft(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [timeLeft, phase]);

  const editorLocked = phase !== "coding";

  return { phase, timeLeft, editorLocked };
}
