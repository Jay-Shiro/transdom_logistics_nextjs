"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const QUOTATION_STORAGE_KEY = "transdom_quotation_form";
const BOOKING_STORAGE_KEY = "transdom_booking_details";

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found. Please try again.");
      return;
    }

    verifyPaymentAndCreateOrder();
  }, [reference]);

  const verifyPaymentAndCreateOrder = async () => {
    try {
      setStatus("loading");
      setMessage("Verifying your payment...");

      const verifyResponse = await fetch(
        `/api/payments/verify?reference=${reference}`,
        { cache: "no-store" },
      );

      if (!verifyResponse.ok) {
        throw new Error("Payment verification failed");
      }

      const verifyData = await verifyResponse.json();

      if (verifyData.status !== "success") {
        throw new Error(verifyData.message || "Payment was not successful");
      }

      setMessage("Payment verified! Creating your shipment order...");

      const savedBooking = localStorage.getItem(BOOKING_STORAGE_KEY);
      if (!savedBooking) {
        throw new Error("Booking details not found. Please contact support.");
      }

      const bookingDetails = JSON.parse(savedBooking);

      // The booking details are stored in a flat structure from the dashboard
      if (!bookingDetails.zone_picked || !bookingDetails.delivery_speed || !bookingDetails.amount_paid) {
        throw new Error("Quotation details not found.");
      }

      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: bookingDetails.sender_name,
          sender_phone: bookingDetails.sender_phone,
          sender_address: bookingDetails.sender_address,
          sender_state: bookingDetails.sender_state,
          sender_city: bookingDetails.sender_city,
          sender_country: bookingDetails.sender_country,
          sender_email: bookingDetails.sender_email,
          receiver_name: bookingDetails.receiver_name,
          receiver_phone: bookingDetails.receiver_phone,
          receiver_address: bookingDetails.receiver_address,
          receiver_state: bookingDetails.receiver_state,
          receiver_city: bookingDetails.receiver_city,
          receiver_post_code: bookingDetails.receiver_post_code,
          receiver_country: bookingDetails.receiver_country,
          shipment_description: bookingDetails.shipment_description,
          shipment_quantity: bookingDetails.shipment_quantity,
          shipment_value: bookingDetails.shipment_value,
          shipment_weight: bookingDetails.shipment_weight,
          zone_picked: bookingDetails.zone_picked,
          delivery_speed: bookingDetails.delivery_speed,
          amount_paid: bookingDetails.amount_paid,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await orderResponse.json();

      // Clear both storage keys after successful order creation
      localStorage.removeItem(QUOTATION_STORAGE_KEY);
      localStorage.removeItem(BOOKING_STORAGE_KEY);

      setStatus("success");
      setMessage("Payment successful!");
      setOrderNo(orderData.order_no);
      setOrderDetails(orderData);
    } catch (err) {
      setStatus("failed");
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please contact support.",
      );
    }
  };

  return (
    <>
      {/* Loading spinner animation */}
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

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
            justifyContent: "center",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
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
              style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937" }}
            >
              Transdom Logistics
            </span>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "#f9fafb",
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "3rem",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            {/* LOADING STATE */}
            {status === "loading" && (
              <>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    border: "4px solid #e5e7eb",
                    borderTopColor: "#10b981",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 2rem",
                  }}
                />
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "1rem",
                  }}
                >
                  {message || "Processing..."}
                </h1>
                <p style={{ color: "#6b7280", fontSize: "16px" }}>
                  Please wait while we confirm your payment and create your
                  shipment order.
                </p>
                <style jsx>{`
                  @keyframes spin {
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}</style>
              </>
            )}

            {/* SUCCESS STATE */}
            {status === "success" && (
              <>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    backgroundColor: "#d1fae5",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 2rem",
                  }}
                >
                  <svg
                    style={{ width: "40px", height: "40px", color: "#10b981" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "0.5rem",
                  }}
                >
                  Payment Successful!
                </h1>

                <p
                  style={{
                    color: "#10b981",
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "2rem",
                  }}
                >
                  Your shipment has been booked successfully
                </p>

                {/* Order Number */}
                {orderNo && (
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "2px solid #d1fae5",
                      padding: "1.5rem",
                      borderRadius: "0.5rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#047857",
                        marginBottom: "0.5rem",
                        textTransform: "uppercase",
                        fontWeight: "600",
                      }}
                    >
                      Order Number
                    </p>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#065f46",
                        margin: 0,
                        fontFamily: "monospace",
                      }}
                    >
                      {orderNo}
                    </p>
                  </div>
                )}

                {/* Order Details Summary */}
                {orderDetails && (
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "1.5rem",
                      borderRadius: "0.5rem",
                      marginBottom: "2rem",
                      textAlign: "left",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#1f2937",
                        marginBottom: "1rem",
                      }}
                    >
                      Shipment Details
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gap: "0.75rem",
                        fontSize: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>From:</span>
                        <span style={{ color: "#1f2937", fontWeight: "500" }}>
                          {orderDetails.sender_name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>To:</span>
                        <span style={{ color: "#1f2937", fontWeight: "500" }}>
                          {orderDetails.receiver_name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>Weight:</span>
                        <span style={{ color: "#1f2937", fontWeight: "500" }}>
                          {orderDetails.shipment_weight} kg
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>
                          Delivery Speed:
                        </span>
                        <span
                          style={{
                            color: "#1f2937",
                            fontWeight: "500",
                            textTransform: "capitalize",
                          }}
                        >
                          {orderDetails.delivery_speed}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>Status:</span>
                        <span
                          style={{
                            color: "#10b981",
                            fontWeight: "600",
                            textTransform: "capitalize",
                          }}
                        >
                          {orderDetails.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmation Message */}
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
                    📧 A confirmation email has been sent to your registered
                    email address.
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "grid", gap: "1rem" }}>
                  <Link
                    href="/dashboard"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "16px",
                      fontWeight: "600",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    View My Shipments
                  </Link>
                  <Link
                    href="/quotation"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#f3f4f6",
                      color: "#1f2937",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "16px",
                      fontWeight: "600",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    Create New Shipment
                  </Link>
                </div>
              </>
            )}

            {/* FAILED STATE */}
            {status === "failed" && (
              <>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    backgroundColor: "#fee2e2",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 2rem",
                  }}
                >
                  <svg
                    style={{ width: "40px", height: "40px", color: "#dc2626" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>

                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "0.5rem",
                  }}
                >
                  Payment Failed
                </h1>

                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "16px",
                    fontWeight: "500",
                    marginBottom: "2rem",
                  }}
                >
                  {message}
                </p>

                {/* Error Details */}
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    marginBottom: "2rem",
                  }}
                >
                  <p style={{ fontSize: "14px", color: "#991b1b", margin: 0 }}>
                    If you believe this is an error or if payment was deducted,
                    please contact our support team with the reference number.
                  </p>
                </div>

                {reference && (
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "1rem",
                      borderRadius: "0.375rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Reference Number:
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1f2937",
                        margin: 0,
                        fontFamily: "monospace",
                      }}
                    >
                      {reference}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "grid", gap: "1rem" }}>
                  <Link
                    href="/quotation"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "16px",
                      fontWeight: "600",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    Try Again
                  </Link>
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
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    Go to Dashboard
                  </Link>
                  <a
                    href="mailto:support@transdom.com"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#fff",
                      color: "#1f2937",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      fontSize: "14px",
                      fontWeight: "500",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    📧 Contact Support
                  </a>
                </div>
              </>
            )}
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

export default function PaymentVerifyPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center" }}>Loading...</div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
