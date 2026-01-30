import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co/transaction/initialize";

interface BookingDetails {
  sender: {
    name: string;
    phone: string;
    address: string;
    state: string;
    city: string;
    country: string;
    email: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    state: string;
    city: string;
    post_code: string;
    country: string;
  };
  shipment: {
    description: string;
    quantity: number;
    value?: number;
    weight: number;
  };
}

/**
 * POST /api/payments/initialize
 * Initialize a Paystack payment transaction with complete booking details
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const cookieStore = await cookies();
    const authToken = cookieStore.get("backend_auth_token");

    if (!authToken) {
      return NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      amount,
      email,
      zone,
      delivery_speed,
      booking_details,
    }: {
      amount: number;
      email: string;
      zone: string;
      delivery_speed: string;
      booking_details: BookingDetails;
    } = body;

    // Validate required fields
    if (!amount || !email || !zone || !booking_details) {
      return NextResponse.json(
        {
          detail:
            "Missing required fields: amount, email, zone, booking_details",
        },
        { status: 422 },
      );
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { detail: "Amount must be a positive number" },
        { status: 422 },
      );
    }

    // Validate booking details structure
    if (
      !booking_details.sender ||
      !booking_details.receiver ||
      !booking_details.shipment
    ) {
      return NextResponse.json(
        { detail: "Invalid booking details structure" },
        { status: 422 },
      );
    }

    // Convert amount to kobo (Paystack uses kobo, not naira)
    const amountInKobo = Math.round(amount * 100);

    // Generate a unique reference for this transaction
    const reference = `TDL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare callback URL (where Paystack will redirect after payment)
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment/success`;

    // Initialize payment with Paystack
    // Store ALL booking details in metadata for order creation after payment
    const paystackResponse = await fetch(PAYSTACK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        reference,
        callback_url: callbackUrl,
        metadata: {
          zone,
          delivery_speed: delivery_speed || "standard",
          // Sender details
          sender_name: booking_details.sender.name,
          sender_phone: booking_details.sender.phone,
          sender_address: booking_details.sender.address,
          sender_state: booking_details.sender.state,
          sender_city: booking_details.sender.city,
          sender_country: booking_details.sender.country,
          sender_email: booking_details.sender.email,
          // Receiver details
          receiver_name: booking_details.receiver.name,
          receiver_phone: booking_details.receiver.phone,
          receiver_address: booking_details.receiver.address,
          receiver_state: booking_details.receiver.state,
          receiver_city: booking_details.receiver.city,
          receiver_post_code: booking_details.receiver.post_code,
          receiver_country: booking_details.receiver.country,
          // Shipment details
          shipment_description: booking_details.shipment.description,
          shipment_quantity: booking_details.shipment.quantity,
          shipment_value: booking_details.shipment.value,
          shipment_weight: booking_details.shipment.weight,
          custom_fields: [
            {
              display_name: "Destination Zone",
              variable_name: "zone",
              value: zone,
            },
            {
              display_name: "Weight (kg)",
              variable_name: "shipment_weight",
              value: booking_details.shipment.weight.toString(),
            },
            {
              display_name: "Delivery Speed",
              variable_name: "delivery_speed",
              value: delivery_speed || "standard",
            },
            {
              display_name: "Sender Name",
              variable_name: "sender_name",
              value: booking_details.sender.name,
            },
            {
              display_name: "Receiver Name",
              variable_name: "receiver_name",
              value: booking_details.receiver.name,
            },
          ],
        },
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json().catch(() => ({}));
      console.error("Paystack initialization failed:", errorData);

      return NextResponse.json(
        {
          detail: errorData.message || "Payment initialization failed",
          error: errorData,
        },
        { status: paystackResponse.status },
      );
    }

    const paystackData = await paystackResponse.json();

    // Return the authorization URL and reference
    return NextResponse.json(
      {
        status: "success",
        message: "Payment initialized",
        data: {
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
          reference: paystackData.data.reference,
        },
        metadata: {
          zone,
          delivery_speed: delivery_speed || "standard",
          amount,
          booking_details,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
      },
      { status: 500 },
    );
  }
}
