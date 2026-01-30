import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * GET /api/admin/shipments
 * Fetch all shipments for admin (with optional filters) including complete booking details
 * Uses admin Bearer token from HTTP-only cookie
 */
export async function GET(request: NextRequest) {
  try {
    // Get admin token from HTTP-only cookie
    const token = request.cookies.get("admin_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status_filter = searchParams.get("status_filter");
    const email = searchParams.get("email");
    const limit = searchParams.get("limit") || "100";

    // Build query string
    const params = new URLSearchParams();
    if (status_filter) params.append("status_filter", status_filter);
    if (email) params.append("email", email);
    params.append("limit", limit);

    // Forward to FastAPI backend with admin token
    const response = await fetch(
      `${API_BASE_URL}/api/admin/shipments?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to fetch shipments" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Admin shipments fetch error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Failed to fetch shipments",
        shipments: [],
        count: 0,
      },
      { status: 400 },
    );
  }
}
