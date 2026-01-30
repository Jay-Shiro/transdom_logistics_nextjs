import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * GET /api/admin/orders/[orderId]
 * Fetch a specific order by ID (admin only)
 * Uses admin Bearer token from HTTP-only cookie
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Get admin token from HTTP-only cookie
    const token = request.cookies.get("admin_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    // Await params in Next.js 15
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { detail: "Order ID is required" },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend with admin token
    const response = await fetch(
      `${API_BASE_URL}/api/admin/orders/${orderId}`,
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
        .catch(() => ({ detail: "Failed to fetch order" }));

      // Handle 404 specifically
      if (response.status === 404) {
        return NextResponse.json(
          { detail: "Order not found" },
          { status: 404 },
        );
      }

      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Admin fetch order error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Failed to fetch order. Please try again."
      : error instanceof Error
        ? error.message
        : "Failed to fetch order";

    return NextResponse.json({ detail: errorMessage }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/orders/[orderId]
 * Delete a specific order by ID (admin only)
 * Uses admin Bearer token from HTTP-only cookie
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Get admin token from HTTP-only cookie
    const token = request.cookies.get("admin_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    // Await params in Next.js 15
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { detail: "Order ID is required" },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend with admin token
    const response = await fetch(
      `${API_BASE_URL}/api/admin/orders/${orderId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to delete order" }));

      // Handle 404 specifically
      if (response.status === 404) {
        return NextResponse.json(
          { detail: "Order not found" },
          { status: 404 },
        );
      }

      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Admin delete order error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Failed to delete order. Please try again."
      : error instanceof Error
        ? error.message
        : "Failed to delete order";

    return NextResponse.json({ detail: errorMessage }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/orders/[orderId]
 * Update order status (admin only)
 * Uses admin Bearer token from HTTP-only cookie
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Get admin token from HTTP-only cookie
    const token = request.cookies.get("admin_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    // Await params in Next.js 15
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { detail: "Order ID is required" },
        { status: 422 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate status if provided
    if (
      body.status &&
      !["pending", "approved", "rejected"].includes(body.status)
    ) {
      return NextResponse.json(
        { detail: "Invalid status. Must be: pending, approved, or rejected" },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend with admin token
    const response = await fetch(
      `${API_BASE_URL}/api/admin/orders/${orderId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to update order" }));

      // Handle 404 specifically
      if (response.status === 404) {
        return NextResponse.json(
          { detail: "Order not found" },
          { status: 404 },
        );
      }

      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Admin update order error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Failed to update order. Please try again."
      : error instanceof Error
        ? error.message
        : "Failed to update order";

    return NextResponse.json({ detail: errorMessage }, { status: 400 });
  }
}
