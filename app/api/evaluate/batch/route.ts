import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

interface ResponseItem {
  question_id: string
  question: string
  transcript: string
  audio_metrics: {
    wpm: number
    pause_count: number
    avg_pause_duration: number
    total_duration: number
    amplitude_variance: number
  }
}

interface BatchEvaluationRequest {
  session_id: string
  topic: string
  responses: ResponseItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchEvaluationRequest = await request.json()

    if (!body.responses || body.responses.length === 0) {
      return NextResponse.json(
        { error: "No responses provided" },
        { status: 400 }
      )
    }

    // Evaluate each response
    const evaluationResults = await Promise.all(
      body.responses.map(async (response) => {
        const evalRequest = {
          session_id: body.session_id,
          question: response.question,
          topic: body.topic,
          transcript: response.transcript,
          audio_metrics: {
            wpm: response.audio_metrics.wpm,
            pause_count: response.audio_metrics.pause_count || 0,
            avg_pause_duration: response.audio_metrics.avg_pause_duration || 0,
            total_duration: response.audio_metrics.total_duration,
            amplitude_variance: response.audio_metrics.amplitude_variance || 0,
          },
        }

        try {
          const evalResponse = await fetch(
            `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/evaluate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(evalRequest),
            }
          )

          if (evalResponse.ok) {
            return await evalResponse.json()
          }
        } catch {
          console.error("Individual evaluation failed")
        }

        // Return a default failed evaluation if the API call fails
        return {
          question_id: response.question_id,
          overall_score: 0,
          passed: false,
          dimensions: [],
          error: "Evaluation failed",
        }
      })
    )

    // Calculate aggregate scores
    const validResults = evaluationResults.filter((r) => r.overall_score > 0)
    const aggregateScore =
      validResults.length > 0
        ? validResults.reduce((sum, r) => sum + r.overall_score, 0) /
          validResults.length
        : 0

    // Aggregate dimension scores
    const dimensionAggregates: Record<string, { total: number; count: number }> = {}

    validResults.forEach((result) => {
      result.dimensions?.forEach((dim: { dimension: string; score: number }) => {
        if (!dimensionAggregates[dim.dimension]) {
          dimensionAggregates[dim.dimension] = { total: 0, count: 0 }
        }
        dimensionAggregates[dim.dimension].total += dim.score
        dimensionAggregates[dim.dimension].count += 1
      })
    })

    const aggregatedDimensions = Object.entries(dimensionAggregates).map(
      ([dimension, data]) => ({
        dimension,
        score: Math.round((data.total / data.count) * 10) / 10,
      })
    )

    // Collect unique blind spots, strengths, and recommendations
    const allBlindSpots = [
      ...new Set(validResults.flatMap((r) => r.blind_spots || [])),
    ]
    const allStrengths = [
      ...new Set(validResults.flatMap((r) => r.strengths || [])),
    ]
    const allRecommendations = [
      ...new Set(validResults.flatMap((r) => r.recommendations || [])),
    ]

    return NextResponse.json({
      session_id: body.session_id,
      topic: body.topic,
      individual_results: evaluationResults,
      aggregate: {
        overall_score: Math.round(aggregateScore * 10) / 10,
        passed: aggregateScore >= 6.0,
        dimensions: aggregatedDimensions,
        blind_spots: allBlindSpots.slice(0, 5),
        strengths: allStrengths.slice(0, 5),
        recommendations: allRecommendations.slice(0, 5),
      },
      total_responses: body.responses.length,
      evaluated_responses: validResults.length,
      evaluated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Batch evaluation error:", error)
    return NextResponse.json(
      { error: "Failed to process batch evaluation" },
      { status: 500 }
    )
  }
}
