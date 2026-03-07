"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useAuth, usePhaseAccess } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Code,
  Clock,
  ArrowLeft,
  ArrowRight,
  Mic,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  Play,
  Terminal,
} from "lucide-react"

// Dynamically import Monaco Editor to avoid SSR issues
const CodeEditor = dynamic(() => import("@/components/code/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

// Code challenges
const CODE_CHALLENGES = [
  {
    id: "challenge-1",
    title: "Array Manipulation",
    difficulty: "Medium",
    description: `Given an array of integers, write a function that returns a new array where each element is the product of all elements except the current one.

**Example:**
- Input: [1, 2, 3, 4]
- Output: [24, 12, 8, 6]

**Constraints:**
- Do not use division
- Time complexity should be O(n)
- Space complexity should be O(n) for the output array`,
    testCases: [
      { input: "[1, 2, 3, 4]", expected: "[24, 12, 8, 6]" },
      { input: "[2, 3]", expected: "[3, 2]" },
      { input: "[1, 1, 1]", expected: "[1, 1, 1]" },
    ],
    hints: [
      "Think about prefix and suffix products",
      "You can solve this in two passes",
    ],
  },
  {
    id: "challenge-2",
    title: "String Pattern Matching",
    difficulty: "Medium",
    description: `Write a function that checks if a string follows a given pattern.

**Example:**
- Pattern: "abba"
- String: "dog cat cat dog"
- Output: true (a->dog, b->cat)

**Constraints:**
- Each character in the pattern maps to exactly one word
- Each word maps to exactly one character`,
    testCases: [
      { input: '"abba", "dog cat cat dog"', expected: "true" },
      { input: '"abba", "dog cat cat fish"', expected: "false" },
      { input: '"aaaa", "dog dog dog dog"', expected: "true" },
    ],
    hints: [
      "Use a hash map for character to word mapping",
      "Also track word to character mapping to ensure bijection",
    ],
  },
]

interface ConsoleOutput {
  type: "log" | "error" | "result"
  content: string
  timestamp: Date
}

export default function CodeChallengePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, refreshUser } = useAuth()
  const { canAccess, isLoading: accessLoading } = usePhaseAccess("code")
  
  // immediately forward to the new compiler page
  useEffect(() => {
    router.push("/assessment/code/compiler");
  }, [router]);

  const [currentChallenge, setCurrentChallenge] = useState(0)
  const [code, setCode] = useState("")
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([])
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [explanation, setExplanation] = useState("")

  const challenge = CODE_CHALLENGES[currentChallenge]

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle code run
  const handleRun = useCallback((codeToRun: string, language: string) => {
    setConsoleOutput((prev) => [
      ...prev,
      { type: "log", content: `Running ${language} code...`, timestamp: new Date() },
    ])

    // Simulate code execution (in production, this would call a sandboxed executor)
    try {
      if (language === "javascript" || language === "typescript") {
        // Create a mock console
        const logs: string[] = []
        const mockConsole = {
          log: (...args: any[]) => logs.push(args.map(String).join(" ")),
        }
        
        // Execute code (simplified - in production use a sandbox)
        const fn = new Function("console", codeToRun)
        fn(mockConsole)
        
        logs.forEach((log) => {
          setConsoleOutput((prev) => [
            ...prev,
            { type: "result", content: log, timestamp: new Date() },
          ])
        })
      } else {
        setConsoleOutput((prev) => [
          ...prev,
          { 
            type: "log", 
            content: `${language} execution requires backend. Code captured for evaluation.`, 
            timestamp: new Date() 
          },
        ])
      }
    } catch (error) {
      setConsoleOutput((prev) => [
        ...prev,
        { 
          type: "error", 
          content: error instanceof Error ? error.message : "Execution error", 
          timestamp: new Date() 
        },
      ])
    }
  }, [])

  // Handle submission
  const handleSubmit = useCallback(async () => {
    if (!user) return
    
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("skillbridge_token")
      
      // Submit code challenge results
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase: "code",
          passed: true, // In production, this would be determined by test results
          score: 7.5, // In production, calculated from test results + explanation quality
          evaluation: {
            code,
            explanation,
            challenges_completed: currentChallenge + 1,
            time_elapsed: timeElapsed,
          },
        }),
      })

      if (response.ok) {
        await refreshUser()
        router.push("/assessment/code/results")
      }
    } catch (error) {
      console.error("Submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [user, code, explanation, currentChallenge, timeElapsed, refreshUser, router])

  // Loading state
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Access denied
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">SkillBridge</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Phase Locked</h1>
          <p className="text-muted-foreground mb-6">
            You must pass the Voice Assessment before accessing the Code Challenge.
          </p>
          <Button asChild>
            <Link href="/assessment/voice">Go to Voice Assessment</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">SkillBridge</span>
            </Link>
            <Badge variant="secondary">Phase 2: Code Challenge</Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{formatTime(timeElapsed)}</span>
            </div>
            <Badge variant="outline">
              {currentChallenge + 1} / {CODE_CHALLENGES.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-2">
          <Progress 
            value={((currentChallenge + 1) / CODE_CHALLENGES.length) * 100} 
            className="h-1" 
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6 h-full">
          {/* Left: Problem Description */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {challenge.title}
                  </CardTitle>
                  <Badge 
                    variant={challenge.difficulty === "Easy" ? "secondary" : "default"}
                  >
                    {challenge.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {challenge.description}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Cases */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Test Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {challenge.testCases.map((test, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">Input:</span>
                        <code className="font-mono">{test.input}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Expected:</span>
                        <code className="font-mono text-green-600">{test.expected}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hints */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Hints</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {challenge.hints.map((hint, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {hint}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right: Code Editor & Console */}
          <div className="space-y-4">
            <Tabs defaultValue="code" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="explain" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Explain
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="code" className="space-y-4">
                <CodeEditor
                  defaultLanguage="javascript"
                  onChange={setCode}
                  onRun={handleRun}
                  height="350px"
                />

                {/* Console Output */}
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Console
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[150px] overflow-auto bg-zinc-950 rounded-b-lg p-3 font-mono text-xs">
                      {consoleOutput.length === 0 ? (
                        <span className="text-zinc-500">
                          Run your code to see output here...
                        </span>
                      ) : (
                        consoleOutput.map((output, index) => (
                          <div
                            key={index}
                            className={`mb-1 ${
                              output.type === "error"
                                ? "text-red-400"
                                : output.type === "result"
                                ? "text-green-400"
                                : "text-zinc-400"
                            }`}
                          >
                            {output.content}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="explain" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Explain Your Approach</CardTitle>
                    <CardDescription>
                      Describe your solution strategy. This helps us verify your understanding.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-[400px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Explain your approach here...&#10;&#10;1. What algorithm did you use?&#10;2. What is the time complexity?&#10;3. What is the space complexity?&#10;4. Are there any edge cases you considered?"
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer Actions */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentChallenge(Math.max(0, currentChallenge - 1))}
            disabled={currentChallenge === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-4">
            {currentChallenge < CODE_CHALLENGES.length - 1 ? (
              <Button
                onClick={() => setCurrentChallenge(currentChallenge + 1)}
              >
                Next Challenge
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !code || !explanation}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Assessment
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
