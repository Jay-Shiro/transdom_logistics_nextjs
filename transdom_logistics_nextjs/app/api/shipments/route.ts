import { NextRequest, NextResponse } from "next/server";

interface Shipment {
  _id: string;
  order_no: string;
  zone_picked: string;
  delivery_speed: string;
  amount_paid: number;
  status: string;
  date_created: string;
  // Sender details
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_state: string;
  sender_city: string;
  sender_country: string;
  sender_email: string;
  // Receiver details
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_state: string;
  receiver_city: string;
  receiver_post_code: string;
  receiver_country: string;
  // Shipment details
  shipment_description: string;
  shipment_quantity: number;
  shipment_value?: number;
  shipment_weight: number;
}

/**
 * GET /api/shipments
 * Fetch user's shipments/orders from FastAPI backend with complete booking details
 * Uses Bearer token from HTTP-only cookie
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from HTTP-only cookie
    const token = request.cookies.get("backend_auth_token")?.value;
    
    if (!token) {
      return NextResponse.json(
        {
          detail: "Unauthorized - No authentication token",
          shipments: [],
          total: 0,
        },
        { status: 401 },
      );
    }

    // Forward to FastAPI backend with the token
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/shipments`;
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to fetch shipments" }));
      
      // Return empty array instead of throwing error
      return NextResponse.json(
        {
          detail: error.detail || `HTTP ${response.status}`,
          shipments: [],
          total: 0,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Backend returns array directly, wrap it in proper format
    const shipments = Array.isArray(data) ? data : [];

    return NextResponse.json(
      {
        shipments,
        total: shipments.length,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Failed to fetch shipments",
        shipments: [],
        total: 0,
      },
      { status: 400 },
    );
  }
}
