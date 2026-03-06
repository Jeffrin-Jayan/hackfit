"use client"

import { useRef, useState, useCallback } from "react"
import Editor, { OnMount, OnChange } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Play, RotateCcw, Settings } from "lucide-react"

interface CodeEditorProps {
  defaultLanguage?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onRun?: (code: string, language: string) => void
  readOnly?: boolean
  height?: string
}

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
]

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Write your solution here
function solution(input) {
  // Your code here
  return input;
}

// Test your solution
console.log(solution("test"));
`,
  typescript: `// Write your solution here
function solution(input: string): string {
  // Your code here
  return input;
}

// Test your solution
console.log(solution("test"));
`,
  python: `# Write your solution here
def solution(input):
    # Your code here
    return input

# Test your solution
print(solution("test"))
`,
  java: `// Write your solution here
public class Solution {
    public static String solution(String input) {
        // Your code here
        return input;
    }
    
    public static void main(String[] args) {
        System.out.println(solution("test"));
    }
}
`,
  cpp: `// Write your solution here
#include <iostream>
#include <string>
using namespace std;

string solution(string input) {
    // Your code here
    return input;
}

int main() {
    cout << solution("test") << endl;
    return 0;
}
`,
  go: `// Write your solution here
package main

import "fmt"

func solution(input string) string {
    // Your code here
    return input
}

func main() {
    fmt.Println(solution("test"))
}
`,
}

export function CodeEditor({
  defaultLanguage = "javascript",
  defaultValue,
  onChange,
  onRun,
  readOnly = false,
  height = "400px",
}: CodeEditorProps) {
  const editorRef = useRef<any>(null)
  const [language, setLanguage] = useState(defaultLanguage)
  const [code, setCode] = useState(defaultValue || DEFAULT_CODE[defaultLanguage] || "")
  const [fontSize, setFontSize] = useState(14)

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
    editor.focus()
  }

  const handleChange: OnChange = (value) => {
    const newCode = value || ""
    setCode(newCode)
    onChange?.(newCode)
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    const newCode = DEFAULT_CODE[newLanguage] || ""
    setCode(newCode)
    onChange?.(newCode)
  }

  const handleReset = useCallback(() => {
    const resetCode = DEFAULT_CODE[language] || ""
    setCode(resetCode)
    onChange?.(resetCode)
    editorRef.current?.setValue(resetCode)
  }, [language, onChange])

  const handleRun = useCallback(() => {
    onRun?.(code, language)
  }, [code, language, onRun])

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <Select
              value={fontSize.toString()}
              onValueChange={(v) => setFontSize(parseInt(v))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[12, 14, 16, 18, 20].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={readOnly}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          {onRun && (
            <Button size="sm" onClick={handleRun}>
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <Editor
        height={height}
        language={language}
        value={code}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          smoothScrolling: true,
        }}
        loading={
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}

export default CodeEditor
