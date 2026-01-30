"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import { hasValidAuth } from "@/lib/auth";

const QUOTATION_STORAGE_KEY = "transdom_quotation_form";

// Country options with proper names that match zone mapping
const COUNTRIES = [
  // Africa
  { value: "Nigeria", label: "Nigeria" },
  { value: "Ghana", label: "Ghana" },
  { value: "Kenya", label: "Kenya" },
  { value: "South Africa", label: "South Africa" },
  { value: "Egypt", label: "Egypt" },

  // Europe
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "France", label: "France" },
  { value: "Germany", label: "Germany" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Netherlands", label: "Netherlands" },

  // Americas
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Brazil", label: "Brazil" },
  { value: "Mexico", label: "Mexico" },

  // Asia
  { value: "China", label: "China" },
  { value: "Japan", label: "Japan" },
  { value: "India", label: "India" },
  { value: "Singapore", label: "Singapore" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
];

interface DeliveryOption {
  speed: "economy" | "standard" | "express";
  price: string;
  estimated_delivery: string;
  multiplier: number;
}

interface QuotationResult {
  pickup_country: string;
  destination_country: string;
  destination_zone: string;
  weight: number;
  weight_rounded: number;
  currency: string;
  delivery_options: DeliveryOption[];
  base_price: string;
}

export default function QuotationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"international" | "local">(
    "international",
  );
  const [quotationResult, setQuotationResult] =
    useState<QuotationResult | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<
    "economy" | "standard" | "express"
  >("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store form data for use after getting pricing
  const [formData, setFormData] = useState<{
    pickupCountry: string;
    destinationCountry: string;
    weight: string;
  } | null>(null);

  const handleInternationalSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formDataObj = new FormData(e.currentTarget);
    const pickupCountry = formDataObj.get("pickup-country") as string;
    const destinationCountry = formDataObj.get("destination-country") as string;
    const weight = formDataObj.get("weight") as string;

    if (!pickupCountry || !destinationCountry || !weight) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    // Store form data for later use
    setFormData({
      pickupCountry,
      destinationCountry,
      weight,
    });

    try {
      // Call quotation API
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupCountry,
          destinationCountry,
          weight: parseFloat(weight),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to calculate quotation");
      }

      const result: QuotationResult = await response.json();
      setQuotationResult(result);
      setSelectedSpeed("standard"); // Default to standard
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!quotationResult || !formData) return;

    // Find the selected delivery option
    const selectedOption = quotationResult.delivery_options.find(
      (opt) => opt.speed === selectedSpeed,
    );

    if (!selectedOption) return;

    // Save complete quotation data to localStorage
    const quotationData = {
      pickupCountry: formData.pickupCountry,
      destinationCountry: formData.destinationCountry,
      weight: formData.weight,
      zone: quotationResult.destination_zone,
      deliverySpeed: selectedSpeed,
      price: selectedOption.price,
      currency: quotationResult.currency,
      estimatedDelivery: selectedOption.estimated_delivery,
      isLocal: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(quotationData));

    // Check if user is authenticated
    const isAuth = hasValidAuth();
    if (isAuth) {
      // User is authenticated, go to dashboard
      router.push("/dashboard");
    } else {
      // User not authenticated, redirect to sign-in with redirect param
      router.push("/sign-in?redirect=quotation");
    }
  };

  const handleRecalculate = () => {
    setQuotationResult(null);
    setFormData(null);
    setError(null);
  };

  return (
    <>
      <Header />

      {/* Quotation Form Section */}
      <section className="quotation-form-section">
        <div className="quotation-wrapper">
          <div className="quotation-text-content">
            <h1>Shipping Price Calculator</h1>
            <p>
              Calculate your shipping costs in seconds. Easily determine the
              cost of shipping your packages by inputting your country, shipment
              weight, and delivery options and receive an instant, accurate
              estimate of your shipping cost.
            </p>
            <div className="quotation-text-image">
              <Image
                src="/assets/hero_image.svg"
                alt="Shipping Illustration"
                width={600}
                height={400}
              />
            </div>
          </div>
          <div className="quotation-container">
            <div className="shipping-tabs">
              <button
                className={`tab-btn ${activeTab === "international" ? "active" : ""}`}
                onClick={() => setActiveTab("international")}
              >
                INTERNATIONAL
              </button>
              <button
                className={`tab-btn ${activeTab === "local" ? "active" : ""}`}
                onClick={() => setActiveTab("local")}
              >
                LOCAL
              </button>
            </div>

            {/* International Form */}
            {activeTab === "international" && !quotationResult && (
              <form
                className="quotation-form"
                onSubmit={handleInternationalSubmit}
              >
                <h3 className="form-section-title">Pickup</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pickup-country">Country</label>
                    <select
                      name="pickup-country"
                      id="pickup-country"
                      className="form-control"
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <h3 className="form-section-title">Destination</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="destination-country">Country</label>
                    <select
                      name="destination-country"
                      id="destination-country"
                      className="form-control"
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="weight">Weight (KG)</label>
                    <input
                      type="number"
                      name="weight"
                      id="weight"
                      className="form-control"
                      placeholder="Enter weight"
                      min="0.1"
                      step="0.1"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#fee",
                      color: "#c33",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-calculate"
                  disabled={isLoading}
                >
                  {isLoading ? "CALCULATING..." : "GET PRICING"}
                </button>
              </form>
            )}

            {/* Pricing Result Display */}
            {activeTab === "international" && quotationResult && (
              <div className="quotation-form">
                <h3 className="form-section-title">Shipping Quote</h3>

                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#666",
                    }}
                  >
                    <span>From:</span>
                    <strong>{quotationResult.pickup_country}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#666",
                    }}
                  >
                    <span>To:</span>
                    <strong>{quotationResult.destination_country}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#666",
                    }}
                  >
                    <span>Weight:</span>
                    <strong>{quotationResult.weight} KG</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.9rem",
                      color: "#666",
                    }}
                  >
                    <span>Zone:</span>
                    <strong>{quotationResult.destination_zone}</strong>
                  </div>
                </div>

                <h3 className="form-section-title">Select Delivery Speed</h3>

                <div style={{ marginBottom: "1.5rem" }}>
                  {quotationResult.delivery_options.map((option) => (
                    <div
                      key={option.speed}
                      onClick={() => setSelectedSpeed(option.speed)}
                      style={{
                        border: "2px solid",
                        borderColor:
                          selectedSpeed === option.speed ? "#c8102e" : "#ddd",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1rem",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        backgroundColor:
                          selectedSpeed === option.speed ? "#fff5f5" : "white",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div>
                          <input
                            type="radio"
                            name="delivery-speed"
                            value={option.speed}
                            checked={selectedSpeed === option.speed}
                            onChange={() => setSelectedSpeed(option.speed)}
                            style={{ marginRight: "0.5rem" }}
                          />
                          <strong
                            style={{
                              textTransform: "capitalize",
                              fontSize: "1.1rem",
                            }}
                          >
                            {option.speed}
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: "1.3rem",
                            fontWeight: "bold",
                            color: "#c8102e",
                          }}
                        >
                          {quotationResult.currency}{" "}
                          {parseFloat(option.price).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#666" }}>
                        📦 Estimated delivery: {option.estimated_delivery}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexDirection: "column",
                  }}
                >
                  <button
                    type="button"
                    className="btn-calculate"
                    onClick={handleBookNow}
                  >
                    BOOK NOW
                  </button>
                  <button
                    type="button"
                    onClick={handleRecalculate}
                    style={{
                      padding: "1rem",
                      backgroundColor: "transparent",
                      color: "#c8102e",
                      border: "2px solid #c8102e",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff5f5";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    RECALCULATE
                  </button>
                </div>
              </div>
            )}

            {/* Local Form */}
            {activeTab === "local" && (
              <div
                className="quotation-form"
                style={{ textAlign: "center", padding: "4rem 2rem" }}
              >
                <h3
                  className="form-section-title"
                  style={{ fontSize: "2rem", marginBottom: "1rem" }}
                >
                  Coming Soon
                </h3>
                <p
                  style={{
                    fontSize: "1.1rem",
                    color: "#666",
                    marginBottom: "2rem",
                  }}
                >
                  Local delivery calculator will be available soon. Stay tuned!
                </p>
                <div style={{ fontSize: "3rem", opacity: "0.3" }}>🚚</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta" id="contact">
        <h2>Ready to Ship with Transdom?</h2>
        <p>
          Start shipping today and experience the difference of world-class
          logistics
        </p>
        <Link href="/sign-up" className="btn-primary">
          Get Started Now
        </Link>
      </section>

      <Footer />
    </>
  );
}
