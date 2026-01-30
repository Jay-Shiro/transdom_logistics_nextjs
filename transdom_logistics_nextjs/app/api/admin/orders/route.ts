import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * GET /api/admin/orders
 * Fetch all orders (admin only)
 * Uses admin Bearer token from HTTP-only cookie
 *
 * Query params:
 * - status: Filter by status (pending, approved, rejected)
 * - limit: Number of results
 * - skip: Number of results to skip
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
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");
    const skip = searchParams.get("skip");

    // Build query string
    const queryParams = new URLSearchParams();
    if (status) queryParams.append("status", status);
    if (limit) queryParams.append("limit", limit);
    if (skip) queryParams.append("skip", skip);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/api/admin/orders${queryString ? `?${queryString}` : ""}`;

    // Forward to FastAPI backend with admin token
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to fetch orders" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Admin fetch orders error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Failed to fetch orders. Please try again."
      : error instanceof Error
        ? error.message
        : "Failed to fetch orders";

    return NextResponse.json({ detail: errorMessage }, { status: 400 });
  }
}

/**
 * POST /api/admin/orders
 * Create a new order (admin only)
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

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["zone_picked", "weight", "email", "amount_paid"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { detail: `Missing required field: ${field}` },
          { status: 422 },
        );
      }
    }

    // Additional validation for production
    if (process.env.NODE_ENV === "production") {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { detail: "Invalid email format" },
          { status: 422 },
        );
      }

      // Validate weight is positive
      if (body.weight <= 0) {
        return NextResponse.json(
          { detail: "Weight must be greater than 0" },
          { status: 422 },
        );
      }

      // Validate amount is positive
      if (body.amount_paid <= 0) {
        return NextResponse.json(
          { detail: "Amount must be greater than 0" },
          { status: 422 },
        );
      }
    }

    // Forward to FastAPI backend with admin token
    const response = await fetch(`${API_BASE_URL}/api/admin/orders`, {
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
        .catch(() => ({ detail: "Failed to create order" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Admin create order error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Failed to create order. Please try again."
      : error instanceof Error
        ? error.message
        : "Failed to create order";

    return NextResponse.json({ detail: errorMessage }, { status: 400 });
  }
}
