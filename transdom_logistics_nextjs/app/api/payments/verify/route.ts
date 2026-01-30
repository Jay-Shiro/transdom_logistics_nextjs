import { NextRequest, NextResponse } from "next/server";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * GET /api/payments/verify?reference=xxx
 * Verify a Paystack payment transaction and extract complete booking details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { detail: "Payment reference is required" },
        { status: 422 },
      );
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json().catch(() => ({}));
      console.error("Paystack verification failed:", errorData);

      return NextResponse.json(
        {
          detail: errorData.message || "Payment verification failed",
          error: errorData,
        },
        { status: paystackResponse.status },
      );
    }

    const paystackData = await paystackResponse.json();

    // Check if payment was successful
    if (!paystackData.data || paystackData.data.status !== "success") {
      return NextResponse.json(
        {
          status: "failed",
          message: "Payment was not successful",
          data: paystackData.data,
        },
        { status: 400 },
      );
    }

    // Extract metadata
    const metadata = paystackData.data.metadata || {};
    const amountInNaira = paystackData.data.amount / 100; // Convert from kobo to naira

    // Return verified payment data with complete booking details
    return NextResponse.json(
      {
        status: "success",
        message: "Payment verified successfully",
        data: {
          reference: paystackData.data.reference,
          amount: amountInNaira,
          currency: paystackData.data.currency,
          status: paystackData.data.status,
          paid_at: paystackData.data.paid_at,
          channel: paystackData.data.channel,
          metadata: {
            zone: metadata.zone,
            delivery_speed: metadata.delivery_speed,
            // Sender details
            sender_name: metadata.sender_name,
            sender_phone: metadata.sender_phone,
            sender_address: metadata.sender_address,
            sender_state: metadata.sender_state,
            sender_city: metadata.sender_city,
            sender_country: metadata.sender_country,
            sender_email: metadata.sender_email,
            // Receiver details
            receiver_name: metadata.receiver_name,
            receiver_phone: metadata.receiver_phone,
            receiver_address: metadata.receiver_address,
            receiver_state: metadata.receiver_state,
            receiver_city: metadata.receiver_city,
            receiver_post_code: metadata.receiver_post_code,
            receiver_country: metadata.receiver_country,
            // Shipment details
            shipment_description: metadata.shipment_description,
            shipment_quantity: metadata.shipment_quantity,
            shipment_value: metadata.shipment_value,
            shipment_weight: metadata.shipment_weight,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      },
      { status: 500 },
    );
  }
}
