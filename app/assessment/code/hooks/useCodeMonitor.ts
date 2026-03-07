import { useEffect, useRef, useState } from "react";

interface MonitorState {
  pasteCount: number;
  blurCount: number;
  fastTypingEvents: number;
  tabSwitchCount: number;
  devtoolsCount: number;
}

interface UseCodeMonitorReturn {
  state: MonitorState;
  cheatScore: number;
}

export function useCodeMonitor(): UseCodeMonitorReturn {
  const [state, setState] = useState<MonitorState>({
    pasteCount: 0,
    blurCount: 0,
    fastTypingEvents: 0,
    tabSwitchCount: 0,
    devtoolsCount: 0,
  });

  const keyTimes = useRef<number[]>([]);
  const sessionId = useRef<string>(Math.random().toString(36).substr(2));

  useEffect(() => {
    // detect paste
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setState((s) => ({ ...s, pasteCount: s.pasteCount + 1 }));
    };
    const onBlur = () => {
      setState((s) => ({ ...s, blurCount: s.blurCount + 1, tabSwitchCount: s.tabSwitchCount + 1 }));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setState((s) => ({ ...s, tabSwitchCount: s.tabSwitchCount + 1 }));
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // track typing speed
      const now = Date.now();
      keyTimes.current.push(now);
      // keep only last 20 entries
      if (keyTimes.current.length > 20) keyTimes.current.shift();
      const times = keyTimes.current;
      if (times.length >= 2) {
        const dt = times[times.length - 1] - times[0];
        const avg = dt / (times.length - 1);
        if (avg < 100) {
          setState((s) => ({ ...s, fastTypingEvents: s.fastTypingEvents + 1 }));
        }
      }

      // detect devtools shortcuts
      if (
        (e.key === "F12") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c")
      ) {
        setState((s) => ({ ...s, devtoolsCount: s.devtoolsCount + 1 }));
      }
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);

    // multi-tab lock
    const existing = localStorage.getItem("assessment_active");
    if (existing && existing !== sessionId.current) {
      // another tab already active
      setState((s) => ({ ...s, tabSwitchCount: s.tabSwitchCount + 1 }));
    }
    localStorage.setItem("assessment_active", sessionId.current);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "assessment_active" && e.newValue !== sessionId.current) {
        setState((s) => ({ ...s, tabSwitchCount: s.tabSwitchCount + 1 }));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("storage", onStorage);
      // clear the flag when leaving
      if (localStorage.getItem("assessment_active") === sessionId.current) {
        localStorage.removeItem("assessment_active");
      }
    };
  }, []);

  // cheat score weighting: each event adds a small penalty
  const { pasteCount, blurCount, fastTypingEvents, tabSwitchCount, devtoolsCount } = state;
  const cheatScore = pasteCount * 2 + blurCount * 1 + fastTypingEvents * 1 + tabSwitchCount * 2 + devtoolsCount * 3;

  return { state, cheatScore };
}
