"use client";

import { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SEO from "@/app/components/SEO";
import { useRouter } from "next/navigation";
import { hasValidAuth, getAuthUser, signInPath } from "@/lib/auth";
import { AlertTriangle, Lightbulb, MapPin } from "lucide-react";
import {
  getCountryIsoCode,
  getStatesOfCountry,
  getCitiesOfState,
  getStateIsoCode,
  StateOption,
  CityOption,
} from "@/lib/countries-data";
import SearchableSelect from "@/app/components/SearchableSelect";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://transdomlogistics.com";

// Map generic speed names to a customer-facing service name. International
// speeds are carrier-branded; local deliveries are handled in-house, so they
// are labelled by service level instead.
const getCarrierName = (speed: string, isLocal = false): string => {
  const speedMap: Record<string, string> = isLocal
    ? {
        "same-day": "Same Day",
        "next-day": "Next Day",
        standard: "Standard",
      }
    : {
        economy: "UPS",
        standard: "FedEx",
        express: "DHL",
      };
  return speedMap[speed.toLowerCase()] || speed;
};

const BASIC_QUOTE_STORAGE_KEY = "transdom_basic_quote";

interface BasicQuote {
  // Absent on quotes saved before local delivery shipped — treat as international
  shipment_type?: "international" | "local";
  pickup_country: string;
  pickup_state?: string;
  pickup_city?: string;
  destination_country: string;
  destination_state?: string;
  destination_city?: string;
  weight: number;
  zone_picked: string;
  delivery_speed:
    | "economy"
    | "standard"
    | "express"
    | "same-day"
    | "next-day";
  amount_paid: number;
  estimated_delivery: string;
  currency: string;
  timestamp: string;
}

type Step = "sender" | "receiver" | "shipment" | "addons" | "review";

export default function BookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [basicQuote, setBasicQuote] = useState<BasicQuote | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("sender");
  const [error, setError] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Local (Nigeria domestic) shipments skip the post code and never leave the
  // country, so several fields behave differently
  const isLocal = basicQuote?.shipment_type === "local";

  // Sender details
  const [senderDetails, setSenderDetails] = useState({
    name: "",
    phone: "",
    address: "",
    state: "",
    city: "",
    country: "",
    email: "",
  });

  // Receiver details
  const [receiverDetails, setReceiverDetails] = useState({
    name: "",
    phone: "",
    address: "",
    state: "",
    city: "",
    postCode: "",
    country: "",
  });

  // Shipment details
  const [shipmentDetails, setShipmentDetails] = useState({
    description: "",
    quantity: "1",
    value: "",
  });

  // Insurance addon
  const [addInsurance, setAddInsurance] = useState(false);
  const [insuranceFee, setInsuranceFee] = useState(0);
  const [calculatingInsurance, setCalculatingInsurance] = useState(false);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">(
    "online",
  );
  const [showHubModal, setShowHubModal] = useState(false);
  const [showDropOffModal, setShowDropOffModal] = useState(false);
  const [hasAcknowledgedDropOff, setHasAcknowledgedDropOff] = useState(false);

  // Dynamic state and city options
  const [senderStates, setSenderStates] = useState<StateOption[]>([]);
  const [senderCities, setSenderCities] = useState<CityOption[]>([]);
  const [receiverStates, setReceiverStates] = useState<StateOption[]>([]);
  const [receiverCities, setReceiverCities] = useState<CityOption[]>([]);
  const [senderCountryIso, setSenderCountryIso] = useState<string>("");
  const [receiverCountryIso, setReceiverCountryIso] = useState<string>("");
  const [senderStateIso, setSenderStateIso] = useState<string>("");
  const [receiverStateIso, setReceiverStateIso] = useState<string>("");

  // Check authentication and load saved quote
  useEffect(() => {
    const checkAuthAndLoadQuote = () => {
      // Check authentication
      // Second line of defence - middleware.ts already gates /booking, this
      // only fires if the session expires while the tab is open
      if (!hasValidAuth()) {
        router.push(signInPath());
        return;
      }

      // Load saved quote from localStorage
      const savedQuote = localStorage.getItem(BASIC_QUOTE_STORAGE_KEY);
      if (!savedQuote) {
        // No saved quote, redirect to quotation page
        router.push("/quotation");
        return;
      }

      try {
        const quote: BasicQuote = JSON.parse(savedQuote);
        setBasicQuote(quote);

        // Auto-fill sender details from authenticated user
        const user = getAuthUser();
        if (user) {
          setSenderDetails((prev) => ({
            ...prev,
            email: user.email,
            name: `${user.firstname} ${user.lastname}`,
            phone: user.phone_number || prev.phone,
            country: quote.pickup_country, // Use pickup country from quote
            state: quote.pickup_state || "",
            city: quote.pickup_city || "",
          }));
        }

        // Auto-fill receiver country, state, and city from destination
        setReceiverDetails((prev) => ({
          ...prev,
          country: quote.destination_country,
          state: quote.destination_state || "",
          city: quote.destination_city || "",
        }));

        setLoading(false);
      } catch (e) {
        console.error("Failed to parse saved quote:", e);
        router.push("/quotation");
      }
    };

    checkAuthAndLoadQuote();
  }, [router]);

  // Calculate insurance when shipment value changes
  useEffect(() => {
    const calculateInsurance = async () => {
      if (!addInsurance || !shipmentDetails.value) {
        setInsuranceFee(0);
        return;
      }

      const value = parseFloat(shipmentDetails.value);
      if (isNaN(value) || value <= 0) {
        setInsuranceFee(0);
        return;
      }

      setCalculatingInsurance(true);
      try {
        const response = await fetch("/api/calculate-insurance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shipment_value: value,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setInsuranceFee(data.insurance_fee);
        } else {
          setInsuranceFee(0);
        }
      } catch (err) {
        console.error("Failed to calculate insurance:", err);
        setInsuranceFee(0);
      } finally {
        setCalculatingInsurance(false);
      }
    };

    calculateInsurance();
  }, [addInsurance, shipmentDetails.value]);

  // Load sender states when sender country changes
  useEffect(() => {
    if (senderDetails.country) {
      const isoCode = getCountryIsoCode(senderDetails.country);
      if (isoCode) {
        setSenderCountryIso(isoCode);
        const states = getStatesOfCountry(isoCode);
        setSenderStates(states);
        // Reset state and city when country changes - only if they're not already empty
        setSenderDetails((prev) => {
          if (prev.state !== "" || prev.city !== "") {
            return { ...prev, state: "", city: "" };
          }
          return prev;
        });
        setSenderCities([]);
        setSenderStateIso("");
      }
    } else {
      // Clear everything if no country selected
      setSenderStates([]);
      setSenderCities([]);
      setSenderCountryIso("");
      setSenderStateIso("");
    }
  }, [senderDetails.country]);

  // Load sender cities when sender state changes
  useEffect(() => {
    if (senderCountryIso && senderDetails.state) {
      const stateIso = getStateIsoCode(senderCountryIso, senderDetails.state);
      if (stateIso) {
        setSenderStateIso(stateIso);
        const cities = getCitiesOfState(senderCountryIso, stateIso);
        setSenderCities(cities);
        // Reset city when state changes - only if it's not already empty
        setSenderDetails((prev) => {
          if (prev.city !== "") {
            return { ...prev, city: "" };
          }
          return prev;
        });
      }
    } else {
      // Clear cities if no state selected
      setSenderCities([]);
    }
  }, [senderCountryIso, senderDetails.state]);

  // Load receiver states when receiver country changes
  useEffect(() => {
    if (receiverDetails.country) {
      const isoCode = getCountryIsoCode(receiverDetails.country);
      if (isoCode) {
        setReceiverCountryIso(isoCode);
        const states = getStatesOfCountry(isoCode);
        setReceiverStates(states);
        // Reset state and city when country changes - only if they're not already empty
        setReceiverDetails((prev) => {
          if (prev.state !== "" || prev.city !== "") {
            return { ...prev, state: "", city: "" };
          }
          return prev;
        });
        setReceiverCities([]);
        setReceiverStateIso("");
      }
    } else {
      // Clear everything if no country selected
      setReceiverStates([]);
      setReceiverCities([]);
      setReceiverCountryIso("");
      setReceiverStateIso("");
    }
  }, [receiverDetails.country]);

  // Load receiver cities when receiver state changes
  useEffect(() => {
    if (receiverCountryIso && receiverDetails.state) {
      const stateIso = getStateIsoCode(
        receiverCountryIso,
        receiverDetails.state,
      );
      if (stateIso) {
        setReceiverStateIso(stateIso);
        const cities = getCitiesOfState(receiverCountryIso, stateIso);
        setReceiverCities(cities);
        // Reset city when state changes - only if it's not already empty
        setReceiverDetails((prev) => {
          if (prev.city !== "") {
            return { ...prev, city: "" };
          }
          return prev;
        });
      }
    } else {
      // Clear cities if no state selected
      setReceiverCities([]);
    }
  }, [receiverCountryIso, receiverDetails.state]);

  // Clear form and localStorage
  const handleClearForm = () => {
    if (
      confirm("Are you sure you want to clear the saved quote and start over?")
    ) {
      localStorage.removeItem(BASIC_QUOTE_STORAGE_KEY);
      router.push("/quotation");
    }
  };

  // Step 1: Sender Details
  const handleSenderSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate phone number
    const phoneRegex = /^\d+$/;
    if (!senderDetails.phone || !phoneRegex.test(senderDetails.phone)) {
      setError(
        "Phone number must contain only numbers (no spaces, dashes, or special characters)",
      );
      return;
    }

    if (senderDetails.phone.length < 10) {
      setError("Phone number must include country code (e.g., 2348133730145)");
      return;
    }

    setError(null);
    setCurrentStep("receiver");
  };

  // Step 2: Receiver Details
  const handleReceiverSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate phone number
    const numericRegex = /^\d+$/;
    if (!receiverDetails.phone || !numericRegex.test(receiverDetails.phone)) {
      setError(
        "Phone number must contain only numbers (no spaces, dashes, or special characters)",
      );
      return;
    }

    if (receiverDetails.phone.length < 10) {
      setError("Phone number must include country code (e.g., 2348133730145)");
      return;
    }

    // Validate post code (supports letters and numbers).
    // Nigerian domestic addresses have no post code, so local deliveries skip this.
    if (!isLocal) {
      if (!receiverDetails.postCode || receiverDetails.postCode.trim() === "") {
        setError("Receiver post code is required");
        return;
      }

      const postalCodeRegex = /^[A-Za-z0-9\s-]+$/;
      if (!postalCodeRegex.test(receiverDetails.postCode.trim())) {
        setError(
          "Post code can only contain letters, numbers, spaces, or hyphens",
        );
        return;
      }
    }

    setError(null);
    setCurrentStep("shipment");
  };

  // Step 3: Shipment Details
  const handleShipmentSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate shipment details
    if (
      !shipmentDetails.description ||
      shipmentDetails.description.trim().length < 3
    ) {
      setError("Shipment description must be at least 3 characters");
      return;
    }

    const quantity = parseInt(shipmentDetails.quantity);
    if (isNaN(quantity) || quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    // Validate value if provided
    if (shipmentDetails.value && shipmentDetails.value.trim() !== "") {
      const value = parseFloat(shipmentDetails.value);
      if (isNaN(value) || value < 0) {
        setError("Shipment value must be a positive number");
        return;
      }
    }

    setError(null);
    // Show drop-off acknowledgment modal before going to addons
    setShowDropOffModal(true);
  };

  // Handle drop-off acknowledgment
  const handleAcknowledgeDropOff = () => {
    setShowDropOffModal(false);
    setHasAcknowledgedDropOff(true);
    setCurrentStep("addons");
  };

  // Step 4: Continue from add-ons
  const handleAddonsNext = () => {
    setCurrentStep("review");
  };

  // Step 5: Create Order
  const handleCreateOrder = async () => {
    if (!basicQuote) return;

    setIsCreatingOrder(true);
    setError(null);

    try {
      const basePrice = basicQuote.amount_paid;
      const totalAmount = basePrice + (addInsurance ? insuranceFee : 0);

      if (paymentMethod === "online") {
        // Save booking details to localStorage before redirecting to payment
        const bookingDetailsForStorage = {
          shipment_type: basicQuote.shipment_type || "international",
          sender_name: senderDetails.name,
          sender_phone: senderDetails.phone,
          sender_address: senderDetails.address,
          sender_state: senderDetails.state,
          sender_city: senderDetails.city,
          sender_country: senderDetails.country,
          sender_email: senderDetails.email,
          receiver_name: receiverDetails.name,
          receiver_phone: receiverDetails.phone,
          receiver_address: receiverDetails.address,
          receiver_state: receiverDetails.state,
          receiver_city: receiverDetails.city,
          receiver_post_code: receiverDetails.postCode,
          receiver_country: receiverDetails.country,
          shipment_description: shipmentDetails.description,
          shipment_quantity: parseInt(shipmentDetails.quantity),
          shipment_value: shipmentDetails.value
            ? parseFloat(shipmentDetails.value)
            : undefined,
          shipment_weight: basicQuote.weight,
          zone_picked: basicQuote.zone_picked,
          delivery_speed: basicQuote.delivery_speed,
          amount_paid: totalAmount,
          add_insurance: addInsurance,
          insurance_fee: addInsurance ? insuranceFee : 0,
        };

        localStorage.setItem(
          "transdom_booking_details",
          JSON.stringify(bookingDetailsForStorage),
        );

        // Initialize Paystack payment
        const paymentResponse = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalAmount,
            email: senderDetails.email,
            zone: basicQuote.zone_picked,
            delivery_speed: basicQuote.delivery_speed,
            booking_details: {
              sender: {
                name: senderDetails.name,
                phone: senderDetails.phone,
                address: senderDetails.address,
                state: senderDetails.state,
                city: senderDetails.city,
                country: senderDetails.country,
                email: senderDetails.email,
              },
              receiver: {
                name: receiverDetails.name,
                phone: receiverDetails.phone,
                address: receiverDetails.address,
                state: receiverDetails.state,
                city: receiverDetails.city,
                post_code: receiverDetails.postCode,
                country: receiverDetails.country,
              },
              shipment: {
                description: shipmentDetails.description,
                quantity: parseInt(shipmentDetails.quantity),
                value: shipmentDetails.value
                  ? parseFloat(shipmentDetails.value)
                  : undefined,
                weight: basicQuote.weight,
              },
            },
            add_insurance: addInsurance,
            insurance_fee: addInsurance ? insuranceFee : 0,
          }),
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.detail || "Failed to initialize payment");
        }

        const paymentData = await paymentResponse.json();

        // Redirect to Paystack
        if (paymentData.data && paymentData.data.authorization_url) {
          window.location.href = paymentData.data.authorization_url;
        } else {
          throw new Error("No authorization URL received from payment gateway");
        }
      } else {
        // Cash payment - create order directly
        const orderResponse = await fetch("/api/orders/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shipment_type: basicQuote.shipment_type || "international",
            sender_name: senderDetails.name,
            sender_phone: senderDetails.phone,
            sender_address: senderDetails.address,
            sender_state: senderDetails.state,
            sender_city: senderDetails.city,
            sender_country: senderDetails.country,
            sender_email: senderDetails.email,
            receiver_name: receiverDetails.name,
            receiver_phone: receiverDetails.phone,
            receiver_address: receiverDetails.address,
            receiver_state: receiverDetails.state,
            receiver_city: receiverDetails.city,
            receiver_post_code: receiverDetails.postCode,
            receiver_country: receiverDetails.country,
            shipment_description: shipmentDetails.description,
            shipment_quantity: parseInt(shipmentDetails.quantity),
            shipment_value: shipmentDetails.value
              ? parseFloat(shipmentDetails.value)
              : undefined,
            shipment_weight: basicQuote.weight,
            zone_picked: basicQuote.zone_picked,
            delivery_speed: basicQuote.delivery_speed,
            amount_paid: totalAmount,
            add_insurance: addInsurance,
            insurance_fee: addInsurance ? insuranceFee : 0,
          }),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          throw new Error(errorData.detail || "Failed to create order");
        }

        // Clear localStorage and redirect to dashboard
        localStorage.removeItem(BASIC_QUOTE_STORAGE_KEY);
        router.push("/dashboard?order=success&method=cash");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsCreatingOrder(false);
    }
  };

  const progressPercentage = {
    sender: 20,
    receiver: 40,
    shipment: 60,
    addons: 80,
    review: 100,
  }[currentStep] as number;

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <p>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!basicQuote) {
    return null;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "International Shipping Booking",
    description:
      "Book and ship packages internationally with instant quotes and real-time tracking",
    provider: {
      "@type": "Organization",
      name: "Transdom Express Logistics",
    },
  };

  return (
    <>
      <SEO
        title="Book Shipment - Complete Your International Shipping Order"
        description="Book your international shipment with Transdom Express. Enter shipping details, choose delivery speed, and complete payment. Fast, secure, reliable shipping worldwide."
        keywords="book shipment, ship package internationally, complete shipping order, international delivery booking, send package abroad"
        canonical={`${siteUrl}/booking`}
        jsonLd={structuredData}
      />
      <Header />

      {/* Drop-off Acknowledgment Modal */}
      {showDropOffModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "2.5rem",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              animation: "slideUp 0.3s ease",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <MapPin size={64} />
            </div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#047857",
                marginBottom: "1rem",
              }}
            >
              Drop-off Information
            </h2>
            <p
              style={{
                fontSize: "18px",
                color: "#374151",
                lineHeight: "1.6",
                marginBottom: "2rem",
              }}
            >
              You can drop off your package at any of our hub locations. Visit
              our <strong>Contact Us</strong> page for hub addresses.
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setShowDropOffModal(false)}
                style={{
                  padding: "0.875rem 1.75rem",
                  background: "transparent",
                  color: "#6b7280",
                  border: "2px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  flex: "1 1 160px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledgeDropOff}
                style={{
                  padding: "0.875rem 1.75rem",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)",
                  flex: "1 1 160px",
                }}
              >
                I Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Section */}
      <section className="quotation-form-section">
        <div className="quotation-wrapper">
          <div className="quotation-text-content">
            <h1>Complete Your Booking</h1>
            <p>
              Fill in the shipping details to complete your order. We&apos;ve
              saved your quote information below.
            </p>

            {/* Saved Quote Display */}
            <div
              style={{
                background: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
                borderRadius: "12px",
                padding: "1.5rem",
                color: "white",
                marginTop: "2rem",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
                Your Saved Quote
              </h3>
              <div
                style={{ display: "grid", gap: "0.5rem", fontSize: "0.95rem" }}
              >
                <div>
                  <strong>From:</strong> {basicQuote.pickup_country}
                </div>
                <div>
                  <strong>To:</strong> {basicQuote.destination_country}
                </div>
                <div>
                  <strong>Weight:</strong> {basicQuote.weight} kg
                </div>
                <div>
                  <strong>Delivery:</strong>{" "}
                  {getCarrierName(basicQuote.delivery_speed, isLocal)}
                </div>
                <div>
                  <strong>Base Price:</strong> {basicQuote.currency}{" "}
                  {basicQuote.amount_paid.toLocaleString()}
                </div>
              </div>
              <button
                onClick={handleClearForm}
                style={{
                  marginTop: "1rem",
                  padding: "0.5rem 1rem",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "1px solid white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Clear & Start Over
              </button>
            </div>
          </div>

          <div className="quotation-container">
            {/* Progress Indicator */}
            <div className="form-progress-container">
              <div className="form-progress-bar">
                <div
                  className="form-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <span className="form-progress-text">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "#6b7280",
                  fontWeight: "500",
                  marginTop: "0.5rem",
                }}
              >
                <span>Sender</span>
                <span>Receiver</span>
                <span>Shipment</span>
                <span>Add-ons</span>
                <span>Review</span>
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
                  marginTop: "1rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Step 1: Sender Details */}
            {currentStep === "sender" && (
              <form className="quotation-form" onSubmit={handleSenderSubmit}>
                <h3 className="form-section-title">Sender Information</h3>

                <div className="form-group">
                  <label htmlFor="sender-name">Full Name *</label>
                  <input
                    type="text"
                    id="sender-name"
                    className="form-control"
                    value={senderDetails.name}
                    onChange={(e) =>
                      setSenderDetails({
                        ...senderDetails,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sender-email">
                    Email *
                    {getAuthUser() && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#10b981",
                          marginLeft: "8px",
                        }}
                      >
                        (Auto-filled from your account)
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    id="sender-email"
                    className="form-control"
                    value={senderDetails.email}
                    onChange={(e) =>
                      setSenderDetails({
                        ...senderDetails,
                        email: e.target.value,
                      })
                    }
                    readOnly={!!getAuthUser()}
                    style={
                      getAuthUser()
                        ? { backgroundColor: "#f0fdf4", cursor: "not-allowed" }
                        : {}
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sender-phone">
                    Phone Number *
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginLeft: "8px",
                      }}
                    >
                      (Numbers only, include country code)
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="sender-phone"
                    className="form-control"
                    value={senderDetails.phone}
                    onChange={(e) =>
                      setSenderDetails({
                        ...senderDetails,
                        phone: e.target.value,
                      })
                    }
                    placeholder="e.g., 2348133730145"
                    pattern="\d+"
                    title="Phone number must contain only numbers and include country code"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sender-address">Address *</label>
                  <textarea
                    id="sender-address"
                    className="form-control"
                    rows={3}
                    value={senderDetails.address}
                    onChange={(e) =>
                      setSenderDetails({
                        ...senderDetails,
                        address: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="sender-state">State/Province *</label>
                    {senderStates.length > 0 ? (
                      <SearchableSelect
                        options={senderStates}
                        value={senderDetails.state}
                        onChange={(value) =>
                          setSenderDetails({
                            ...senderDetails,
                            state: value,
                          })
                        }
                        placeholder="Search state/province..."
                        name="sender-state"
                        id="sender-state"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        id="sender-state"
                        className="form-control"
                        value={senderDetails.state}
                        onChange={(e) =>
                          setSenderDetails({
                            ...senderDetails,
                            state: e.target.value,
                          })
                        }
                        placeholder="Enter state/province"
                        required
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="sender-city">City *</label>
                    {senderCities.length > 0 ? (
                      <SearchableSelect
                        options={senderCities}
                        value={senderDetails.city}
                        onChange={(value) =>
                          setSenderDetails({
                            ...senderDetails,
                            city: value,
                          })
                        }
                        placeholder="Search city..."
                        name="sender-city"
                        id="sender-city"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        id="sender-city"
                        className="form-control"
                        value={senderDetails.city}
                        onChange={(e) =>
                          setSenderDetails({
                            ...senderDetails,
                            city: e.target.value,
                          })
                        }
                        placeholder="Enter city"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="sender-country">
                    Country *
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#10b981",
                        marginLeft: "8px",
                      }}
                    >
                      (Set to pickup country)
                    </span>
                  </label>
                  <input
                    type="text"
                    id="sender-country"
                    className="form-control"
                    value={senderDetails.country}
                    readOnly
                    style={{
                      backgroundColor: "#f0fdf4",
                      cursor: "not-allowed",
                    }}
                    required
                  />
                </div>

                <button type="submit" className="btn-calculate">
                  CONTINUE TO RECEIVER DETAILS
                </button>
              </form>
            )}

            {/* Step 2: Receiver Details */}
            {currentStep === "receiver" && (
              <form className="quotation-form" onSubmit={handleReceiverSubmit}>
                <h3 className="form-section-title">Receiver Information</h3>

                <div className="form-group">
                  <label htmlFor="receiver-name">Full Name *</label>
                  <input
                    type="text"
                    id="receiver-name"
                    className="form-control"
                    value={receiverDetails.name}
                    onChange={(e) =>
                      setReceiverDetails({
                        ...receiverDetails,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="receiver-phone">
                    Phone Number *
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginLeft: "8px",
                      }}
                    >
                      (Numbers only, include country code)
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="receiver-phone"
                    className="form-control"
                    value={receiverDetails.phone}
                    onChange={(e) =>
                      setReceiverDetails({
                        ...receiverDetails,
                        phone: e.target.value,
                      })
                    }
                    placeholder="e.g., 2348133730145"
                    pattern="\d+"
                    title="Phone number must contain only numbers and include country code"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="receiver-address">Address *</label>
                  <textarea
                    id="receiver-address"
                    className="form-control"
                    rows={3}
                    value={receiverDetails.address}
                    onChange={(e) =>
                      setReceiverDetails({
                        ...receiverDetails,
                        address: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="receiver-state">State/Province *</label>
                    {receiverStates.length > 0 ? (
                      <SearchableSelect
                        options={receiverStates}
                        value={receiverDetails.state}
                        onChange={(value) =>
                          setReceiverDetails({
                            ...receiverDetails,
                            state: value,
                          })
                        }
                        placeholder="Search state/province..."
                        name="receiver-state"
                        id="receiver-state"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        id="receiver-state"
                        className="form-control"
                        value={receiverDetails.state}
                        onChange={(e) =>
                          setReceiverDetails({
                            ...receiverDetails,
                            state: e.target.value,
                          })
                        }
                        placeholder="Enter state/province"
                        required
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="receiver-city">City *</label>
                    {receiverCities.length > 0 ? (
                      <SearchableSelect
                        options={receiverCities}
                        value={receiverDetails.city}
                        onChange={(value) =>
                          setReceiverDetails({
                            ...receiverDetails,
                            city: value,
                          })
                        }
                        placeholder="Search city..."
                        name="receiver-city"
                        id="receiver-city"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        id="receiver-city"
                        className="form-control"
                        value={receiverDetails.city}
                        onChange={(e) =>
                          setReceiverDetails({
                            ...receiverDetails,
                            city: e.target.value,
                          })
                        }
                        placeholder="Enter city"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="form-row">
                  {/* Nigerian domestic addresses have no post code */}
                  {!isLocal && (
                    <div className="form-group">
                      <label htmlFor="receiver-postcode">
                        Post Code *
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginLeft: "8px",
                          }}
                        >
                          (Letters and numbers)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="receiver-postcode"
                        className="form-control"
                        value={receiverDetails.postCode}
                        onChange={(e) =>
                          setReceiverDetails({
                            ...receiverDetails,
                            postCode: e.target.value,
                          })
                        }
                        placeholder="e.g., SW1A 1AA or 23467"
                        pattern="[A-Za-z0-9\s-]+"
                        title="Post code can contain letters, numbers, spaces, and hyphens"
                        required
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="receiver-country">
                      Country *
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#10b981",
                          marginLeft: "8px",
                        }}
                      >
                        (Set to destination country)
                      </span>
                    </label>
                    <input
                      type="text"
                      id="receiver-country"
                      className="form-control"
                      value={receiverDetails.country}
                      readOnly
                      style={{
                        backgroundColor: "#f0fdf4",
                        cursor: "not-allowed",
                      }}
                      required
                    />
                  </div>
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
                    onClick={() => setCurrentStep("sender")}
                    className="btn-secondary"
                  >
                    ← BACK
                  </button>
                  <button type="submit" className="btn-calculate">
                    CONTINUE TO SHIPMENT DETAILS
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Shipment Details */}
            {currentStep === "shipment" && (
              <form className="quotation-form" onSubmit={handleShipmentSubmit}>
                <h3 className="form-section-title">Shipment Information</h3>

                <div className="form-group">
                  <label htmlFor="shipment-description">
                    Package Description *
                  </label>
                  <textarea
                    id="shipment-description"
                    className="form-control"
                    rows={3}
                    placeholder="Describe the contents of your shipment"
                    value={shipmentDetails.description}
                    onChange={(e) =>
                      setShipmentDetails({
                        ...shipmentDetails,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="shipment-quantity">Quantity *</label>
                    <input
                      type="number"
                      id="shipment-quantity"
                      className="form-control"
                      min="1"
                      value={shipmentDetails.quantity}
                      onChange={(e) =>
                        setShipmentDetails({
                          ...shipmentDetails,
                          quantity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shipment-value">
                      Declared Value (NGN)
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginLeft: "8px",
                        }}
                      >
                        (Required for insurance)
                      </span>
                    </label>
                    <input
                      type="number"
                      id="shipment-value"
                      className="form-control"
                      step="0.01"
                      min="0"
                      placeholder="Enter value in NGN"
                      value={shipmentDetails.value}
                      onChange={(e) =>
                        setShipmentDetails({
                          ...shipmentDetails,
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
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
                    onClick={() => setCurrentStep("receiver")}
                    className="btn-secondary"
                  >
                    ← BACK
                  </button>
                  <button type="submit" className="btn-calculate">
                    CONTINUE TO ADD-ONS
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Optional Add-ons (Insurance) */}
            {currentStep === "addons" && (
              <div className="quotation-form">
                <h3 className="form-section-title">Optional Add-ons</h3>

                <div
                  style={{
                    background: "#f9fafb",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "600",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={addInsurance}
                      onChange={(e) => setAddInsurance(e.target.checked)}
                      style={{
                        width: "20px",
                        height: "20px",
                        marginRight: "12px",
                        cursor: "pointer",
                      }}
                    />
                    Add Insurance Protection
                  </label>

                  {addInsurance && (
                    <div style={{ marginTop: "1rem", paddingLeft: "32px" }}>
                      {!shipmentDetails.value ? (
                        <p style={{ color: "#d97706", fontSize: "0.9rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              marginRight: "0.5rem",
                            }}
                          >
                            <AlertTriangle size={16} />
                          </span>
                          Please enter a shipment value in the previous step to
                          calculate insurance.
                        </p>
                      ) : (
                        <div>
                          <div
                            style={{
                              background: "white",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              padding: "1rem",
                              marginBottom: "1rem",
                            }}
                          >
                            <div
                              style={{
                                marginBottom: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              <strong>Shipment Value:</strong> ₦
                              {parseFloat(
                                shipmentDetails.value,
                              ).toLocaleString()}
                            </div>
                            <div
                              style={{
                                marginBottom: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              <strong>Insurance Fee:</strong>{" "}
                              {calculatingInsurance
                                ? "Calculating..."
                                : `₦${insuranceFee.toLocaleString()}`}
                            </div>
                            <div
                              style={{ fontSize: "0.85rem", color: "#6b7280" }}
                            >
                              Coverage: Loss or damage up to ₦
                              {parseFloat(
                                shipmentDetails.value,
                              ).toLocaleString()}
                            </div>
                          </div>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "#6b7280",
                              lineHeight: "1.5",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                marginRight: "0.5rem",
                              }}
                            >
                              <Lightbulb size={16} />
                            </span>
                            Insurance is calculated at 2% of shipment value with
                            a minimum fee of ₦500.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.9rem",
                    color: "#1e40af",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      marginRight: "0.5rem",
                    }}
                  >
                    <MapPin size={16} />
                  </span>
                  <strong>Drop-off Information:</strong> You can drop off your
                  package at any of our hub locations. Visit our Contact Us page
                  for hub addresses.
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
                    onClick={() => setCurrentStep("shipment")}
                    className="btn-secondary"
                  >
                    ← BACK
                  </button>
                  <button
                    type="button"
                    onClick={handleAddonsNext}
                    className="btn-calculate"
                  >
                    CONTINUE TO REVIEW
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === "review" && (
              <div className="quotation-form">
                <h3 className="form-section-title">Review Your Booking</h3>

                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#047857",
                      marginBottom: "1rem",
                      paddingBottom: "0.5rem",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Sender Details
                  </h4>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Name:</strong> {senderDetails.name}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Email:</strong> {senderDetails.email}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Phone:</strong> {senderDetails.phone}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Address:</strong> {senderDetails.address}
                  </div>
                  <div style={{ fontSize: "0.9rem" }}>
                    <strong>Location:</strong> {senderDetails.city},{" "}
                    {senderDetails.state}, {senderDetails.country}
                  </div>
                </div>

                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#047857",
                      marginBottom: "1rem",
                      paddingBottom: "0.5rem",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Receiver Details
                  </h4>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Name:</strong> {receiverDetails.name}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Phone:</strong> {receiverDetails.phone}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Address:</strong> {receiverDetails.address}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Location:</strong> {receiverDetails.city},{" "}
                    {receiverDetails.state}, {receiverDetails.country}
                  </div>
                  {!isLocal && (
                    <div style={{ fontSize: "0.9rem" }}>
                      <strong>Post Code:</strong> {receiverDetails.postCode}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#047857",
                      marginBottom: "1rem",
                      paddingBottom: "0.5rem",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    Shipment Details
                  </h4>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Description:</strong> {shipmentDetails.description}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Quantity:</strong> {shipmentDetails.quantity}
                  </div>
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Weight:</strong> {basicQuote.weight} kg
                  </div>
                  {shipmentDetails.value && (
                    <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      <strong>Declared Value:</strong> ₦
                      {parseFloat(shipmentDetails.value).toLocaleString()}
                    </div>
                  )}
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                    <strong>Delivery Speed:</strong>{" "}
                    {getCarrierName(basicQuote.delivery_speed, isLocal)}
                  </div>
                  <div style={{ fontSize: "0.9rem" }}>
                    <strong>Estimated Delivery:</strong>{" "}
                    {basicQuote.estimated_delivery}
                  </div>
                </div>

                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #047857 0%, #065f46 100%)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    color: "white",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      marginBottom: "1rem",
                    }}
                  >
                    Price Breakdown
                  </h4>
                  <div style={{ marginBottom: "0.5rem" }}>
                    Shipping Cost: {basicQuote.currency}{" "}
                    {basicQuote.amount_paid.toLocaleString()}
                  </div>
                  {addInsurance && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      Insurance Fee: {basicQuote.currency}{" "}
                      {insuranceFee.toLocaleString()}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: "700",
                      textAlign: "center",
                      marginTop: "1rem",
                      paddingTop: "1rem",
                      borderTop: "2px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    Total: {basicQuote.currency}{" "}
                    {(
                      basicQuote.amount_paid + (addInsurance ? insuranceFee : 0)
                    ).toLocaleString()}
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      marginBottom: "1rem",
                    }}
                  >
                    Select Payment Method
                  </h4>
                  <div
                    style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
                  >
                    <label
                      style={{
                        flex: "1 1 220px",
                        minWidth: "220px",
                        padding: "1rem",
                        border:
                          paymentMethod === "online"
                            ? "2px solid #047857"
                            : "2px solid #e5e7eb",
                        borderRadius: "8px",
                        cursor: "pointer",
                        background:
                          paymentMethod === "online" ? "#f0fdf4" : "white",
                      }}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value="online"
                        checked={paymentMethod === "online"}
                        onChange={() => setPaymentMethod("online")}
                        style={{ marginRight: "8px" }}
                      />
                      Pay Online (Paystack)
                    </label>
                    <label
                      style={{
                        flex: "1 1 220px",
                        minWidth: "220px",
                        padding: "1rem",
                        border:
                          paymentMethod === "cash"
                            ? "2px solid #047857"
                            : "2px solid #e5e7eb",
                        borderRadius: "8px",
                        cursor: "pointer",
                        background:
                          paymentMethod === "cash" ? "#f0fdf4" : "white",
                      }}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                        style={{ marginRight: "8px" }}
                      />
                      Pay Cash at Hub
                    </label>
                  </div>
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
                    onClick={() => setCurrentStep("addons")}
                    className="btn-secondary"
                  >
                    ← BACK
                  </button>
                  <button
                    type="button"
                    className="btn-calculate"
                    onClick={handleCreateOrder}
                    disabled={isCreatingOrder}
                  >
                    {isCreatingOrder
                      ? "PROCESSING..."
                      : paymentMethod === "online"
                        ? "PROCEED TO PAYMENT"
                        : "PLACE ORDER"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
