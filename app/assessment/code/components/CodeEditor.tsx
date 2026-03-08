"use client";

import React, { useEffect, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (code: string) => void;
  locked?: boolean;
  onPasteAttempt?: () => void;
}

export function CodeEditor({
  value,
  language,
  onChange,
  locked = false,
  onPasteAttempt,
}: CodeEditorProps) {

  const monaco = useMonaco();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!monaco) return;

    monaco.editor.defineTheme("assessmentTheme", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {},
    });
  }, [monaco]);

  useEffect(() => {
    // whenever the locked prop changes, update the editor if we have it
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: locked });
    }
  }, [locked]);

  useEffect(() => {
    // cleanup monaco disposables on unmount
    return () => {
      if (editorRef.current?._disposables) {
        editorRef.current._disposables.forEach((d: any) => d && d.dispose && d.dispose());
      }
    };
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.updateOptions({ readOnly: locked });

    // disable right click menu
    const cmDisposable = editor.onContextMenu((e: any) => {
      e.event.preventDefault();
    });

    // safe key detection for monaco
    const kdDisposable = editor.onKeyDown((e: any) => {
      const keyCode = e.keyCode;
      const isCtrl = e.ctrlKey || e.metaKey;

      // Monaco key codes
      const KEY_C = 33;
      const KEY_V = 52;

      const isCopy = isCtrl && keyCode === KEY_C;
      const isPaste = isCtrl && keyCode === KEY_V;

      if (isCopy || isPaste) {
        e.preventDefault();
        if (isPaste && onPasteAttempt) {
          onPasteAttempt();
        }
      }
    });

    // store disposables for cleanup
    editorRef.current._disposables = [cmDisposable, kdDisposable];
  };

  // attach DOM listeners separately so we can clean them up on unmount
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const pasteHandler = (e: ClipboardEvent) => {
      e.preventDefault();
      if (onPasteAttempt) onPasteAttempt();
    };
    const copyHandler = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    const menuHandler = (e: MouseEvent) => {
      e.preventDefault();
    };
    el.addEventListener("paste", pasteHandler);
    el.addEventListener("copy", copyHandler);
    el.addEventListener("contextmenu", menuHandler);
    return () => {
      el.removeEventListener("paste", pasteHandler);
      el.removeEventListener("copy", copyHandler);
      el.removeEventListener("contextmenu", menuHandler);
    };
  }, [onPasteAttempt]);

  return (

    <div ref={containerRef} className="border rounded">

      <Editor
        height="500px"
        language={language}
        value={value}
        theme="assessmentTheme"
        onChange={(val) => {
          if (val !== undefined) {
            onChange(val);
          }
        }}
        options={{
          readOnly: locked,
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