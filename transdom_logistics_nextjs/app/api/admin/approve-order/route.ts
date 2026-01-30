import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ApproveOrderPayload {
  order_no: string;
  status: string;
}

/**
 * POST /api/admin/approve-order
 * Approve or reject an order (admin only)
 * Uses admin Bearer token from HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Get admin token from HTTP-only cookie
    const token = request.cookies.get("admin_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as ApproveOrderPayload;

    // Validate required fields
    if (!body.order_no || !body.status) {
      return NextResponse.json(
        { detail: "Missing required fields: order_no, status" },
        { status: 422 },
      );
    }

    // Validate status value
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(body.status.toLowerCase())) {
      return NextResponse.json(
        {
          detail: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend with admin token
    const response = await fetch(`${API_BASE_URL}/api/admin/approve-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to update order" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Admin approve order error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Failed to update order",
      },
      { status: 400 },
    );
  }
}
