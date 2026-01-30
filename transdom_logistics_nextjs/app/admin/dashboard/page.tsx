"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Order {
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
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    rejectedOrders: 0,
    totalRevenue: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const checkAdminAuth = useCallback(() => {
    try {
      const adminCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("admin_user="));

      if (!adminCookie) {
        router.push("/admin/login");
        return;
      }

      const adminData = JSON.parse(
        decodeURIComponent(adminCookie.split("=")[1]),
      );
      setAdmin(adminData);
      setLoading(false);
    } catch (err) {
      console.error("Auth check failed:", err);
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    checkAdminAuth();
    fetchOrders();
  }, [checkAdminAuth]);

  const fetchOrders = async (status?: string) => {
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") {
        params.append("status_filter", status);
      }
      params.append("limit", "100");

      const response = await fetch(
        `/api/admin/shipments?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      const ordersData = data.shipments || [];
      setOrders(ordersData);

      // Calculate stats
      const totalOrders = ordersData.length;
      const pendingOrders = ordersData.filter(
        (o: Order) => o.status === "pending",
      ).length;
      const approvedOrders = ordersData.filter(
        (o: Order) => o.status === "approved",
      ).length;
      const rejectedOrders = ordersData.filter(
        (o: Order) => o.status === "rejected",
      ).length;
      const totalRevenue = ordersData
        .filter((o: Order) => o.status === "approved")
        .reduce((sum: number, o: Order) => sum + o.amount_paid, 0);

      setStats({
        totalOrders,
        pendingOrders,
        approvedOrders,
        rejectedOrders,
        totalRevenue,
      });
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/approve-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          order_no: order.order_no,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh orders
      await fetchOrders(filterStatus === "all" ? undefined : filterStatus);
      setShowModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this order? This action cannot be undone.",
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      // Refresh orders
      await fetchOrders(filterStatus === "all" ? undefined : filterStatus);
      setShowModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Failed to delete order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear admin cookies
    document.cookie =
      "admin_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/admin/login");
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      filterStatus === "all" || order.status === filterStatus;
    const matchesSearch =
      order.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "approved":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "approved":
        return "✅";
      case "rejected":
        return "❌";
      default:
        return "📦";
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>⏳</div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 2rem",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Image
              src="/assets/transdom_logo.svg"
              alt="Transdom Logistics"
              width={40}
              height={40}
            />
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                Admin Dashboard
              </h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                Welcome back, {admin?.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ fontSize: "32px" }}>📦</div>
              <div>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Total Orders
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  {stats.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ fontSize: "32px" }}>⏳</div>
              <div>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Pending
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#f59e0b",
                    margin: 0,
                  }}
                >
                  {stats.pendingOrders}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ fontSize: "32px" }}>✅</div>
              <div>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Approved
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#10b981",
                    margin: 0,
                  }}
                >
                  {stats.approvedOrders}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ fontSize: "32px" }}>💰</div>
              <div>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Total Revenue
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  ₦{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              alignItems: "end",
            }}
          >
            {/* Status Filter */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  fetchOrders(
                    e.target.value === "all" ? undefined : e.target.value,
                  );
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Search Orders
              </label>
              <input
                type="text"
                placeholder="Order number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() =>
                fetchOrders(filterStatus === "all" ? undefined : filterStatus)
              }
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.5rem",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1f2937",
                margin: 0,
              }}
            >
              Orders ({filteredOrders.length})
            </h2>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📭</div>
              <p style={{ color: "#6b7280" }}>No orders found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "#f9fafb" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Order No
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Customer
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Zone
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Weight
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order._id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f9fafb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          fontFamily: "monospace",
                          color: "#1f2937",
                        }}
                      >
                        {order.order_no}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#1f2937",
                        }}
                      >
                        {order.email}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#1f2937",
                        }}
                      >
                        {order.zone_picked.replace(/_/g, " ")}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#1f2937",
                        }}
                      >
                        {order.weight} kg
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1f2937",
                        }}
                      >
                        ₦{order.amount_paid.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            backgroundColor: `${getStatusColor(order.status)}20`,
                            color: getStatusColor(order.status),
                          }}
                        >
                          {getStatusIcon(order.status)} {order.status}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        {new Date(order.date_created).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowModal(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Order Management Modal */}
      {showModal && selectedOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "12px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "1.5rem",
                color: "#1f2937",
              }}
            >
              Manage Order
            </h2>

            {/* Order Details */}
            <div
              style={{
                backgroundColor: "#f9fafb",
                padding: "1.5rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  Order Number
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    fontFamily: "monospace",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  {selectedOrder.order_no}
                </p>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  Customer Email
                </p>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: 0 }}>
                  {selectedOrder.email}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                    Zone
                  </p>
                  <p style={{ fontSize: "16px", color: "#1f2937", margin: 0 }}>
                    {selectedOrder.zone_picked.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                    Weight
                  </p>
                  <p style={{ fontSize: "16px", color: "#1f2937", margin: 0 }}>
                    {selectedOrder.weight} kg
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  Amount Paid
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#10b981",
                    margin: 0,
                  }}
                >
                  ₦{selectedOrder.amount_paid.toLocaleString()}
                </p>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  Current Status
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "6px 12px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    marginTop: "0.5rem",
                    backgroundColor: `${getStatusColor(selectedOrder.status)}20`,
                    color: getStatusColor(selectedOrder.status),
                  }}
                >
                  {getStatusIcon(selectedOrder.status)} {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "grid", gap: "1rem" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "0.5rem",
                }}
              >
                Update Status
              </h3>

              {selectedOrder.status !== "approved" && (
                <button
                  onClick={() => handleStatusChange(selectedOrder, "approved")}
                  disabled={actionLoading}
                  style={{
                    padding: "12px",
                    backgroundColor: actionLoading ? "#9ca3af" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  ✅ Approve Order
                </button>
              )}

              {selectedOrder.status !== "rejected" && (
                <button
                  onClick={() => handleStatusChange(selectedOrder, "rejected")}
                  disabled={actionLoading}
                  style={{
                    padding: "12px",
                    backgroundColor: actionLoading ? "#9ca3af" : "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  ❌ Reject Order
                </button>
              )}

              {selectedOrder.status !== "pending" && (
                <button
                  onClick={() => handleStatusChange(selectedOrder, "pending")}
                  disabled={actionLoading}
                  style={{
                    padding: "12px",
                    backgroundColor: actionLoading ? "#9ca3af" : "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  ⏳ Set to Pending
                </button>
              )}

              <hr style={{ border: "none", borderTop: "1px solid #e5e7eb" }} />

              <button
                onClick={() => handleDeleteOrder(selectedOrder._id)}
                disabled={actionLoading}
                style={{
                  padding: "12px",
                  backgroundColor: actionLoading ? "#9ca3af" : "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                🗑️ Delete Order
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "12px",
                  backgroundColor: "#f3f4f6",
                  color: "#1f2937",
                  border: "1px solid #e5e7eb",
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
      )}
    </div>
  );
}
