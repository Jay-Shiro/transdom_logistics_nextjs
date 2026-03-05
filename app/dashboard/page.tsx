"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  BarChart3,
  CheckCircle,
  FileText,
  Hand,
  Inbox,
  MapPin,
  Package,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { getAuthUser, hasValidAuth, clearAuthSession } from "@/lib/auth";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

// Map generic speed names to carrier names
const getCarrierName = (speed: string): string => {
  const speedMap: Record<string, string> = {
    economy: "UPS",
    standard: "FedEx",
    express: "DHL",
  };
  return speedMap[speed.toLowerCase()] || speed;
};

const BASIC_QUOTE_STORAGE_KEY = "transdom_basic_quote";

interface BasicQuote {
  pickup_country: string;
  pickup_state?: string;
  pickup_city?: string;
  destination_country: string;
  destination_state?: string;
  destination_city?: string;
  weight: number;
  zone_picked: string;
  delivery_speed: string;
  amount_paid: number;
  currency: string;
  estimated_delivery: string;
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
  tracking_id?: string | null;
}

interface TrackingEvent {
  status: string | null;
  description: string | null;
  location: string | null;
  timestamp: string | null;
  created_at?: string | null;
}

interface TrackingResponse {
  tracking_id: string;
  carrier: string | null;
  current_status: string | null;
  estimated_delivery: string | null;
  origin: string | null;
  destination: string | null;
  events: TrackingEvent[];
  raw?: {
    data?: {
      events?: TrackingEvent[];
      status?: string;
      delivery_date?: string;
    };
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [basicQuote, setBasicQuote] = useState<BasicQuote | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "settings"
  >("overview");
  const [orderFilter, setOrderFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [showQuoteToast, setShowQuoteToast] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingResponse | null>(
    null,
  );
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrderNo, setTrackingOrderNo] = useState<string>("");

  const handleClearQuotation = useCallback(() => {
    localStorage.removeItem(BASIC_QUOTE_STORAGE_KEY);
    setBasicQuote(null);
    setActiveTab("overview");
  }, []);

  const loadQuotation = useCallback(() => {
    const savedQuote = localStorage.getItem(BASIC_QUOTE_STORAGE_KEY);
    if (savedQuote) {
      try {
        const data: BasicQuote = JSON.parse(savedQuote);
        // Only set if we have valid data with required fields
        if (
          data &&
          data.amount_paid &&
          data.pickup_country &&
          data.destination_country &&
          data.weight &&
          data.zone_picked
        ) {
          setBasicQuote(data);
        } else {
          console.warn("Invalid quote data, missing required fields:", data);
        }
      } catch (e) {
        console.error("Failed to parse basic quote:", e);
        localStorage.removeItem(BASIC_QUOTE_STORAGE_KEY);
      }
    }
  }, []);

  const fetchShipments = useCallback(async () => {
    setShipmentsLoading(true);
    try {
      const response = await fetch("/api/shipments", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
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

  const handleContinueBooking = () => {
    router.push("/booking");
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone. All your shipment data will be permanently deleted.",
      )
    ) {
      return;
    }

    // Second confirmation for safety
    if (
      !confirm(
        "This is your final warning. Are you absolutely sure you want to delete your account?",
      )
    ) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch("/api/me", {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        // Clear local auth session
        clearAuthSession();

        // Show success message
        alert(
          "Your account has been successfully deleted. You will be redirected to the homepage.",
        );

        // Redirect to home page
        router.push("/");
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Delete account error:", error);
      alert("An error occurred while deleting your account. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTrackShipment = async (shipment: Shipment) => {
    if (!shipment.tracking_id) return;
    setTrackingOrderNo(shipment.order_no);
    setTrackingData(null);
    setTrackingError(null);
    setTrackingLoading(true);
    setShowTrackingModal(true);
    const carrierMap: Record<string, string> = {
      economy: "UPS",
      standard: "FEDEX",
      express: "DHL",
    };
    const carrierCode = carrierMap[shipment.delivery_speed.toLowerCase()] || "";
    try {
      const url = `/api/tracking/${encodeURIComponent(shipment.tracking_id)}${carrierCode ? `?carrier=${carrierCode}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setTrackingError(
          data.detail || "Failed to fetch tracking info. Please try again.",
        );
      } else {
        setTrackingData(data);
      }
    } catch {
      setTrackingError(
        "Failed to fetch tracking info. Check your connection and try again.",
      );
    } finally {
      setTrackingLoading(false);
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

      <main className="dashboard-main">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <h1>
              Welcome back, {user?.firstname}! <Hand size={20} />
            </h1>
            <p>Here&apos;s an overview of your shipments and activity.</p>
          </div>
          <Link href="/quotation" className="btn-new-shipment">
            <span className="btn-icon">
              <Package size={20} />
            </span>
            New Shipment
          </Link>
        </div>

        {/* Pending Quote Toast */}
        {basicQuote && showQuoteToast && (
          <div className="quote-toast">
            <div
              className="quote-toast-content"
              onClick={handleContinueBooking}
            >
              <div className="quote-toast-icon">
                <FileText size={20} />
              </div>
              <div className="quote-toast-info">
                <div className="quote-toast-title">Pending Quote Available</div>
                <div className="quote-toast-subtitle">
                  {basicQuote.pickup_country} → {basicQuote.destination_country}{" "}
                  • ₦{basicQuote.amount_paid.toLocaleString()}
                </div>
              </div>
              <button className="quote-toast-action">Continue Booking →</button>
            </div>
            <button
              className="quote-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuoteToast(false);
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="tab-icon">
              <BarChart3 size={20} />
            </span>
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <span className="tab-icon">
              <Package size={20} />
            </span>
            All Orders
            {shipments.length > 0 && (
              <span className="badge">{shipments.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span className="tab-icon">
              <Settings size={20} />
            </span>
            Settings
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <Package size={28} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Shipments</div>
                  <div className="stat-value">{shipments.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon pending-color">
                  <Hand size={28} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Pending</div>
                  <div className="stat-value">
                    {shipments.filter((s) => s.status === "pending").length}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon approved-color">
                  <CheckCircle size={28} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Approved</div>
                  <div className="stat-value">
                    {shipments.filter((s) => s.status === "approved").length}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <BadgeDollarSign size={28} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Spent</div>
                  <div className="stat-value">
                    ₦
                    {shipments
                      .reduce((sum, s) => sum + (s.amount_paid || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h2>Quick Actions</h2>
              <div className="quick-actions-grid">
                <Link href="/quotation" className="quick-action-card">
                  <div className="quick-action-icon">
                    <FileText size={32} />
                  </div>
                  <h3>Get a Quote</h3>
                  <p>Calculate shipping costs instantly</p>
                </Link>
                <Link href="/booking" className="quick-action-card">
                  <div className="quick-action-icon">
                    <Send size={32} />
                  </div>
                  <h3>New Booking</h3>
                  <p>Create a new shipment order</p>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* All Orders Tab */}
        {activeTab === "orders" && (
          <>
            <div className="orders-header">
              <div>
                <h2>All Orders</h2>
                <p>View and manage all your shipments</p>
              </div>

              {/* Filter Buttons */}
              <div className="order-filters">
                <button
                  className={`filter-btn ${orderFilter === "all" ? "active" : ""}`}
                  onClick={() => setOrderFilter("all")}
                >
                  All Orders
                  <span className="filter-count">{shipments.length}</span>
                </button>
                <button
                  className={`filter-btn ${orderFilter === "pending" ? "active" : ""}`}
                  onClick={() => setOrderFilter("pending")}
                >
                  Pending
                  <span className="filter-count">
                    {shipments.filter((s) => s.status === "pending").length}
                  </span>
                </button>
                <button
                  className={`filter-btn ${orderFilter === "approved" ? "active" : ""}`}
                  onClick={() => setOrderFilter("approved")}
                >
                  Approved
                  <span className="filter-count">
                    {shipments.filter((s) => s.status === "approved").length}
                  </span>
                </button>
                <button
                  className={`filter-btn ${orderFilter === "rejected" ? "active" : ""}`}
                  onClick={() => setOrderFilter("rejected")}
                >
                  Rejected
                  <span className="filter-count">
                    {shipments.filter((s) => s.status === "rejected").length}
                  </span>
                </button>
              </div>
            </div>

            {shipmentsLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your orders...</p>
              </div>
            ) : (
              <>
                {(() => {
                  const filteredShipments =
                    orderFilter === "all"
                      ? shipments
                      : shipments.filter((s) => s.status === orderFilter);

                  return filteredShipments.length > 0 ? (
                    <div className="shipments-list">
                      {filteredShipments.map((shipment) => (
                        <div key={shipment._id} className="shipment-card">
                          <div className="shipment-header">
                            <div className="shipment-title">
                              <span className="order-no">
                                {shipment.order_no}
                              </span>
                              <span
                                className={`status-badge status-${shipment.status}`}
                              >
                                {shipment.status === "pending" && (
                                  <Hand size={14} />
                                )}
                                {shipment.status === "approved" && (
                                  <CheckCircle size={14} />
                                )}
                                {shipment.status.replace("_", " ")}
                              </span>
                              {shipment.tracking_id && (
                                <span className="tracking-available-badge">
                                  <Truck size={12} /> Tracked
                                </span>
                              )}
                            </div>
                            <div className="shipment-date">
                              {new Date(
                                shipment.date_created,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>

                          <div className="shipment-details">
                            <div className="detail-row">
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <Send size={18} />
                                </span>
                                <div>
                                  <div className="detail-label">From</div>
                                  <div className="detail-value">
                                    {shipment.sender_name}
                                  </div>
                                  <div className="detail-sub">
                                    {shipment.sender_country}
                                  </div>
                                </div>
                              </div>
                              <div className="detail-divider">→</div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <Inbox size={18} />
                                </span>
                                <div>
                                  <div className="detail-label">To</div>
                                  <div className="detail-value">
                                    {shipment.receiver_name}
                                  </div>
                                  <div className="detail-sub">
                                    {shipment.receiver_country}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="shipment-info">
                              <div className="info-col">
                                <div className="info-label">Package</div>
                                <div className="info-text">
                                  {shipment.shipment_description}
                                </div>
                              </div>
                              <div className="info-col">
                                <div className="info-label">Weight</div>
                                <div className="info-text">
                                  {shipment.shipment_weight} kg
                                </div>
                              </div>
                              <div className="info-col">
                                <div className="info-label">Carrier</div>
                                <div
                                  className="info-text"
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {getCarrierName(shipment.delivery_speed)}
                                </div>
                              </div>
                              <div className="info-col">
                                <div className="info-label">Amount</div>
                                <div className="info-text">
                                  ₦{shipment.amount_paid.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="shipment-actions">
                              {shipment.tracking_id ? (
                                <button
                                  className="btn-track-shipment"
                                  onClick={() => handleTrackShipment(shipment)}
                                >
                                  <Truck size={16} /> Track Shipment
                                </button>
                              ) : shipment.status === "approved" ? (
                                <span className="tracking-pending-label">
                                  <Truck size={14} /> Awaiting tracking info
                                </span>
                              ) : null}
                              <Link
                                href={`/receipt/${shipment.order_no}`}
                                className="btn-view-receipt"
                              >
                                <FileText size={16} /> View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <Package size={48} />
                      </div>
                      <h3>
                        No{" "}
                        {orderFilter === "all"
                          ? ""
                          : orderFilter.charAt(0).toUpperCase() +
                            orderFilter.slice(1)}{" "}
                        Orders
                      </h3>
                      <p>
                        {orderFilter === "all"
                          ? "You haven't placed any orders yet."
                          : `You don't have any ${orderFilter} orders at the moment.`}
                      </p>
                      <Link href="/quotation" className="btn-get-started">
                        Create New Order
                      </Link>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="settings-section">
            {/* Account Information */}
            <div className="settings-card">
              <div className="settings-header">
                <div className="settings-icon">
                  <User size={24} />
                </div>
                <div>
                  <h3>Account Information</h3>
                  <p>Your personal account details</p>
                </div>
              </div>
              <div className="account-info-grid">
                <div className="info-field">
                  <label>Name</label>
                  <div className="info-value">
                    {user?.firstname} {user?.lastname}
                  </div>
                </div>
                <div className="info-field">
                  <label>Email</label>
                  <div className="info-value">{user?.email}</div>
                </div>
                <div className="info-field">
                  <label>Account Type</label>
                  <div className="info-value">
                    <span
                      className={`account-type-badge ${user?.account_type === "business" ? "business" : "individual"}`}
                    >
                      {user?.account_type === "business"
                        ? "Business"
                        : "Individual"}
                    </span>
                  </div>
                </div>
                <div className="info-field">
                  <label>Total Orders</label>
                  <div className="info-value">
                    <span className="order-count">{shipments.length}</span>
                  </div>
                </div>
                <div className="info-field">
                  <label>Country</label>
                  <div className="info-value">{user?.country || "N/A"}</div>
                </div>
                <div className="info-field">
                  <label>Phone</label>
                  <div className="info-value">
                    {user?.phone_number || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="settings-card danger-zone">
              <div className="settings-header">
                <div className="settings-icon danger">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3>Danger Zone</h3>
                  <p>Irreversible and destructive actions</p>
                </div>
              </div>
              <div className="danger-content">
                <div className="danger-info">
                  <h4>Delete Account</h4>
                  <p>
                    Once you delete your account, there is no going back. All
                    your shipment data, quotations, and personal information
                    will be permanently deleted.
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="btn-delete-account"
                >
                  {deleteLoading ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete My Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button - View All Orders */}
      <button
        className="floating-action-button"
        onClick={() => setActiveTab("orders")}
        title="View All Orders"
      >
        <Package size={24} />
        <span className="fab-text">View All Orders</span>
      </button>

      {/* Tracking Modal */}
      {showTrackingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
          onClick={() => setShowTrackingModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
                padding: "1.75rem 2rem",
                borderTopLeftRadius: "20px",
                borderTopRightRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Truck size={28} color="white" />
                </div>
                <div>
                  <h2
                    style={{
                      color: "white",
                      fontSize: "22px",
                      fontWeight: "800",
                      margin: 0,
                    }}
                  >
                    Shipment Tracking
                  </h2>
                  <p
                    style={{
                      color: "#a7f3d0",
                      fontSize: "14px",
                      margin: "0.25rem 0 0 0",
                    }}
                  >
                    Order #{trackingOrderNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTrackingModal(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "white",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  fontSize: "22px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  lineHeight: "1",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.75rem 2rem" }}>
              {trackingLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4rem 2rem",
                    gap: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      border: "4px solid #d1fae5",
                      borderTop: "4px solid #10b981",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        color: "#047857",
                        fontWeight: "700",
                        fontSize: "16px",
                        margin: "0 0 0.25rem 0",
                      }}
                    >
                      Fetching Live Tracking Data
                    </p>
                    <p
                      style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}
                    >
                      Contacting carrier, this may take a few seconds...
                    </p>
                  </div>
                </div>
              ) : trackingError ? (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "2px solid #fecaca",
                    borderRadius: "16px",
                    padding: "2.5rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "1rem" }}>
                    ⚠️
                  </div>
                  <h3
                    style={{
                      color: "#991b1b",
                      fontSize: "18px",
                      fontWeight: "700",
                      marginBottom: "0.75rem",
                      margin: "0 0 0.75rem 0",
                    }}
                  >
                    Unable to Fetch Tracking Info
                  </h3>
                  <p
                    style={{
                      color: "#7f1d1d",
                      fontSize: "15px",
                      margin: "0 0 1.5rem 0",
                    }}
                  >
                    {trackingError}
                  </p>
                  <button
                    onClick={() => {
                      const ship = shipments.find(
                        (s) => s.order_no === trackingOrderNo,
                      );
                      if (ship) handleTrackShipment(ship);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1.5rem",
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={16} /> Try Again
                  </button>
                </div>
              ) : trackingData ? (
                <>
                  {/* Status Banner */}
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      border: "2px solid #10b981",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    {/* Current Status + Estimated Delivery */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: "1.25rem",
                        flexWrap: "wrap",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            margin: "0 0 0.5rem 0",
                          }}
                        >
                          Current Status
                        </p>
                        {(() => {
                          const statusMap: Record<
                            string,
                            { label: string; bg: string; color: string }
                          > = {
                            PICKED_UP: {
                              label: "📦 Picked Up",
                              bg: "#dbeafe",
                              color: "#1e40af",
                            },
                            IN_TRANSIT: {
                              label: "✈️ In Transit",
                              bg: "#fef3c7",
                              color: "#92400e",
                            },
                            OUT_FOR_DELIVERY: {
                              label: "🚚 Out for Delivery",
                              bg: "#ffedd5",
                              color: "#9a3412",
                            },
                            DELIVERED: {
                              label: "✅ Delivered",
                              bg: "#d1fae5",
                              color: "#065f46",
                            },
                            EXCEPTION: {
                              label: "⚠️ Attention Required",
                              bg: "#fee2e2",
                              color: "#991b1b",
                            },
                          };
                          const key = (
                            trackingData.current_status || ""
                          ).toUpperCase();
                          const info = statusMap[key] || {
                            label: trackingData.current_status || "Unknown",
                            bg: "#f3f4f6",
                            color: "#374151",
                          };
                          return (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem 1.25rem",
                                borderRadius: "99px",
                                background: info.bg,
                                color: info.color,
                                fontSize: "15px",
                                fontWeight: "700",
                              }}
                            >
                              {info.label}
                            </span>
                          );
                        })()}
                      </div>
                      {trackingData.estimated_delivery && (
                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              margin: "0 0 0.25rem 0",
                            }}
                          >
                            Est. Delivery
                          </p>
                          <p
                            style={{
                              fontSize: "17px",
                              fontWeight: "700",
                              color: "#047857",
                              margin: 0,
                            }}
                          >
                            {new Date(
                              trackingData.estimated_delivery,
                            ).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Route origin → destination */}
                    {(trackingData.origin || trackingData.destination) && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          background: "white",
                          borderRadius: "12px",
                          padding: "1rem 1.25rem",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              margin: "0 0 0.25rem 0",
                            }}
                          >
                            Origin
                          </p>
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#1f2937",
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                            }}
                          >
                            <MapPin size={14} color="#3b82f6" />{" "}
                            {trackingData.origin || "—"}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            color: "#10b981",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "2px",
                              background: "#10b981",
                            }}
                          />
                          <Truck size={18} color="#10b981" />
                          <div
                            style={{
                              width: "24px",
                              height: "2px",
                              background: "#10b981",
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, textAlign: "right" }}>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              margin: "0 0 0.25rem 0",
                            }}
                          >
                            Destination
                          </p>
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#1f2937",
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "0.375rem",
                            }}
                          >
                            {trackingData.destination || "—"}{" "}
                            <MapPin size={14} color="#16a34a" />
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Meta: carrier + tracking # */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          background: "white",
                          borderRadius: "8px",
                          padding: "0.5rem 0.875rem",
                          fontSize: "13px",
                          wordBreak: "break-all",
                        }}
                      >
                        <span style={{ color: "#6b7280", fontWeight: "600" }}>
                          Tracking #:{" "}
                        </span>
                        <span
                          style={{
                            color: "#047857",
                            fontWeight: "700",
                            fontFamily: "monospace",
                          }}
                        >
                          {trackingData.tracking_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  {(trackingData.raw?.data?.events ?? trackingData.events)
                    .length > 0 ? (
                    <div>
                      <h3
                        style={{
                          fontSize: "17px",
                          fontWeight: "700",
                          color: "#047857",
                          margin: "0 0 1.25rem 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Package size={18} /> Tracking Timeline
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {[
                          ...(trackingData.raw?.data?.events ??
                            trackingData.events),
                        ]
                          .reverse()
                          .map((evt, i, arr) => (
                            <div
                              key={i}
                              style={{ display: "flex", gap: "1rem" }}
                            >
                              {/* Marker */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  flexShrink: 0,
                                  width: "22px",
                                }}
                              >
                                <div
                                  style={{
                                    width: i === 0 ? "16px" : "12px",
                                    height: i === 0 ? "16px" : "12px",
                                    borderRadius: "50%",
                                    background: i === 0 ? "#10b981" : "#d1fae5",
                                    border:
                                      i === 0
                                        ? "3px solid #10b981"
                                        : "2px solid #6ee7b7",
                                    marginTop: "4px",
                                    zIndex: 1,
                                    flexShrink: 0,
                                    boxShadow:
                                      i === 0
                                        ? "0 0 0 4px rgba(16,185,129,0.2)"
                                        : "none",
                                  }}
                                />
                                {i < arr.length - 1 && (
                                  <div
                                    style={{
                                      width: "2px",
                                      flex: 1,
                                      background: "#d1fae5",
                                      minHeight: "28px",
                                    }}
                                  />
                                )}
                              </div>
                              {/* Content */}
                              <div
                                style={{
                                  flex: 1,
                                  paddingBottom:
                                    i < arr.length - 1 ? "1rem" : 0,
                                }}
                              >
                                <div
                                  style={{
                                    background: i === 0 ? "#f0fdf4" : "#f9fafb",
                                    border:
                                      i === 0
                                        ? "1px solid #86efac"
                                        : "1px solid #e5e7eb",
                                    borderRadius: "12px",
                                    padding: "0.875rem 1rem",
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: "700",
                                      color: i === 0 ? "#065f46" : "#374151",
                                      margin: "0 0 0.25rem 0",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {(evt.status || "Update").replace(
                                      /_/g,
                                      " ",
                                    )}
                                  </p>
                                  {evt.description && (
                                    <p
                                      style={{
                                        fontSize: "13px",
                                        color: "#6b7280",
                                        margin: "0 0 0.5rem 0",
                                      }}
                                    >
                                      {evt.description}
                                    </p>
                                  )}
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "1rem",
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                    }}
                                  >
                                    {evt.location && (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.25rem",
                                          fontSize: "12px",
                                          color: "#6b7280",
                                        }}
                                      >
                                        <MapPin size={11} /> {evt.location}
                                      </span>
                                    )}
                                    {(evt.created_at || evt.timestamp) && (
                                      <span
                                        style={{
                                          fontSize: "12px",
                                          color: "#9ca3af",
                                          fontStyle: "italic",
                                        }}
                                      >
                                        {new Date(
                                          (evt.created_at || evt.timestamp)!,
                                        ).toLocaleString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#f9fafb",
                        border: "2px dashed #d1d5db",
                        borderRadius: "12px",
                        padding: "2rem",
                        textAlign: "center",
                      }}
                    >
                      <Truck
                        size={32}
                        color="#9ca3af"
                        style={{
                          margin: "0 auto 0.75rem auto",
                          display: "block",
                        }}
                      />
                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "15px",
                          margin: 0,
                        }}
                      >
                        No tracking events yet. Check back soon.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1.25rem 2rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f9fafb",
                borderBottomLeftRadius: "20px",
                borderBottomRightRadius: "20px",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
                Tracking updates may take a few minutes to refresh.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => {
                    const ship = shipments.find(
                      (s) => s.order_no === trackingOrderNo,
                    );
                    if (ship) handleTrackShipment(ship);
                  }}
                  disabled={trackingLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 1.25rem",
                    background: trackingLoading ? "#e5e7eb" : "white",
                    color: trackingLoading ? "#9ca3af" : "#047857",
                    border: "2px solid",
                    borderColor: trackingLoading ? "#e5e7eb" : "#10b981",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: trackingLoading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <RefreshCw size={15} /> Refresh
                </button>
                <button
                  onClick={() => setShowTrackingModal(false)}
                  style={{
                    padding: "0.625rem 1.5rem",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          animation:
            slideInRight 0.3s ease,
            fadeOut 0.3s ease 4.7s;
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
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .success-icon {
          font-size: 24px;
        }

        .dashboard {
          min-height: 100vh;
          background-color: #f9fafb;
          overflow-x: hidden;
        }

        .dashboard-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem;
          overflow-x: hidden;
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
          display: inline-flex;
          align-items: center;
        }

        .btn-icon svg {
          width: 20px;
          height: 20px;
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
          display: inline-flex;
          align-items: center;
        }

        .tab-icon svg {
          width: 20px;
          height: 20px;
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

        /* Quote Toast */
        .quote-toast {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
          animation: slideDown 0.4s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quote-toast-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
        }

        .quote-toast-icon {
          background: #fbbf24;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .quote-toast-info {
          flex: 1;
        }

        .quote-toast-title {
          font-size: 16px;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 0.25rem;
        }

        .quote-toast-subtitle {
          font-size: 14px;
          color: #78350f;
        }

        .quote-toast-action {
          background: #fbbf24;
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .quote-toast-action:hover {
          background: #f59e0b;
          transform: translateY(-2px);
        }

        .quote-toast-close {
          background: transparent;
          border: none;
          color: #92400e;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .quote-toast-close:hover {
          background: rgba(146, 64, 14, 0.1);
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
          color: #ffffff;
        }

        .stat-icon.pending-color {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }

        .stat-icon.approved-color {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .stat-icon svg {
          width: 28px;
          height: 28px;
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

        /* Quick Actions Section */
        .quick-actions-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .quick-actions-section h2 {
          font-size: 24px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 1.5rem;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .quick-action-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.2);
          border-color: #059669;
        }

        .quick-action-icon {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          width: 64px;
          height: 64px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quick-action-card h3 {
          font-size: 18px;
          font-weight: 700;
          color: #047857;
          margin: 0;
        }

        .quick-action-card p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        /* Floating Action Button */
        .floating-action-button {
          position: fixed;
          right: 2rem;
          bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          z-index: 999;
        }

        .floating-action-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        .floating-action-button:active {
          transform: translateY(-1px);
        }

        .fab-text {
          white-space: nowrap;
        }

        /* Orders Header & Filters */
        .orders-header {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .orders-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #047857;
          margin: 0 0 0.5rem 0;
        }

        .orders-header > div > p {
          color: #6b7280;
          font-size: 16px;
          margin-bottom: 1.5rem;
        }

        .order-filters {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #10b981;
          background: #f0fdf4;
          color: #047857;
        }

        .filter-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #10b981;
          color: white;
        }

        .filter-count {
          background: rgba(0, 0, 0, 0.1);
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 13px;
          min-width: 24px;
          text-align: center;
        }

        .filter-btn.active .filter-count {
          background: rgba(255, 255, 255, 0.2);
          color: white;
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
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-approved {
          background: #d1fae5;
          color: #065f46;
        }

        .status-rejected {
          background: #fee2e2;
          color: #991b1b;
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
          display: inline-flex;
          align-items: center;
        }

        .detail-icon svg {
          width: 18px;
          height: 18px;
          color: #047857;
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

        .shipment-actions {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }

        .btn-view-receipt {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }

        .btn-view-receipt:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .empty-shipments {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 1rem;
          opacity: 0.5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-icon svg {
          width: 64px;
          height: 64px;
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

        /* Quote Summary */
        .quote-summary {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .quote-route {
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
          border-radius: 12px;
          padding: 2rem;
          gap: 2rem;
        }

        .route-point {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .route-icon {
          font-size: 32px;
          display: inline-flex;
          align-items: center;
        }

        .route-icon svg {
          width: 18px;
          height: 18px;
          color: #059669;
        }

        .route-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .route-value {
          font-size: 18px;
          font-weight: 700;
          color: #047857;
        }

        .route-arrow {
          font-size: 32px;
          color: #10b981;
          font-weight: 700;
        }

        .quote-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          background: #f9fafb;
          border-radius: 12px;
          padding: 2rem;
        }

        .quote-detail {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
        }

        .quote-price {
          background: linear-gradient(135deg, #047857 0%, #065f46 100%);
          border-radius: 12px;
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .price-label {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .price-value {
          font-size: 32px;
          font-weight: 700;
          color: #fdd835;
        }

        .btn-continue-booking {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 1.125rem 2rem;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-continue-booking:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-continue-booking:active {
          transform: translateY(0);
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

        /* Settings Section */
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .settings-card.danger-zone {
          border: 2px solid #fee2e2;
          background: #fffbfb;
        }

        .settings-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .settings-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .settings-icon.danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .settings-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .settings-header p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .account-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .info-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .danger-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .danger-info {
          flex: 1;
        }

        .danger-info h4 {
          font-size: 18px;
          font-weight: 700;
          color: #dc2626;
          margin: 0 0 0.75rem 0;
        }

        .danger-info p {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .btn-delete-account {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);
          white-space: nowrap;
        }

        .btn-delete-account:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(239, 68, 68, 0.3);
        }

        .btn-delete-account:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner-small {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .shipment-info {
            grid-template-columns: repeat(2, 1fr);
          }

          .quick-actions-grid {
            grid-template-columns: 1fr;
          }

          .floating-action-button {
            right: 1.5rem;
            bottom: 1.5rem;
            padding: 0.875rem 1.25rem;
            font-size: 15px;
          }
        }

        @media (max-width: 768px) {
          .dashboard-main {
            padding: 1rem 0.75rem;
          }

          .quote-toast {
            flex-direction: column;
            padding: 1rem;
          }

          .quote-toast-content {
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
          }

          .quote-toast-action {
            width: 100%;
            text-align: center;
          }

          .orders-header {
            padding: 1rem;
          }

          .orders-header h2 {
            font-size: 22px;
          }

          .order-filters {
            gap: 0.5rem;
          }

          .filter-btn {
            flex: 1 1 calc(50% - 0.25rem);
            padding: 0.625rem 1rem;
            font-size: 14px;
            justify-content: center;
          }

          .quick-actions-grid {
            gap: 1rem;
          }

          .quick-action-card {
            padding: 1.5rem 1rem;
          }

          .floating-action-button {
            right: 1rem;
            bottom: 1rem;
            padding: 0.875rem;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.5);
          }

          .floating-action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
          }

          .fab-text {
            display: none;
          }

          .welcome-section {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
          }

          .welcome-content h1 {
            font-size: 22px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .welcome-content p {
            font-size: 14px;
          }

          .btn-new-shipment {
            width: 100%;
            justify-content: center;
            padding: 0.875rem 1.25rem;
          }

          .tab-navigation {
            flex-direction: row;
            flex-wrap: wrap;
            padding: 0.5rem;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
          }

          .tab-btn {
            flex: 1 1 calc(50% - 0.25rem);
            min-width: 140px;
            justify-content: center;
            padding: 0.75rem 0.5rem;
            font-size: 13px;
          }

          .tab-icon svg {
            width: 16px;
            height: 16px;
          }

          .badge {
            font-size: 10px;
            padding: 2px 5px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.5rem;
          }

          .stat-card {
            padding: 1rem;
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .stat-icon {
            width: 55px;
            height: 55px;
            font-size: 32px;
          }

          .stat-icon svg {
            width: 24px;
            height: 24px;
          }

          .stat-label {
            font-size: 12px;
          }

          .stat-value {
            font-size: 22px;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }

          .section-header h2 {
            font-size: 20px;
          }

          .btn-view-quotation {
            width: 100%;
            padding: 0.75rem;
            font-size: 14px;
          }

          .shipments-list {
            gap: 1rem;
          }

          .shipment-card {
            padding: 1rem;
          }

          .shipment-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .order-no {
            font-size: 15px;
          }

          .status-badge {
            font-size: 11px;
            padding: 4px 10px;
          }

          .shipment-date {
            font-size: 12px;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.75rem;
          }

          .detail-divider {
            display: none;
          }

          .detail-item {
            gap: 0.75rem;
          }

          .detail-icon svg {
            width: 16px;
            height: 16px;
          }

          .detail-label {
            font-size: 11px;
          }

          .detail-value {
            font-size: 14px;
          }

          .detail-sub {
            font-size: 12px;
          }

          .shipment-info {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            padding: 0.75rem;
          }

          .info-label {
            font-size: 10px;
          }

          .info-text {
            font-size: 12px;
          }

          .shipment-actions {
            margin-top: 0.75rem;
            padding-top: 0.75rem;
          }

          .btn-view-receipt {
            width: 100%;
            justify-content: center;
            padding: 0.75rem;
            font-size: 13px;
          }

          .quotation-card {
            padding: 1.25rem;
            margin-bottom: 1.5rem;
          }

          .quotation-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .quotation-header h2 {
            font-size: 20px;
          }

          .btn-clear {
            width: 100%;
            padding: 0.75rem;
          }

          .quote-route {
            flex-direction: column;
            padding: 1.25rem;
            gap: 1rem;
          }

          .route-point {
            width: 100%;
          }

          .route-arrow {
            transform: rotate(90deg);
            font-size: 24px;
          }

          .quote-details-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
            padding: 1.25rem;
          }

          .quote-price {
            flex-direction: column;
            gap: 0.75rem;
            padding: 1.25rem;
            text-align: center;
          }

          .price-label {
            font-size: 16px;
          }

          .price-value {
            font-size: 28px;
          }

          .btn-continue-booking {
            padding: 1rem 1.5rem;
            font-size: 16px;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .info-item.full-width {
            grid-column: span 1;
          }

          .payment-options {
            grid-template-columns: 1fr;
          }

          .payment-option {
            padding: 1rem;
          }

          .total-price-section {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
            padding: 1.25rem;
          }

          .total-label {
            font-size: 16px;
          }

          .total-amount {
            font-size: 24px;
          }

          .account-info-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .settings-card {
            padding: 1.25rem;
          }

          .settings-header {
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
          }

          .settings-icon {
            width: 40px;
            height: 40px;
          }

          .settings-header h3 {
            font-size: 18px;
          }

          .danger-content {
            flex-direction: column;
            gap: 1.25rem;
          }

          .danger-info h4 {
            font-size: 16px;
          }

          .btn-delete-account {
            width: 100%;
            justify-content: center;
          }

          .empty-state {
            padding: 2.5rem 1.5rem;
          }

          .empty-icon {
            font-size: 48px;
          }

          .empty-icon svg {
            width: 48px;
            height: 48px;
          }

          .empty-state h3 {
            font-size: 18px;
          }

          .empty-state p {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .dashboard-main {
            padding: 0.75rem 0.5rem;
          }

          .welcome-section {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .welcome-content h1 {
            font-size: 18px;
          }

          .welcome-content p {
            font-size: 13px;
          }

          .btn-new-shipment {
            padding: 0.75rem 1rem;
            font-size: 14px;
          }

          .btn-icon svg {
            width: 18px;
            height: 18px;
          }

          .tab-navigation {
            padding: 0.4rem;
            gap: 0.4rem;
          }

          .tab-btn {
            padding: 0.65rem 0.4rem;
            font-size: 12px;
            flex: 1 1 calc(50% - 0.2rem);
            min-width: 120px;
          }

          .tab-icon svg {
            width: 14px;
            height: 14px;
          }

          .badge {
            font-size: 9px;
            padding: 1px 4px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .stat-card {
            padding: 0.85rem;
            gap: 0.5rem;
          }

          .stat-icon {
            width: 48px;
            height: 48px;
          }

          .stat-icon svg {
            width: 20px;
            height: 20px;
          }

          .stat-label {
            font-size: 11px;
          }

          .stat-value {
            font-size: 18px;
          }

          .section-header {
            gap: 0.5rem;
          }

          .section-header h2 {
            font-size: 17px;
          }

          .btn-view-quotation {
            padding: 0.65rem;
            font-size: 13px;
          }

          .shipments-list {
            gap: 0.75rem;
          }

          .shipment-card {
            padding: 0.85rem;
          }

          .order-no {
            font-size: 14px;
          }

          .status-badge {
            font-size: 10px;
            padding: 3px 8px;
          }

          .shipment-date {
            font-size: 11px;
          }

          .detail-row {
            gap: 0.5rem;
          }

          .detail-item {
            gap: 0.5rem;
          }

          .detail-icon svg {
            width: 14px;
            height: 14px;
          }

          .detail-label {
            font-size: 10px;
          }

          .detail-value {
            font-size: 13px;
          }

          .detail-sub {
            font-size: 11px;
          }

          .shipment-info {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            padding: 0.65rem;
          }

          .info-label {
            font-size: 9px;
          }

          .info-text {
            font-size: 11px;
          }

          .shipment-actions {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
          }

          .btn-view-receipt {
            padding: 0.65rem;
            font-size: 12px;
          }

          .quotation-card {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .quotation-header {
            gap: 0.75rem;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
          }

          .quotation-header h2 {
            font-size: 18px;
          }

          .btn-clear {
            padding: 0.65rem;
            font-size: 13px;
          }

          .quote-route {
            padding: 1rem;
            gap: 0.75rem;
          }

          .route-icon svg {
            width: 16px;
            height: 16px;
          }

          .route-label {
            font-size: 10px;
          }

          .route-value {
            font-size: 15px;
          }

          .route-arrow {
            font-size: 20px;
          }

          .quote-details-grid {
            gap: 0.75rem;
            padding: 1rem;
          }

          .detail-label {
            font-size: 10px;
          }

          .detail-value {
            font-size: 14px;
          }

          .quote-price {
            padding: 1rem;
            gap: 0.5rem;
          }

          .price-label {
            font-size: 14px;
          }

          .price-value {
            font-size: 24px;
          }

          .btn-continue-booking {
            padding: 0.85rem 1.25rem;
            font-size: 14px;
          }

          .review-section {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .section-title {
            font-size: 16px;
          }

          .info-grid {
            gap: 0.5rem;
          }

          .info-label {
            font-size: 10px;
          }

          .info-value {
            font-size: 13px;
          }

          .payment-method-section {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .payment-option {
            padding: 0.85rem;
          }

          .option-icon {
            font-size: 24px;
          }

          .option-name {
            font-size: 14px;
          }

          .option-desc {
            font-size: 12px;
          }

          .total-price-section {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .total-label {
            font-size: 14px;
          }

          .total-amount {
            font-size: 20px;
          }

          .btn-proceed-payment {
            padding: 0.85rem;
            font-size: 14px;
          }

          .settings-section {
            gap: 1rem;
          }

          .settings-card {
            padding: 1rem;
          }

          .settings-header {
            gap: 0.75rem;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
          }

          .settings-icon {
            width: 36px;
            height: 36px;
          }

          .settings-icon svg {
            width: 20px;
            height: 20px;
          }

          .settings-header h3 {
            font-size: 16px;
          }

          .settings-header p {
            font-size: 12px;
          }

          .account-info-grid {
            gap: 0.75rem;
          }

          .info-field label {
            font-size: 11px;
          }

          .info-value {
            font-size: 14px;
          }

          .account-type-badge {
            font-size: 11px;
            padding: 3px 10px;
          }

          .order-count {
            font-size: 14px;
          }

          .danger-content {
            gap: 1rem;
          }

          .danger-info h4 {
            font-size: 14px;
          }

          .danger-info p {
            font-size: 12px;
          }

          .btn-delete-account {
            padding: 0.75rem 1.25rem;
            font-size: 13px;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-icon {
            font-size: 40px;
          }

          .empty-icon svg {
            width: 40px;
            height: 40px;
          }

          .empty-state h3 {
            font-size: 16px;
          }

          .empty-state p {
            font-size: 13px;
            margin-bottom: 1rem;
          }

          .btn-get-started {
            padding: 0.75rem 1.5rem;
            font-size: 14px;
          }

          .loading-state {
            padding: 2rem 1rem;
          }

          .loading-state p {
            font-size: 13px;
          }
        }

          .order-no {
            font-size: 15px;
          }

          .status-badge {
            padding: 4px 10px;
            font-size: 11px;
          }

          .detail-label {
            font-size: 12px;
          }

          .detail-value {
            font-size: 13px;
          }

          .info-label {
            font-size: 11px;
          }

          .info-value {
            font-size: 13px;
          }

          .btn-view-receipt {
            padding: 0.7rem 1rem;
            font-size: 13px;
          }

          .quotation-card {
            padding: 1rem;
          }

          .quotation-title {
            font-size: 14px;
          }

          .zone-name {
            font-size: 14px;
          }

          .price-amount {
            font-size: 22px;
          }

          .payment-option {
            padding: 1rem;
          }

          .total-price-section {
            padding: 1rem;
          }

          .total-label {
            font-size: 13px;
          }

          .total-amount {
            font-size: 24px;
          }

          .account-info-item {
            padding: 0.9rem;
          }

          .account-label {
            font-size: 12px;
          }

          .account-value {
            font-size: 13px;
          }

          .btn-delete-account {
            padding: 0.75rem 1rem;
            font-size: 13px;
          }
        }

        /* Global Mobile Optimizations */
        @media (max-width: 768px) {
          * {
            box-sizing: border-box;
          }

          .dashboard {
            overflow-x: hidden;
            width: 100%;
          }

          .dashboard-main {
            width: 100%;
            overflow-x: hidden;
          }

          /* Ensure all containers don't overflow */
          .welcome-section,
          .tab-navigation,
          .stats-grid,
          .shipments-section,
          .shipments-list,
          .shipment-card,
          .quotation-card,
          .settings-section,
          .settings-card {
            max-width: 100%;
            overflow-x: hidden;
          }

          /* Ensure text doesn't overflow */
          .order-no,
          .detail-value,
          .route-value,
          .info-value,
          .info-text {
            word-break: break-word;
            overflow-wrap: break-word;
          }
        }

        /* Pending Orders Styles */
        .shipment-card.pending {
          border-left: 4px solid #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .status-badge.pending {
          background-color: #f59e0b;
          color: white;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Account Type Badge Styles */
        .account-type-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          display: inline-block;
        }

        .account-type-badge.individual {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .account-type-badge.business {
          background-color: #dcfce7;
          color: #166534;
        }

        /* Order Count Styles */
        .order-count {
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .order-count:before {
          content: "📦";
          font-size: 14px;
        }

        /* Tracking Badge (on shipment card header) */
        .tracking-available-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.625rem;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid #93c5fd;
          letter-spacing: 0.3px;
        }

        /* Awaiting tracking label */
        .tracking-pending-label {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #fcd34d;
        }

        /* Track shipment button */
        .btn-track-shipment {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(29, 78, 216, 0.2);
        }

        .btn-track-shipment:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(29, 78, 216, 0.3);
        }
      `}</style>
    </div>
  );
}
