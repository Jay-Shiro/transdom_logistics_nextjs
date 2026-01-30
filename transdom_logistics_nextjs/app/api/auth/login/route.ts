import { NextRequest, NextResponse } from "next/server";
import { apiPost } from "@/lib/api-client";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthUser {
  firstname: string;
  lastname: string;
  gender: string;
  email: string;
  phone_number?: string;
  country: string;
  referral_code?: string | null;
  photo_url?: string | null;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: AuthUser;
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT access token in HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request has a body
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { detail: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    const text = await request.text();
    if (!text) {
      return NextResponse.json(
        { detail: "Request body is required" },
        { status: 400 },
      );
    }

    const body = JSON.parse(text) as LoginPayload;

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend
    const response = await apiPost<LoginResponse>("/api/login", body);

    // Create response with HTTP-only cookies
    const nextResponse = NextResponse.json(
      {
        success: true,
        user: response.user,
      },
      { status: 200 },
    );

    // Set HTTP-only cookie for backend JWT
    nextResponse.cookies.set("backend_auth_token", response.access_token, {
      httpOnly: true,
      secure: false, // Changed for development
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    // Set user data in cookie (not HTTP-only, accessible to client)
    if (response.user) {
      nextResponse.cookies.set("auth_user", JSON.stringify(response.user), {
        httpOnly: false, // Must be false so client can read it
        secure: false, // Changed for development
        sameSite: "lax",
        maxAge: 24 * 60 * 60,
        path: "/",
      });
    }

    return nextResponse;
  } catch (error) {
    console.error("❌ Login error:", error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Login failed",
      },
      { status: 401 },
    );
  }
}
