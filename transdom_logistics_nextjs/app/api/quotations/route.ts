import { NextRequest, NextResponse } from "next/server";
import { getZoneForCountry, getZoneDisplayName } from "@/lib/zone-mapping";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface QuotationRequest {
  pickupCountry: string;
  destinationCountry: string;
  weight: number;
}

interface BookingDetailsRequest {
  pickupCountry: string;
  destinationCountry: string;
  weight: number;
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
  delivery_speed: "economy" | "standard" | "express";
}

interface PriceResponse {
  zone: string;
  weight: number;
  price: string;
  currency: string;
}

interface DeliveryOption {
  speed: "economy" | "standard" | "express";
  price: string;
  estimated_delivery: string;
  multiplier: number;
}

/**
 * POST /api/quotations
 * Calculate shipping quote based on pickup/destination countries and weight
 * Returns all 3 delivery speed options for user to choose
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuotationRequest;

    // Validate required fields
    if (!body.pickupCountry || !body.destinationCountry || !body.weight) {
      return NextResponse.json(
        {
          detail:
            "Missing required fields: pickupCountry, destinationCountry, weight",
        },
        { status: 422 },
      );
    }

    if (body.weight <= 0) {
      return NextResponse.json(
        { detail: "Weight must be greater than 0" },
        { status: 422 },
      );
    }

    // Map destination country to zone
    const destinationZone = getZoneForCountry(body.destinationCountry);

    if (!destinationZone) {
      return NextResponse.json(
        {
          detail: `Unsupported destination country: ${body.destinationCountry}`,
          suggestion:
            "Please check the country name or contact support for shipping to this location.",
        },
        { status: 400 },
      );
    }

    console.log(`Mapped ${body.destinationCountry} -> ${destinationZone}`);

    // Round up weight to nearest whole number
    const weightRounded = Math.ceil(body.weight);

    // Fetch base price from FastAPI backend: GET /api/rates/{zone}/price?weight={weight}
    const priceUrl = `${API_BASE_URL}/api/rates/${encodeURIComponent(destinationZone)}/price?weight=${weightRounded}`;
    console.log(`Fetching price from: ${priceUrl}`);

    const response = await fetch(priceUrl);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to fetch price" }));
      return NextResponse.json(
        {
          detail:
            error.detail ||
            `Failed to fetch price for zone: ${destinationZone}`,
        },
        { status: response.status },
      );
    }

    const priceResponse = (await response.json()) as PriceResponse;

    // Parse the price (handles both numeric and formatted string like "1,234.56")
    const basePriceStr = priceResponse.price.toString().replace(/,/g, "");
    const standardPrice = parseFloat(basePriceStr);

    if (isNaN(standardPrice)) {
      return NextResponse.json(
        { detail: "Invalid price returned from backend" },
        { status: 500 },
      );
    }

    // Calculate all three delivery options
    // Standard is the base price from DB
    // Express is 2x standard
    // Economy is standard / 2
    const deliveryOptions: DeliveryOption[] = [
      {
        speed: "economy",
        price: (standardPrice / 2).toFixed(2),
        estimated_delivery: "14-21 business days",
        multiplier: 0.5,
      },
      {
        speed: "standard",
        price: standardPrice.toFixed(2),
        estimated_delivery: "7-10 business days",
        multiplier: 1.0,
      },
      {
        speed: "express",
        price: (standardPrice * 2).toFixed(2),
        estimated_delivery: "3-5 business days",
        multiplier: 2.0,
      },
    ];

    return NextResponse.json(
      {
        pickup_country: body.pickupCountry,
        destination_country: body.destinationCountry,
        destination_zone: getZoneDisplayName(destinationZone),
        weight: body.weight,
        weight_rounded: weightRounded,
        currency: priceResponse.currency || "NGN",
        delivery_options: deliveryOptions,
        base_price: standardPrice.toFixed(2), // Standard price from DB
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Quotation error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "Quotation calculation failed",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/quotations
 * Create an order with complete booking details
 * This stores the quotation details temporarily for the user to review before payment
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingDetailsRequest;

    // Validate booking details
    if (
      !body.sender_name ||
      !body.receiver_name ||
      !body.shipment_description
    ) {
      return NextResponse.json(
        { detail: "Missing required booking details" },
        { status: 422 },
      );
    }

    if (!body.delivery_speed) {
      return NextResponse.json(
        { detail: "Missing delivery speed selection" },
        { status: 422 },
      );
    }

    // Get token from HTTP-only cookie
    const token = request.cookies.get("backend_auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { detail: "Unauthorized - Please login to create a quotation" },
        { status: 401 },
      );
    }

    // Map destination country to zone
    const destinationZone = getZoneForCountry(body.destinationCountry);

    if (!destinationZone) {
      return NextResponse.json(
        {
          detail: `Unsupported destination country: ${body.destinationCountry}`,
        },
        { status: 400 },
      );
    }

    // Calculate final price based on delivery speed
    const weightRounded = Math.ceil(body.weight);
    const priceUrl = `${API_BASE_URL}/api/rates/${encodeURIComponent(destinationZone)}/price?weight=${weightRounded}`;
    const priceResponse = await fetch(priceUrl);

    if (!priceResponse.ok) {
      return NextResponse.json(
        { detail: "Failed to fetch price" },
        { status: 500 },
      );
    }

    const priceData = (await priceResponse.json()) as PriceResponse;
    const basePriceStr = priceData.price.toString().replace(/,/g, "");
    const standardPrice = parseFloat(basePriceStr);

    // Calculate final price based on delivery speed
    let finalPrice = standardPrice;
    if (body.delivery_speed === "economy") {
      finalPrice = standardPrice / 2;
    } else if (body.delivery_speed === "express") {
      finalPrice = standardPrice * 2;
    }

    // Return quotation summary for user to review before payment
    // This does NOT create the order yet - that happens after payment
    return NextResponse.json(
      {
        zone_picked: destinationZone,
        zone_display: getZoneDisplayName(destinationZone),
        weight: body.shipment_weight,
        delivery_speed: body.delivery_speed,
        amount: finalPrice,
        currency: priceData.currency || "NGN",
        booking_details: {
          sender: {
            name: body.sender_name,
            phone: body.sender_phone,
            address: body.sender_address,
            state: body.sender_state,
            city: body.sender_city,
            country: body.sender_country,
            email: body.sender_email,
          },
          receiver: {
            name: body.receiver_name,
            phone: body.receiver_phone,
            address: body.receiver_address,
            state: body.receiver_state,
            city: body.receiver_city,
            post_code: body.receiver_post_code,
            country: body.receiver_country,
          },
          shipment: {
            description: body.shipment_description,
            quantity: body.shipment_quantity,
            value: body.shipment_value,
            weight: body.shipment_weight,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Quotation creation error:", error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Failed to create quotation",
      },
      { status: 500 },
    );
  }
}
