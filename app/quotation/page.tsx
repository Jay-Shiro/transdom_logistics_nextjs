"use client";

import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import SearchableSelect from "@/app/components/SearchableSelect";
import SEO from "@/app/components/SEO";
import {
  CityOption,
  getAllCountries,
  getCitiesOfState,
  getCountryIsoCode,
  getStateIsoCode,
  getStatesOfCountry,
  StateOption,
} from "@/lib/countries-data";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://transdomlogistics.com";

const BASIC_QUOTE_STORAGE_KEY = "transdom_basic_quote";

// Get all countries with zone mapping
const COUNTRIES = getAllCountries();

// Local delivery is Nigeria-only
const NIGERIA_ISO = "NG";
const NIGERIA_STATES = getStatesOfCountry(NIGERIA_ISO);

interface CarrierPrice {
  carrier: string;
  zone: string;
  price: string;
  currency?: string;
}

interface DeliveryOption {
  speed: "economy" | "standard" | "express";
  price: string;
  estimated_delivery: string;
  multiplier: number;
  carrier?: string;
  zone?: string;
}

interface QuotationResult {
  pickup_country: string;
  destination_country: string;
  from_country_iso: string;
  to_country_iso: string;
  weight: number;
  weight_rounded: number;
  currency: string;
  delivery_options: DeliveryOption[];
  carriers_data: CarrierPrice[];
  unified_zone?: string;
  unified_zone_display?: string;
}

type LocalSpeed = "same-day" | "next-day" | "standard";

interface LocalDeliveryOption {
  speed: LocalSpeed;
  price: string;
  estimated_delivery: string;
}

interface LocalQuotationResult {
  origin_state: string;
  origin_state_name: string;
  destination_state: string;
  destination_state_name: string;
  lane: string;
  weight: number;
  weight_rounded: number;
  currency: string;
  delivery_options: LocalDeliveryOption[];
}

type Step = "basic" | "delivery";

// Map generic speed names to carrier names
const getCarrierName = (speed: string): string => {
  const speedMap: Record<string, string> = {
    economy: "UPS",
    standard: "FedEx",
    express: "DHL",
  };
  return speedMap[speed.toLowerCase()] || speed;
};

// Local deliveries are handled in-house, so speeds are labelled by service
// level rather than by carrier
const getLocalSpeedName = (speed: string): string => {
  const speedMap: Record<string, string> = {
    "same-day": "Same Day",
    "next-day": "Next Day",
    standard: "Standard",
  };
  return speedMap[speed.toLowerCase()] || speed;
};

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
    pickupState: "",
    pickupCity: "",
    destinationCountry: "",
    destinationState: "",
    destinationCity: "",
    weight: "",
  });
  const [localQuoteData, setLocalQuoteData] = useState({
    pickupState: "",
    pickupCity: "",
    destinationState: "",
    destinationCity: "",
    weight: "",
  });
  const [localQuotationResult, setLocalQuotationResult] =
    useState<LocalQuotationResult | null>(null);
  const [selectedLocalSpeed, setSelectedLocalSpeed] =
    useState<LocalSpeed>("standard");

  // City options for the local (Nigeria) form
  const [localPickupCities, setLocalPickupCities] = useState<CityOption[]>([]);
  const [localDestCities, setLocalDestCities] = useState<CityOption[]>([]);

  // Dynamic state and city options
  const [pickupStates, setPickupStates] = useState<StateOption[]>([]);
  const [pickupCities, setPickupCities] = useState<CityOption[]>([]);
  const [destStates, setDestStates] = useState<StateOption[]>([]);
  const [destCities, setDestCities] = useState<CityOption[]>([]);
  const [pickupCountryIso, setPickupCountryIso] = useState<string>("");
  const [destCountryIso, setDestCountryIso] = useState<string>("");
  const [pickupStateIso, setPickupStateIso] = useState<string>("");
  const [destStateIso, setDestStateIso] = useState<string>("");

  // Step 1: Basic Quote Info
  const handleBasicSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData(e.currentTarget);
    const pickupCountry = formDataObj.get("pickup-country") as string;
    const pickupState = formDataObj.get("pickup-state") as string;
    const pickupCity = formDataObj.get("pickup-city") as string;
    const destinationCountry = formDataObj.get("destination-country") as string;
    const destinationState = formDataObj.get("destination-state") as string;
    const destinationCity = formDataObj.get("destination-city") as string;
    const weight = formDataObj.get("weight") as string;

    setQuoteData({
      pickupCountry,
      pickupState,
      pickupCity,
      destinationCountry,
      destinationState,
      destinationCity,
      weight,
    });

    setError(null);
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

  const handleLocalSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const {
      pickupState,
      pickupCity,
      destinationState,
      destinationCity,
      weight,
    } = localQuoteData;

    if (
      !pickupState ||
      !pickupCity ||
      !destinationState ||
      !destinationCity ||
      !weight
    ) {
      setError("Please complete all local delivery fields");
      return;
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setError("Weight must be greater than zero");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        origin_state: pickupState,
        destination_state: destinationState,
        weight: String(parsedWeight),
      });

      const response = await fetch(`/api/local-quote?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to calculate quotation");
      }

      const result: LocalQuotationResult = await response.json();
      setLocalQuotationResult(result);
      setSelectedLocalSpeed("standard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLocalQuotationResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Book Now for local deliveries - save quote and redirect
  const handleCreateLocalOrder = () => {
    if (!localQuotationResult || !selectedLocalSpeed) {
      setError("Please select a delivery speed");
      return;
    }

    const selectedOption = localQuotationResult.delivery_options.find(
      (opt) => opt.speed === selectedLocalSpeed,
    );

    if (!selectedOption) return;

    // Save basic quote to localStorage - same shape the booking page reads for
    // international shipments, flagged with shipment_type so it can adapt
    const basicQuote = {
      shipment_type: "local",
      pickup_country: "Nigeria",
      pickup_state: localQuotationResult.origin_state_name,
      pickup_city: localQuoteData.pickupCity,
      destination_country: "Nigeria",
      destination_state: localQuotationResult.destination_state_name,
      destination_city: localQuoteData.destinationCity,
      weight: localQuotationResult.weight,
      zone_picked: localQuotationResult.lane,
      delivery_speed: selectedLocalSpeed,
      amount_paid: parseFloat(selectedOption.price.replace(/,/g, "")),
      estimated_delivery: selectedOption.estimated_delivery,
      currency: localQuotationResult.currency,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(BASIC_QUOTE_STORAGE_KEY, JSON.stringify(basicQuote));

    // /booking is gated in middleware.ts, which bounces signed-out users to
    // /sign-in?redirect=/booking and returns them here afterwards
    router.push("/booking");
  };

  // Clear the local quote when the route or weight changes, so a stale price
  // can never be carried into booking
  const updateLocalQuoteData = (patch: Partial<typeof localQuoteData>) => {
    setLocalQuoteData((prev) => ({ ...prev, ...patch }));
    setLocalQuotationResult(null);
  };

  // Load pickup states when pickup country changes
  useEffect(() => {
    if (quoteData.pickupCountry) {
      const isoCode = getCountryIsoCode(quoteData.pickupCountry);
      if (isoCode) {
        setPickupCountryIso(isoCode);
        const states = getStatesOfCountry(isoCode);
        setPickupStates(states);
        // Reset state and city when country changes
        setQuoteData((prev) => ({ ...prev, pickupState: "", pickupCity: "" }));
        setPickupCities([]);
        setPickupStateIso("");
      }
    }
  }, [quoteData.pickupCountry]);

  // Load pickup cities when pickup state changes
  useEffect(() => {
    if (pickupCountryIso && quoteData.pickupState) {
      const stateIso = getStateIsoCode(pickupCountryIso, quoteData.pickupState);
      if (stateIso) {
        setPickupStateIso(stateIso);
        const cities = getCitiesOfState(pickupCountryIso, stateIso);
        setPickupCities(cities);
        // Reset city when state changes
        setQuoteData((prev) => ({ ...prev, pickupCity: "" }));
      }
    }
  }, [pickupCountryIso, quoteData.pickupState]);

  // Load destination states when destination country changes
  useEffect(() => {
    if (quoteData.destinationCountry) {
      const isoCode = getCountryIsoCode(quoteData.destinationCountry);
      if (isoCode) {
        setDestCountryIso(isoCode);
        const states = getStatesOfCountry(isoCode);
        setDestStates(states);
        // Reset state and city when country changes
        setQuoteData((prev) => ({
          ...prev,
          destinationState: "",
          destinationCity: "",
        }));
        setDestCities([]);
        setDestStateIso("");
      }
    }
  }, [quoteData.destinationCountry]);

  // Load destination cities when destination state changes
  useEffect(() => {
    if (destCountryIso && quoteData.destinationState) {
      const stateIso = getStateIsoCode(
        destCountryIso,
        quoteData.destinationState,
      );
      if (stateIso) {
        setDestStateIso(stateIso);
        const cities = getCitiesOfState(destCountryIso, stateIso);
        setDestCities(cities);
        // Reset city when state changes
        setQuoteData((prev) => ({ ...prev, destinationCity: "" }));
      }
    }
  }, [destCountryIso, quoteData.destinationState]);

  // Load local pickup cities when the local pickup state changes
  useEffect(() => {
    if (!localQuoteData.pickupState) {
      setLocalPickupCities([]);
      return;
    }
    const stateIso = getStateIsoCode(NIGERIA_ISO, localQuoteData.pickupState);
    setLocalPickupCities(
      stateIso ? getCitiesOfState(NIGERIA_ISO, stateIso) : [],
    );
    setLocalQuoteData((prev) => ({ ...prev, pickupCity: "" }));
  }, [localQuoteData.pickupState]);

  // Load local destination cities when the local destination state changes
  useEffect(() => {
    if (!localQuoteData.destinationState) {
      setLocalDestCities([]);
      return;
    }
    const stateIso = getStateIsoCode(
      NIGERIA_ISO,
      localQuoteData.destinationState,
    );
    setLocalDestCities(stateIso ? getCitiesOfState(NIGERIA_ISO, stateIso) : []);
    setLocalQuoteData((prev) => ({ ...prev, destinationCity: "" }));
  }, [localQuoteData.destinationState]);

  // Step 3: Book Now - Save and redirect
  const handleCreateOrder = () => {
    if (!quotationResult || !selectedSpeed) {
      setError("Please select a delivery speed");
      return;
    }

    const selectedOption = quotationResult.delivery_options.find(
      (opt) => opt.speed === selectedSpeed,
    );

    if (!selectedOption) return;

    // Save basic quote to localStorage
    const basicQuote = {
      shipment_type: "international",
      pickup_country: quotationResult.pickup_country,
      pickup_state: quoteData.pickupState,
      pickup_city: quoteData.pickupCity,
      destination_country: quotationResult.destination_country,
      destination_state: quoteData.destinationState,
      destination_city: quoteData.destinationCity,
      weight: quotationResult.weight,
      zone_picked:
        quotationResult.unified_zone_display ||
        quotationResult.carriers_data.map((c) => c.carrier).join(", "),
      delivery_speed: selectedSpeed,
      amount_paid: parseFloat(selectedOption.price),
      estimated_delivery: selectedOption.estimated_delivery,
      currency: quotationResult.currency,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(BASIC_QUOTE_STORAGE_KEY, JSON.stringify(basicQuote));

    // /booking is gated in middleware.ts, which bounces signed-out users to
    // /sign-in?redirect=/booking and returns them here afterwards
    router.push("/booking");
  };

  // Start Over - Clear all data
  const handleStartOver = () => {
    setCurrentStep("basic");
    setQuotationResult(null);
    setSelectedSpeed("standard");
    setLocalQuotationResult(null);
    setSelectedLocalSpeed("standard");
    setLocalQuoteData({
      pickupState: "",
      pickupCity: "",
      destinationState: "",
      destinationCity: "",
      weight: "",
    });
    setLocalPickupCities([]);
    setLocalDestCities([]);
    setError(null);
    setQuoteData({
      pickupCountry: "",
      pickupState: "",
      pickupCity: "",
      destinationCountry: "",
      destinationState: "",
      destinationCity: "",
      weight: "",
    });
    setPickupStates([]);
    setPickupCities([]);
    setDestStates([]);
    setDestCities([]);
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "International Shipping Quote",
    description:
      "Get instant shipping quotes for international package delivery",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "NGN",
      lowPrice: "0",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <SEO
        title="Get Instant Shipping Quote - International Shipping Rates Calculator"
        description="Calculate shipping costs instantly. Get free quotes for DHL, FedEx, UPS international shipping. Compare prices, delivery times, and choose the best option for your package."
        keywords="shipping quote, shipping calculator, international shipping rates, DHL rates, FedEx prices, UPS shipping cost, freight quote, delivery cost calculator"
        canonical={`${siteUrl}/quotation`}
        jsonLd={structuredData}
      />
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
                onClick={() => setActiveTab("international")}>
                INTERNATIONAL
              </button>
              <button
                className={`tab-btn ${activeTab === "local" ? "active" : ""}`}
                onClick={() => setActiveTab("local")}>
                LOCAL
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#fee",
                  color: "#c33",
                  borderRadius: "4px",
                  marginBottom: "1rem",
                }}>
                {error}
              </div>
            )}

            {/* Basic Quote Form */}
            {activeTab === "international" && currentStep === "basic" && (
              <form className="quotation-form" onSubmit={handleBasicSubmit}>
                <h3 className="form-section-title">Pickup Location</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pickup-country">Country *</label>
                    <SearchableSelect
                      options={COUNTRIES}
                      value={quoteData.pickupCountry}
                      onChange={(value) =>
                        setQuoteData({
                          ...quoteData,
                          pickupCountry: value,
                        })
                      }
                      placeholder="Search country..."
                      name="pickup-country"
                      id="pickup-country"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pickup-state">State/Province</label>
                    {pickupStates.length > 0 ? (
                      <SearchableSelect
                        options={pickupStates}
                        value={quoteData.pickupState}
                        onChange={(value) =>
                          setQuoteData({
                            ...quoteData,
                            pickupState: value,
                          })
                        }
                        placeholder="Search state/province..."
                        name="pickup-state"
                        id="pickup-state"
                      />
                    ) : (
                      <input
                        type="text"
                        name="pickup-state"
                        id="pickup-state"
                        className="form-control"
                        placeholder="Enter state/province (optional)"
                        value={quoteData.pickupState}
                        onChange={(e) =>
                          setQuoteData({
                            ...quoteData,
                            pickupState: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="pickup-city">City</label>
                    {pickupCities.length > 0 ? (
                      <SearchableSelect
                        options={pickupCities}
                        value={quoteData.pickupCity}
                        onChange={(value) =>
                          setQuoteData({
                            ...quoteData,
                            pickupCity: value,
                          })
                        }
                        placeholder="Search city..."
                        name="pickup-city"
                        id="pickup-city"
                      />
                    ) : (
                      <input
                        type="text"
                        name="pickup-city"
                        id="pickup-city"
                        className="form-control"
                        placeholder="Enter city (optional)"
                        value={quoteData.pickupCity}
                        onChange={(e) =>
                          setQuoteData({
                            ...quoteData,
                            pickupCity: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                </div>

                <h3 className="form-section-title">Destination</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="destination-country">Country *</label>
                    <SearchableSelect
                      options={COUNTRIES}
                      value={quoteData.destinationCountry}
                      onChange={(value) =>
                        setQuoteData({
                          ...quoteData,
                          destinationCountry: value,
                        })
                      }
                      placeholder="Search country..."
                      name="destination-country"
                      id="destination-country"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="destination-state">State/Province</label>
                    {destStates.length > 0 ? (
                      <SearchableSelect
                        options={destStates}
                        value={quoteData.destinationState}
                        onChange={(value) =>
                          setQuoteData({
                            ...quoteData,
                            destinationState: value,
                          })
                        }
                        placeholder="Search state/province..."
                        name="destination-state"
                        id="destination-state"
                      />
                    ) : (
                      <input
                        type="text"
                        name="destination-state"
                        id="destination-state"
                        className="form-control"
                        placeholder="Enter state/province (optional)"
                        value={quoteData.destinationState}
                        onChange={(e) =>
                          setQuoteData({
                            ...quoteData,
                            destinationState: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="destination-city">City</label>
                    {destCities.length > 0 ? (
                      <SearchableSelect
                        options={destCities}
                        value={quoteData.destinationCity}
                        onChange={(value) =>
                          setQuoteData({
                            ...quoteData,
                            destinationCity: value,
                          })
                        }
                        placeholder="Search city..."
                        name="destination-city"
                        id="destination-city"
                      />
                    ) : (
                      <input
                        type="text"
                        name="destination-city"
                        id="destination-city"
                        className="form-control"
                        placeholder="Enter city (optional)"
                        value={quoteData.destinationCity}
                        onChange={(e) =>
                          setQuoteData({
                            ...quoteData,
                            destinationCity: e.target.value,
                          })
                        }
                      />
                    )}
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

                <button
                  type="submit"
                  className="btn-calculate"
                  disabled={isLoading}>
                  {isLoading ? "CALCULATING..." : "GET QUOTE"}
                </button>
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
                      }}>
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
                      }}>
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
                      }}>
                      <span>Weight:</span>
                      <strong>{quotationResult.weight} KG</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9rem",
                        color: "#666",
                      }}>
                      <span>Zone:</span>
                      <strong>
                        {quotationResult.unified_zone_display ||
                          quotationResult.carriers_data
                            .map((c) => c.carrier)
                            .join(", ")}
                      </strong>
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
                        }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}>
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
                              }}>
                              {getCarrierName(option.speed)}
                            </strong>
                          </div>
                          <div
                            style={{
                              fontSize: "1.3rem",
                              fontWeight: "bold",
                              color: "#047857",
                            }}>
                            {quotationResult.currency}{" "}
                            {parseFloat(option.price).toLocaleString()}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#666",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}>
                          <Package size={14} /> Estimated delivery:{" "}
                          {option.estimated_delivery}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      flexDirection: "column",
                    }}>
                    <button
                      type="button"
                      className="btn-calculate"
                      onClick={handleCreateOrder}>
                      BOOK NOW
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
                      }}>
                      START OVER
                    </button>
                  </div>
                </div>
              )}

            {/* Local Form */}
            {activeTab === "local" && (
              <form className="quotation-form" onSubmit={handleLocalSubmit}>
                <h3 className="form-section-title">Local Delivery Quote</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="local-pickup-state">Pickup State *</label>
                    <SearchableSelect
                      options={NIGERIA_STATES}
                      value={localQuoteData.pickupState}
                      onChange={(value) =>
                        updateLocalQuoteData({ pickupState: value })
                      }
                      placeholder="Search state..."
                      name="local-pickup-state"
                      id="local-pickup-state"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="local-pickup-city">Pickup City *</label>
                    <SearchableSelect
                      options={localPickupCities}
                      value={localQuoteData.pickupCity}
                      onChange={(value) =>
                        updateLocalQuoteData({ pickupCity: value })
                      }
                      placeholder={
                        localQuoteData.pickupState
                          ? "Search city..."
                          : "Select a state first"
                      }
                      name="local-pickup-city"
                      id="local-pickup-city"
                      disabled={!localQuoteData.pickupState}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="local-destination-state">
                      Destination State *
                    </label>
                    <SearchableSelect
                      options={NIGERIA_STATES}
                      value={localQuoteData.destinationState}
                      onChange={(value) =>
                        updateLocalQuoteData({ destinationState: value })
                      }
                      placeholder="Search state..."
                      name="local-destination-state"
                      id="local-destination-state"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="local-destination-city">
                      Destination City *
                    </label>
                    <SearchableSelect
                      options={localDestCities}
                      value={localQuoteData.destinationCity}
                      onChange={(value) =>
                        updateLocalQuoteData({ destinationCity: value })
                      }
                      placeholder={
                        localQuoteData.destinationState
                          ? "Search city..."
                          : "Select a state first"
                      }
                      name="local-destination-city"
                      id="local-destination-city"
                      disabled={!localQuoteData.destinationState}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="local-weight">Weight (KG) *</label>
                    <input
                      type="number"
                      id="local-weight"
                      className="form-control"
                      placeholder="Enter shipment weight"
                      min="0.1"
                      step="0.1"
                      value={localQuoteData.weight}
                      onChange={(e) =>
                        updateLocalQuoteData({ weight: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-calculate"
                  disabled={isLoading}>
                  {isLoading ? "CALCULATING..." : "GET QUOTE"}
                </button>

                {localQuotationResult && (
                  <>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                          fontSize: "0.9rem",
                          color: "#666",
                        }}>
                        <span>From:</span>
                        <strong>
                          {localQuoteData.pickupCity},{" "}
                          {localQuotationResult.origin_state_name}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                          fontSize: "0.9rem",
                          color: "#666",
                        }}>
                        <span>To:</span>
                        <strong>
                          {localQuoteData.destinationCity},{" "}
                          {localQuotationResult.destination_state_name}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.9rem",
                          color: "#666",
                        }}>
                        <span>Weight:</span>
                        <strong>{localQuotationResult.weight} KG</strong>
                      </div>
                    </div>

                    <h3 className="form-section-title">
                      Select Delivery Speed
                    </h3>

                    <div style={{ marginBottom: "1.5rem" }}>
                      {localQuotationResult.delivery_options.map((option) => (
                        <div
                          key={option.speed}
                          onClick={() => setSelectedLocalSpeed(option.speed)}
                          style={{
                            border: "2px solid",
                            borderColor:
                              selectedLocalSpeed === option.speed
                                ? "#fdd835"
                                : "#ddd",
                            borderRadius: "8px",
                            padding: "1rem",
                            marginBottom: "1rem",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            backgroundColor:
                              selectedLocalSpeed === option.speed
                                ? "#fffef0"
                                : "white",
                          }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.5rem",
                            }}>
                            <div>
                              <input
                                type="radio"
                                name="local-delivery-speed"
                                value={option.speed}
                                checked={selectedLocalSpeed === option.speed}
                                onChange={() =>
                                  setSelectedLocalSpeed(option.speed)
                                }
                                style={{ marginRight: "0.5rem" }}
                              />
                              <strong style={{ fontSize: "1.1rem" }}>
                                {getLocalSpeedName(option.speed)}
                              </strong>
                            </div>
                            <div
                              style={{
                                fontSize: "1.3rem",
                                fontWeight: "bold",
                                color: "#047857",
                              }}>
                              {localQuotationResult.currency}{" "}
                              {option.price}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "0.9rem",
                              color: "#666",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}>
                            <Package size={14} /> Estimated delivery:{" "}
                            {option.estimated_delivery}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        flexDirection: "column",
                      }}>
                      <button
                        type="button"
                        className="btn-calculate"
                        onClick={handleCreateLocalOrder}>
                        BOOK NOW
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
                        }}>
                        START OVER
                      </button>
                    </div>
                  </>
                )}
              </form>
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
          width: 100%;
          max-width: none;
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
          width: 100%;
          max-width: none;
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
            order: 1;
            padding: 0 1rem;
          }

          .quotation-container {
            order: 2;
          }

          .quotation-text-content h1 {
            font-size: 2rem;
          }

          .quotation-text-content p {
            font-size: 1rem;
          }

          .quotation-container {
            padding: 1.5rem;
          }

          .shipping-tabs {
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .tab-btn {
            padding: 0.8rem 1rem;
            font-size: 0.9rem;
            flex: 1 1 100%;
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

          .pricing-results {
            padding: 1.5rem;
          }

          .pricing-results h3 {
            font-size: 1.5rem;
          }

          .result-item {
            padding: 0.9rem;
            font-size: 0.95rem;
          }

          .result-actions {
            flex-direction: column;
            gap: 0.8rem;
          }

          .result-actions button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .quotation-wrapper {
            gap: 1.5rem;
          }

          .quotation-text-content {
            padding: 0 0.5rem;
          }

          .quotation-text-content h1 {
            font-size: 1.7rem;
          }

          .quotation-text-content p {
            font-size: 0.9rem;
          }

          .quotation-container {
            padding: 1.2rem;
          }

          .tab-btn {
            padding: 0.7rem 0.8rem;
            font-size: 0.85rem;
          }

          .form-section-title {
            font-size: 1.1rem;
          }

          .form-group label {
            font-size: 0.85rem;
          }

          .form-control {
            padding: 0.75rem 0.8rem;
            font-size: 16px;
          }

          .btn-calculate {
            padding: 0.85rem 1.2rem;
            font-size: 1rem;
          }

          .quotation-form-section {
            padding: 1.5rem 0.8rem;
          }

          .pricing-results {
            padding: 1.2rem;
          }

          .pricing-results h3 {
            font-size: 1.3rem;
          }

          .result-item {
            padding: 0.75rem;
            font-size: 0.85rem;
          }

          .result-actions button {
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
          }

          .quotation-text-image {
            margin-top: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}
