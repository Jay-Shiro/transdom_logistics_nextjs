import { NextRequest, NextResponse } from "next/server";

/**
 * Simple health check endpoint to verify API connection
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        message: "Backend is ready for FastAPI integration",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
