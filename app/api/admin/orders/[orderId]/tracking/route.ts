import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * PUT /api/admin/orders/[orderId]/tracking
 * Assign a carrier tracking number to an order.
 * Automatically sends a tracking notification email to the user.
 * Auth: Admin JWT
 *
 * Request body:
 * - tracking_id: string (required, 3–100 chars)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Get admin token from HTTP-only cookie OR Authorization header
    let token = request.cookies.get("admin_auth_token")?.value;

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { detail: "Order ID is required" },
        { status: 422 },
      );
    }

    const body = await request.json();

    // Validate required field
    if (!body.tracking_id || typeof body.tracking_id !== "string") {
      return NextResponse.json(
        { detail: "tracking_id is required" },
        { status: 422 },
      );
    }

    if (body.tracking_id.length < 3 || body.tracking_id.length > 100) {
      return NextResponse.json(
        { detail: "tracking_id must be between 3 and 100 characters" },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend
    const response = await fetch(
      `${API_BASE_URL}/api/admin/orders/${orderId}/tracking`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tracking_id: body.tracking_id }),
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to assign tracking ID" }));

      if (response.status === 404) {
        return NextResponse.json(
          { detail: "Order not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { detail: error.detail || "Failed to assign tracking ID" },
        { status: response.status },
      );
    }

    const data = await response.json();
    const res = NextResponse.json(data, { status: 200 });

    // Disable caching
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (error) {
    console.error("Admin assign tracking error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "Failed to assign tracking ID",
      },
      { status: 500 },
    );
  }
}
