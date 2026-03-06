import { NextRequest, NextResponse } from "next/server"

// In-memory session storage (in production, use a database)
const sessions = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case "create": {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const session = {
          session_id: sessionId,
          user_id: data.user_id || "anonymous",
          skill_topic: data.skill_topic,
          difficulty: data.difficulty || "intermediate",
          status: "active",
          created_at: new Date().toISOString(),
          responses: [],
          evaluation: null,
        }
        sessions.set(sessionId, session)
        return NextResponse.json(session)
      }

      case "get": {
        const session = sessions.get(data.session_id)
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          )
        }
        return NextResponse.json(session)
      }

      case "submit_response": {
        const session = sessions.get(data.session_id)
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          )
        }
        session.responses.push({
          question_id: data.question_id,
          question: data.question,
          transcript: data.transcript,
          audio_metrics: data.audio_metrics,
          submitted_at: new Date().toISOString(),
        })
        return NextResponse.json({
          message: "Response submitted",
          response_count: session.responses.length,
        })
      }

      case "complete": {
        const session = sessions.get(data.session_id)
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          )
        }
        session.status = "completed"
        session.completed_at = new Date().toISOString()
        return NextResponse.json({
          message: "Session completed",
          session_id: data.session_id,
        })
      }

      case "store_evaluation": {
        const session = sessions.get(data.session_id)
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          )
        }
        session.evaluation = data.evaluation
        session.status = "evaluated"
        return NextResponse.json({
          message: "Evaluation stored",
          session_id: data.session_id,
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id required" },
      { status: 400 }
    )
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(session)
}
