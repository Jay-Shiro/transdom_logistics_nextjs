import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface MakeOrderRequest {
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
  // Pricing details
  zone_picked: string;
  delivery_speed: string;
  amount_paid: number;
}

interface OrderResponse {
  _id: string;
  order_no: string;
  zone_picked: string;
  delivery_speed: string;
  amount_paid: number;
  status: string;
  date_created: string;
  // All the booking details will also be returned
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_state: string;
  sender_city: string;
  sender_country: string;
  sender_email: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_state: string;
  receiver_city: string;
  receiver_post_code: string;
  receiver_country: string;
  shipment_description: string;
  shipment_quantity: number;
  shipment_value?: number;
  shipment_weight: number;
}

/**
 * POST /api/orders/create
 * Create a new order after successful payment with complete booking details
 * Calls FastAPI /api/make-order endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Get the auth token from HTTP-only cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get("backend_auth_token");

    if (!authToken) {
      return NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as MakeOrderRequest;

    // Validate required sender fields
    const requiredSenderFields = [
      "sender_name",
      "sender_phone",
      "sender_address",
      "sender_state",
      "sender_city",
      "sender_country",
      "sender_email",
    ];
    for (const field of requiredSenderFields) {
      if (
        !(field in body) ||
        body[field as keyof MakeOrderRequest] === undefined
      ) {
        return NextResponse.json(
          { detail: `Missing required sender field: ${field}` },
          { status: 422 },
        );
      }
    }

    // Validate required receiver fields
    const requiredReceiverFields = [
      "receiver_name",
      "receiver_phone",
      "receiver_address",
      "receiver_state",
      "receiver_city",
      "receiver_post_code",
      "receiver_country",
    ];
    for (const field of requiredReceiverFields) {
      if (
        !(field in body) ||
        body[field as keyof MakeOrderRequest] === undefined
      ) {
        return NextResponse.json(
          { detail: `Missing required receiver field: ${field}` },
          { status: 422 },
        );
      }
    }

    // Validate required shipment fields
    const requiredShipmentFields = [
      "shipment_description",
      "shipment_quantity",
      "shipment_weight",
    ];
    for (const field of requiredShipmentFields) {
      if (
        !(field in body) ||
        body[field as keyof MakeOrderRequest] === undefined
      ) {
        return NextResponse.json(
          { detail: `Missing required shipment field: ${field}` },
          { status: 422 },
        );
      }
    }

    // Validate pricing fields
    if (!body.zone_picked || !body.delivery_speed || !body.amount_paid) {
      return NextResponse.json(
        {
          detail:
            "Missing required pricing fields: zone_picked, delivery_speed, amount_paid",
        },
        { status: 422 },
      );
    }

    // Validate types
    if (typeof body.shipment_weight !== "number" || body.shipment_weight <= 0) {
      return NextResponse.json(
        { detail: "Shipment weight must be a positive number" },
        { status: 422 },
      );
    }

    if (typeof body.amount_paid !== "number" || body.amount_paid <= 0) {
      return NextResponse.json(
        { detail: "Amount paid must be a positive number" },
        { status: 422 },
      );
    }

    if (
      typeof body.shipment_quantity !== "number" ||
      body.shipment_quantity <= 0
    ) {
      return NextResponse.json(
        { detail: "Shipment quantity must be a positive number" },
        { status: 422 },
      );
    }

    // Forward to FastAPI backend with authentication
    const response = await fetch(`${API_BASE_URL}/api/make-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Sender details
        sender_name: body.sender_name,
        sender_phone: body.sender_phone,
        sender_address: body.sender_address,
        sender_state: body.sender_state,
        sender_city: body.sender_city,
        sender_country: body.sender_country,
        sender_email: body.sender_email,
        // Receiver details
        receiver_name: body.receiver_name,
        receiver_phone: body.receiver_phone,
        receiver_address: body.receiver_address,
        receiver_state: body.receiver_state,
        receiver_city: body.receiver_city,
        receiver_post_code: body.receiver_post_code,
        receiver_country: body.receiver_country,
        // Shipment details
        shipment_description: body.shipment_description,
        shipment_quantity: body.shipment_quantity,
        shipment_value: body.shipment_value,
        shipment_weight: body.shipment_weight,
        // Pricing details
        zone_picked: body.zone_picked,
        delivery_speed: body.delivery_speed,
        amount_paid: body.amount_paid,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Order creation failed" }));
      return NextResponse.json(
        { detail: error.detail || "Order creation failed" },
        { status: response.status },
      );
    }

    const orderResponse = (await response.json()) as OrderResponse;

    return NextResponse.json(orderResponse, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Order creation failed",
      },
      { status: 400 },
    );
  }
}
