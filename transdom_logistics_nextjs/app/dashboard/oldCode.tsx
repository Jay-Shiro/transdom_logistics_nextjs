"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuthSession, getAuthUser, hasValidAuth } from "@/lib/auth";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

interface Shipment {
  _id: string;
  order_no: string;
  zone_picked: string;
  weight: number;
  email: string;
  amount_paid: number;
  status: string;
  date_created: string;
}

interface DashboardStats {
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  totalSpent: number;
}

interface QuotationData {
  pickupCountry: string;
  destinationCountry: string;
  weight: string;
  isLocal: boolean;
  timestamp: string;
}

interface DeliveryOption {
  speed: "economy" | "standard" | "express";
  price: string;
  estimated_delivery: string;
  multiplier: number;
}

interface QuotationResponse {
  pickup_country: string;
  destination_country: string;
  destination_zone: string;
  weight: number;
  weight_rounded: number;
  currency: string;
  delivery_options: DeliveryOption[];
  base_price: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    totalSpent: 0,
  });
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [quotationPricing, setQuotationPricing] =
    useState<QuotationResponse | null>(null);
  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<
    "economy" | "standard" | "express"
  >("standard");

  const fetchShipments = useCallback(async () => {
    try {
      const response = await fetch("/api/shipments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthSession();
          router.push("/sign-in");
          return;
        }
        throw new Error("Failed to fetch shipments");
      }

      const data = await response.json();
      const shipmentsData = data.shipments || [];
      setShipments(shipmentsData);

      if (shipmentsData.length > 0) {
        const totalShipments = shipmentsData.length;
        const activeShipments = shipmentsData.filter(
          (s: Shipment) => s.status === "pending" || s.status === "in-transit",
        ).length;
        const deliveredShipments = shipmentsData.filter(
          (s: Shipment) => s.status === "delivered",
        ).length;
        const totalSpent = shipmentsData.reduce(
          (sum: number, s: Shipment) => sum + (s.amount_paid || 0),
          0,
        );

        setStats({
          totalShipments,
          activeShipments,
          deliveredShipments,
          totalSpent,
        });
      }
    } catch (error) {
      console.error("Failed to fetch shipments:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleClearQuotation = useCallback(() => {
    localStorage.removeItem("transdom_quotation_form");
    setQuotation(null);
    setQuotationPricing(null);
  }, []);

  const fetchQuotationPricing = useCallback(
    async (quotationData: QuotationData) => {
      setLoadingQuotation(true);
      try {
        const response = await fetch("/api/quotations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pickupCountry: quotationData.pickupCountry,
            destinationCountry: quotationData.destinationCountry,
            weight: parseFloat(quotationData.weight),
          }),
        });

        if (response.ok) {
          const data: QuotationResponse = await response.json();
          setQuotationPricing(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch quotation pricing:", errorData);
          alert(
            `Failed to get pricing: ${errorData.detail || "Unknown error"}. Please try again.`,
          );
          // Clear the quotation if pricing failed
          handleClearQuotation();
        }
      } catch (error) {
        console.error("Error fetching quotation pricing:", error);
        alert(
          "Network error while fetching pricing. Please check your connection and try again.",
        );
        handleClearQuotation();
      } finally {
        setLoadingQuotation(false);
      }
    },
    [handleClearQuotation],
  );

  const loadQuotation = useCallback(async () => {
    const savedQuotation = localStorage.getItem("transdom_quotation_form");
    if (savedQuotation) {
      try {
        const data: QuotationData = JSON.parse(savedQuotation);
        setQuotation(data);

        // Fetch pricing for this quotation
        if (!data.isLocal) {
          await fetchQuotationPricing(data);
        }
      } catch (e) {
        console.error("Failed to parse quotation:", e);
      }
    }
  }, [fetchQuotationPricing]);

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
        fetchShipments();
        loadQuotation();
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/sign-in");
      }
    };

    checkAuth();
  }, [router, fetchShipments, loadQuotation]);

  const handleMakeOrder = () => {
    if (!quotationPricing || !quotation) return;

    const selectedOption = quotationPricing.delivery_options.find(
      (opt) => opt.speed === selectedSpeed,
    );

    if (!selectedOption) return;

    // Redirect to payment with selected speed and price
    const params = new URLSearchParams({
      zone: quotationPricing.destination_zone,
      weight: quotation.weight,
      price: selectedOption.price,
      speed: selectedSpeed,
    });
    router.push(`/payment?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      delivered: { bg: "#d1fae5", text: "#047857" },
      "in-transit": { bg: "#dbeafe", text: "#1e40af" },
      pending: { bg: "#fef3c7", text: "#92400e" },
      delayed: { bg: "#fee2e2", text: "#991b1b" },
    };
    return colors[status] || colors.pending;
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
            <h1>Welcome back, {user?.firstname}! 👋</h1>
            <p>Here&amp;s an overview of your shipments and activity.</p>
          </div>
          <Link href="/quotation" className="btn-new-shipment">
            <span className="btn-icon">📦</span>
            New Shipment
          </Link>
        </div>

        {/* Pending Quotation Section */}
        {quotation && quotationPricing && (
          <div className="quotation-card">
            <div className="quotation-header">
              <h2>📋 Pending Quotation</h2>
              <button onClick={handleClearQuotation} className="btn-clear">
                Clear
              </button>
            </div>

            <div className="quotation-details">
              <div className="detail-row">
                <span className="label">From:</span>
                <span className="value">{quotationPricing.pickup_country}</span>
              </div>
              <div className="detail-row">
                <span className="label">To:</span>
                <span className="value">
                  {quotationPricing.destination_country} (
                  {quotationPricing.destination_zone})
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Weight:</span>
                <span className="value">{quotationPricing.weight} kg</span>
              </div>
            </div>

            <div className="delivery-options">
              <h3>Select Delivery Speed</h3>
              <div className="options-grid">
                {quotationPricing.delivery_options.map((option) => (
                  <div
                    key={option.speed}
                    className={`option-card ${selectedSpeed === option.speed ? "selected" : ""}`}
                    onClick={() => setSelectedSpeed(option.speed)}
                  >
                    <div className="option-header">
                      <span className="option-name">
                        {option.speed.toUpperCase()}
                      </span>
                      {option.speed === "express" && (
                        <span className="badge-fast">⚡ Fastest</span>
                      )}
                      {option.speed === "economy" && (
                        <span className="badge-cheap">💰 Cheapest</span>
                      )}
                    </div>
                    <div className="option-price">
                      ₦{parseFloat(option.price).toLocaleString()}
                    </div>
                    <div className="option-delivery">
                      {option.estimated_delivery}
                    </div>
                    <div className="option-radio">
                      <input
                        type="radio"
                        name="delivery-speed"
                        checked={selectedSpeed === option.speed}
                        onChange={() => setSelectedSpeed(option.speed)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleMakeOrder} className="btn-proceed-payment">
              💳 Proceed to Payment
            </button>
          </div>
        )}

        {quotation && !quotationPricing && loadingQuotation && (
          <div className="quotation-card">
            <div className="loading-quotation">
              <div className="spinner-small"></div>
              <p>Loading quotation pricing...</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#d1fae5" }}>
              <span style={{ fontSize: "24px" }}>📊</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Shipments</p>
              <p className="stat-value">{stats.totalShipments}</p>
              <p className="stat-subtitle">All time</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#fef3c7" }}>
              <span style={{ fontSize: "24px" }}>🚚</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Active Shipments</p>
              <p className="stat-value">{stats.activeShipments}</p>
              <p className="stat-subtitle">Currently in transit</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#a7f3d0" }}>
              <span style={{ fontSize: "24px" }}>✅</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Delivered</p>
              <p className="stat-value">{stats.deliveredShipments}</p>
              <p className="stat-subtitle">Successful deliveries</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#d1fae5" }}>
              <span style={{ fontSize: "24px" }}>💰</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Spent</p>
              <p className="stat-value">₦{stats.totalSpent.toLocaleString()}</p>
              <p className="stat-subtitle">All time spending</p>
            </div>
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="shipments-section">
          <div className="section-header">
            <h2>Recent Shipments</h2>
            <Link href="/shipments" className="view-all-link">
              View All →
            </Link>
          </div>

          <div className="shipments-table-container">
            {shipments.length > 0 ? (
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th>Order No.</th>
                    <th>Zone</th>
                    <th>Weight (kg)</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.slice(0, 10).map((shipment) => {
                    const statusColor = getStatusBadge(shipment.status);
                    return (
                      <tr key={shipment._id}>
                        <td className="order-no">{shipment.order_no}</td>
                        <td>{shipment.zone_picked}</td>
                        <td>{shipment.weight}</td>
                        <td className="amount">
                          ₦{shipment.amount_paid.toLocaleString()}
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                            }}
                          >
                            {shipment.status}
                          </span>
                        </td>
                        <td className="date">
                          {new Date(shipment.date_created).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>No shipments yet</h3>
                <p>Start by getting a quotation for your first shipment.</p>
                <Link href="/quotation" className="btn-get-started">
                  Get a Quotation
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background-color: #ffffff;
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
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #d1fae5;
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

        /* Quotation Card */
        .quotation-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);
        }

        .quotation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .quotation-header h2 {
          font-size: 22px;
          font-weight: 700;
          color: #047857;
        }

        .btn-clear {
          background: transparent;
          border: 1px solid #dc2626;
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

        .quotation-details {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f0fdf4;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .label {
          color: #6b7280;
          font-weight: 500;
          font-size: 14px;
        }

        .value {
          color: #047857;
          font-weight: 600;
          font-size: 14px;
        }

        .delivery-options h3 {
          font-size: 18px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 1rem;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .option-card {
          background: white;
          border: 2px solid #d1fae5;
          border-radius: 8px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .option-card:hover {
          border-color: #10b981;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        }

        .option-card.selected {
          border-color: #10b981;
          background: #f0fdf4;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .option-name {
          font-size: 14px;
          font-weight: 700;
          color: #047857;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-fast {
          background: #fef3c7;
          color: #92400e;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge-cheap {
          background: #d1fae5;
          color: #047857;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .option-price {
          font-size: 24px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 0.5rem;
        }

        .option-delivery {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }

        .option-radio {
          display: flex;
          justify-content: flex-end;
        }

        .option-radio input[type="radio"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #10b981;
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

        .btn-proceed-payment:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
        }

        .loading-quotation {
          text-align: center;
          padding: 2rem;
        }

        .spinner-small {
          width: 30px;
          height: 30px;
          border: 3px solid #d1fae5;
          border-top-color: #10b981;
          border-radius: 50%;
          margin: 0 auto 1rem;
          animation: spin 1s linear infinite;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .stat-card {
          background: white;
          padding: 1.75rem;
          border-radius: 12px;
          display: flex;
          gap: 1.25rem;
          align-items: center;
          border: 2px solid #d1fae5;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          border-color: #10b981;
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.15);
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 0.5rem;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #047857;
          margin-bottom: 0.25rem;
        }

        .stat-subtitle {
          font-size: 13px;
          color: #9ca3af;
        }

        /* Shipments Section */
        .shipments-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          border: 2px solid #d1fae5;
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
        }

        .view-all-link {
          color: #10b981;
          font-weight: 600;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .view-all-link:hover {
          color: #059669;
        }

        /* Table */
        .shipments-table-container {
          overflow-x: auto;
        }

        .shipments-table {
          width: 100%;
          border-collapse: collapse;
        }

        .shipments-table thead {
          background-color: #f0fdf4;
        }

        .shipments-table th {
          padding: 1rem;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          color: #047857;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .shipments-table td {
          padding: 1rem;
          border-bottom: 1px solid #f0fdf4;
          color: #374151;
          font-size: 14px;
        }

        .shipments-table tbody tr {
          transition: background-color 0.2s;
        }

        .shipments-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .order-no {
          font-weight: 600;
          color: #047857;
        }

        .amount {
          font-weight: 600;
          color: #1f2937;
        }

        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          display: inline-block;
        }

        .date {
          color: #6b7280;
          font-size: 13px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
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
        @media (max-width: 768px) {
          .welcome-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .options-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 1.25rem;
          }

          .shipments-section {
            padding: 1.25rem;
          }

          .shipments-table {
            font-size: 13px;
          }

          .shipments-table th,
          .shipments-table td {
            padding: 0.75rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
