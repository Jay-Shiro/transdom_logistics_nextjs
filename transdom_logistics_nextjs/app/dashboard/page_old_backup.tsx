"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { hasValidAuth, getAuthUser } from "@/lib/auth";

const QUOTATION_STORAGE_KEY = "transdom_quotation_form";

interface QuotationData {
  pickupCountry: string;
  destinationCountry: string;
  weight: number;
  deliverySpeed: "economy" | "standard" | "express";
  price: string;
  zone: string;
  zoneDisplay: string;
  estimatedDelivery: string;
  timestamp: number;
}

interface BookingFormData {
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
  shipment_value: number;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuotation = searchParams.get("from") === "quotation";

  const user = getAuthUser();
  const isAuth = hasValidAuth();

  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookingData, setBookingData] = useState<BookingFormData>({
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    sender_state: "",
    sender_city: "",
    sender_country: "",
    sender_email: user?.email || "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    receiver_state: "",
    receiver_city: "",
    receiver_post_code: "",
    receiver_country: "",
    shipment_description: "",
    shipment_quantity: 1,
    shipment_value: 0,
  });

  useEffect(() => {
    if (!isAuth || !user) {
      router.push("/sign-in");
      return;
    }

    // Check if coming from quotation
    if (fromQuotation) {
      const savedQuotation = localStorage.getItem(QUOTATION_STORAGE_KEY);
      if (savedQuotation) {
        try {
          const parsed = JSON.parse(savedQuotation);
          setQuotation(parsed);
        } catch (e) {
          console.error("Failed to parse quotation data:", e);
        }
      }
    }
  }, [isAuth, user, router, fromQuotation]);

  const handleBookingChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({
      ...prev,
      [name]:
        name === "shipment_quantity" || name === "shipment_value"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleClearQuotation = () => {
    localStorage.removeItem(QUOTATION_STORAGE_KEY);
    setQuotation(null);
    router.push("/dashboard");
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!quotation) {
        throw new Error("No quotation data found");
      }

      // Validate required fields
      const requiredFields: (keyof BookingFormData)[] = [
        "sender_name",
        "sender_phone",
        "sender_address",
        "sender_state",
        "sender_city",
        "sender_country",
        "receiver_name",
        "receiver_phone",
        "receiver_address",
        "receiver_state",
        "receiver_city",
        "receiver_post_code",
        "receiver_country",
        "shipment_description",
      ];

      for (const field of requiredFields) {
        if (!bookingData[field]) {
          throw new Error(`Please fill in ${field.replace(/_/g, " ")}`);
        }
      }

      // Save complete booking details with quotation for payment processing
      const completeBookingData = {
        ...bookingData,
        quotation: quotation,
      };

      localStorage.setItem(
        "transdom_booking_details",
        JSON.stringify(completeBookingData),
      );

      // Redirect to payment page with quotation details
      const queryParams = new URLSearchParams({
        zone: quotation.zone,
        weight: quotation.weight.toString(),
        price: quotation.price,
        speed: quotation.deliverySpeed,
      });

      router.push(`/payment?${queryParams.toString()}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to proceed to payment",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuth || !user) {
    return null;
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ color: "#6b7280" }}>Welcome, {user.firstname}</span>
            <Link
              href="/quotation"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#10b981",
                color: "#fff",
                borderRadius: "0.375rem",
                textDecoration: "none",
              }}
            >
              New Quote
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "#f9fafb",
          minHeight: "80vh",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "2rem",
            }}
          >
            Dashboard
          </h1>

          {/* Quotation Display */}
          {quotation ? (
            <div
              style={{
                backgroundColor: "#fff",
                padding: "2rem",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  Your Quotation
                </h2>
                <button
                  onClick={handleClearQuotation}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Clear Quote
                </button>
              </div>

              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #d1fae5",
                  padding: "1.5rem",
                  borderRadius: "0.375rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1rem",
                    fontSize: "14px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "#047857",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      From:
                    </span>
                    <span style={{ fontWeight: "500", color: "#065f46" }}>
                      {quotation.pickupCountry}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        color: "#047857",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      To:
                    </span>
                    <span style={{ fontWeight: "500", color: "#065f46" }}>
                      {quotation.destinationCountry}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        color: "#047857",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Weight:
                    </span>
                    <span style={{ fontWeight: "500", color: "#065f46" }}>
                      {quotation.weight} kg
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        color: "#047857",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Zone:
                    </span>
                    <span style={{ fontWeight: "500", color: "#065f46" }}>
                      {quotation.zoneDisplay}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        color: "#047857",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Delivery Speed:
                    </span>
                    <span
                      style={{
                        fontWeight: "500",
                        color: "#065f46",
                        textTransform: "capitalize",
                      }}
                    >
                      {quotation.deliverySpeed}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        color: "#047857",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Estimated Delivery:
                    </span>
                    <span style={{ fontWeight: "500", color: "#065f46" }}>
                      {quotation.estimatedDelivery}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "2px solid #d1fae5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#065f46",
                    }}
                  >
                    Total Price:
                  </span>
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#10b981",
                    }}
                  >
                    ₦{parseFloat(quotation.price).toLocaleString()}
                  </span>
                </div>
              </div>

              {!showBookingForm ? (
                <button
                  onClick={() => setShowBookingForm(true)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Proceed to Booking Details
                </button>
              ) : (
                /* Booking Form */
                <form onSubmit={handleProceedToPayment}>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "600",
                      color: "#1f2937",
                      marginBottom: "1.5rem",
                    }}
                  >
                    Booking Details
                  </h3>

                  {/* Sender Details */}
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "1.5rem",
                      borderRadius: "0.375rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "1rem",
                      }}
                    >
                      Sender Information
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "1rem",
                      }}
                    >
                      <input
                        type="text"
                        name="sender_name"
                        placeholder="Full Name"
                        value={bookingData.sender_name}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="tel"
                        name="sender_phone"
                        placeholder="Phone Number"
                        value={bookingData.sender_phone}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="email"
                        name="sender_email"
                        placeholder="Email"
                        value={bookingData.sender_email}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          gridColumn: "span 2",
                        }}
                      />
                      <input
                        type="text"
                        name="sender_address"
                        placeholder="Address"
                        value={bookingData.sender_address}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          gridColumn: "span 2",
                        }}
                      />
                      <input
                        type="text"
                        name="sender_city"
                        placeholder="City"
                        value={bookingData.sender_city}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="text"
                        name="sender_state"
                        placeholder="State"
                        value={bookingData.sender_state}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="text"
                        name="sender_country"
                        placeholder="Country"
                        value={bookingData.sender_country}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          gridColumn: "span 2",
                        }}
                      />
                    </div>
                  </div>

                  {/* Receiver Details */}
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "1.5rem",
                      borderRadius: "0.375rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "1rem",
                      }}
                    >
                      Receiver Information
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "1rem",
                      }}
                    >
                      <input
                        type="text"
                        name="receiver_name"
                        placeholder="Full Name"
                        value={bookingData.receiver_name}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="tel"
                        name="receiver_phone"
                        placeholder="Phone Number"
                        value={bookingData.receiver_phone}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="text"
                        name="receiver_address"
                        placeholder="Address"
                        value={bookingData.receiver_address}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          gridColumn: "span 2",
                        }}
                      />
                      <input
                        type="text"
                        name="receiver_city"
                        placeholder="City"
                        value={bookingData.receiver_city}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="text"
                        name="receiver_state"
                        placeholder="State"
                        value={bookingData.receiver_state}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="text"
                        name="receiver_post_code"
                        placeholder="Postal Code"
                        value={bookingData.receiver_post_code}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                      <input
                        type="text"
                        name="receiver_country"
                        placeholder="Country"
                        value={bookingData.receiver_country}
                        onChange={handleBookingChange}
                        required
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                        }}
                      />
                    </div>
                  </div>

                  {/* Shipment Details */}
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "1.5rem",
                      borderRadius: "0.375rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "1rem",
                      }}
                    >
                      Shipment Information
                    </h4>
                    <div style={{ display: "grid", gap: "1rem" }}>
                      <textarea
                        name="shipment_description"
                        placeholder="Package Description"
                        value={bookingData.shipment_description}
                        onChange={handleBookingChange}
                        required
                        rows={3}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          resize: "vertical",
                        }}
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "1rem",
                        }}
                      >
                        <input
                          type="number"
                          name="shipment_quantity"
                          placeholder="Quantity"
                          value={bookingData.shipment_quantity}
                          onChange={handleBookingChange}
                          min="1"
                          required
                          style={{
                            padding: "0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                          }}
                        />
                        <input
                          type="number"
                          name="shipment_value"
                          placeholder="Value (₦)"
                          value={bookingData.shipment_value}
                          onChange={handleBookingChange}
                          min="0"
                          step="0.01"
                          style={{
                            padding: "0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div
                      style={{
                        backgroundColor: "#fee2e2",
                        border: "1px solid #fecaca",
                        padding: "1rem",
                        borderRadius: "0.375rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#dc2626",
                          margin: 0,
                        }}
                      >
                        ⚠️ {error}
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#f3f4f6",
                        color: "#1f2937",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: loading ? "#9ca3af" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {loading ? "Processing..." : "Proceed to Payment"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fff",
                padding: "3rem",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "1rem",
                }}
              >
                No Active Quotation
              </h2>
              <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
                Get started by requesting a shipping quotation
              </p>
              <Link
                href="/quotation"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#10b981",
                  color: "#fff",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                Get a Quote
              </Link>
            </div>
          )}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
