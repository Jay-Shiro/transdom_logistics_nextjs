import { NextRequest, NextResponse } from "next/server";
import { apiPost } from "@/lib/api-client";

interface SignupPayload {
  firstname: string;
  lastname: string;
  email: string;
  gender: string;
  country: string;
  referral_code?: string;
  phone_number?: string;
  password: string;
  photo_url?: string;
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

interface SignupResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/**
 * POST /api/auth/signup
 * Register a new user and return JWT token + user info with HTTP-only cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupPayload;

    // Validate required fields
    const required = [
      "firstname",
      "lastname",
      "email",
      "gender",
      "country",
      "password",
    ];
    for (const field of required) {
      if (!body[field as keyof SignupPayload]) {
        return NextResponse.json(
          { detail: `Missing required field: ${field}` },
          { status: 422 },
        );
      }
    }

    // Additional validation for production
    if (process.env.NODE_ENV === "production") {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { detail: "Invalid email format" },
          { status: 422 },
        );
      }

      // Password strength validation (minimum 8 characters)
      if (body.password.length < 8) {
        return NextResponse.json(
          { detail: "Password must be at least 8 characters long" },
          { status: 422 },
        );
      }
    }

    // Forward to FastAPI backend
    const response = await apiPost<SignupResponse>("/api/signup", body);

    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === "production";

    // Cookie configuration based on environment
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: "lax" as const,
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
      // Only set domain in production if specified
      ...(isProduction && process.env.COOKIE_DOMAIN
        ? { domain: process.env.COOKIE_DOMAIN }
        : {}),
    };

    // Create response with HTTP-only cookies
    const nextResponse = NextResponse.json(
      {
        success: true,
        user: response.user,
      },
      { status: 201 },
    );

    // Set HTTP-only cookie for backend JWT
    nextResponse.cookies.set(
      "backend_auth_token",
      response.access_token,
      cookieOptions,
    );

    // Set user data in cookie (not HTTP-only, accessible to client)
    if (response.user) {
      nextResponse.cookies.set("auth_user", JSON.stringify(response.user), {
        ...cookieOptions,
        httpOnly: false, // Must be false so client can read it
      });
    }

    return nextResponse;
  } catch (error) {
    console.error("Signup error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Signup failed. Please try again or contact support."
      : error instanceof Error
        ? error.message
        : "Signup failed";

    return NextResponse.json({ detail: errorMessage }, { status: 400 });
  }
}
