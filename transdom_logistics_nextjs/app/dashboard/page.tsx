"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAuthUser, hasValidAuth, clearAuthSession } from "@/lib/auth";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

const QUOTATION_STORAGE_KEY = "transdom_quotation_form";

interface QuotationData {
  // Sender
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_state: string;
  sender_city: string;
  sender_country: string;
  sender_email: string;
  // Receiver
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_state: string;
  receiver_city: string;
  receiver_post_code: string;
  receiver_country: string;
  // Shipment
  shipment_description: string;
  shipment_quantity: number;
  shipment_value: number | null;
  shipment_weight: number;
  // Pricing
  zone_picked: string;
  delivery_speed: "economy" | "standard" | "express";
  amount_paid: number;
  currency: string;
  estimated_delivery: string;
  // Additional
  pickup_country: string;
  destination_country: string;
  timestamp: string;
}

interface Shipment {
  _id: string;
  order_no: string;
  zone_picked: string;
  delivery_speed: string;
  amount_paid: number;
  status: string;
  date_created: string;
  sender_name: string;
  sender_country: string;
  receiver_name: string;
  receiver_country: string;
  shipment_description: string;
  shipment_weight: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "quotation">("overview");
  const [showHubModal, setShowHubModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClearQuotation = useCallback(() => {
    localStorage.removeItem(QUOTATION_STORAGE_KEY);
    setQuotation(null);
    setActiveTab("overview");
  }, []);

  const loadQuotation = useCallback(() => {
    const savedQuotation = localStorage.getItem(QUOTATION_STORAGE_KEY);
    if (savedQuotation) {
      try {
        const data: QuotationData = JSON.parse(savedQuotation);
        // Auto-append authenticated user's email to sender_email
        const currentUser = getAuthUser();
        if (currentUser && currentUser.email) {
          data.sender_email = currentUser.email;
        }
        setQuotation(data);
        setActiveTab("quotation");
      } catch (e) {
        console.error("Failed to parse quotation:", e);
      }
    }
  }, []);

  const fetchShipments = useCallback(async () => {
    setShipmentsLoading(true);
    try {
      const response = await fetch("/api/shipments", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setShipments(data.shipments || []);
      } else {
        setShipments([]);
      }
    } catch (err) {
      setShipments([]);
    } finally {
      setShipmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (!hasValidAuth()) {
          router.push("/sign-in");
          return;
        }

        const userData = getAuthUser();
        if (!userData) {
          router.push("/sign-in");
          return;
        }

        setUser(userData);
        setLoading(false);
        loadQuotation();
        fetchShipments();
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/sign-in");
      }
    };

    checkAuth();
  }, [router, loadQuotation, fetchShipments]);

  const handleCreateCashOrder = async () => {
    if (!quotation) return;
    
    setIsCreatingOrder(true);
    setError(null);

    try {
      const orderData = {
        sender_name: quotation.sender_name,
        sender_phone: quotation.sender_phone,
        sender_address: quotation.sender_address,
        sender_state: quotation.sender_state,
        sender_city: quotation.sender_city,
        sender_country: quotation.sender_country,
        sender_email: quotation.sender_email,
        receiver_name: quotation.receiver_name,
        receiver_phone: quotation.receiver_phone,
        receiver_address: quotation.receiver_address,
        receiver_state: quotation.receiver_state,
        receiver_city: quotation.receiver_city,
        receiver_post_code: quotation.receiver_post_code,
        receiver_country: quotation.receiver_country,
        shipment_description: quotation.shipment_description,
        shipment_quantity: quotation.shipment_quantity,
        shipment_value: quotation.shipment_value,
        shipment_weight: quotation.shipment_weight,
        zone_picked: quotation.zone_picked,
        delivery_speed: quotation.delivery_speed,
        amount_paid: quotation.amount_paid,
      };

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create order");
      }

      // Clear quotation and show success
      localStorage.removeItem(QUOTATION_STORAGE_KEY);
      setQuotation(null);
      setActiveTab("overview");
      setSuccessMessage(`Order created successfully! Order Number: ${data.order_no}`);
      fetchShipments(); // Refresh shipments
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!quotation) return;
    
    // Show hub center notification modal first
    setShowHubModal(true);
  };

  const handleConfirmAndProceed = () => {
    if (!quotation) return;
    
    setShowHubModal(false);

    if (paymentMethod === "cash") {
      handleCreateCashOrder();
    } else {
      // Save complete booking details for payment processing
      const completeBookingData = {
        sender_name: quotation.sender_name,
        sender_phone: quotation.sender_phone,
        sender_address: quotation.sender_address,
        sender_state: quotation.sender_state,
        sender_city: quotation.sender_city,
        sender_country: quotation.sender_country,
        sender_email: quotation.sender_email,
        receiver_name: quotation.receiver_name,
        receiver_phone: quotation.receiver_phone,
        receiver_address: quotation.receiver_address,
        receiver_state: quotation.receiver_state,
        receiver_city: quotation.receiver_city,
        receiver_post_code: quotation.receiver_post_code,
        receiver_country: quotation.receiver_country,
        shipment_description: quotation.shipment_description,
        shipment_quantity: quotation.shipment_quantity,
        shipment_value: quotation.shipment_value,
        shipment_weight: quotation.shipment_weight,
        zone_picked: quotation.zone_picked,
        delivery_speed: quotation.delivery_speed,
        amount_paid: quotation.amount_paid,
      };

      localStorage.setItem(
        "transdom_booking_details",
        JSON.stringify(completeBookingData),
      );

      // Redirect to online payment with query params
      const params = new URLSearchParams({
        zone: quotation.zone_picked,
        weight: quotation.shipment_weight.toString(),
        price: quotation.amount_paid.toString(),
        speed: quotation.delivery_speed,
        email: quotation.sender_email,
      });
      router.push(`/payment?${params.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            gap: 1rem;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />

      {/* Hub Center Notification Modal */}
      {showHubModal && (
        <div className="modal-overlay" onClick={() => setShowHubModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">📍</div>
            <h2 className="modal-title">Important Notice</h2>
            <p className="modal-message">
              Shipment should be dropped off at our Hub Center in <strong>Port Harcourt</strong> or <strong>Lagos</strong>
            </p>
            <div className="modal-actions">
              <button 
                className="btn-modal-cancel" 
                onClick={() => setShowHubModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-modal-confirm" 
                onClick={handleConfirmAndProceed}
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        {/* Success Message */}
        {successMessage && (
          <div className="success-notification">
            <div className="success-icon">✅</div>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <h1>Welcome back, {user?.firstname}! 👋</h1>
            <p>Here&apos;s an overview of your shipments and activity.</p>
          </div>
          <Link href="/quotation" className="btn-new-shipment">
            <span className="btn-icon">📦</span>
            New Shipment
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="tab-icon">📊</span>
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "quotation" ? "active" : ""}`}
            onClick={() => setActiveTab("quotation")}
            disabled={!quotation}
          >
            <span className="tab-icon">📝</span>
            Pending Quotation
            {quotation && <span className="badge">1</span>}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <div className="stat-label">Total Shipments</div>
                  <div className="stat-value">{shipments.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🚚</div>
                <div className="stat-content">
                  <div className="stat-label">In Transit</div>
                  <div className="stat-value">
                    {shipments.filter(s => s.status === "pending" || s.status === "in_transit").length}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-label">Delivered</div>
                  <div className="stat-value">
                    {shipments.filter(s => s.status === "delivered").length}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-label">Total Spent</div>
                  <div className="stat-value">
                    ₦{shipments.reduce((sum, s) => sum + (s.amount_paid || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipments List */}
            <div className="shipments-section">
              <div className="section-header">
                <h2>Recent Shipments</h2>
                {quotation && (
                  <button
                    className="btn-view-quotation"
                    onClick={() => setActiveTab("quotation")}
                  >
                    View Pending Quotation
                  </button>
                )}
              </div>

              {shipmentsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading shipments...</p>
                </div>
              ) : shipments.length > 0 ? (
                <div className="shipments-list">
                  {shipments.map((shipment) => (
                    <div key={shipment._id} className="shipment-card">
                      <div className="shipment-header">
                        <div className="shipment-title">
                          <span className="order-no">{shipment.order_no}</span>
                          <span className={`status-badge status-${shipment.status}`}>
                            {shipment.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="shipment-date">
                          {new Date(shipment.date_created).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </div>
                      </div>

                      <div className="shipment-details">
                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-icon">📤</span>
                            <div>
                              <div className="detail-label">From</div>
                              <div className="detail-value">{shipment.sender_name}</div>
                              <div className="detail-sub">{shipment.sender_country}</div>
                            </div>
                          </div>
                          <div className="detail-divider">→</div>
                          <div className="detail-item">
                            <span className="detail-icon">📥</span>
                            <div>
                              <div className="detail-label">To</div>
                              <div className="detail-value">{shipment.receiver_name}</div>
                              <div className="detail-sub">{shipment.receiver_country}</div>
                            </div>
                          </div>
                        </div>

                        <div className="shipment-info">
                          <div className="info-col">
                            <div className="info-label">Package</div>
                            <div className="info-text">{shipment.shipment_description}</div>
                          </div>
                          <div className="info-col">
                            <div className="info-label">Weight</div>
                            <div className="info-text">{shipment.shipment_weight} kg</div>
                          </div>
                          <div className="info-col">
                            <div className="info-label">Delivery Speed</div>
                            <div className="info-text" style={{ textTransform: "capitalize" }}>
                              {shipment.delivery_speed}
                            </div>
                          </div>
                          <div className="info-col">
                            <div className="info-label">Amount</div>
                            <div className="info-text">₦{shipment.amount_paid.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-shipments">
                  <div className="empty-icon">📦</div>
                  <h3>No Shipments Yet</h3>
                  <p>Start by creating your first shipping quotation.</p>
                  <Link href="/quotation" className="btn-get-started">
                    Get a Quote
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {/* Quotation Tab */}
        {activeTab === "quotation" && quotation && (
          <div className="quotation-card">
            <div className="quotation-header">
              <h2>Review Your Booking</h2>
              <button onClick={handleClearQuotation} className="btn-clear">
                Clear Quote
              </button>
            </div>

            {/* Sender Information */}
            <div className="review-section">
              <h3 className="section-title">📤 Sender Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{quotation.sender_name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{quotation.sender_email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{quotation.sender_phone}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Country:</span>
                  <span className="info-value">{quotation.sender_country}</span>
                </div>
                <div className="info-item full-width">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{quotation.sender_address}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">City:</span>
                  <span className="info-value">{quotation.sender_city}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">State:</span>
                  <span className="info-value">{quotation.sender_state}</span>
                </div>
              </div>
            </div>

            {/* Receiver Information */}
            <div className="review-section">
              <h3 className="section-title">📥 Receiver Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{quotation.receiver_name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{quotation.receiver_phone}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Country:</span>
                  <span className="info-value">{quotation.receiver_country}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Post Code:</span>
                  <span className="info-value">{quotation.receiver_post_code}</span>
                </div>
                <div className="info-item full-width">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{quotation.receiver_address}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">City:</span>
                  <span className="info-value">{quotation.receiver_city}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">State:</span>
                  <span className="info-value">{quotation.receiver_state}</span>
                </div>
              </div>
            </div>

            {/* Shipment Information */}
            <div className="review-section">
              <h3 className="section-title">📦 Shipment Information</h3>
              <div className="info-grid">
                <div className="info-item full-width">
                  <span className="info-label">Description:</span>
                  <span className="info-value">{quotation.shipment_description}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Quantity:</span>
                  <span className="info-value">{quotation.shipment_quantity} item(s)</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Weight:</span>
                  <span className="info-value">{quotation.shipment_weight} kg</span>
                </div>
                {quotation.shipment_value && (
                  <div className="info-item">
                    <span className="info-label">Declared Value:</span>
                    <span className="info-value">{quotation.currency} {quotation.shipment_value.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Details */}
            <div className="review-section">
              <h3 className="section-title">🚚 Shipping Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">From:</span>
                  <span className="info-value">{quotation.pickup_country}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">To:</span>
                  <span className="info-value">{quotation.destination_country}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Zone:</span>
                  <span className="info-value">{quotation.zone_picked}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Delivery Speed:</span>
                  <span className="info-value" style={{ textTransform: "capitalize" }}>
                    {quotation.delivery_speed}
                  </span>
                </div>
                <div className="info-item full-width">
                  <span className="info-label">Estimated Delivery:</span>
                  <span className="info-value">{quotation.estimated_delivery}</span>
                </div>
              </div>
            </div>

            {/* Total Price */}
            <div className="total-price-section">
              <span className="total-label">Total Price:</span>
              <span className="total-amount">
                {quotation.currency} {quotation.amount_paid.toLocaleString()}
              </span>
            </div>

            {/* Payment Method Selection */}
            <div className="payment-method-section">
              <h3 className="section-title">💳 Select Payment Method</h3>
              <div className="payment-options">
                <label className={`payment-option ${paymentMethod === "online" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === "online"}
                    onChange={(e) => setPaymentMethod(e.target.value as "online" | "cash")}
                  />
                  <div className="option-content">
                    <div className="option-icon">💳</div>
                    <div className="option-details">
                      <div className="option-name">Online Payment</div>
                      <div className="option-desc">Pay securely with Paystack</div>
                    </div>
                  </div>
                </label>

                <label className={`payment-option ${paymentMethod === "cash" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => setPaymentMethod(e.target.value as "online" | "cash")}
                  />
                  <div className="option-content">
                    <div className="option-icon">💵</div>
                    <div className="option-details">
                      <div className="option-name">Cash Payment</div>
                      <div className="option-desc">Pay on delivery or pickup</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              onClick={handleProceedToPayment} 
              className="btn-proceed-payment"
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? "Creating Order..." : paymentMethod === "online" ? "Proceed to Payment" : "Confirm Order (Cash Payment)"}
            </button>
          </div>
        )}

        {/* No Quotation in Quotation Tab */}
        {activeTab === "quotation" && !quotation && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No Pending Quotation</h3>
            <p>You don&apos;t have any pending quotations at the moment.</p>
            <Link href="/quotation" className="btn-get-started">
              Get a Quote
            </Link>
          </div>
        )}
      </main>

      <Footer />

      <style jsx>{`
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
          text-align: center;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-icon {
          font-size: 64px;
          margin-bottom: 1rem;
        }

        .modal-title {
          font-size: 28px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 1rem;
        }

        .modal-message {
          font-size: 18px;
          color: #374151;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .modal-message strong {
          color: #047857;
          font-weight: 600;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn-modal-cancel {
          padding: 0.875rem 1.75rem;
          background: transparent;
          color: #6b7280;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-modal-cancel:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .btn-modal-confirm {
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
        }

        .btn-modal-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }

        /* Success Notification */
        .success-notification {
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 16px;
          font-weight: 500;
          z-index: 1001;
          animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4.7s;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .success-icon {
          font-size: 24px;
        }

        .dashboard {
          min-height: 100vh;
          background-color: #f9fafb;
        }

        .dashboard-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
        }

        /* Welcome Section */
        .welcome-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #d1fae5;
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .welcome-content h1 {
          font-size: 32px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 0.5rem;
        }

        .welcome-content p {
          color: #6b7280;
          font-size: 16px;
        }

        .btn-new-shipment {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
        }

        .btn-new-shipment:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-icon {
          font-size: 20px;
        }

        /* Tab Navigation */
        .tab-navigation {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          background: white;
          padding: 0.75rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .tab-btn:hover:not(:disabled) {
          background: #f0fdf4;
          color: #047857;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
        }

        .tab-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-icon {
          font-size: 20px;
        }

        .badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #fdd835;
          color: #047857;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 20px;
          text-align: center;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          font-size: 40px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          width: 70px;
          height: 70px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #047857;
        }

        /* Shipments Section */
        .shipments-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f0fdf4;
        }

        .section-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #047857;
          margin: 0;
        }

        .btn-view-quotation {
          background: #fdd835;
          color: #047857;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view-quotation:hover {
          background: #fbc02d;
          transform: translateY(-2px);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #d1fae5;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p {
          color: #6b7280;
          font-size: 16px;
        }

        /* Shipments List */
        .shipments-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .shipment-card {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .shipment-card:hover {
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        }

        .shipment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .shipment-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .order-no {
          font-size: 18px;
          font-weight: 700;
          color: #047857;
        }

        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-in_transit {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-delivered {
          background: #d1fae5;
          color: #065f46;
        }

        .shipment-date {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .shipment-details {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 2rem;
          background: white;
          padding: 1rem;
          border-radius: 8px;
        }

        .detail-item {
          flex: 1;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .detail-icon {
          font-size: 24px;
        }

        .detail-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .detail-value {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.125rem;
        }

        .detail-sub {
          font-size: 14px;
          color: #6b7280;
        }

        .detail-divider {
          font-size: 24px;
          color: #10b981;
          font-weight: 700;
        }

        .shipment-info {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          background: white;
          padding: 1rem;
          border-radius: 8px;
        }

        .info-col {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.375rem;
        }

        .info-text {
          font-size: 14px;
          color: #1f2937;
          font-weight: 600;
        }

        .empty-shipments {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-shipments h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .empty-shipments p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        /* Quotation Card */
        .quotation-card {
          background: white;
          border: 2px solid #d1fae5;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .quotation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f0fdf4;
        }

        .quotation-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #047857;
          margin: 0;
        }

        .btn-clear {
          background: transparent;
          border: 2px solid #dc2626;
          color: #dc2626;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-clear:hover {
          background: #dc2626;
          color: white;
        }

        /* Review Sections */
        .review-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-item.full-width {
          grid-column: span 2;
        }

        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 14px;
          color: #1f2937;
          font-weight: 500;
        }

        /* Total Price Section */
        .total-price-section {
          background: linear-gradient(135deg, #047857 0%, #065f46 100%);
          border: none;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-label {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .total-amount {
          font-size: 28px;
          font-weight: 700;
          color: #fdd835;
        }

        /* Payment Method Section */
        .payment-method-section {
          background: #f0fdf4;
          border: 1px solid #d1fae5;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .payment-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }

        .payment-option {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .payment-option:hover {
          border-color: #10b981;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        }

        .payment-option.selected {
          border-color: #10b981;
          background: #f0fdf4;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .payment-option input[type="radio"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }

        .option-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .option-icon {
          font-size: 32px;
        }

        .option-details {
          flex: 1;
        }

        .option-name {
          font-size: 16px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 0.25rem;
        }

        .option-desc {
          font-size: 13px;
          color: #6b7280;
        }

        /* Error Message */
        .error-message {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-proceed-payment {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
        }

        .btn-proceed-payment:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-proceed-payment:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          border: 2px solid #d1fae5;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .btn-get-started {
          display: inline-block;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .btn-get-started:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .shipment-info {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .dashboard-main {
            padding: 1.5rem 1rem;
          }

          .welcome-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .welcome-content h1 {
            font-size: 24px;
          }

          .btn-new-shipment {
            width: 100%;
            justify-content: center;
          }

          .tab-navigation {
            flex-direction: column;
          }

          .tab-btn {
            justify-content: flex-start;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 1.25rem;
          }

          .stat-icon {
            width: 60px;
            height: 60px;
            font-size: 32px;
          }

          .stat-value {
            font-size: 24px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .btn-view-quotation {
            width: 100%;
          }

          .shipment-card {
            padding: 1.25rem;
          }

          .shipment-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .detail-row {
            flex-direction: column;
            gap: 1rem;
          }

          .detail-divider {
            transform: rotate(90deg);
          }

          .shipment-info {
            grid-template-columns: 1fr;
          }

          .quotation-card {
            padding: 1.25rem;
          }

          .quotation-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .btn-clear {
            width: 100%;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .info-item.full-width {
            grid-column: span 1;
          }

          .payment-options {
            grid-template-columns: 1fr;
          }

          .total-price-section {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
