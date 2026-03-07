import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/api/v1/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const message = errBody.error || errBody.message || "Compilation service error";
      throw new Error(message);
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("/api/compile error", err.message || err);
    return NextResponse.json({ error: err.message || "Compilation failed" }, { status: 500 });
  }
}
