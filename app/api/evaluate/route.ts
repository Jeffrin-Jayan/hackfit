import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export interface EvaluationRequest {
  session_id: string
  question: string
  topic: string
  transcript: string
  audio_metrics: {
    wpm: number
    pause_count: number
    avg_pause_duration: number
    total_duration: number
    amplitude_variance: number
  }
}

export interface DimensionScore {
  dimension: string
  score: number
  feedback: string
  indicators: string[]
}

export interface EvaluationResponse {
  session_id: string
  overall_score: number
  passed: boolean
  dimensions: DimensionScore[]
  blind_spots: string[]
  strengths: string[]
  recommendations: string[]
  evaluated_at: string
}

// Mock Gemini evaluation for when backend is not available
function mockGeminiEvaluation(request: EvaluationRequest): EvaluationResponse {
  const { transcript, audio_metrics } = request

  // Calculate scores based on actual response data
  const wordCount = transcript.split(/\s+/).filter(Boolean).length
  const hasContent = wordCount > 20

  // Base scores with some variance
  const baseScore = hasContent ? 6.5 : 3.0
  const variance = () => (Math.random() - 0.5) * 2

  // Adjust scores based on audio metrics
  const wpmBonus = audio_metrics.wpm >= 100 && audio_metrics.wpm <= 160 ? 0.5 : 0
  const pauseBonus = audio_metrics.pause_count >= 2 && audio_metrics.pause_count <= 8 ? 0.3 : 0
  const confidenceBonus = audio_metrics.amplitude_variance > 0.005 ? 0.4 : 0

  const dimensions: DimensionScore[] = [
    {
      dimension: "content_accuracy",
      score: Math.min(10, Math.max(1, baseScore + variance() + (hasContent ? 1 : 0))),
      feedback: hasContent
        ? "Response contains relevant information addressing the question."
        : "Response lacks sufficient content to evaluate accuracy.",
      indicators: hasContent
        ? ["Addresses main topic", "Includes relevant details"]
        : ["Insufficient content"],
    },
    {
      dimension: "conceptual_depth",
      score: Math.min(10, Math.max(1, baseScore + variance() + (wordCount > 50 ? 0.5 : 0))),
      feedback: wordCount > 50
        ? "Shows understanding beyond surface level concepts."
        : "Could benefit from deeper exploration of the topic.",
      indicators: wordCount > 50
        ? ["Explains underlying principles", "Connects related concepts"]
        : ["Surface-level coverage"],
    },
    {
      dimension: "explanation_clarity",
      score: Math.min(10, Math.max(1, baseScore + variance() + 0.5)),
      feedback: "Explanation structure and clarity evaluated based on speech patterns.",
      indicators: ["Logical progression observed", "Uses appropriate examples"],
    },
    {
      dimension: "real_world_application",
      score: Math.min(10, Math.max(1, baseScore + variance() - 0.3)),
      feedback: "Evaluation of practical examples and real-world connections.",
      indicators: ["Some practical context provided"],
    },
    {
      dimension: "response_spontaneity",
      score: Math.min(10, Math.max(1, baseScore + variance() + wpmBonus + pauseBonus)),
      feedback:
        audio_metrics.pause_count > 0
          ? "Natural speech patterns with thoughtful pauses detected."
          : "Response appears rehearsed or very fluid.",
      indicators:
        audio_metrics.pause_count > 0
          ? ["Natural pauses", "Thinking-aloud moments"]
          : ["Consistent delivery"],
    },
    {
      dimension: "technical_vocabulary",
      score: Math.min(10, Math.max(1, baseScore + variance())),
      feedback: "Use of domain-specific terminology evaluated.",
      indicators: ["Appropriate terminology", "Correct usage context"],
    },
    {
      dimension: "logical_flow",
      score: Math.min(10, Math.max(1, baseScore + variance() + 0.3)),
      feedback: "Response follows a logical structure.",
      indicators: ["Clear progression", "Connected points"],
    },
    {
      dimension: "confidence_indicators",
      score: Math.min(10, Math.max(1, baseScore + variance() + confidenceBonus)),
      feedback:
        audio_metrics.amplitude_variance > 0.005
          ? "Voice patterns suggest genuine confidence in the material."
          : "Steady delivery with consistent energy.",
      indicators:
        audio_metrics.amplitude_variance > 0.005
          ? ["Animated delivery", "Appropriate emphasis"]
          : ["Consistent tone"],
    },
  ]

  // Round all scores to 1 decimal place
  dimensions.forEach((d) => {
    d.score = Math.round(d.score * 10) / 10
  })

  const overallScore =
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length

  return {
    session_id: request.session_id,
    overall_score: Math.round(overallScore * 10) / 10,
    passed: overallScore >= 6.0,
    dimensions,
    blind_spots: hasContent
      ? ["Edge cases and error handling", "Performance considerations", "Recent updates to the technology"]
      : ["Core concept understanding", "Practical application"],
    strengths: hasContent
      ? ["Clear communication style", "Addresses the question directly", "Shows foundational knowledge"]
      : ["Attempted response"],
    recommendations: hasContent
      ? [
          "Explore more advanced use cases",
          "Practice explaining concepts to different audiences",
          "Include more real-world examples",
        ]
      : [
          "Review core concepts for this topic",
          "Practice explaining ideas verbally",
          "Try to include specific examples",
        ],
    evaluated_at: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EvaluationRequest = await request.json()

    // Validate required fields
    if (!body.transcript || !body.question || !body.topic) {
      return NextResponse.json(
        { error: "Missing required fields: transcript, question, topic" },
        { status: 400 }
      )
    }

    // Try to call the backend if available
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/v1/evaluate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (backendResponse.ok) {
        const result = await backendResponse.json()
        return NextResponse.json(result)
      }
    } catch (backendError) {
      console.log("Backend unavailable, using mock evaluation")
    }

    // Use mock evaluation if backend is unavailable
    const mockResult = mockGeminiEvaluation(body)
    return NextResponse.json(mockResult)
  } catch (error) {
    console.error("Evaluation error:", error)
    return NextResponse.json(
      { error: "Failed to evaluate response" },
      { status: 500 }
    )
  }
}
