"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { AudioMetrics } from "@/hooks/useAudioAnalysis"
import { ArrowLeft, Send, Shield, Clock, FileText, Activity } from "lucide-react"

interface ResponseData {
  questionId: string
  question: string
  transcript: string
  metrics: AudioMetrics
}

interface AssessmentConfig {
  topic: string
  difficulty: string
  type: string
}

export default function ReviewPage() {
  const router = useRouter()
  const [config, setConfig] = useState<AssessmentConfig | null>(null)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load config and responses
  useEffect(() => {
    const storedConfig = sessionStorage.getItem("assessmentConfig")
    const storedResponses = sessionStorage.getItem("assessmentResponses")

    if (storedConfig && storedResponses) {
      setConfig(JSON.parse(storedConfig))
      setResponses(JSON.parse(storedResponses))
    } else {
      router.push("/assessment")
    }
  }, [router])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)

    try {
      const sessionId = `session-${Date.now()}`

      // Call the batch evaluation API
      const batchResponse = await fetch("/api/evaluate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          topic: config?.topic,
          responses: responses.map((r) => ({
            question_id: r.questionId,
            question: r.question,
            transcript: r.transcript,
            audio_metrics: {
              wpm: r.metrics.wpm,
              pause_count: r.metrics.pauseCount,
              avg_pause_duration: r.metrics.avgPauseDuration,
              total_duration: r.metrics.totalDuration,
              amplitude_variance: r.metrics.amplitudeVariance,
            },
          })),
        }),
      })

      if (!batchResponse.ok) {
        throw new Error("Evaluation failed")
      }

      const evaluationData = await batchResponse.json()

      // Format results for the results page
      const results = {
        sessionId,
        topic: config?.topic,
        difficulty: config?.difficulty,
        responses: responses.map((r, index) => ({
          ...r,
          evaluation: evaluationData.individual_results[index] || {
            overall_score: 0,
            passed: false,
            dimensions: [],
            blind_spots: [],
            strengths: [],
            recommendations: [],
          },
        })),
        aggregate: evaluationData.aggregate,
        submittedAt: new Date().toISOString(),
      }

      sessionStorage.setItem("assessmentResults", JSON.stringify(results))
      router.push("/assessment/results")
    } catch (error) {
      console.error("Submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [config, responses, router])

  // Calculate summary stats
  const totalDuration = responses.reduce((sum, r) => sum + r.metrics.totalDuration, 0)
  const totalWords = responses.reduce(
    (sum, r) => sum + (r.transcript.split(/\s+/).filter(Boolean).length || 0),
    0
  )
  const answeredCount = responses.filter((r) => r.transcript.trim()).length

  if (!config || responses.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/assessment/voice"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Questions
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold">SkillBridge</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3">Review Your Responses</h1>
          <p className="text-muted-foreground">
            Review your answers before submitting for evaluation.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {answeredCount}/{responses.length}
              </p>
              <p className="text-sm text-muted-foreground">Questions Answered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {Math.round(totalDuration / 60)}m {Math.round(totalDuration % 60)}s
              </p>
              <p className="text-sm text-muted-foreground">Total Duration</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalWords}</p>
              <p className="text-sm text-muted-foreground">Total Words</p>
            </CardContent>
          </Card>
        </div>

        {/* Response Review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {responses.map((response, index) => (
                <AccordionItem key={response.questionId} value={response.questionId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">
                          {response.question}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {response.transcript ? (
                            <Badge variant="secondary" className="text-xs">
                              {response.transcript.split(/\s+/).length} words
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Skipped
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(response.metrics.totalDuration)}s
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 pl-11">
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Question:</strong> {response.question}
                      </p>
                      {response.transcript ? (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm leading-relaxed">{response.transcript}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No response recorded
                        </p>
                      )}
                      {/* Metrics Summary */}
                      <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                        <div>
                          <p className="text-lg font-bold">{response.metrics.wpm}</p>
                          <p className="text-xs text-muted-foreground">WPM</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{response.metrics.pauseCount}</p>
                          <p className="text-xs text-muted-foreground">Pauses</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">
                            {Math.round(response.metrics.speakingDuration)}s
                          </p>
                          <p className="text-xs text-muted-foreground">Speaking</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">
                            {Math.round(response.metrics.amplitudeVariance * 1000)}
                          </p>
                          <p className="text-xs text-muted-foreground">Variation</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/assessment/voice">Re-record Answers</Link>
          </Button>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || answeredCount === 0}
            className="gap-2 px-8"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit for Evaluation
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
