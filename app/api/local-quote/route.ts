import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * GET /api/local-quote
 * Quote a local (Nigeria domestic) delivery, state to state, across all
 * delivery speeds (same-day, next-day, standard)
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin_state = searchParams.get("origin_state");
    const destination_state = searchParams.get("destination_state");
    const weight = searchParams.get("weight");

    // Validate required parameters
    if (!origin_state || !destination_state || !weight) {
      return NextResponse.json(
        {
          detail:
            "Missing required parameters: origin_state, destination_state, weight",
        },
        { status: 400 },
      );
    }

    // Validate weight
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 1000) {
      return NextResponse.json(
        { detail: "Weight must be a positive number between 0.1 and 1000 kg" },
        { status: 400 },
      );
    }

    // Forward to FastAPI backend
    const response = await fetch(
      `${API_BASE_URL}/api/local-quote?origin_state=${encodeURIComponent(origin_state)}&destination_state=${encodeURIComponent(destination_state)}&weight=${weight}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to fetch local quote" }));
      return NextResponse.json(
        { detail: error.detail || `HTTP ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Local quote error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "Failed to fetch local quote",
        delivery_options: [],
      },
      { status: 500 },
    );
  }
}
