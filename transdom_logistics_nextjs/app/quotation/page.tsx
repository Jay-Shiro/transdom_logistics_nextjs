"use client";

import { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import { hasValidAuth, getAuthUser } from "@/lib/auth";

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

type Step =
  | "basic"
  | "sender"
  | "receiver"
  | "shipment"
  | "pricing"
  | "delivery"
  | "review";

export default function QuotationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"international" | "local">(
    "international",
  );
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [quotationResult, setQuotationResult] =
    useState<QuotationResult | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<
    "economy" | "standard" | "express"
  >("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic quote data
  const [quoteData, setQuoteData] = useState({
    pickupCountry: "",
    destinationCountry: "",
    weight: "",
  });

  // Booking details
  const [senderDetails, setSenderDetails] = useState({
    name: "",
    phone: "",
    address: "",
    state: "",
    city: "",
    country: "",
    email: "",
  });

  const [receiverDetails, setReceiverDetails] = useState({
    name: "",
    phone: "",
    address: "",
    state: "",
    city: "",
    postCode: "",
    country: "",
  });

  const [shipmentDetails, setShipmentDetails] = useState({
    description: "",
    quantity: "1",
    value: "",
  });

  // Auto-fill sender details for authenticated users
  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      setSenderDetails((prev) => ({
        ...prev,
        email: user.email,
        name: `${user.firstname} ${user.lastname}`,
        phone: user.phone_number || prev.phone,
        country: user.country || prev.country,
      }));
    }
  }, []);

  // Auto-select sender country from pickup country
  useEffect(() => {
    if (quoteData.pickupCountry) {
      setSenderDetails((prev) => ({
        ...prev,
        country: quoteData.pickupCountry,
      }));
    }
  }, [quoteData.pickupCountry]);

  // Auto-select receiver country from destination country
  useEffect(() => {
    if (quoteData.destinationCountry) {
      setReceiverDetails((prev) => ({
        ...prev,
        country: quoteData.destinationCountry,
      }));
    }
  }, [quoteData.destinationCountry]);

  // Step 1: Basic Quote Info
  const handleBasicSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData(e.currentTarget);
    const pickupCountry = formDataObj.get("pickup-country") as string;
    const destinationCountry = formDataObj.get("destination-country") as string;
    const weight = formDataObj.get("weight") as string;

    setQuoteData({
      pickupCountry,
      destinationCountry,
      weight,
    });

    setError(null);
    setCurrentStep("sender");
  };

  // Step 2: Sender Details
  const handleSenderSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate phone number is strictly numeric
    const phoneRegex = /^\d+$/;
    if (!senderDetails.phone || !phoneRegex.test(senderDetails.phone)) {
      setError("Phone number must contain only numbers (no spaces, dashes, or special characters)");
      return;
    }
    
    // Validate phone number includes country code (minimum 10 digits)
    if (senderDetails.phone.length < 10) {
      setError("Phone number must include country code (e.g., 2348133730145)");
      return;
    }
    
    setError(null);
    setCurrentStep("receiver");
  };

  // Step 3: Receiver Details
  const handleReceiverSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate phone number is strictly numeric
    const numericRegex = /^\d+$/;
    if (!receiverDetails.phone || !numericRegex.test(receiverDetails.phone)) {
      setError("Phone number must contain only numbers (no spaces, dashes, or special characters)");
      return;
    }
    
    // Validate phone number includes country code (minimum 10 digits)
    if (receiverDetails.phone.length < 10) {
      setError("Phone number must include country code (e.g., 2348133730145)");
      return;
    }
    
    // Validate post code is provided and strictly numeric
    if (!receiverDetails.postCode || receiverDetails.postCode.trim() === "") {
      setError("Receiver post code is required");
      return;
    }
    
    if (!numericRegex.test(receiverDetails.postCode)) {
      setError("Post code must contain only numbers (no spaces, dashes, or special characters)");
      return;
    }
    
    setError(null);
    setCurrentStep("shipment");
  };

  // Step 4: Shipment Details
  const handleShipmentSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate shipment details
    if (!shipmentDetails.description || shipmentDetails.description.trim().length < 3) {
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
    // Now get the pricing
    getPricing();
  };

  // Get Pricing from API
  const getPricing = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupCountry: quoteData.pickupCountry,
          destinationCountry: quoteData.destinationCountry,
          weight: parseFloat(quoteData.weight),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to calculate quotation");
      }

      const result: QuotationResult = await response.json();
      setQuotationResult(result);
      setSelectedSpeed("standard");
      setCurrentStep("delivery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCurrentStep("basic"); // Go back to start on error
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Select Delivery Speed
  const handleSelectDelivery = () => {
    setCurrentStep("review");
  };

  // Step 6: Create Order
  const handleCreateOrder = () => {
    if (!quotationResult) return;

    const selectedOption = quotationResult.delivery_options.find(
      (opt) => opt.speed === selectedSpeed,
    );

    if (!selectedOption) return;

    // Save complete quotation data to localStorage
    const quotationData = {
      // Sender
      sender_name: senderDetails.name,
      sender_phone: senderDetails.phone,
      sender_address: senderDetails.address,
      sender_state: senderDetails.state,
      sender_city: senderDetails.city,
      sender_country: senderDetails.country,
      sender_email: senderDetails.email,

      // Receiver
      receiver_name: receiverDetails.name,
      receiver_phone: receiverDetails.phone,
      receiver_address: receiverDetails.address,
      receiver_state: receiverDetails.state,
      receiver_city: receiverDetails.city,
      receiver_post_code: receiverDetails.postCode,
      receiver_country: receiverDetails.country,

      // Shipment
      shipment_description: shipmentDetails.description,
      shipment_quantity: parseInt(shipmentDetails.quantity),
      shipment_value: shipmentDetails.value
        ? parseFloat(shipmentDetails.value)
        : null,
      shipment_weight: quotationResult.weight,

      // Pricing
      zone_picked: quotationResult.destination_zone,
      delivery_speed: selectedSpeed,
      amount_paid: parseFloat(selectedOption.price),
      currency: quotationResult.currency,
      estimated_delivery: selectedOption.estimated_delivery,

      // Additional info
      pickup_country: quotationResult.pickup_country,
      destination_country: quotationResult.destination_country,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(quotationData));

    // Check if user is authenticated
    const isAuth = hasValidAuth();
    if (isAuth) {
      // User is authenticated, go to dashboard
      router.push("/dashboard?from=quotation");
    } else {
      // User not authenticated, redirect to sign-in with redirect param
      router.push("/sign-in?redirect=quotation");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("basic");
    setQuotationResult(null);
    setError(null);
    setQuoteData({
      pickupCountry: "",
      destinationCountry: "",
      weight: "",
    });
    setSenderDetails({
      name: "",
      phone: "",
      address: "",
      state: "",
      city: "",
      country: "",
      email: "",
    });
    setReceiverDetails({
      name: "",
      phone: "",
      address: "",
      state: "",
      city: "",
      postCode: "",
      country: "",
    });
    setShipmentDetails({
      description: "",
      quantity: "1",
      value: "",
    });
  };

  const progressPercentage = {
    basic: 14,
    sender: 28,
    receiver: 42,
    shipment: 56,
    pricing: 70,
    delivery: 85,
    review: 100,
  }[currentStep];

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

            {/* Progress Indicator */}
            {activeTab === "international" && currentStep !== "basic" && (
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
                  <span>Basic</span>
                  <span>Sender</span>
                  <span>Receiver</span>
                  <span>Shipment</span>
                  <span>Pricing</span>
                  <span>Delivery</span>
                  <span>Review</span>
                </div>
              </div>
            )}

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

            {/* Step 1: Basic Quote Info */}
            {activeTab === "international" && currentStep === "basic" && (
              <form className="quotation-form" onSubmit={handleBasicSubmit}>
                <h3 className="form-section-title">Pickup</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pickup-country">Country</label>
                    <select
                      name="pickup-country"
                      id="pickup-country"
                      className="form-control"
                      value={quoteData.pickupCountry}
                      onChange={(e) =>
                        setQuoteData({
                          ...quoteData,
                          pickupCountry: e.target.value,
                        })
                      }
                      required
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
                      value={quoteData.destinationCountry}
                      onChange={(e) =>
                        setQuoteData({
                          ...quoteData,
                          destinationCountry: e.target.value,
                        })
                      }
                      required
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

                <h3 className="form-section-title">Shipment Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="weight">Weight (KG)</label>
                    <input
                      type="number"
                      name="weight"
                      id="weight"
                      className="form-control"
                      placeholder="Enter weight in kilograms"
                      min="0.1"
                      step="0.1"
                      value={quoteData.weight}
                      onChange={(e) =>
                        setQuoteData({ ...quoteData, weight: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-calculate">
                  CONTINUE TO SENDER DETAILS
                </button>
              </form>
            )}

            {/* Step 2: Sender Details */}
            {activeTab === "international" && currentStep === "sender" && (
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
                      <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '8px' }}>
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
                    style={getAuthUser() ? { backgroundColor: '#f0fdf4', cursor: 'not-allowed' } : {}}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sender-phone">
                    Phone Number *
                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
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
                    <label htmlFor="sender-city">City *</label>
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
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sender-state">State/Province *</label>
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
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="sender-country">
                    Country *
                    <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '8px' }}>
                      (Locked to pickup country - change in Step 1 if needed)
                    </span>
                  </label>
                  <select
                    id="sender-country"
                    className="form-control"
                    value={senderDetails.country || quoteData.pickupCountry}
                    onChange={(e) =>
                      setSenderDetails({
                        ...senderDetails,
                        country: e.target.value,
                      })
                    }
                    disabled
                    style={{ backgroundColor: '#f0fdf4', cursor: 'not-allowed' }}
                    required
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map((country) => (
                      <option 
                        key={country.value} 
                        value={country.value}
                      >
                        {country.label}
                      </option>
                    ))}
                  </select>
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
                    onClick={() => setCurrentStep("basic")}
                    style={{
                      padding: "1rem",
                      backgroundColor: "transparent",
                      color: "#047857",
                      border: "2px solid #047857",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0fdf4";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    ← BACK
                  </button>
                  <button type="submit" className="btn-calculate">
                    CONTINUE TO RECEIVER DETAILS
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Receiver Details */}
            {activeTab === "international" && currentStep === "receiver" && (
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
                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
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
                    <label htmlFor="receiver-city">City *</label>
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
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="receiver-state">State/Province *</label>
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
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="receiver-postcode">
                      Post Code *
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        (Numbers only)
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
                      placeholder="e.g., 23467"
                      pattern="\d+"
                      title="Post code must contain only numbers"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="receiver-country">
                      Country *
                      <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '8px' }}>
                        (Locked to destination country - change in Step 1 if needed)
                      </span>
                    </label>
                    <select
                      id="receiver-country"
                      className="form-control"
                      value={receiverDetails.country || quoteData.destinationCountry}
                      onChange={(e) =>
                        setReceiverDetails({
                          ...receiverDetails,
                          country: e.target.value,
                        })
                      }
                      disabled
                      style={{ backgroundColor: '#f0fdf4', cursor: 'not-allowed' }}
                      required
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((country) => (
                        <option 
                          key={country.value} 
                          value={country.value}
                        >
                          {country.label}
                        </option>
                      ))}
                    </select>
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
                    style={{
                      padding: "1rem",
                      backgroundColor: "transparent",
                      color: "#047857",
                      border: "2px solid #047857",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0fdf4";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    ← BACK
                  </button>
                  <button type="submit" className="btn-calculate">
                    CONTINUE TO SHIPMENT DETAILS
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Shipment Details */}
            {activeTab === "international" && currentStep === "shipment" && (
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
                      Declared Value (Optional)
                    </label>
                    <input
                      type="number"
                      id="shipment-value"
                      className="form-control"
                      step="0.01"
                      placeholder="USD"
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
                    style={{
                      padding: "1rem",
                      backgroundColor: "transparent",
                      color: "#047857",
                      border: "2px solid #047857",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0fdf4";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    ← BACK
                  </button>
                  <button
                    type="submit"
                    className="btn-calculate"
                    disabled={isLoading}
                  >
                    {isLoading ? "CALCULATING..." : "GET PRICING"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 5: Pricing Results & Delivery Selection */}
            {activeTab === "international" &&
              currentStep === "delivery" &&
              quotationResult && (
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
                            selectedSpeed === option.speed ? "#fdd835" : "#ddd",
                          borderRadius: "8px",
                          padding: "1rem",
                          marginBottom: "1rem",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          backgroundColor:
                            selectedSpeed === option.speed
                              ? "#fffef0"
                              : "white",
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
                              color: "#047857",
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
                      onClick={handleSelectDelivery}
                    >
                      CONTINUE TO REVIEW
                    </button>
                    <button
                      type="button"
                      onClick={handleStartOver}
                      style={{
                        padding: "1rem",
                        backgroundColor: "transparent",
                        color: "#047857",
                        border: "2px solid #047857",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0fdf4";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      START OVER
                    </button>
                  </div>
                </div>
              )}

            {/* Step 6: Review & Confirm */}
            {activeTab === "international" &&
              currentStep === "review" &&
              quotationResult && (
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
                    <div style={{ fontSize: "0.9rem" }}>
                      <strong>Post Code:</strong> {receiverDetails.postCode}
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
                      Shipment Details
                    </h4>
                    <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      <strong>Description:</strong>{" "}
                      {shipmentDetails.description}
                    </div>
                    <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      <strong>Quantity:</strong> {shipmentDetails.quantity}
                    </div>
                    <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      <strong>Weight:</strong> {quotationResult.weight} kg
                    </div>
                    {shipmentDetails.value && (
                      <div
                        style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}
                      >
                        <strong>Declared Value:</strong> $
                        {shipmentDetails.value}
                      </div>
                    )}
                    <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                      <strong>Delivery Speed:</strong>{" "}
                      {selectedSpeed.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "0.9rem" }}>
                      <strong>Estimated Delivery:</strong>{" "}
                      {
                        quotationResult.delivery_options.find(
                          (opt) => opt.speed === selectedSpeed,
                        )?.estimated_delivery
                      }
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
                        marginBottom: "0.5rem",
                      }}
                    >
                      Total Cost
                    </h4>
                    <div
                      style={{
                        fontSize: "2rem",
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {quotationResult.currency}{" "}
                      {parseFloat(
                        quotationResult.delivery_options.find(
                          (opt) => opt.speed === selectedSpeed,
                        )?.price || "0",
                      ).toLocaleString()}
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
                      className="btn-calculate"
                      onClick={handleCreateOrder}
                    >
                      CONFIRM & PROCEED TO PAYMENT
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep("delivery")}
                      style={{
                        padding: "1rem",
                        backgroundColor: "transparent",
                        color: "#047857",
                        border: "2px solid #047857",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0fdf4";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      ← BACK TO DELIVERY OPTIONS
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

      <style jsx>{`
        .quotation-form-section {
          padding: 4rem 2rem;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          min-height: calc(100vh - 200px);
        }

        .quotation-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: start;
        }

        .quotation-text-content h1 {
          font-size: 2.5rem;
          color: #047857;
          margin-bottom: 1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .quotation-text-content p {
          font-size: 1.1rem;
          color: #374151;
          line-height: 1.8;
          margin-bottom: 2rem;
        }

        .quotation-text-image {
          text-align: center;
          margin-top: 2rem;
        }

        .quotation-container {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .shipping-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab-btn {
          flex: 1;
          padding: 1rem;
          background: transparent;
          border: none;
          color: #666;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 3px solid transparent;
          font-size: 0.9rem;
          letter-spacing: 0.5px;
          position: relative;
        }

        .tab-btn.active {
          color: #047857;
        }

        .tab-btn.active::after {
          content: "";
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #fdd835;
        }

        .tab-btn:hover {
          color: #047857;
        }

        .quotation-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #047857;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1f1f1f;
          font-size: 0.95rem;
        }

        .form-control {
          padding: 0.9rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s ease;
          font-family: inherit;
          background-color: white;
        }

        .form-control:focus {
          border-color: #047857;
          outline: none;
          box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.1);
        }

        .form-control:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }

        .form-control::placeholder {
          color: #999;
        }

        textarea.form-control {
          resize: vertical;
        }

        select.form-control {
          cursor: pointer;
          background-color: white;
        }

        .btn-calculate {
          width: 100%;
          padding: 1rem 2.5rem;
          background-color: #fdd835;
          color: #047857;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
          margin-top: 1rem;
        }

        .btn-calculate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(253, 216, 53, 0.4);
        }

        .btn-calculate:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          color: #666;
        }

        .final-cta {
          text-align: center;
          padding: 5rem 2rem;
          background: linear-gradient(135deg, #047857 0%, #065f46 100%);
          color: white;
        }

        .final-cta h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .final-cta p {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        .btn-primary {
          display: inline-block;
          padding: 1rem 2.5rem;
          background: white;
          color: #047857;
          border-radius: 8px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 1.1rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .quotation-wrapper {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .quotation-text-content {
            order: 2;
          }

          .quotation-container {
            order: 1;
          }

          .quotation-text-content h1 {
            font-size: 2rem;
          }

          .quotation-text-content p {
            font-size: 1rem;
          }

          .quotation-text-image {
            order: -1;
          }

          .quotation-container {
            padding: 1.5rem;
          }

          .shipping-tabs {
            gap: 0.5rem;
          }

          .tab-btn {
            padding: 0.8rem 1rem;
            font-size: 0.9rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .btn-calculate {
            width: 100%;
            align-self: stretch;
          }

          .quotation-form-section {
            padding: 2rem 1rem;
          }

          .final-cta h2 {
            font-size: 1.8rem;
          }

          .final-cta p {
            font-size: 1rem;
          }

          .form-control {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }
      `}</style>
    </>
  );
}
