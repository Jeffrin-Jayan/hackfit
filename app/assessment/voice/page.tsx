"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { VoiceCapture } from "@/components/voice/VoiceCapture"
import type { AudioMetrics } from "@/hooks/useAudioAnalysis"
import { ArrowLeft, Shield, ChevronRight } from "lucide-react"

interface AssessmentConfig {
  topic: string
  difficulty: string
  type: string
}

interface ResponseData {
  questionId: string
  question: string
  transcript: string
  metrics: AudioMetrics
}

// Sample questions by topic (in production, these would come from the backend)
const QUESTIONS_BY_TOPIC: Record<string, string[]> = {
  "Python Programming": [
    "Explain the difference between a list and a tuple in Python. When would you use each?",
    "What are Python decorators and how do they work? Give an example use case.",
    "Explain Python's Global Interpreter Lock (GIL) and its implications for multithreading.",
  ],
  "JavaScript & TypeScript": [
    "Explain the event loop in JavaScript. How does it handle asynchronous operations?",
    "What are the differences between var, let, and const? When would you use each?",
    "Explain how prototypal inheritance works in JavaScript.",
  ],
  "React & Frontend Development": [
    "Explain the difference between controlled and uncontrolled components in React.",
    "What is the purpose of useEffect and how does its cleanup function work?",
    "Explain React's reconciliation algorithm and why keys are important in lists.",
  ],
  "Node.js & Backend Development": [
    "Explain the Node.js event-driven architecture and its advantages.",
    "What is middleware in Express.js and how does the middleware chain work?",
    "Explain the difference between process.nextTick() and setImmediate().",
  ],
  "SQL & Database Design": [
    "Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.",
    "What is database normalization? Explain the first three normal forms.",
    "How would you optimize a slow query? Walk me through your approach.",
  ],
  default: [
    "Explain the core concepts of this technology in your own words.",
    "Describe a real-world problem this technology solves well.",
    "What are the common pitfalls or mistakes when using this technology?",
  ],
}

export default function VoiceAssessmentPage() {
  const router = useRouter()
  const [config, setConfig] = useState<AssessmentConfig | null>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load config and questions
  useEffect(() => {
    const stored = sessionStorage.getItem("assessmentConfig")
    if (stored) {
      const parsedConfig = JSON.parse(stored) as AssessmentConfig
      setConfig(parsedConfig)

      // Get questions for the topic
      const topicQuestions =
        QUESTIONS_BY_TOPIC[parsedConfig.topic] || QUESTIONS_BY_TOPIC.default
      setQuestions(topicQuestions)
    } else {
      router.push("/assessment")
    }
  }, [router])

  const handleSubmitResponse = useCallback(
    (data: { transcript: string; metrics: AudioMetrics }) => {
      const response: ResponseData = {
        questionId: `q-${currentQuestionIndex + 1}`,
        question: questions[currentQuestionIndex],
        transcript: data.transcript,
        metrics: data.metrics,
      }

      const newResponses = [...responses, response]
      setResponses(newResponses)

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
      } else {
        // All questions answered, go to review
        sessionStorage.setItem("assessmentResponses", JSON.stringify(newResponses))
        router.push("/assessment/review")
      }
    },
    [currentQuestionIndex, questions, responses, router]
  )

  const handleSkipQuestion = useCallback(() => {
    // Store an empty response for skipped questions
    const response: ResponseData = {
      questionId: `q-${currentQuestionIndex + 1}`,
      question: questions[currentQuestionIndex],
      transcript: "",
      metrics: {
        wpm: 0,
        pauseCount: 0,
        avgPauseDuration: 0,
        totalDuration: 0,
        amplitudeVariance: 0,
        speakingDuration: 0,
        pauseRatio: 0,
        volumeLevel: 0,
      },
    }

    const newResponses = [...responses, response]
    setResponses(newResponses)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      sessionStorage.setItem("assessmentResponses", JSON.stringify(newResponses))
      router.push("/assessment/review")
    }
  }, [currentQuestionIndex, questions, responses, router])

  if (!config || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/assessment"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit Assessment
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-semibold">SkillBridge</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Topic Badge */}
        <Card className="mb-6 bg-muted/30">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Topic:</span>
              <span className="font-medium">{config.topic}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Level:</span>
              <span className="font-medium capitalize">{config.difficulty}</span>
            </div>
          </CardContent>
        </Card>

        {/* Voice Capture */}
        <VoiceCapture
          question={questions[currentQuestionIndex]}
          onSubmit={handleSubmitResponse}
          maxDuration={180}
        />

        {/* Skip Button */}
        <div className="flex justify-center mt-6">
          <Button
            variant="ghost"
            onClick={handleSkipQuestion}
            className="text-muted-foreground"
          >
            Skip this question
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </main>
    </div>
  )
}
