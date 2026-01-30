import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface AdminLoginPayload {
  name: string;
  password: string;
}

interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  admin: {
    name: string;
    role: string;
  };
}

/**
 * POST /api/admin/login
 * Authenticate admin and return JWT access token in HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminLoginPayload;

    // Validate required fields
    if (!body.name || !body.password) {
      return NextResponse.json(
        { detail: "Name and password are required" },
        { status: 422 },
      );
    }

    // Additional security: rate limiting check could be added here in production
    // For example, check Redis for failed login attempts

    // Forward to FastAPI backend
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Login failed" }));

      // Log failed admin login attempts in production for security monitoring
      if (process.env.NODE_ENV === "production") {
        console.warn(`Failed admin login attempt for: ${body.name}`);
      }

      return NextResponse.json(
        { detail: error.detail || "Invalid credentials" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as AdminLoginResponse;

    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === "production";

    // Cookie configuration based on environment
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: "strict" as const, // Stricter for admin routes
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
        admin: data.admin,
      },
      { status: 200 },
    );

    // Set HTTP-only cookie for backend JWT
    nextResponse.cookies.set(
      "admin_auth_token",
      data.access_token,
      cookieOptions,
    );

    // Set admin data in cookie (not HTTP-only, accessible to client)
    nextResponse.cookies.set("admin_user", JSON.stringify(data.admin), {
      ...cookieOptions,
      httpOnly: false, // Must be false so client can read it
    });

    // Log successful admin login in production for security monitoring
    if (isProduction) {
      console.info(
        `Admin login successful: ${data.admin.name} (${data.admin.role})`,
      );
    }

    return nextResponse;
  } catch (error) {
    console.error("Admin login error:", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Login failed. Please try again."
      : error instanceof Error
        ? error.message
        : "Login failed";

    return NextResponse.json({ detail: errorMessage }, { status: 401 });
  }
}
