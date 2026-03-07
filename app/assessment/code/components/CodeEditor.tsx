"use client";

import React, { useEffect, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (code: string) => void;
  onPasteAttempt?: () => void;
}

export function CodeEditor({ value, language, onChange, onPasteAttempt }: CodeEditorProps) {
  const monaco = useMonaco();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("assessmentTheme", {
        base: "vs",
        inherit: true,
        rules: [],
        colors: {},
      });
    }
  }, [monaco]);

  const handleEditorDidMount = (editor: any) => {
    editor.updateOptions({ readOnly: false });

    // disable context menu
    editor.onContextMenu((e: any) => e.event.preventDefault());

    // intercept copy/paste shortcuts
    editor.onKeyDown((e: any) => {
      // use standard KeyboardEvent properties to avoid monaco null
      const isCopy = (e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "c";
      const isPaste = (e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "v";
      if (isCopy || isPaste) {
        e.preventDefault();
        if (isPaste && onPasteAttempt) {
          onPasteAttempt();
        }
      }
    });

    // also listen for native paste events
    if (containerRef.current) {
      containerRef.current.addEventListener("paste", (e) => {
        e.preventDefault();
        if (onPasteAttempt) onPasteAttempt();
      });
      containerRef.current.addEventListener("copy", (e) => e.preventDefault());
      containerRef.current.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  };

  return (
    <div ref={containerRef} className="border rounded">
      <Editor
        height="500px"
        language={language}
        value={value}
        theme="assessmentTheme"
        onChange={(val) => (val !== undefined ? onChange(val) : null)}
        options={{
          readOnly: false,
          fontSize: 14,
          minimap: { enabled: false },
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}
