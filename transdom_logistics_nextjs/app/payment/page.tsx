"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { hasValidAuth, getAuthUser } from "@/lib/auth";

interface PaymentInitResponse {
  status: string;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
  metadata: {
    zone: string;
    weight: number;
    delivery_speed: string;
    amount: number;
  };
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const zone = searchParams.get("zone") || "";
  const weight = searchParams.get("weight") || "";
  const price = searchParams.get("price") || "";
  const speed = searchParams.get("speed") || "standard";

  const user = getAuthUser();
  const isAuth = hasValidAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuth || !user) {
      router.push("/sign-in");
      return;
    }

    // Validate required parameters
    if (!zone || !weight || !price) {
      setError(
        "Missing payment details. Please start from the quotation page.",
      );
    }
  }, [isAuth, user, router, zone, weight, price]);

  const handlePayment = async () => {
    if (!zone || !weight || !price || !user) {
      setError("Missing required payment information");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Parse amount (remove commas if present)
      const amount = parseFloat(price.replace(/,/g, ""));

      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid payment amount");
      }

      // Retrieve booking details from localStorage
      const savedBookingDetails = localStorage.getItem("transdom_booking_details");
      if (!savedBookingDetails) {
        throw new Error("Booking details not found. Please start from the quotation page.");
      }

      const bookingData = JSON.parse(savedBookingDetails);

      // Transform booking data to the expected structure
      const booking_details = {
        sender: {
          name: bookingData.sender_name,
          phone: bookingData.sender_phone,
          address: bookingData.sender_address,
          state: bookingData.sender_state,
          city: bookingData.sender_city,
          country: bookingData.sender_country,
          email: bookingData.sender_email,
        },
        receiver: {
          name: bookingData.receiver_name,
          phone: bookingData.receiver_phone,
          address: bookingData.receiver_address,
          state: bookingData.receiver_state,
          city: bookingData.receiver_city,
          post_code: bookingData.receiver_post_code,
          country: bookingData.receiver_country,
        },
        shipment: {
          description: bookingData.shipment_description,
          quantity: bookingData.shipment_quantity,
          value: bookingData.shipment_value,
          weight: bookingData.shipment_weight,
        },
      };

      // Initialize payment with Paystack
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          email: user.email,
          zone,
          weight: parseFloat(weight),
          delivery_speed: speed,
          booking_details,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Payment initialization failed");
      }

      const data: PaymentInitResponse = await response.json();

      // Redirect to Paystack payment page
      if (data.data && data.data.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Failed to get payment URL");
      }
    } catch (err) {
      console.error("Payment initialization error:", err);
      setError(
        err instanceof Error ? err.message : "Payment initialization failed",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuth || !user) {
    return null;
  }

  if (!zone || !weight || !price) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Invalid Payment Link</h1>
        <p>Please start from the quotation page.</p>
        <Link href="/quotation">
          <button>Go to Quotation</button>
        </Link>
      </div>
    );
  }

  const amount = parseFloat(price.replace(/,/g, ""));

  return (
    <>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 2rem",
        }}
      >
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Image
                src="/assets/transdom_logo.svg"
                alt="Transdom Logistics"
                width={40}
                height={40}
              />
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                Transdom Logistics
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Payment Section */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "#f9fafb",
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "3rem",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              Complete Your Payment
            </h1>

            <p
              style={{
                color: "#6b7280",
                fontSize: "16px",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              You will be redirected to Paystack to complete your payment
              securely.
            </p>

            {/* Order Summary */}
            <div
              style={{
                backgroundColor: "#f3f4f6",
                padding: "1.5rem",
                borderRadius: "0.375rem",
                marginBottom: "2rem",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "1rem",
                  textTransform: "uppercase",
                }}
              >
                Order Summary
              </h2>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "#6b7280" }}>Destination Zone:</span>
                <span style={{ color: "#1f2937", fontWeight: "500" }}>
                  {zone.replace(/_/g, " ")}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "#6b7280" }}>Weight:</span>
                <span style={{ color: "#1f2937", fontWeight: "500" }}>
                  {weight} kg
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "#6b7280" }}>Delivery Speed:</span>
                <span
                  style={{
                    color: "#1f2937",
                    fontWeight: "500",
                    textTransform: "capitalize",
                  }}
                >
                  {speed}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "2px solid #e5e7eb",
                  fontSize: "18px",
                }}
              >
                <span style={{ color: "#1f2937", fontWeight: "600" }}>
                  Total Amount:
                </span>
                <span
                  style={{
                    color: "#10b981",
                    fontWeight: "bold",
                    fontSize: "20px",
                  }}
                >
                  ₦{amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div
              style={{
                backgroundColor: "#ecfdf5",
                border: "1px solid #d1fae5",
                padding: "1rem",
                borderRadius: "0.375rem",
                marginBottom: "2rem",
              }}
            >
              <p style={{ fontSize: "14px", color: "#065f46", margin: 0 }}>
                💳 Payment will be processed for <strong>{user.email}</strong>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fecaca",
                  padding: "1rem",
                  borderRadius: "0.375rem",
                  marginBottom: "1.5rem",
                }}
              >
                <p style={{ fontSize: "14px", color: "#dc2626", margin: 0 }}>
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "grid", gap: "1rem" }}>
              <button
                onClick={handlePayment}
                disabled={loading || !!error}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: loading || error ? "#9ca3af" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading || error ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Redirecting to Paystack..." : "Proceed to Payment"}
              </button>

              <Link
                href="/dashboard"
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#f3f4f6",
                  color: "#1f2937",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "block",
                  textAlign: "center",
                }}
              >
                Cancel
              </Link>
            </div>

            {/* Security Note */}
            <p
              style={{
                color: "#6b7280",
                fontSize: "12px",
                marginTop: "2rem",
                textAlign: "center",
              }}
            >
              🔒 Secure payment powered by Paystack. Your payment information is
              encrypted and secure.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#1f2937",
          color: "#fff",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p>&copy; 2026 Transdom Logistics. All rights reserved.</p>
      </footer>
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading payment...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
