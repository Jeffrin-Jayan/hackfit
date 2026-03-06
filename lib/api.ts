/**
 * SkillBridge API Client
 * Handles communication with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ApiError {
  detail: string
  status: number
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = {
      detail: "An error occurred",
      status: response.status,
    }
    try {
      const data = await response.json()
      error.detail = data.detail || data.message || error.detail
    } catch {
      error.detail = response.statusText
    }
    throw error
  }
  return response.json()
}

// Session API
export const sessionApi = {
  async create(data: {
    user_id: string
    skill_topic: string
    difficulty?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  async get(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/v1/session/${sessionId}`)
    return handleResponse(response)
  },

  async submitResponse(
    sessionId: string,
    data: {
      question_id: string
      transcript: string
      audio_metrics: {
        wpm: number
        pause_count: number
        avg_pause_duration: number
        total_duration: number
        amplitude_variance: number
      }
    }
  ) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/session/${sessionId}/response`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
        }),
      }
    )
    return handleResponse(response)
  },

  async complete(sessionId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/session/${sessionId}/complete`,
      {
        method: "POST",
      }
    )
    return handleResponse(response)
  },

  async getUserHistory(userId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/session/user/${userId}/history`
    )
    return handleResponse(response)
  },
}

// Evaluation API
export const evaluationApi = {
  async evaluate(data: {
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
  }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/evaluate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  async evaluateBatch(sessionId: string, responses: any[]) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/evaluate/batch?session_id=${sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responses),
      }
    )
    return handleResponse(response)
  },

  async checkConsistency(sessionId: string, responses: any[]) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/evaluate/consistency-check?session_id=${sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responses),
      }
    )
    return handleResponse(response)
  },

  async getResults(sessionId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/evaluate/${sessionId}`
    )
    return handleResponse(response)
  },
}

// Auth API
export const authApi = {
  async register(data: {
    email: string
    password: string
    display_name?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  async login(data: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },

  async getCurrentUser(token: string) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return handleResponse(response)
  },

  async logout() {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
    })
    return handleResponse(response)
  },
}

// Health check
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    return handleResponse(response)
  } catch {
    return { status: "unavailable", services: {} }
  }
}
