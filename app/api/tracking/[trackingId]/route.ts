import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * GET /api/tracking/[trackingId]
 * Fetch live shipment tracking status from the carrier via Terminal Africa.
 * Auth: User JWT (auth_token cookie)
 *
 * Query params:
 * - carrier: Carrier hint (DHL | FEDEX | UPS) — optional, improves accuracy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> },
) {
  try {
    // Get user token from HTTP-only cookie OR Authorization header
    let token = request.cookies.get("backend_auth_token")?.value;

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Authentication required" },
        { status: 401 },
      );
    }

    const { trackingId } = await params;

    if (!trackingId) {
      return NextResponse.json(
        { detail: "Tracking ID is required" },
        { status: 422 },
      );
    }

    // Forward optional carrier query param
    const carrier = request.nextUrl.searchParams.get("carrier");
    const queryString = carrier
      ? `?carrier=${encodeURIComponent(carrier)}`
      : "";

    const response = await fetch(
      `${API_BASE_URL}/api/tracking/${encodeURIComponent(trackingId)}${queryString}`,
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
        .catch(() => ({ detail: "Failed to fetch tracking info" }));

      return NextResponse.json(
        {
          detail: error.detail || "Failed to fetch tracking info",
          error_code: error.error_code,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const res = NextResponse.json(data, { status: 200 });

    // Disable caching — tracking data must always be fresh
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (error) {
    console.error("Tracking fetch error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "Failed to fetch tracking info",
      },
      { status: 500 },
    );
  }
}
