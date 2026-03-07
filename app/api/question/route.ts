import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { search } = request.nextUrl;
    const response = await fetch(`${API_URL}/api/v1/question${search}`);
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const message = errBody.error || errBody.message || "Question service error";
      throw new Error(message);
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("/api/question error", err.message || err);
    return NextResponse.json({ error: err.message || "Failed to fetch question" }, { status: 500 });
  }
}
