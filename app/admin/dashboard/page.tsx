"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeDollarSign,
  CheckCircle,
  Clock,
  LogOut,
  MailX,
  Inbox,
  MapPin,
  Package,
  RefreshCw,
  Send,
  Trash2,
  Truck,
  XCircle,
  DollarSign,
  Edit,
  Plus,
  Save,
  X,
  Eye,
  Download,
  FileSpreadsheet,
  Users,
  Shield,
  UserPlus,
  Upload,
  Mail,
  User,
  Phone,
  Building2,
} from "lucide-react";

interface Order {
  _id: string;
  order_no: string;
  zone_picked: string;
  delivery_speed: string;
  weight: number;
  email: string;
  amount_paid: number;
  status: string;
  date_created: string;
  // Complete booking details
  sender_name?: string;
  sender_phone?: string;
  sender_address?: string;
  sender_state?: string;
  sender_city?: string;
  sender_country?: string;
  sender_email?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  receiver_state?: string;
  receiver_city?: string;
  receiver_post_code?: string;
  receiver_country?: string;
  shipment_description?: string;
  shipment_quantity?: number;
  shipment_value?: number;
  shipment_weight?: number;
  tracking_id?: string | null;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  totalRevenue: number;
}

interface RateEntry {
  weight: number;
  price: string | number;
}

interface ShippingRate {
  _id?: string;
  zone: string;
  currency: string;
  unit: string;
  rates: RateEntry[];
}

const getCarrierName = (speed: string): string => {
  const speedMap: Record<string, string> = {
    economy: "UPS",
    standard: "FedEx",
    express: "DHL",
  };
  return speedMap[speed?.toLowerCase()] || speed;
};

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
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);

  // Zones management states
  const [activeTab, setActiveTab] = useState<
    "orders" | "zones" | "users" | "pricing" | "emails" | "admins"
  >("users"); // Default to users since all roles have access
  const [zones, setZones] = useState<ShippingRate[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingRate | null>(null);
  const [zoneForm, setZoneForm] = useState({
    zone: "",
    currency: "NGN",
    unit: "kg",
    rates: [{ weight: 0, price: 0 }],
  });
  // User management states
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Pricing management states
  const [selectedCarrier, setSelectedCarrier] = useState<string>("DHL");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: string | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  // Email management states
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<any | null>(
    null,
  );
  const [selectedUsersForEmail, setSelectedUsersForEmail] = useState<any[]>([]); // Multi-select
  const [userFilter, setUserFilter] = useState<
    "all" | "individuals" | "business"
  >("all");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviews, setEmailPreviews] = useState<
    { email: string; subject: string; message: string; user: any }[]
  >([]);
  const [userOrdersForEmail, setUserOrdersForEmail] = useState<Order[]>([]);
  const [emailForm, setEmailForm] = useState({
    to_email: "",
    subject: "",
    message: "",
    user_name: "",
  });
  const [emailSending, setEmailSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [emailMode, setEmailMode] = useState<"user" | "custom" | "bulk">(
    "user",
  );
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [bulkSendProgress, setBulkSendProgress] = useState({
    sent: 0,
    failed: 0,
    total: 0,
  });
  const [isBulkSending, setIsBulkSending] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Notification system states
  const [notifications, setNotifications] = useState<
    {
      id: number;
      type: "success" | "error" | "warning" | "info";
      message: string;
    }[]
  >([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Custom notification functions
  const showNotification = (
    type: "success" | "error" | "warning" | "info",
    message: string,
    duration = 4000,
  ) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      isDangerous?: boolean;
      onCancel?: () => void;
    },
  ) => {
    setConfirmDialog({
      isOpen: true,
      title: options?.title || "Confirm Action",
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        options?.onCancel?.();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText: options?.confirmText || "Confirm",
      cancelText: options?.cancelText || "Cancel",
      isDangerous: options?.isDangerous || false,
    });
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Admin management states
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [selectedAdminForEdit, setSelectedAdminForEdit] = useState<any | null>(
    null,
  );
  const [adminForm, setAdminForm] = useState({
    name: "",
    password: "",
    role: "support" as "admin" | "account" | "support",
  });
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Email templates
  const emailTemplates = [
    {
      id: "order_shipped",
      name: "Order Shipped",
      subject: "Your order has been shipped - Order #{order_no}",
      message: `Dear {name},

Great news! Your order #{order_no} has been shipped and is on its way to you.

Order Details:
- Zone: {zone}
- Weight: {weight} kg
- Delivery Speed: {delivery_speed}
- Amount Paid: ₦{amount}

Your package will arrive within the estimated delivery time based on the shipping method selected.

If you have any questions or concerns, please don't hesitate to contact our support team.

Best regards,
The Transdom Express Team`,
    },
    {
      id: "order_approved",
      name: "Order Approved",
      subject: "Your order has been approved - Order #{order_no}",
      message: `Dear {name},

We are pleased to inform you that your order #{order_no} has been approved and is now being processed.

Order Details:
- Zone: {zone}
- Weight: {weight} kg
- Amount Paid: ₦{amount}

We will prepare your shipment and notify you once it's on its way.

Thank you for choosing Transdom Express!

Best regards,
The Transdom Express Team`,
    },
    {
      id: "order_delayed",
      name: "Order Delayed",
      subject: "Update on your order - Order #{order_no}",
      message: `Dear {name},

We wanted to inform you about a delay with your order #{order_no}.

We sincerely apologize for any inconvenience this may cause. Our team is working diligently to resolve the issue and get your shipment back on track.

We will keep you updated on the progress and notify you as soon as your order is ready to ship.

If you have any questions or concerns, please contact our support team.

Thank you for your patience and understanding.

Best regards,
The Transdom Express Team`,
    },
    {
      id: "custom_update",
      name: "Custom Update",
      subject: "Update regarding your order - Order #{order_no}",
      message: `Dear {name},

We wanted to reach out regarding your order #{order_no}.

[Your custom message here]

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Transdom Express Team`,
    },
    {
      id: "account_update",
      name: "Account Update",
      subject: "Important update about your account",
      message: `Dear {name},

We wanted to inform you about an important update regarding your Transdom Express account.

[Your message here]

If you have any questions or need assistance, our support team is here to help.

Best regards,
The Transdom Express Team`,
    },
    {
      id: "blank",
      name: "Blank Template",
      subject: "",
      message: "",
    },
  ];

  const checkAdminAuth = useCallback(() => {
    try {
      // First try to get from cookie
      const adminCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("admin_user="));

      let adminData = null;

      if (adminCookie) {
        adminData = JSON.parse(decodeURIComponent(adminCookie.split("=")[1]));
      } else {
        // Fallback to localStorage (for production cookie issues)
        const storedAdmin = localStorage.getItem("admin_user");
        if (storedAdmin) {
          adminData = JSON.parse(storedAdmin);
        }
      }

      if (!adminData) {
        router.push("/admin/login");
        return false;
      }

      setAdmin(adminData);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Auth check failed:", err);
      router.push("/admin/login");
      return false;
    }
  }, [router]);

  const fetchOrders = useCallback(
    async (status?: string) => {
      try {
        const params = new URLSearchParams();
        if (status && status !== "all") {
          params.append("status_filter", status);
        }
        params.append("limit", "100");

        // Get token from localStorage
        const token = localStorage.getItem("admin_auth_token");

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Add Authorization header if token exists
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/admin/shipments?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            headers,
            cache: "no-store",
            next: { revalidate: 0 },
          },
        );

        if (!response.ok) {
          console.error(
            "Fetch orders failed:",
            response.status,
            response.statusText,
          );

          // Check for authentication errors
          const errorData = await response.json().catch(() => ({ detail: "" }));
          const isAuthError =
            response.status === 401 ||
            (errorData.detail &&
              errorData.detail.toLowerCase().includes("credentials"));

          if (isAuthError) {
            console.error("Authentication failed - redirecting to login");
            // Clear invalid tokens
            localStorage.removeItem("admin_auth_token");
            document.cookie =
              "admin_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            router.push("/admin/login");
            return;
          }
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
    },
    [router],
  );

  const handleStatusChange = async (order: Order, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/approve-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          order_no: order.order_no,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Failed to update order status" }));
        throw new Error(errorData.detail || "Failed to update order status");
      }

      // Always fetch all orders to update stats correctly
      // This ensures the complete dataset and stats are refreshed
      await fetchOrders(undefined);

      // Close modal after successful update
      setShowModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Failed to update order:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update order status";
      showNotification(
        "error",
        `Error: ${errorMessage}. Please try again or contact support if the issue persists.`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    showConfirm(
      "Are you sure you want to delete this order? This action cannot be undone.",
      async () => {
        setActionLoading(true);
        await executeDeleteOrder(orderId);
      },
      {
        title: "Delete Order",
        confirmText: "Delete",
        isDangerous: true,
      },
    );
  };

  const executeDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      // Refresh orders
      await fetchOrders(filterStatus === "all" ? undefined : filterStatus);
      setShowModal(false);
      setSelectedOrder(null);
      showNotification("success", "Order deleted successfully");
    } catch (error) {
      console.error("Failed to delete order:", error);
      showNotification("error", "Failed to delete order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAllOrders = async () => {
    // Triple confirmation for this dangerous action
    showConfirm(
      `⚠️ WARNING: This will permanently delete ALL ${orders.length} orders in the system! This action cannot be undone. Are you sure?`,
      () => {
        showConfirm(
          "This is your second warning. ALL orders will be permanently deleted. Continue?",
          () => {
            const confirmText = window.prompt(
              "FINAL WARNING: Type DELETE (in capital letters) to confirm deletion of all orders:",
            );
            if (confirmText === "DELETE") {
              executeDeleteAllOrders();
            } else {
              showNotification(
                "warning",
                "Deletion cancelled. The text did not match.",
              );
            }
          },
          {
            title: "Second Confirmation",
            confirmText: "Continue",
            isDangerous: true,
          },
        );
      },
      {
        title: "Delete All Orders",
        confirmText: "Continue",
        isDangerous: true,
      },
    );
  };

  const handleAssignTracking = async () => {
    if (!selectedOrder || !trackingInput.trim()) return;
    setTrackingLoading(true);
    try {
      const response = await fetch(
        `/api/admin/orders/${selectedOrder._id}/tracking`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tracking_id: trackingInput.trim() }),
        },
      );
      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ detail: "Failed to assign tracking ID" }));
        showNotification("error", err.detail || "Failed to assign tracking ID");
        return;
      }
      setSelectedOrder({ ...selectedOrder, tracking_id: trackingInput.trim() });
      setTrackingInput("");
      showNotification(
        "success",
        "Tracking ID assigned. Customer notified via email.",
      );
      await fetchOrders(filterStatus === "all" ? undefined : filterStatus);
    } catch {
      showNotification(
        "error",
        "Failed to assign tracking ID. Please try again.",
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  const executeDeleteAllOrders = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete all orders");
      }

      const data = await response.json();
      showNotification(
        "success",
        `Success: ${data.deleted_count || "All"} orders have been permanently deleted.`,
      );

      // Refresh orders list
      await fetchOrders();
    } catch (error) {
      console.error("Failed to delete all orders:", error);
      showNotification(
        "error",
        `Error: ${error instanceof Error ? error.message : "Failed to delete all orders"}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditOrder = () => {
    setEditedOrder({ ...selectedOrder! });
    setIsEditingOrder(true);
  };

  const handleCancelEdit = () => {
    setEditedOrder(null);
    setIsEditingOrder(false);
  };

  const handleUpdateOrder = async () => {
    if (!editedOrder || !selectedOrder) return;

    showConfirm(
      "Are you sure you want to update this order? This will modify the order details.",
      () => executeUpdateOrder(),
      {
        title: "Update Order",
        confirmText: "Update",
        isDangerous: false,
      },
    );
  };

  const executeUpdateOrder = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          sender_name: editedOrder?.sender_name,
          sender_phone: editedOrder?.sender_phone,
          sender_address: editedOrder?.sender_address,
          sender_city: editedOrder?.sender_city,
          sender_state: editedOrder?.sender_state,
          sender_country: editedOrder?.sender_country,
          sender_email: editedOrder?.sender_email,
          receiver_name: editedOrder?.receiver_name,
          receiver_phone: editedOrder?.receiver_phone,
          receiver_address: editedOrder?.receiver_address,
          receiver_city: editedOrder?.receiver_city,
          receiver_state: editedOrder?.receiver_state,
          receiver_post_code: editedOrder?.receiver_post_code,
          receiver_country: editedOrder?.receiver_country,
          shipment_description: editedOrder?.shipment_description,
          shipment_quantity: editedOrder?.shipment_quantity,
          shipment_value: editedOrder?.shipment_value,
          shipment_weight: editedOrder?.shipment_weight,
          weight: editedOrder?.weight,
          zone_picked: editedOrder?.zone_picked,
          delivery_speed: editedOrder?.delivery_speed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update order");
      }

      const updatedOrder = await response.json();

      // Update local state
      setSelectedOrder(updatedOrder);
      setIsEditingOrder(false);
      setEditedOrder(null);

      // Refresh orders list
      await fetchOrders(filterStatus === "all" ? undefined : filterStatus);

      showNotification("success", "Order updated successfully!");
    } catch (error) {
      console.error("Failed to update order:", error);
      showNotification(
        "error",
        `Error: ${error instanceof Error ? error.message : "Failed to update order"}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Download functions for Orders
  const downloadOrdersCSV = () => {
    if (orders.length === 0) {
      showNotification("warning", "No orders to download");
      return;
    }

    // Prepare CSV data with all order fields
    const csvData = orders.map((order) => ({
      "Order No": order.order_no,
      Status: order.status,
      "Date Created": new Date(order.date_created).toLocaleString(),
      Email: order.email,
      "Sender Name": order.sender_name || "",
      "Sender Phone": order.sender_phone || "",
      "Sender Email": order.sender_email || "",
      "Sender Address": order.sender_address || "",
      "Sender City": order.sender_city || "",
      "Sender State": order.sender_state || "",
      "Sender Country": order.sender_country || "",
      "Receiver Name": order.receiver_name || "",
      "Receiver Phone": order.receiver_phone || "",
      "Receiver Address": order.receiver_address || "",
      "Receiver City": order.receiver_city || "",
      "Receiver State": order.receiver_state || "",
      "Receiver Country": order.receiver_country || "",
      "Receiver Postal Code": order.receiver_post_code || "",
      "Shipment Description": order.shipment_description || "",
      "Shipment Quantity": order.shipment_quantity || "",
      "Shipment Weight (kg)": order.shipment_weight || order.weight,
      "Shipment Value (NGN)": order.shipment_value || "",
      Zone: order.zone_picked,
      "Delivery Speed": getCarrierName(order.delivery_speed),
      "Amount Paid (NGN)": order.amount_paid,
    }));

    // Convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `orders_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadOrdersExcel = () => {
    if (orders.length === 0) {
      showNotification("warning", "No orders to download");
      return;
    }

    // Prepare Excel data
    const excelData = orders.map((order) => ({
      "Order No": order.order_no,
      Status: order.status,
      "Date Created": new Date(order.date_created).toLocaleString(),
      Email: order.email,
      "Sender Name": order.sender_name || "",
      "Sender Phone": order.sender_phone || "",
      "Sender Email": order.sender_email || "",
      "Sender Address": order.sender_address || "",
      "Sender City": order.sender_city || "",
      "Sender State": order.sender_state || "",
      "Sender Country": order.sender_country || "",
      "Receiver Name": order.receiver_name || "",
      "Receiver Phone": order.receiver_phone || "",
      "Receiver Address": order.receiver_address || "",
      "Receiver City": order.receiver_city || "",
      "Receiver State": order.receiver_state || "",
      "Receiver Country": order.receiver_country || "",
      "Receiver Postal Code": order.receiver_post_code || "",
      "Shipment Description": order.shipment_description || "",
      "Shipment Quantity": order.shipment_quantity || "",
      "Shipment Weight (kg)": order.shipment_weight || order.weight,
      "Shipment Value (NGN)": order.shipment_value || "",
      Zone: order.zone_picked,
      "Delivery Speed": getCarrierName(order.delivery_speed),
      "Amount Paid (NGN)": order.amount_paid,
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...excelData.map(
            (row) => String(row[key as keyof typeof row] || "").length,
          ),
        ),
      ),
    }));
    worksheet["!cols"] = colWidths;

    // Download
    XLSX.writeFile(
      workbook,
      `orders_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // Download functions for Users
  const downloadUsersCSV = () => {
    if (users.length === 0) {
      showNotification("warning", "No users to download");
      return;
    }

    // Prepare CSV data
    const csvData = users.map((user) => ({
      "User ID": user.id,
      "First Name": user.firstname,
      "Last Name": user.lastname,
      Email: user.email,
      Gender: user.gender,
      Country: user.country,
      "Phone Number": user.phone_number || "",
      "User Type": user.user_type,
      Suspended: user.is_suspended ? "Yes" : "No",
      "Created At": new Date(user.created_at).toLocaleString(),
    }));

    // Convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadUsersExcel = () => {
    if (users.length === 0) {
      showNotification("warning", "No users to download");
      return;
    }

    // Prepare Excel data
    const excelData = users.map((user) => ({
      "User ID": user.id,
      "First Name": user.firstname,
      "Last Name": user.lastname,
      Email: user.email,
      Gender: user.gender,
      Country: user.country,
      "Phone Number": user.phone_number || "",
      "User Type": user.user_type,
      Suspended: user.is_suspended ? "Yes" : "No",
      "Created At": new Date(user.created_at).toLocaleString(),
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...excelData.map(
            (row) => String(row[key as keyof typeof row] || "").length,
          ),
        ),
      ),
    }));
    worksheet["!cols"] = colWidths;

    // Download
    XLSX.writeFile(
      workbook,
      `users_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // Email functionality handlers
  const handleUserSelect = (userId: string) => {
    if (!userId) {
      // Clear selection if empty
      setSelectedUserForEmail(null);
      setUserOrdersForEmail([]);
      setEmailForm({
        to_email: "",
        subject: "",
        message: "",
        user_name: "",
      });
      return;
    }

    const user = users.find((u) => u.id === userId);
    if (!user) {
      console.log("User not found:", userId);
      return;
    }

    setSelectedUserForEmail(user);
    setEmailForm({
      to_email: user.email,
      subject: "",
      message: "",
      user_name: `${user.firstname} ${user.lastname}`,
    });

    // Filter user's orders - check both email and sender_email fields
    const userEmail = user.email.toLowerCase().trim();
    const userOrders = orders.filter((order) => {
      const orderEmail = (order.email || order.sender_email || "")
        .toLowerCase()
        .trim();
      return orderEmail === userEmail;
    });
    setUserOrdersForEmail(userOrders);
  };

  const handleInsertOrderDetails = (order: Order) => {
    const orderDetails = `
--- Order #${order.order_no} ---
Zone: ${order.zone_picked}
Weight: ${order.shipment_weight || order.weight} kg
Delivery Speed: ${getCarrierName(order.delivery_speed)}
Amount Paid: ₦${order.amount_paid?.toLocaleString()}
Status: ${order.status}
Date: ${new Date(order.date_created).toLocaleDateString()}
--- End Order Details ---
`;

    const textarea = messageTextareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart || emailForm.message.length;
    const textBefore = emailForm.message.substring(0, cursorPosition);
    const textAfter = emailForm.message.substring(cursorPosition);
    const newMessage = textBefore + orderDetails + textAfter;

    setEmailForm((prev) => ({
      ...prev,
      message: newMessage,
    }));

    // Set cursor position after inserted text
    setTimeout(() => {
      if (textarea) {
        const newCursorPosition = cursorPosition + orderDetails.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Template variable parser - replaces @variable with actual user data
  const parseTemplateVariables = (text: string, user: any): string => {
    if (!text) return text;

    let parsed = text;

    // User variables
    parsed = parsed.replace(/@firstname/gi, user.firstname || "");
    parsed = parsed.replace(/@lastname/gi, user.lastname || "");
    parsed = parsed.replace(/@email/gi, user.email || "");
    parsed = parsed.replace(/@phone/gi, user.phone_number || "N/A");
    parsed = parsed.replace(/@country/gi, user.country || "");
    parsed = parsed.replace(
      /@fullname/gi,
      `${user.firstname || ""} ${user.lastname || ""}`.trim(),
    );
    parsed = parsed.replace(/@usertype/gi, user.user_type || "Individual");
    parsed = parsed.replace(/@company/gi, user.company_name || "N/A");

    return parsed;
  };

  // Handle multi-user selection
  const handleUserCheckbox = (user: any, checked: boolean) => {
    if (checked) {
      setSelectedUsersForEmail((prev) => [...prev, user]);
    } else {
      setSelectedUsersForEmail((prev) => prev.filter((u) => u.id !== user.id));
    }
  };

  // Select all users (filtered)
  const handleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    setSelectedUsersForEmail(filteredUsers);
  };

  // Deselect all users
  const handleDeselectAll = () => {
    setSelectedUsersForEmail([]);
  };

  // Get filtered users based on current filter
  const getFilteredUsers = () => {
    if (userFilter === "all") return users;
    if (userFilter === "individuals") {
      return users.filter((u) => !u.user_type || u.user_type === "Individual");
    }
    if (userFilter === "business") {
      return users.filter((u) => u.user_type === "Business");
    }
    return users;
  };

  // Generate email previews for all selected users
  const generateEmailPreviews = () => {
    const previews = selectedUsersForEmail.map((user) => {
      const parsedSubject = parseTemplateVariables(emailForm.subject, user);
      const parsedMessage = parseTemplateVariables(emailForm.message, user);

      return {
        email: user.email,
        subject: parsedSubject,
        message: parsedMessage,
        user: user,
      };
    });

    setEmailPreviews(previews);
    setShowEmailPreview(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);

    let subject = template.subject;
    let message = template.message;

    // Replace placeholders with user data if user is selected
    if (selectedUserForEmail) {
      const userName = `${selectedUserForEmail.firstname} ${selectedUserForEmail.lastname}`;
      subject = subject.replace(/{name}/g, userName);
      message = message.replace(/{name}/g, userName);

      // If user has orders, use the first order for placeholder data
      if (userOrdersForEmail.length > 0) {
        const firstOrder = userOrdersForEmail[0];
        subject = subject.replace(/{order_no}/g, firstOrder.order_no || "");
        message = message
          .replace(/{order_no}/g, firstOrder.order_no || "")
          .replace(/{zone}/g, firstOrder.zone_picked || "")
          .replace(
            /{weight}/g,
            String(firstOrder.shipment_weight || firstOrder.weight || ""),
          )
          .replace(
            /{delivery_speed}/g,
            getCarrierName(firstOrder.delivery_speed) || "",
          )
          .replace(/{amount}/g, String(firstOrder.amount_paid || ""));
      }
    } else if (emailMode === "custom" && customName) {
      // Replace name placeholder with custom name
      subject = subject.replace(/{name}/g, customName);
      message = message.replace(/{name}/g, customName);
    }

    setEmailForm((prev) => ({
      ...prev,
      subject,
      message,
    }));
  };

  // Handle CSV file upload for bulk emails
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV - extract emails from all rows
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      const emails: string[] = [];
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

      for (const line of lines) {
        // Split by comma and check each cell
        const cells = line.split(",");
        for (const cell of cells) {
          const trimmed = cell.trim().replace(/^["']|["']$/g, "");
          const match = trimmed.match(emailRegex);
          if (match) {
            const email = match[0].toLowerCase();
            if (!emails.includes(email)) {
              emails.push(email);
            }
          }
        }
      }

      if (emails.length === 0) {
        showNotification(
          "warning",
          "No valid email addresses found in the CSV file.",
        );
        return;
      }

      setBulkEmails(emails);
      setEmailForm((prev) => ({
        ...prev,
        to_email: `${emails.length} recipients`,
      }));
      showNotification(
        "success",
        `Successfully loaded ${emails.length} email addresses from CSV.`,
      );
    };
    reader.readAsText(file);

    // Reset file input
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  // Remove a single email from bulk list
  const handleRemoveBulkEmail = (emailToRemove: string) => {
    const updated = bulkEmails.filter((e) => e !== emailToRemove);
    setBulkEmails(updated);
    if (updated.length === 0) {
      setEmailForm((prev) => ({ ...prev, to_email: "" }));
    } else {
      setEmailForm((prev) => ({
        ...prev,
        to_email: `${updated.length} recipients`,
      }));
    }
  };

  const handleSendEmail = async () => {
    // Determine recipient(s) based on mode
    const recipients: { email: string; name: string; userData?: any }[] = [];

    if (emailMode === "bulk") {
      if (bulkEmails.length === 0) {
        showNotification(
          "warning",
          "Please upload a CSV with email addresses first",
        );
        return;
      }
      bulkEmails.forEach((email) => {
        recipients.push({ email, name: "" });
      });
    } else if (emailMode === "custom") {
      if (!customEmail) {
        showNotification("warning", "Please enter a recipient email address");
        return;
      }
      recipients.push({ email: customEmail, name: customName });
    } else {
      // User mode - multi-select
      if (selectedUsersForEmail.length === 0) {
        showNotification("warning", "Please select at least one user");
        return;
      }
      selectedUsersForEmail.forEach((user) => {
        recipients.push({
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
          userData: user,
        });
      });
    }

    if (!emailForm.subject || !emailForm.message) {
      showNotification("warning", "Please fill in subject and message");
      return;
    }

    const confirmMsg =
      recipients.length > 1
        ? `Are you sure you want to send this email to ${recipients.length} recipients?`
        : `Are you sure you want to send this email to ${recipients[0].email}?`;

    showConfirm(confirmMsg, () => executeSendEmail(recipients), {
      title: "Send Email",
      confirmText: "Send",
      isDangerous: false,
    });
  };

  const executeSendEmail = async (
    recipients: { email: string; name: string; userData?: any }[],
  ) => {
    setEmailSending(true);

    if (recipients.length > 1) {
      // Bulk send mode - send one by one with progress
      setIsBulkSending(true);
      setBulkSendProgress({ sent: 0, failed: 0, total: recipients.length });

      let sent = 0;
      let failed = 0;

      for (const recipient of recipients) {
        try {
          const token = localStorage.getItem("admin_auth_token");
          const headers: HeadersInit = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          // Parse template variables for each user
          const parsedSubject = recipient.userData
            ? parseTemplateVariables(emailForm.subject, recipient.userData)
            : emailForm.subject;
          const parsedMessage = recipient.userData
            ? parseTemplateVariables(emailForm.message, recipient.userData)
            : emailForm.message;

          const response = await fetch("/api/admin/send-custom-email", {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({
              to_email: recipient.email,
              subject: parsedSubject,
              message: parsedMessage,
            }),
          });

          if (response.ok) {
            sent++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
        setBulkSendProgress({ sent, failed, total: recipients.length });
      }

      setIsBulkSending(false);
      showNotification(
        sent === recipients.length ? "success" : "warning",
        `Bulk email complete! Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`,
      );

      // Clear form
      setEmailForm({ to_email: "", subject: "", message: "", user_name: "" });
      setSelectedUsersForEmail([]);
      setBulkEmails([]);
      setSelectedTemplate("");
      setBulkSendProgress({ sent: 0, failed: 0, total: 0 });
    } else {
      // Single email send
      try {
        const token = localStorage.getItem("admin_auth_token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const recipient = recipients[0];
        const parsedSubject = recipient.userData
          ? parseTemplateVariables(emailForm.subject, recipient.userData)
          : emailForm.subject;
        const parsedMessage = recipient.userData
          ? parseTemplateVariables(emailForm.message, recipient.userData)
          : emailForm.message;

        const response = await fetch("/api/admin/send-custom-email", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            to_email: recipient.email,
            subject: parsedSubject,
            message: parsedMessage,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          showNotification("success", "Email sent successfully!");
          setEmailForm({
            to_email: "",
            subject: "",
            message: "",
            user_name: "",
          });
          setSelectedUserForEmail(null);
          setSelectedUsersForEmail([]);
          setUserOrdersForEmail([]);
          setSelectedTemplate("");
          setCustomEmail("");
          setCustomName("");
        } else {
          showNotification(
            "error",
            data.error || data.detail || "Failed to send email",
          );
        }
      } catch (error) {
        console.error("Error sending email:", error);
        showNotification("error", "An error occurred while sending the email");
      }
    }

    setEmailSending(false);
  };

  // Auto-update user orders when orders state changes
  useEffect(() => {
    if (selectedUserForEmail && orders.length > 0) {
      const userEmail = selectedUserForEmail.email.toLowerCase().trim();
      const userOrders = orders.filter((order) => {
        const orderEmail = (order.email || order.sender_email || "")
          .toLowerCase()
          .trim();
        return orderEmail === userEmail;
      });
      console.log("Auto-updating user orders:", userOrders.length);
      setUserOrdersForEmail(userOrders);
    }
  }, [orders, selectedUserForEmail]);

  // Role-based access control helpers
  const hasAccessToTab = useCallback(
    (tabName: string) => {
      if (!admin) return false;

      const userRole = admin.role;

      switch (tabName) {
        case "orders":
          return userRole === "admin" || userRole === "account";
        case "zones":
        case "pricing":
          return userRole === "admin";
        case "users":
          return (
            userRole === "admin" ||
            userRole === "account" ||
            userRole === "support"
          );
        case "emails":
          return userRole === "admin" || userRole === "support";
        case "admins":
          return userRole === "admin";
        default:
          return false;
      }
    },
    [admin],
  );

  // Set default tab based on admin role
  useEffect(() => {
    if (admin && admin.role) {
      // Set appropriate default tab based on role
      if (admin.role === "admin") {
        // Admin has access to everything, keep current tab
        return;
      } else if (admin.role === "account") {
        // Account admins have access to orders and users
        if (!hasAccessToTab(activeTab)) {
          setActiveTab("orders"); // Default to orders for account admins
        }
      } else if (admin.role === "support") {
        // Support admins have access to emails and users
        if (!hasAccessToTab(activeTab)) {
          setActiveTab("emails"); // Default to emails for support admins
        }
      }
    }
  }, [admin, activeTab, hasAccessToTab]);

  // Admin management functions
  const fetchAdmins = useCallback(async () => {
    // Check token availability instead of admin state for initial call
    const token = localStorage.getItem("admin_auth_token");
    if (!token) {
      return;
    }

    // If admin state is available, check access; otherwise, assume access for super admin token
    if (admin && !hasAccessToTab("admins")) {
      return;
    }

    setAdminsLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/admins", {
        credentials: "include",
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to fetch admins");
      }

      const data = await response.json();
      setAdminsList(data.admins || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
      setAdminsList([]);
    } finally {
      setAdminsLoading(false);
    }
  }, [router, admin, hasAccessToTab]);

  const handleCreateAdmin = async () => {
    if (!adminForm.name || !adminForm.password || !adminForm.role) {
      showNotification("warning", "Please fill in all fields");
      return;
    }

    if (adminForm.password.length < 6) {
      showNotification(
        "warning",
        "Password must be at least 6 characters long",
      );
      return;
    }

    showConfirm(
      `Are you sure you want to create admin "${adminForm.name}" with role "${adminForm.role}"?`,
      () => executeCreateAdmin(),
      {
        title: "Create Admin",
        confirmText: "Create",
        isDangerous: false,
      },
    );
  };

  const executeCreateAdmin = async () => {
    setAdminActionLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/admins", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(adminForm),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", "Admin created successfully!");
        setAdminForm({ name: "", password: "", role: "support" });
        setShowCreateAdminModal(false);
        await fetchAdmins();
      } else {
        showNotification("error", data.detail || "Failed to create admin");
      }
    } catch (error) {
      console.error("Error creating admin:", error);
      showNotification("error", "An error occurred while creating admin");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleUpdateAdminRole = async (adminId: string, newRole: string) => {
    showConfirm(
      `Are you sure you want to change this admin's role to "${newRole}"?`,
      () => executeUpdateAdminRole(adminId, newRole),
      {
        title: "Update Admin Role",
        confirmText: "Update",
        isDangerous: false,
      },
    );
  };

  const executeUpdateAdminRole = async (adminId: string, newRole: string) => {
    setAdminActionLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/admins/${adminId}/role`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", "Admin role updated successfully!");
        await fetchAdmins();
      } else {
        showNotification("error", data.detail || "Failed to update admin role");
      }
    } catch (error) {
      console.error("Error updating admin role:", error);
      showNotification("error", "An error occurred while updating admin role");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    showConfirm(
      `Are you sure you want to delete admin "${adminName}"? This action cannot be undone.`,
      () => {
        // Use setTimeout to ensure the second confirmation shows after the first dialog closes
        setTimeout(() => {
          showConfirm(
            `WARNING: This will permanently delete admin "${adminName}". This action cannot be undone.`,
            () => executeDeleteAdmin(adminId, adminName),
            {
              title: "Final Confirmation",
              confirmText: "Delete",
              isDangerous: true,
            },
          );
        }, 100);
      },
      {
        title: "Delete Admin",
        confirmText: "Continue",
        isDangerous: true,
      },
    );
  };

  const executeDeleteAdmin = async (adminId: string, adminName: string) => {
    setAdminActionLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", "Admin deleted successfully!");
        await fetchAdmins();
      } else {
        showNotification("error", data.detail || "Failed to delete admin");
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      showNotification("error", "An error occurred while deleting admin");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear admin cookies
    document.cookie =
      "admin_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    // Clear localStorage backup AND token
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_auth_token");

    router.push("/admin/login");
  };

  // Zones management functions
  const fetchZones = useCallback(async () => {
    setZonesLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/rates", {
        method: "GET",
        credentials: "include",
        headers,
        cache: "no-store",
        next: { revalidate: 0 },
      });

      if (!response.ok) {
        console.error("Failed to fetch zones:", response.status);
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to fetch zones");
      }

      const data = await response.json();
      setZones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching zones:", error);
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  }, [router]);

  // User management functions
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Initial auth check and data loading - runs only once on mount
  useEffect(() => {
    const isAuthenticated = checkAdminAuth();
    if (isAuthenticated) {
      // Add small delay to ensure cookies are fully loaded in production
      setTimeout(() => {
        fetchOrders();
        fetchUsers(); // Always fetch users on page load for email functionality
      }, 300);
    }
  }, [checkAdminAuth, fetchOrders, fetchUsers]);

  // Handle active tab changes - fetch tab-specific data
  useEffect(() => {
    // Check if user is authenticated before fetching tab-specific data
    const token = localStorage.getItem("admin_auth_token");
    const adminCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("admin_user="));

    if (!token && !adminCookie) return; // Not authenticated

    if (activeTab === "zones") {
      fetchZones();
    } else if (activeTab === "admins") {
      fetchAdmins();
    }
  }, [activeTab, fetchZones, fetchAdmins]);

  const handleAddZone = () => {
    setEditingZone(null);
    setZoneForm({
      zone: "",
      currency: "NGN",
      unit: "kg",
      rates: [{ weight: 0, price: 0 }],
    });
    setShowZoneModal(true);
  };

  const handleEditZone = (zone: ShippingRate) => {
    setEditingZone(zone);
    setZoneForm({
      zone: zone.zone,
      currency: zone.currency,
      unit: zone.unit,
      rates: zone.rates.map((r) => ({
        weight: r.weight,
        price:
          typeof r.price === "string"
            ? parseFloat(r.price.replace(/,/g, ""))
            : r.price,
      })),
    });
    setShowZoneModal(true);
  };

  const handleDeleteZone = async (zone: string) => {
    showConfirm(
      `Are you sure you want to delete zone "${zone}"? This action cannot be undone.`,
      () => executeDeleteZone(zone),
      {
        title: "Delete Zone",
        confirmText: "Delete",
        isDangerous: true,
      },
    );
  };

  const executeDeleteZone = async (zone: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const response = await fetch(`/api/admin/rates?zone=${zone}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to delete zone");
      }

      await fetchZones();
    } catch (error) {
      console.error("Failed to delete zone:", error);
      showNotification("error", "Failed to delete zone");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveZone = async () => {
    // Validation
    if (!zoneForm.zone.trim()) {
      showNotification("warning", "Zone name is required");
      return;
    }

    if (zoneForm.rates.length === 0) {
      showNotification("warning", "At least one rate is required");
      return;
    }

    for (const rate of zoneForm.rates) {
      if (rate.weight <= 0 || rate.price <= 0) {
        showNotification("warning", "Weight and price must be greater than 0");
        return;
      }
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const response = await fetch("/api/admin/rates", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: "no-store",
        body: JSON.stringify(zoneForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save zone");
      }

      await fetchZones();
      setShowZoneModal(false);
      setEditingZone(null);
      setZoneForm({
        zone: "",
        currency: "NGN",
        unit: "kg",
        rates: [{ weight: 0, price: 0 }],
      });
    } catch (error: any) {
      console.error("Failed to save zone:", error);
      showNotification("error", error.message || "Failed to save zone");
    } finally {
      setActionLoading(false);
    }
  };

  const addRateRow = () => {
    setZoneForm({
      ...zoneForm,
      rates: [...zoneForm.rates, { weight: 0, price: 0 }],
    });
  };

  const removeRateRow = (index: number) => {
    if (zoneForm.rates.length === 1) {
      showNotification("warning", "At least one rate is required");
      return;
    }
    setZoneForm({
      ...zoneForm,
      rates: zoneForm.rates.filter((_, i) => i !== index),
    });
  };

  const updateRateRow = (
    index: number,
    field: "weight" | "price",
    value: number,
  ) => {
    const newRates = [...zoneForm.rates];
    newRates[index][field] = value;
    setZoneForm({
      ...zoneForm,
      rates: newRates,
    });
  };

  // Pricing management functions
  const downloadSampleExcel = async () => {
    setPricingLoading(true);
    try {
      const response = await fetch(`/api/rates?route=${selectedCarrier}`);
      if (!response.ok) {
        throw new Error("Failed to fetch carrier zones");
      }

      const data = await response.json();

      // Extract zones exactly as in terminal script
      const zones: string[] = Array.from(
        new Set<string>(
          data
            .map((z: any) => String(z.zone || "").trim())
            .filter((x: string) => x.length > 0),
        ),
      );

      if (zones.length === 0) {
        throw new Error(`No zone labels found for ${selectedCarrier}`);
      }

      // Build prices object exactly as in terminal script
      const prices: Record<number, Record<string, number>> = {};
      data.forEach((z: any) => {
        const zone = String(z.zone || "").trim();
        (z.rates || []).forEach((rate: any) => {
          if (!prices[rate.weight]) prices[rate.weight] = {};
          const price =
            typeof rate.price === "string"
              ? parseFloat(rate.price.replace(/,/g, ""))
              : rate.price;
          prices[rate.weight][zone] = price;
        });
      });

      const weights = Object.keys(prices)
        .map(Number)
        .sort((a, b) => a - b);

      // Build header and data rows exactly as in terminal script
      const headerRow = ["Weight in kg", ...zones];
      const dataRows: (string | number)[][] = [];

      weights.forEach((weight) => {
        const row: (string | number)[] = [weight];
        zones.forEach((zone: string) => {
          const price = prices[weight][zone];
          // Use actual prices if available, otherwise generate sample
          const samplePrice =
            price !== undefined
              ? price
              : parseFloat((weight * 85000 + Math.random() * 20000).toFixed(2));
          row.push(samplePrice);
        });
        dataRows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.sheet_add_aoa(
        ws,
        [[`TRANSDOM EXPRESS (${selectedCarrier})`]],
        {
          origin: "A1",
        },
      );
      XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: "A2" });
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A3" });

      const lastCol = headerRow.length - 1;
      const lastRow = dataRows.length + 1;

      ws["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: lastCol },
        },
      ];

      const colWidths = [{ wch: 14 }];
      zones.forEach(() => colWidths.push({ wch: 20 }));
      ws["!cols"] = colWidths;
      ws["!rows"] = [{ hpx: 30 }, { hpx: 28 }];

      const titleStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
        fill: { fgColor: { rgb: "0066CC" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };

      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "E7E6E6" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };

      const dataBorder = {
        top: { style: "thin", color: { rgb: "D3D3D3" } },
        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
        left: { style: "thin", color: { rgb: "D3D3D3" } },
        right: { style: "thin", color: { rgb: "D3D3D3" } },
      };

      ws["A1"].s = titleStyle;

      for (let C = 0; C <= lastCol; C++) {
        const headerCell = XLSX.utils.encode_cell({ r: 1, c: C });
        if (ws[headerCell]) {
          ws[headerCell].s = headerStyle;
        }
      }

      for (let R = 2; R <= lastRow; R++) {
        for (let C = 0; C <= lastCol; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) continue;
          ws[addr].s = {
            border: dataBorder,
            alignment: {
              horizontal: C === 0 ? "center" : "right",
              vertical: "center",
            },
          };
          if (C > 0 && typeof ws[addr].v === "number") {
            ws[addr].z = "#,##0.00";
          }
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pricing Data");

      // Generate Excel file
      XLSX.writeFile(
        wb,
        `sample_pricing_${selectedCarrier.toLowerCase()}.xlsx`,
        {
          cellStyles: true,
        },
      );
    } catch (error) {
      console.error("Error downloading sample pricing:", error);
      showNotification("error", "Failed to generate sample pricing template");
    } finally {
      setPricingLoading(false);
    }
  };

  const downloadExistingPrices = async () => {
    setPricingLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      const response = await fetch(`/api/rates?route=${selectedCarrier}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch existing prices");
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        showNotification(
          "warning",
          "No existing pricing data found for this carrier",
        );
        setPricingLoading(false);
        return;
      }

      // Extract zones exactly as in terminal script
      const zones: string[] = Array.from(
        new Set<string>(
          data
            .map((z: any) => String(z.zone || "").trim())
            .filter((x: string) => x.length > 0),
        ),
      );

      // Build prices object exactly as in terminal script
      const prices: Record<number, Record<string, number>> = {};
      data.forEach((z: any) => {
        const zone = String(z.zone || "").trim();
        (z.rates || []).forEach((rate: any) => {
          if (!prices[rate.weight]) prices[rate.weight] = {};
          const price =
            typeof rate.price === "string"
              ? parseFloat(rate.price.replace(/,/g, ""))
              : rate.price;
          prices[rate.weight][zone] = price;
        });
      });

      const weights = Object.keys(prices)
        .map(Number)
        .sort((a, b) => a - b);

      // Build header and data rows exactly as in terminal script
      const headerRow = ["Weight in kg", ...zones];
      const dataRows: (string | number)[][] = [];

      weights.forEach((weight) => {
        const row: (string | number)[] = [weight];
        zones.forEach((zone: string) => {
          const price = prices[weight][zone];
          row.push(price !== undefined ? price : "");
        });
        dataRows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.sheet_add_aoa(
        ws,
        [[`TRANSDOM EXPRESS (${selectedCarrier})`]],
        {
          origin: "A1",
        },
      );
      XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: "A2" });
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A3" });

      const lastCol = headerRow.length - 1;
      const lastRow = dataRows.length + 1;

      ws["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: lastCol },
        },
      ];

      const colWidths = [{ wch: 14 }];
      zones.forEach(() => colWidths.push({ wch: 20 }));
      ws["!cols"] = colWidths;
      ws["!rows"] = [{ hpx: 30 }, { hpx: 28 }];

      const titleStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
        fill: { fgColor: { rgb: "0066CC" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };

      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "E7E6E6" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };

      const dataBorder = {
        top: { style: "thin", color: { rgb: "D3D3D3" } },
        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
        left: { style: "thin", color: { rgb: "D3D3D3" } },
        right: { style: "thin", color: { rgb: "D3D3D3" } },
      };

      ws["A1"].s = titleStyle;

      for (let C = 0; C <= lastCol; C++) {
        const headerCell = XLSX.utils.encode_cell({ r: 1, c: C });
        if (ws[headerCell]) {
          ws[headerCell].s = headerStyle;
        }
      }

      for (let R = 2; R <= lastRow; R++) {
        for (let C = 0; C <= lastCol; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) continue;
          ws[addr].s = {
            border: dataBorder,
            alignment: {
              horizontal: C === 0 ? "center" : "right",
              vertical: "center",
            },
          };
          if (C > 0 && typeof ws[addr].v === "number") {
            ws[addr].z = "#,##0.00";
          }
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Existing Pricing");

      // Generate Excel file
      XLSX.writeFile(
        wb,
        `existing_pricing_${selectedCarrier.toLowerCase()}.xlsx`,
        { cellStyles: true },
      );
    } catch (error) {
      console.error("Error downloading existing prices:", error);
      showNotification("error", "Failed to download existing pricing data");
    } finally {
      setPricingLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        type: "error",
        message: "Please select a valid Excel file (.xlsx or .xls)",
      });
      return;
    }

    setPricingLoading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Convert to JSON (skip title row by starting from row 2)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 });

      // Validate data structure
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error("Excel file is empty or has invalid format");
      }

      // Check the format - NEW format (zones as columns) or OLD format (zone, weight, price columns)
      const firstRow = jsonData[0] as any;
      const csvData: Array<{ zone: string; weight: number; price: number }> =
        [];

      const weightColumnKey =
        firstRow["Weight in kg"] !== undefined
          ? "Weight in kg"
          : firstRow["Weight in Kgs"] !== undefined
            ? "Weight in Kgs"
            : firstRow["weight"] !== undefined
              ? "weight"
              : null;

      if (weightColumnKey) {
        // NEW FORMAT: Zones as columns, weights as rows
        // Zone name mapping for backend
        const zoneMapping: Record<string, string> = {
          "UK/IRELAND": "UK_IRELAND",
          "WEST/CENTRAL AFRICA": "WEST_CENTRAL_AFRICA",
          "USA/CANADA": "USA_CANADA",
          EUROPE: "EUROPE",
          "EAST/SOUTH AFRICA": "EAST_SOUTH_AFRICA",
          MIDDLEEAST: "MIDDLEEAST",
          ASIA: "ASIA",
          "SOUTH AMERICA": "SOUTH_AMERICA",
        };

        // Get zone column names (all columns except "Weight in Kgs")
        const zoneColumns = Object.keys(firstRow).filter(
          (key) => key !== weightColumnKey,
        );

        // Transform data: each weight row × each zone column = one CSV row
        jsonData.forEach((row: any) => {
          const weight = parseFloat(row[weightColumnKey]);
          if (!weight || weight <= 0) return; // Skip invalid weights

          zoneColumns.forEach((zoneDisplay) => {
            const price = parseFloat(
              String(row[zoneDisplay] || "").replace(/,/g, ""),
            );
            if (!price || price <= 0) return; // Skip empty/invalid prices

            const zoneBackend = zoneMapping[zoneDisplay] || zoneDisplay;
            csvData.push({
              zone: zoneBackend,
              weight: weight,
              price: price,
            });
          });
        });
      } else if (firstRow.zone && firstRow.weight && firstRow.price) {
        // OLD FORMAT: Direct zone, weight, price columns (for backward compatibility)
        jsonData.forEach((row: any) => {
          csvData.push({
            zone: String(row.zone || "").trim(),
            weight: parseFloat(row.weight) || 0,
            price: parseFloat(String(row.price).replace(/,/g, "")) || 0,
          });
        });
      } else {
        throw new Error(
          "Excel format not recognized. Expected either 'Weight in Kgs' with zone columns, or 'zone, weight, price' columns",
        );
      }

      // Validate data
      const invalidRows = csvData.filter(
        (row) => !row.zone || row.weight <= 0 || row.price <= 0,
      );
      if (invalidRows.length > 0) {
        throw new Error(
          `${invalidRows.length} rows have invalid data. Check zone, weight (>0), and price (>0)`,
        );
      }

      if (csvData.length === 0) {
        throw new Error("No valid pricing data found in the Excel file");
      }

      // Convert to CSV string
      const csvString = [
        "zone,weight,price",
        ...csvData.map((row) => `${row.zone},${row.weight},${row.price}`),
      ].join("\n");

      // Create CSV blob
      const csvBlob = new Blob([csvString], { type: "text/csv" });

      // Upload to backend
      const token = localStorage.getItem("admin_auth_token");
      const formData = new FormData();
      formData.append("file", csvBlob, "pricing_data.csv");
      formData.append("carrier", selectedCarrier);

      const response = await fetch("/api/admin/upload-prices", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload pricing data");
      }

      const result = await response.json();
      setUploadStatus({
        type: "success",
        message: `Successfully processed ${result.zones_processed} zones with ${result.total_rates} rates. Inserted: ${result.inserted}, Updated: ${result.updated}`,
      });

      // Clear file input
      event.target.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus({
        type: "error",
        message: error.message || "Failed to upload pricing data",
      });
    } finally {
      setPricingLoading(false);
    }
  };

  const handleUserAction = async (
    userId: string,
    action: "suspend" | "unsuspend" | "delete",
  ) => {
    showConfirm(
      `Are you sure you want to ${action} this user?`,
      () => executeUserAction(userId, action),
      {
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        isDangerous: action === "delete" || action === "suspend",
      },
    );
  };

  const executeUserAction = async (
    userId: string,
    action: "suspend" | "unsuspend" | "delete",
  ) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("admin_auth_token");
      let url = `/api/admin/users/${userId}`;
      let method = "PUT";

      if (action === "delete") {
        method = "DELETE";
      } else if (action === "suspend" || action === "unsuspend") {
        url += "/suspend";
      }

      const body =
        action === "suspend" || action === "unsuspend"
          ? JSON.stringify({ suspended: action === "suspend" })
          : undefined;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${action} user`);
      }

      // Refresh users list
      await fetchUsers();
      showNotification("success", `User ${action}d successfully`);
    } catch (error: any) {
      console.error(`Error ${action}ing user:`, error);
      showNotification("error", error.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      filterStatus === "all" || order.status === filterStatus;
    const matchesSearch =
      order.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sender_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={16} />;
      case "approved":
        return <CheckCircle size={16} />;
      case "rejected":
        return <XCircle size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "1rem" }}>
            <Clock size={48} />
          </div>
          <p style={{ color: "#6b7280", fontSize: "18px" }}>
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#1B5E20",
          color: "white",
          padding: "1rem 0",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="admin-header-inner"
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 clamp(1rem, 3vw, 2rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div
            className="admin-header-brand"
            style={{ display: "flex", alignItems: "center", gap: "1rem" }}
          >
            <Link href="/">
              <Image
                src="/assets/transdom_logo.svg"
                alt="Transdom Logistics"
                width={50}
                height={50}
                style={{ cursor: "pointer" }}
              />
            </Link>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                Admin Dashboard
              </h1>
              <p style={{ fontSize: "14px", color: "#e8f5e9", margin: 0 }}>
                Welcome back, {admin?.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="admin-logout-btn"
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: "#d32f2f",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="admin-main"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "clamp(1rem, 3vw, 2rem)",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            marginBottom: "2rem",
            borderBottom: "2px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", gap: "1rem" }}>
            {hasAccessToTab("orders") && (
              <button
                onClick={() => setActiveTab("orders")}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === "orders" ? "#1B5E20" : "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === "orders"
                      ? "3px solid #1B5E20"
                      : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Package size={20} />
                Orders Management
              </button>
            )}
            {hasAccessToTab("zones") && (
              <button
                onClick={() => {
                  setActiveTab("zones");
                  fetchZones();
                }}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === "zones" ? "#1B5E20" : "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === "zones"
                      ? "3px solid #1B5E20"
                      : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <DollarSign size={20} />
                Zones & Prices
              </button>
            )}
            {hasAccessToTab("users") && (
              <button
                onClick={() => setActiveTab("users")}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === "users" ? "#1B5E20" : "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === "users"
                      ? "3px solid #1B5E20"
                      : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Inbox size={20} />
                User Management
              </button>
            )}
            {hasAccessToTab("pricing") && (
              <button
                onClick={() => setActiveTab("pricing")}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === "pricing" ? "#1B5E20" : "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === "pricing"
                      ? "3px solid #1B5E20"
                      : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <BadgeDollarSign size={20} />
                Bulk Pricing
              </button>
            )}
            {hasAccessToTab("emails") && (
              <button
                onClick={() => setActiveTab("emails")}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === "emails" ? "#1B5E20" : "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === "emails"
                      ? "3px solid #1B5E20"
                      : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Send size={20} />
                Custom Emails
              </button>
            )}
            {hasAccessToTab("admins") && (
              <button
                onClick={() => {
                  setActiveTab("admins");
                  fetchAdmins();
                }}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: activeTab === "admins" ? "#1B5E20" : "#6b7280",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === "admins"
                      ? "3px solid #1B5E20"
                      : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Shield size={20} />
                Admin Management
              </button>
            )}
          </div>
        </div>

        {/* Orders Tab Content */}
        {activeTab === "orders" && hasAccessToTab("orders") && (
          <>
            {/* Stats Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              {/* Total Orders */}
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderLeft: "4px solid #1B5E20",
                }}
              >
                <div
                  className="admin-modal-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Total Orders
                    </p>
                    <p
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#1f2937",
                        marginTop: "0.5rem",
                        marginBottom: 0,
                      }}
                    >
                      {stats.totalOrders}
                    </p>
                  </div>
                  <div>
                    <Package size={48} />
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderLeft: "4px solid #f59e0b",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Pending
                    </p>
                    <p
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#f59e0b",
                        marginTop: "0.5rem",
                        marginBottom: 0,
                      }}
                    >
                      {stats.pendingOrders}
                    </p>
                  </div>
                  <div>
                    <Clock size={48} />
                  </div>
                </div>
              </div>

              {/* Approved */}
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderLeft: "4px solid #10b981",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Approved
                    </p>
                    <p
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#10b981",
                        marginTop: "0.5rem",
                        marginBottom: 0,
                      }}
                    >
                      {stats.approvedOrders}
                    </p>
                  </div>
                  <div>
                    <CheckCircle size={48} />
                  </div>
                </div>
              </div>

              {/* Rejected */}
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderLeft: "4px solid #ef4444",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Rejected
                    </p>
                    <p
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#ef4444",
                        marginTop: "0.5rem",
                        marginBottom: 0,
                      }}
                    >
                      {stats.rejectedOrders}
                    </p>
                  </div>
                  <div>
                    <XCircle size={48} />
                  </div>
                </div>
              </div>

              {/* Revenue */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(27,94,32,0.3)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#e8f5e9",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Total Revenue
                    </p>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "white",
                        marginTop: "0.5rem",
                        marginBottom: 0,
                      }}
                    >
                      ₦{stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <BadgeDollarSign size={48} />
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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
                      // Just update the filter state - orders are already loaded
                      // Frontend filtering via filteredOrders will handle the display
                      setFilterStatus(e.target.value);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "14px",
                      outline: "none",
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
                      outline: "none",
                    }}
                  />
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => {
                    // Always fetch all orders to ensure stats are correct
                    fetchOrders(undefined);
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#1B5E20",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                  title="Refresh all orders and update statistics"
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <RefreshCw size={20} />
                  </span>
                  <span>Refresh</span>
                </button>

                {/* Delete All Orders Button */}
                <button
                  onClick={handleDeleteAllOrders}
                  disabled={actionLoading || orders.length === 0}
                  style={{
                    padding: "10px 20px",
                    background:
                      actionLoading || orders.length === 0
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor:
                      actionLoading || orders.length === 0
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    opacity: actionLoading || orders.length === 0 ? 0.6 : 1,
                  }}
                  title={
                    orders.length === 0
                      ? "No orders to delete"
                      : `Delete all ${orders.length} orders permanently`
                  }
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <Trash2 size={20} />
                  </span>
                  <span>Delete All</span>
                </button>

                {/* Download CSV Button */}
                <button
                  onClick={downloadOrdersCSV}
                  disabled={orders.length === 0}
                  style={{
                    padding: "10px 20px",
                    background:
                      orders.length === 0
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: orders.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    opacity: orders.length === 0 ? 0.6 : 1,
                  }}
                  title={
                    orders.length === 0
                      ? "No orders to download"
                      : `Download ${orders.length} orders as CSV`
                  }
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <Download size={20} />
                  </span>
                  <span>CSV</span>
                </button>

                {/* Download Excel Button */}
                <button
                  onClick={downloadOrdersExcel}
                  disabled={orders.length === 0}
                  style={{
                    padding: "10px 20px",
                    background:
                      orders.length === 0
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: orders.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    opacity: orders.length === 0 ? 0.6 : 1,
                  }}
                  title={
                    orders.length === 0
                      ? "No orders to download"
                      : `Download ${orders.length} orders as Excel`
                  }
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <FileSpreadsheet size={20} />
                  </span>
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e5e7eb",
                  background: "linear-gradient(90deg, #f9fafb 0%, white 100%)",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  Orders{" "}
                  <span style={{ color: "#1B5E20" }}>
                    ({filteredOrders.length})
                  </span>
                </h2>
              </div>

              {filteredOrders.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <MailX size={64} />
                  </div>
                  <p style={{ color: "#6b7280", fontSize: "18px" }}>
                    No orders found
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead
                      style={{
                        background:
                          "linear-gradient(90deg, #f9fafb 0%, #f3f4f6 100%)",
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Order #
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Customer
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Route
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Weight
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Amount
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "left",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#6b7280",
                            textTransform: "uppercase",
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            padding: "1rem 1.5rem",
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: "bold",
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
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontFamily: "monospace",
                                fontWeight: "600",
                                color: "#1f2937",
                              }}
                            >
                              {order.order_no}
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <div style={{ fontSize: "14px" }}>
                              <div
                                style={{ fontWeight: "500", color: "#1f2937" }}
                              >
                                {order.sender_name || "N/A"}
                              </div>
                              <div
                                style={{ color: "#6b7280", fontSize: "13px" }}
                              >
                                {order.sender_email || order.email}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <div style={{ fontSize: "14px" }}>
                              <div
                                style={{ fontWeight: "500", color: "#1f2937" }}
                              >
                                {order.sender_country || "N/A"}
                              </div>
                              <div
                                style={{ color: "#6b7280", fontSize: "13px" }}
                              >
                                →{" "}
                                {order.receiver_country ||
                                  order.zone_picked.replace(/_/g, " ")}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#1f2937",
                              }}
                            >
                              {order.shipment_weight || order.weight} kg
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "bold",
                                color: "#10b981",
                              }}
                            >
                              ₦{order.amount_paid.toLocaleString()}
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1.5rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "12px",
                                fontWeight: "600",
                                backgroundColor:
                                  order.status === "pending"
                                    ? "#fef3c7"
                                    : order.status === "approved"
                                      ? "#d1fae5"
                                      : "#fee2e2",
                                color:
                                  order.status === "pending"
                                    ? "#92400e"
                                    : order.status === "approved"
                                      ? "#065f46"
                                      : "#991b1b",
                              }}
                            >
                              {getStatusIcon(order.status)} {order.status}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "1rem 1.5rem",
                              fontSize: "14px",
                              color: "#6b7280",
                            }}
                          >
                            {new Date(order.date_created).toLocaleDateString()}
                          </td>
                          <td
                            style={{
                              padding: "1rem 1.5rem",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowModal(true);
                              }}
                              style={{
                                backgroundColor: "#1B5E20",
                                color: "white",
                                padding: "0.5rem 1rem",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                              onMouseOver={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#2E7D32")
                              }
                              onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#1B5E20")
                              }
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Zones Tab Content */}
        {activeTab === "zones" && hasAccessToTab("zones") && (
          <>
            {/* Header with Add Button */}
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
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                Shipping Zones & Prices
              </h2>
              <button
                onClick={handleAddZone}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#1B5E20",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2E7D32")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1B5E20")
                }
              >
                <Plus size={20} />
                Add New Zone
              </button>
            </div>

            {/* Zones Grid */}
            {zonesLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  backgroundColor: "white",
                  borderRadius: "12px",
                }}
              >
                <Clock size={48} />
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "18px",
                    marginTop: "1rem",
                  }}
                >
                  Loading zones...
                </p>
              </div>
            ) : zones.length === 0 ? (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "3rem",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <DollarSign size={64} style={{ margin: "0 auto 1rem" }} />
                <p style={{ color: "#6b7280", fontSize: "18px" }}>
                  No zones found. Add your first shipping zone!
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {zones.map((zone) => (
                  <div
                    key={zone._id || zone.zone}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      border: "2px solid #e5e7eb",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#1B5E20";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(27,94,32,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.1)";
                    }}
                  >
                    {/* Zone Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        paddingBottom: "0.75rem",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#1B5E20",
                          margin: 0,
                        }}
                      >
                        {zone.zone.replace(/_/g, " ")}
                      </h3>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleEditZone(zone)}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                          title="Edit Zone"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone.zone)}
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                          title="Delete Zone"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Zone Info */}
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginBottom: "1rem",
                        fontSize: "14px",
                        color: "#6b7280",
                      }}
                    >
                      <div>
                        <strong>Currency:</strong> {zone.currency}
                      </div>
                      <div>
                        <strong>Unit:</strong> {zone.unit}
                      </div>
                    </div>

                    {/* Rates Table */}
                    <div
                      style={{
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        padding: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.75rem",
                        }}
                      >
                        Price Tiers
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        {zone.rates
                          .sort((a, b) => a.weight - b.weight)
                          .map((rate, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "0.5rem 0.75rem",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            >
                              <span
                                style={{ fontWeight: "600", color: "#1f2937" }}
                              >
                                {rate.weight} {zone.unit}
                              </span>
                              <span
                                style={{ fontWeight: "bold", color: "#1B5E20" }}
                              >
                                {zone.currency}{" "}
                                {typeof rate.price === "string"
                                  ? rate.price
                                  : rate.price.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Zone Add/Edit Modal */}
      {showZoneModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => !actionLoading && setShowZoneModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(90deg, #1B5E20 0%, #2E7D32 100%)",
                color: "white",
                padding: "1.5rem",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                  {editingZone ? "Edit Zone" : "Add New Zone"}
                </h2>
                <button
                  onClick={() => !actionLoading && setShowZoneModal(false)}
                  disabled={actionLoading}
                  style={{
                    color: "white",
                    fontSize: "36px",
                    fontWeight: "bold",
                    background: "none",
                    border: "none",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    lineHeight: "1",
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {/* Zone Name */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Zone Name *
                </label>
                <input
                  type="text"
                  value={zoneForm.zone}
                  onChange={(e) =>
                    setZoneForm({
                      ...zoneForm,
                      zone: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., UK_IRELAND, EUROPE, ASIA"
                  disabled={!!editingZone || actionLoading}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: editingZone ? "#f3f4f6" : "white",
                  }}
                />
                {editingZone && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  >
                    Zone name cannot be changed when editing
                  </p>
                )}
              </div>

              {/* Currency and Unit */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
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
                    Currency *
                  </label>
                  <input
                    type="text"
                    value={zoneForm.currency}
                    onChange={(e) =>
                      setZoneForm({
                        ...zoneForm,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="NGN"
                    disabled={actionLoading}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
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
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={zoneForm.unit}
                    onChange={(e) =>
                      setZoneForm({
                        ...zoneForm,
                        unit: e.target.value.toLowerCase(),
                      })
                    }
                    placeholder="kg"
                    disabled={actionLoading}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Rates */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Price Tiers *
                  </label>
                  <button
                    onClick={addRateRow}
                    disabled={actionLoading}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#1B5E20",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Plus size={16} />
                    Add Tier
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    padding: "1rem",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  {zoneForm.rates.map((rate, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr auto",
                        gap: "0.75rem",
                        marginBottom: "0.75rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        value={rate.weight}
                        onChange={(e) =>
                          updateRateRow(
                            index,
                            "weight",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Weight"
                        disabled={actionLoading}
                        min="0"
                        step="0.1"
                        style={{
                          padding: "0.75rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                      <input
                        type="number"
                        value={rate.price}
                        onChange={(e) =>
                          updateRateRow(
                            index,
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Price"
                        disabled={actionLoading}
                        min="0"
                        step="0.01"
                        style={{
                          padding: "0.75rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => removeRateRow(index)}
                        disabled={actionLoading || zoneForm.rates.length === 1}
                        style={{
                          padding: "0.75rem",
                          backgroundColor:
                            zoneForm.rates.length === 1 ? "#e5e7eb" : "#dc2626",
                          color:
                            zoneForm.rates.length === 1 ? "#9ca3af" : "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor:
                            actionLoading || zoneForm.rates.length === 1
                              ? "not-allowed"
                              : "pointer",
                        }}
                        title="Remove Tier"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  onClick={handleSaveZone}
                  disabled={actionLoading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: actionLoading ? "#9ca3af" : "#1B5E20",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Save size={16} />
                  {actionLoading
                    ? "Saving..."
                    : editingZone
                      ? "Update Zone"
                      : "Create Zone"}
                </button>
                <button
                  onClick={() => !actionLoading && setShowZoneModal(false)}
                  disabled={actionLoading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === "users" && hasAccessToTab("users") && (
        <div style={{ backgroundColor: "white", borderRadius: "12px" }}>
          <div style={{ padding: "2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                User Management
              </h2>
              <div
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: usersLoading ? "#9ca3af" : "#1B5E20",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: usersLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <RefreshCw
                    size={16}
                    className={usersLoading ? "animate-spin" : ""}
                  />
                  {usersLoading ? "Loading..." : "Refresh"}
                </button>

                <button
                  onClick={downloadUsersCSV}
                  disabled={users.length === 0}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background:
                      users.length === 0
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: users.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: users.length === 0 ? 0.6 : 1,
                  }}
                  title={
                    users.length === 0
                      ? "No users to download"
                      : `Download ${users.length} users as CSV`
                  }
                >
                  <Download size={16} />
                  CSV
                </button>

                <button
                  onClick={downloadUsersExcel}
                  disabled={users.length === 0}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background:
                      users.length === 0
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: users.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: users.length === 0 ? 0.6 : 1,
                  }}
                  title={
                    users.length === 0
                      ? "No users to download"
                      : `Download ${users.length} users as Excel`
                  }
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </button>
              </div>
            </div>

            {users.length === 0 && !usersLoading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "#6b7280",
                }}
              >
                <Inbox size={48} />
                <p style={{ fontSize: "18px", marginTop: "1rem" }}>
                  No users registered yet.
                </p>
              </div>
            )}

            {users.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb" }}>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        User ID
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Email
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Type
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Created
                      </th>
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: any) => (
                      <tr
                        key={user.id}
                        style={{ borderBottom: "1px solid #e5e7eb" }}
                      >
                        <td
                          style={{
                            padding: "1rem",
                            fontWeight: "600",
                            color: "#1f2937",
                          }}
                        >
                          {user.id}
                        </td>
                        <td style={{ padding: "1rem", color: "#374151" }}>
                          {user.email}
                        </td>
                        <td style={{ padding: "1rem", color: "#374151" }}>
                          {user.firstname && user.lastname
                            ? `${user.firstname} ${user.lastname}`
                            : user.firstname || user.lastname || "N/A"}
                        </td>
                        <td style={{ padding: "1rem", color: "#374151" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "9999px",
                              fontSize: "12px",
                              fontWeight: "600",
                              backgroundColor:
                                user.user_type === "Business"
                                  ? "#dbeafe"
                                  : "#f3e8ff",
                              color:
                                user.user_type === "Business"
                                  ? "#1e40af"
                                  : "#6b21a8",
                            }}
                          >
                            {user.user_type || "Individual"}
                          </span>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "9999px",
                              fontSize: "12px",
                              fontWeight: "600",
                              backgroundColor: user.is_suspended
                                ? "#fef3c7"
                                : "#d1fae5",
                              color: user.is_suspended ? "#92400e" : "#065f46",
                            }}
                          >
                            {user.is_suspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              disabled={actionLoading}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: actionLoading
                                  ? "#9ca3af"
                                  : "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: actionLoading
                                  ? "not-allowed"
                                  : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Eye size={14} />
                              View Details
                            </button>
                            {user.is_suspended ? (
                              <button
                                onClick={() =>
                                  handleUserAction(user.id, "unsuspend")
                                }
                                disabled={actionLoading}
                                style={{
                                  padding: "0.5rem 1rem",
                                  backgroundColor: actionLoading
                                    ? "#9ca3af"
                                    : "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: actionLoading
                                    ? "not-allowed"
                                    : "pointer",
                                }}
                              >
                                Unsuspend
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleUserAction(user.id, "suspend")
                                }
                                disabled={actionLoading}
                                style={{
                                  padding: "0.5rem 1rem",
                                  backgroundColor: actionLoading
                                    ? "#9ca3af"
                                    : "#f59e0b",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: actionLoading
                                    ? "not-allowed"
                                    : "pointer",
                                }}
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleUserAction(user.id, "delete")
                              }
                              disabled={actionLoading}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: actionLoading
                                  ? "#9ca3af"
                                  : "#dc2626",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: actionLoading
                                  ? "not-allowed"
                                  : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Tab Content */}
      {activeTab === "pricing" && hasAccessToTab("pricing") && (
        <div style={{ backgroundColor: "white", borderRadius: "12px" }}>
          <div style={{ padding: "2rem" }}>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "1.5rem",
              }}
            >
              Bulk Pricing Management
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
              Upload and manage carrier pricing data in bulk using Excel files.
            </p>

            {/* Carrier Selection */}
            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Select Carrier
              </label>
              <select
                value={selectedCarrier}
                onChange={(e) =>
                  setSelectedCarrier(e.target.value as "DHL" | "FEDEX" | "UPS")
                }
                style={{
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  minWidth: "200px",
                }}
              >
                <option value="DHL">DHL</option>
                <option value="FEDEX">FedEx</option>
                <option value="UPS">UPS</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "2rem",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={downloadSampleExcel}
                disabled={pricingLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#1B5E20",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: pricingLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseOver={(e) =>
                  !pricingLoading &&
                  (e.currentTarget.style.backgroundColor = "#2E7D32")
                }
                onMouseOut={(e) =>
                  !pricingLoading &&
                  (e.currentTarget.style.backgroundColor = "#1B5E20")
                }
              >
                <Save size={16} />
                Download Sample Excel
              </button>

              <button
                onClick={downloadExistingPrices}
                disabled={pricingLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: pricingLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseOver={(e) =>
                  !pricingLoading &&
                  (e.currentTarget.style.backgroundColor = "#1d4ed8")
                }
                onMouseOut={(e) =>
                  !pricingLoading &&
                  (e.currentTarget.style.backgroundColor = "#2563eb")
                }
              >
                <Edit size={16} />
                Download Existing Prices
              </button>
            </div>

            {/* Upload Section */}
            <div
              style={{
                border: "2px dashed #d1d5db",
                borderRadius: "8px",
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "#f9fafb",
              }}
            >
              <BadgeDollarSign
                size={48}
                style={{ color: "#6b7280", marginBottom: "1rem" }}
              />
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "0.5rem",
                }}
              >
                Upload Modified Excel File
              </h3>
              <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
                Select an Excel file (.xlsx or .xls) with your pricing updates
              </p>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={pricingLoading}
                style={{
                  display: "block",
                  margin: "0 auto 1rem",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                }}
              />

              {pricingLoading && (
                <div style={{ color: "#6b7280", marginBottom: "1rem" }}>
                  <RefreshCw
                    size={16}
                    style={{ display: "inline", marginRight: "0.5rem" }}
                    className="animate-spin"
                  />
                  Processing file...
                </div>
              )}

              {uploadStatus.type && (
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    backgroundColor:
                      uploadStatus.type === "success" ? "#d1fae5" : "#fee2e2",
                    color:
                      uploadStatus.type === "success" ? "#065f46" : "#991b1b",
                    border: `1px solid ${uploadStatus.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                  }}
                >
                  {uploadStatus.message}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div
              style={{
                marginTop: "2rem",
                padding: "1.5rem",
                backgroundColor: "#eff6ff",
                borderRadius: "8px",
                border: "1px solid #bfdbfe",
              }}
            >
              <h4
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1e40af",
                  marginBottom: "0.5rem",
                }}
              >
                Instructions
              </h4>
              <ul
                style={{
                  color: "#3730a3",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  margin: 0,
                  paddingLeft: "1.5rem",
                }}
              >
                <li>Select a Carrier (DHL by default)</li>
                <li>
                  Download the sample Excel file to see the required format
                </li>
                <li>
                  The file must contain columns: <strong>zone</strong>,{" "}
                  <strong>weight</strong>, <strong>price</strong>
                </li>
                <li>
                  Weight must be greater than 0, price must be greater than 0
                </li>
                <li>
                  Zone names must match the carrier&apos;s zone naming
                  convention
                </li>
                <li>Upload your modified Excel file to update pricing data</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Emails Tab Content */}
      {activeTab === "emails" && hasAccessToTab("emails") && (
        <div
          className="email-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1.5rem",
          }}
        >
          {/* Email Composer */}
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Send size={24} />
              Send Custom Email
            </h2>

            {/* Email Mode Toggle */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Send To
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                {[
                  {
                    id: "user" as const,
                    label: "Registered User",
                    icon: <User size={14} />,
                  },
                  {
                    id: "custom" as const,
                    label: "Custom Email",
                    icon: <Mail size={14} />,
                  },
                  {
                    id: "bulk" as const,
                    label: "Bulk CSV Upload",
                    icon: <Upload size={14} />,
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setEmailMode(mode.id);
                      setSelectedUserForEmail(null);
                      setSelectedUsersForEmail([]);
                      setUserOrdersForEmail([]);
                      setCustomEmail("");
                      setCustomName("");
                      setBulkEmails([]);
                      setEmailForm({
                        to_email: "",
                        subject: "",
                        message: "",
                        user_name: "",
                      });
                      setSelectedTemplate("");
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor:
                        emailMode === mode.id ? "#1B5E20" : "#f3f4f6",
                      color: emailMode === mode.id ? "white" : "#374151",
                      border:
                        emailMode === mode.id
                          ? "2px solid #1B5E20"
                          : "2px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                    onMouseOver={(e) => {
                      if (emailMode !== mode.id) {
                        e.currentTarget.style.backgroundColor = "#e5e7eb";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (emailMode !== mode.id) {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }
                    }}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* USER MODE: Multi-Select with Checkboxes */}
            {emailMode === "user" && (
              <div style={{ marginBottom: "1.5rem" }}>
                {/* Filter Buttons */}
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Select Recipients
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {[
                      { id: "all", label: "All Users", count: users.length },
                      {
                        id: "individuals",
                        label: "Individuals",
                        count: users.filter(
                          (u) => !u.user_type || u.user_type === "Individual",
                        ).length,
                      },
                      {
                        id: "business",
                        label: "Business",
                        count: users.filter((u) => u.user_type === "Business")
                          .length,
                      },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setUserFilter(filter.id as any)}
                        style={{
                          padding: "0.5rem 0.9rem",
                          backgroundColor:
                            userFilter === filter.id ? "#1B5E20" : "#f3f4f6",
                          color: userFilter === filter.id ? "white" : "#374151",
                          border:
                            userFilter === filter.id
                              ? "2px solid #1B5E20"
                              : "2px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        {filter.label}
                        <span
                          style={{
                            backgroundColor:
                              userFilter === filter.id
                                ? "rgba(255,255,255,0.2)"
                                : "#e5e7eb",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "9999px",
                            fontSize: "11px",
                          }}
                        >
                          {filter.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Select All / Deselect All */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={handleSelectAll}
                      style={{
                        padding: "0.4rem 0.75rem",
                        backgroundColor: "#eff6ff",
                        color: "#1e40af",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Select All{" "}
                      {getFilteredUsers().length > 0 &&
                        `(${getFilteredUsers().length})`}
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      style={{
                        padding: "0.4rem 0.75rem",
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Deselect All
                    </button>
                    {selectedUsersForEmail.length > 0 && (
                      <div
                        style={{
                          padding: "0.4rem 0.75rem",
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {selectedUsersForEmail.length} selected
                      </div>
                    )}
                  </div>
                </div>

                {/* User List with Checkboxes */}
                <div
                  style={{
                    maxHeight: "320px",
                    overflowY: "auto",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: "white",
                  }}
                >
                  {getFilteredUsers().length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No users found
                    </div>
                  ) : (
                    getFilteredUsers().map((user, idx) => {
                      const isSelected = selectedUsersForEmail.some(
                        (u) => u.id === user.id,
                      );
                      return (
                        <label
                          key={user.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "0.75rem 1rem",
                            borderBottom:
                              idx < getFilteredUsers().length - 1
                                ? "1px solid #f3f4f6"
                                : "none",
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#f0fdf4" : "white",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "white";
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleUserCheckbox(user, e.target.checked)
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              marginRight: "0.75rem",
                              cursor: "pointer",
                              accentColor: "#1B5E20",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "600",
                                  fontSize: "13px",
                                  color: "#1f2937",
                                }}
                              >
                                {user.firstname} {user.lastname}
                              </span>
                              {user.user_type === "Business" && (
                                <span
                                  style={{
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "9999px",
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                  }}
                                >
                                  Business
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {user.email}
                              {user.company_name && ` • ${user.company_name}`}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Template Variables Help */}
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fcd34d",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      color: "#92400e",
                      marginBottom: "0.4rem",
                      fontSize: "13px",
                    }}
                  >
                    💡 Template Variables
                  </div>
                  <div style={{ color: "#78350f", lineHeight: "1.6" }}>
                    Use these variables in subject/message to personalize for
                    each user:
                    <div
                      style={{
                        marginTop: "0.4rem",
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "0.3rem",
                      }}
                    >
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @firstname
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @lastname
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @fullname
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @email
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @phone
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @country
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @usertype
                      </code>
                      <code
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                        }}
                      >
                        @company
                      </code>
                    </div>
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontStyle: "italic",
                        fontSize: "11px",
                      }}
                    >
                      Example: &ldquo;Dear @firstname, your @usertype account
                      has been updated...&rdquo;
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOM MODE: Manual Email Entry */}
            {emailMode === "custom" && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Recipient Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setEmailForm((prev) => ({
                      ...prev,
                      user_name: e.target.value,
                    }));
                  }}
                  placeholder="Enter recipient name..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    marginBottom: "0.75rem",
                  }}
                />
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    setEmailForm((prev) => ({
                      ...prev,
                      to_email: e.target.value,
                    }));
                  }}
                  placeholder="Enter email address..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {/* BULK MODE: CSV Upload */}
            {emailMode === "bulk" && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Upload CSV File
                </label>
                <div
                  style={{
                    border: "2px dashed #d1d5db",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    textAlign: "center",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => csvInputRef.current?.click()}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#10b981";
                    e.currentTarget.style.backgroundColor = "#f0fdf4";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                >
                  <Upload
                    size={32}
                    style={{ color: "#6b7280", marginBottom: "0.5rem" }}
                  />
                  <p
                    style={{
                      color: "#374151",
                      fontWeight: "600",
                      fontSize: "14px",
                      margin: "0 0 0.25rem 0",
                    }}
                  >
                    Click to upload CSV file
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
                    CSV should contain email addresses (one per row or in any
                    column)
                  </p>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Bulk Email List */}
                {bulkEmails.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {bulkEmails.length} recipient
                        {bulkEmails.length !== 1 ? "s" : ""} loaded
                      </span>
                      <button
                        onClick={() => {
                          setBulkEmails([]);
                          setEmailForm((prev) => ({ ...prev, to_email: "" }));
                        }}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          border: "1px solid #fecaca",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                    <div
                      style={{
                        maxHeight: "160px",
                        overflowY: "auto",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        backgroundColor: "white",
                      }}
                    >
                      {bulkEmails.map((email, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.4rem 0.75rem",
                            borderBottom:
                              idx < bulkEmails.length - 1
                                ? "1px solid #f3f4f6"
                                : "none",
                            fontSize: "13px",
                            color: "#374151",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <Mail size={12} style={{ color: "#9ca3af" }} />
                            {email}
                          </span>
                          <button
                            onClick={() => handleRemoveBulkEmail(email)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#9ca3af",
                              padding: "0.15rem",
                              display: "flex",
                              alignItems: "center",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = "#ef4444";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = "#9ca3af";
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bulk Send Progress */}
                {isBulkSending && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      backgroundColor: "#eff6ff",
                      borderRadius: "8px",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#1e40af",
                      }}
                    >
                      <span>Sending emails...</span>
                      <span>
                        {bulkSendProgress.sent + bulkSendProgress.failed} /{" "}
                        {bulkSendProgress.total}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#dbeafe",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${((bulkSendProgress.sent + bulkSendProgress.failed) / bulkSendProgress.total) * 100}%`,
                          background:
                            "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          borderRadius: "4px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginTop: "0.5rem",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ color: "#065f46" }}>
                        Sent: {bulkSendProgress.sent}
                      </span>
                      {bulkSendProgress.failed > 0 && (
                        <span style={{ color: "#991b1b" }}>
                          Failed: {bulkSendProgress.failed}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email Address (shown for user mode, read-only) */}
            {emailMode === "user" && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  To Email
                </label>
                <input
                  type="email"
                  value={emailForm.to_email}
                  readOnly
                  placeholder="Select a user to auto-fill email..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "#f9fafb",
                    color: "#6b7280",
                  }}
                />
              </div>
            )}

            {/* Email Templates */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Quick Templates
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                {emailTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor:
                        selectedTemplate === template.id
                          ? "#1B5E20"
                          : "#f3f4f6",
                      color:
                        selectedTemplate === template.id ? "white" : "#374151",
                      border:
                        selectedTemplate === template.id
                          ? "2px solid #1B5E20"
                          : "2px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      if (selectedTemplate !== template.id) {
                        e.currentTarget.style.backgroundColor = "#e5e7eb";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (selectedTemplate !== template.id) {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Subject
              </label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) =>
                  setEmailForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="Enter email subject..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Message
              </label>
              <textarea
                ref={messageTextareaRef}
                value={emailForm.message}
                onChange={(e) =>
                  setEmailForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                placeholder={
                  emailMode === "bulk"
                    ? "Enter your message here... This will be sent to all recipients."
                    : "Enter your message here... (Click 'Insert' on any order to add its details)"
                }
                rows={12}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Preview Button (for multi-user mode) */}
            {emailMode === "user" &&
              selectedUsersForEmail.length > 0 &&
              emailForm.subject &&
              emailForm.message && (
                <button
                  onClick={generateEmailPreviews}
                  disabled={emailSending || isBulkSending}
                  style={{
                    width: "100%",
                    padding: "0.9rem 2rem",
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor:
                      emailSending || isBulkSending ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                    marginBottom: "0.75rem",
                  }}
                  onMouseOver={(e) => {
                    if (!emailSending && !isBulkSending) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }}
                >
                  <Eye size={20} />
                  Preview Emails for {selectedUsersForEmail.length} User
                  {selectedUsersForEmail.length !== 1 ? "s" : ""}
                </button>
              )}

            {/* Send Button */}
            <button
              onClick={handleSendEmail}
              disabled={
                emailSending ||
                isBulkSending ||
                (emailMode === "user" && selectedUsersForEmail.length === 0) ||
                (emailMode === "custom" && !customEmail) ||
                (emailMode === "bulk" && bulkEmails.length === 0) ||
                !emailForm.subject ||
                !emailForm.message
              }
              style={{
                width: "100%",
                padding: "1rem 2rem",
                background:
                  emailSending ||
                  isBulkSending ||
                  (emailMode === "user" &&
                    selectedUsersForEmail.length === 0) ||
                  (emailMode === "custom" && !customEmail) ||
                  (emailMode === "bulk" && bulkEmails.length === 0) ||
                  !emailForm.subject ||
                  !emailForm.message
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor:
                  emailSending ||
                  isBulkSending ||
                  (emailMode === "user" &&
                    selectedUsersForEmail.length === 0) ||
                  (emailMode === "custom" && !customEmail) ||
                  (emailMode === "bulk" && bulkEmails.length === 0) ||
                  !emailForm.subject ||
                  !emailForm.message
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
              onMouseOver={(e) => {
                if (!emailSending && !isBulkSending) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(16, 185, 129, 0.4)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(16, 185, 129, 0.3)";
              }}
            >
              {emailSending || isBulkSending ? (
                <>
                  <RefreshCw
                    size={20}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  {isBulkSending
                    ? `Sending ${bulkSendProgress.sent + bulkSendProgress.failed}/${bulkSendProgress.total}...`
                    : "Sending..."}
                </>
              ) : (
                <>
                  <Send size={20} />
                  {emailMode === "user" && selectedUsersForEmail.length > 0
                    ? `Send to ${selectedUsersForEmail.length} User${selectedUsersForEmail.length !== 1 ? "s" : ""}`
                    : emailMode === "bulk" && bulkEmails.length > 0
                      ? `Send to ${bulkEmails.length} Recipient${bulkEmails.length !== 1 ? "s" : ""}`
                      : "Send Email"}
                </>
              )}
            </button>
          </div>

          {/* Sidebar: User Details & Orders */}
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              maxHeight: "800px",
              overflowY: "auto",
            }}
          >
            {emailMode === "user" ? (
              <>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Package size={20} />
                  User Orders
                </h3>

                {!selectedUserForEmail ? (
                  <p style={{ color: "#6b7280", fontSize: "14px" }}>
                    Select a user to view their orders
                  </p>
                ) : userOrdersForEmail.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: "14px" }}>
                    No orders found for this user
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {userOrdersForEmail.map((order) => (
                      <div
                        key={order._id}
                        style={{
                          padding: "1rem",
                          border: "2px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#1f2937",
                            marginBottom: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>#{order.order_no}</span>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                              backgroundColor:
                                order.status === "pending"
                                  ? "#fef3c7"
                                  : order.status === "approved"
                                    ? "#d1fae5"
                                    : order.status === "shipped"
                                      ? "#dbeafe"
                                      : order.status === "delivered"
                                        ? "#dcfce7"
                                        : "#fee2e2",
                              color:
                                order.status === "pending"
                                  ? "#92400e"
                                  : order.status === "approved"
                                    ? "#065f46"
                                    : order.status === "shipped"
                                      ? "#1e40af"
                                      : order.status === "delivered"
                                        ? "#166534"
                                        : "#991b1b",
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div
                          style={{
                            color: "#6b7280",
                            lineHeight: "1.6",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div>
                            <strong>Zone:</strong> {order.zone_picked}
                          </div>
                          <div>
                            <strong>Weight:</strong>{" "}
                            {order.shipment_weight || order.weight} kg
                          </div>
                          <div>
                            <strong>Speed:</strong>{" "}
                            {getCarrierName(order.delivery_speed)}
                          </div>
                          <div>
                            <strong>Amount:</strong> ₦
                            {order.amount_paid?.toLocaleString()}
                          </div>
                          <div>
                            <strong>Date:</strong>{" "}
                            {new Date(order.date_created).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleInsertOrderDetails(order)}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            background:
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 8px rgba(16, 185, 129, 0.4)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Plus size={14} />
                          Insert Order Details
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : emailMode === "custom" ? (
              <>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Mail size={20} />
                  Custom Email
                </h3>
                <div
                  style={{
                    padding: "1.5rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    textAlign: "center",
                  }}
                >
                  <Mail
                    size={40}
                    style={{ color: "#9ca3af", marginBottom: "0.75rem" }}
                  />
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "14px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Sending to a custom email address
                  </p>
                  {customEmail && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.75rem 1rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0",
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ fontWeight: "600", color: "#1f2937" }}>
                        {customName || "No name provided"}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "13px" }}>
                        {customEmail}
                      </div>
                    </div>
                  )}
                  <p
                    style={{
                      color: "#9ca3af",
                      fontSize: "12px",
                      marginTop: "1rem",
                    }}
                  >
                    This recipient is not in your system. Templates with
                    placeholders like {"{name}"} will need manual editing.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Upload size={20} />
                  Bulk Email Guide
                </h3>
                <div
                  style={{
                    padding: "1.5rem",
                    backgroundColor: "#eff6ff",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e40af",
                      marginBottom: "0.75rem",
                    }}
                  >
                    CSV Format Guide
                  </h4>
                  <ul
                    style={{
                      color: "#3730a3",
                      fontSize: "13px",
                      lineHeight: "1.8",
                      margin: 0,
                      paddingLeft: "1.25rem",
                    }}
                  >
                    <li>One email address per row</li>
                    <li>Emails can be in any column</li>
                    <li>Header rows are auto-skipped if detected</li>
                    <li>Duplicates are automatically removed</li>
                    <li>Invalid emails are filtered out</li>
                  </ul>
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem",
                      backgroundColor: "white",
                      borderRadius: "6px",
                      border: "1px solid #dbeafe",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Example CSV:
                    </p>
                    <pre
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: 0,
                        fontFamily: "monospace",
                        lineHeight: "1.6",
                      }}
                    >
                      {`email
john@example.com
jane@example.com
bob@company.com`}
                    </pre>
                  </div>
                </div>
                {bulkEmails.length > 0 && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      border: "1px solid #bbf7d0",
                      textAlign: "center",
                    }}
                  >
                    <CheckCircle
                      size={24}
                      style={{ color: "#10b981", marginBottom: "0.25rem" }}
                    />
                    <p
                      style={{
                        fontWeight: "600",
                        color: "#065f46",
                        fontSize: "15px",
                        margin: "0 0 0.25rem 0",
                      }}
                    >
                      {bulkEmails.length} recipients ready
                    </p>
                    <p
                      style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}
                    >
                      Fill in subject and message, then click Send
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
          }}
          onClick={() => setShowEmailPreview(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderBottom: "2px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                color: "white",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Eye size={24} />
                  Email Preview
                </h3>
                <p
                  style={{
                    margin: "0.3rem 0 0 0",
                    fontSize: "13px",
                    opacity: 0.9,
                  }}
                >
                  Review how each email will look before sending
                </p>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.5rem 2rem",
              }}
            >
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#1e40af",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  📧 Previewing {emailPreviews.length} Email
                  {emailPreviews.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: "12px", color: "#3b82f6" }}>
                  Each user will receive a personalized version with their
                  details automatically filled in. Scroll down to see all
                  previews.
                </div>
              </div>

              {emailPreviews.map((preview, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: idx < emailPreviews.length - 1 ? "1.5rem" : 0,
                    padding: "1.5rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  {/* Recipient Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "700",
                        fontSize: "14px",
                      }}
                    >
                      {preview.user.firstname?.[0]?.toUpperCase() || ""}
                      {preview.user.lastname?.[0]?.toUpperCase() || ""}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "14px",
                          color: "#1f2937",
                        }}
                      >
                        {preview.user.firstname} {preview.user.lastname}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Mail size={11} />
                        {preview.email}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.3rem 0.6rem",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: "600",
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                      }}
                    >
                      Email {idx + 1} of {emailPreviews.length}
                    </div>
                  </div>

                  {/* Email Preview */}
                  <div
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Subject Line */}
                    <div
                      style={{
                        padding: "1rem 1.25rem",
                        backgroundColor: "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#6b7280",
                          marginBottom: "0.3rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Subject:
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#1f2937",
                        }}
                      >
                        {preview.subject}
                      </div>
                    </div>

                    {/* Email Body */}
                    <div
                      style={{
                        padding: "1.25rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#6b7280",
                          marginBottom: "0.5rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Message:
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#374151",
                          lineHeight: "1.8",
                          whiteSpace: "pre-wrap",
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        {preview.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1.25rem 2rem",
                borderTop: "2px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowEmailPreview(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "white",
                  color: "#374151",
                  border: "2px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowEmailPreview(false);
                  handleSendEmail();
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(16, 185, 129, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(16, 185, 129, 0.3)";
                }}
              >
                <Send size={16} />
                Send All ({emailPreviews.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Tab Content */}
      {activeTab === "admins" && hasAccessToTab("admins") && (
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#1f2937",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                margin: 0,
              }}
            >
              <Shield size={24} />
              Admin Management
            </h2>
            <button
              onClick={() => setShowCreateAdminModal(true)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(16, 185, 129, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(16, 185, 129, 0.3)";
              }}
            >
              <UserPlus size={16} />
              Create Admin
            </button>
          </div>

          {adminsLoading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <RefreshCw
                size={32}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <p style={{ marginTop: "1rem", color: "#6b7280" }}>
                Loading admins...
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "1rem",
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "14px",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "1rem",
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "14px",
                      }}
                    >
                      Role
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "1rem",
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "14px",
                      }}
                    >
                      Created
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "14px",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adminsList.map((adminUser) => (
                    <tr
                      key={adminUser._id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "1rem", fontSize: "14px" }}>
                        <div style={{ fontWeight: "600", color: "#1f2937" }}>
                          {adminUser.name}
                        </div>
                        {adminUser._id === admin?._id && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#10b981",
                              fontWeight: "500",
                            }}
                          >
                            (You)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "14px" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            backgroundColor:
                              adminUser.role === "admin"
                                ? "#fee2e2"
                                : adminUser.role === "account"
                                  ? "#fef3c7"
                                  : "#e0f2fe",
                            color:
                              adminUser.role === "admin"
                                ? "#991b1b"
                                : adminUser.role === "account"
                                  ? "#92400e"
                                  : "#0c4a6e",
                          }}
                        >
                          {adminUser.role}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        {new Date(adminUser.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "center",
                          }}
                        >
                          {/* Role Change Dropdown */}
                          <select
                            value={adminUser.role}
                            onChange={(e) =>
                              handleUpdateAdminRole(
                                adminUser._id,
                                e.target.value,
                              )
                            }
                            disabled={
                              adminUser._id === admin?._id || adminActionLoading
                            }
                            style={{
                              padding: "0.5rem",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor:
                                adminUser._id === admin?._id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: adminUser._id === admin?._id ? 0.5 : 1,
                            }}
                          >
                            <option value="admin">Admin</option>
                            <option value="account">Account</option>
                            <option value="support">Support</option>
                          </select>

                          {/* Delete Button */}
                          <button
                            onClick={() =>
                              handleDeleteAdmin(adminUser._id, adminUser.name)
                            }
                            disabled={
                              adminUser._id === admin?._id || adminActionLoading
                            }
                            style={{
                              padding: "0.5rem",
                              backgroundColor:
                                adminUser._id === admin?._id
                                  ? "#f3f4f6"
                                  : adminActionLoading
                                    ? "#9ca3af"
                                    : "#ef4444",
                              color:
                                adminUser._id === admin?._id
                                  ? "#9ca3af"
                                  : "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor:
                                adminUser._id === admin?._id ||
                                adminActionLoading
                                  ? "not-allowed"
                                  : "pointer",
                              display: "flex",
                              alignItems: "center",
                              fontSize: "12px",
                            }}
                            title={
                              adminUser._id === admin?._id
                                ? "Cannot delete your own account"
                                : "Delete admin"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {adminsList.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <p style={{ color: "#6b7280" }}>No admin accounts found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setShowCreateAdminModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              maxWidth: "28rem",
              width: "100%",
              padding: "0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "2rem 2rem 0 2rem",
                borderBottom: "1px solid #e5e7eb",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <UserPlus size={24} />
                  Create New Admin
                </h3>
                <button
                  onClick={() => setShowCreateAdminModal(false)}
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "#f3f4f6",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "0 2rem 2rem 2rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Admin Name
                </label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) =>
                    setAdminForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter admin name..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) =>
                    setAdminForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Enter password (min 6 characters)..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  Role
                </label>
                <select
                  value={adminForm.role}
                  onChange={(e) =>
                    setAdminForm((prev) => ({
                      ...prev,
                      role: e.target.value as "admin" | "account" | "support",
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="support">
                    Support (Custom Emails + User Management)
                  </option>
                  <option value="account">
                    Account (Orders + User Management)
                  </option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={handleCreateAdmin}
                  disabled={adminActionLoading}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    background: adminActionLoading
                      ? "#9ca3af"
                      : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: adminActionLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  {adminActionLoading ? (
                    <>
                      <RefreshCw
                        size={16}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Create Admin
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateAdminModal(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Denied Message for unauthorized tabs */}
      {((activeTab === "orders" && !hasAccessToTab("orders")) ||
        (activeTab === "zones" && !hasAccessToTab("zones")) ||
        (activeTab === "users" && !hasAccessToTab("users")) ||
        (activeTab === "pricing" && !hasAccessToTab("pricing")) ||
        (activeTab === "emails" && !hasAccessToTab("emails")) ||
        (activeTab === "admins" && !hasAccessToTab("admins"))) && (
        <div
          style={{
            backgroundColor: "white",
            padding: "3rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <XCircle
            size={48}
            style={{ color: "#ef4444", marginBottom: "1rem" }}
          />
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "1rem",
            }}
          >
            Access Denied
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
            You don&apos;t have permission to access this section. Your role (
            {admin?.role}) doesn&apos;t include access to the {activeTab}{" "}
            management.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            <p>
              <strong>Account Role:</strong> Orders + User Management
            </p>
            <p>
              <strong>Support Role:</strong> Custom Emails + User Management
            </p>
            <p>
              <strong>Admin Role:</strong> Full Access to All Features
            </p>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              maxWidth: "56rem",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(90deg, #1B5E20 0%, #2E7D32 100%)",
                color: "white",
                padding: "1.5rem",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}
                  >
                    {isEditingOrder ? "Edit Order Details" : "Order Details"}
                  </h2>
                  <p
                    style={{
                      color: "#c8e6c9",
                      fontSize: "14px",
                      marginTop: "0.25rem",
                      marginBottom: 0,
                    }}
                  >
                    Order #{selectedOrder.order_no}
                  </p>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  {isEditingOrder ? (
                    <>
                      <button
                        onClick={handleUpdateOrder}
                        disabled={actionLoading}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          backgroundColor: actionLoading
                            ? "#9ca3af"
                            : "#22c55e",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        <Save size={18} />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={actionLoading}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          backgroundColor: actionLoading
                            ? "#9ca3af"
                            : "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        <X size={18} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditOrder}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <Edit size={18} />
                      Edit Order
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEditingOrder(false);
                      setEditedOrder(null);
                    }}
                    style={{
                      color: "white",
                      fontSize: "36px",
                      fontWeight: "bold",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      lineHeight: "1",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {/* Status Badge */}
              <div
                className="admin-status-row"
                style={{
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor:
                      selectedOrder.status === "pending"
                        ? "#fef3c7"
                        : selectedOrder.status === "approved"
                          ? "#d1fae5"
                          : "#fee2e2",
                    color:
                      selectedOrder.status === "pending"
                        ? "#92400e"
                        : selectedOrder.status === "approved"
                          ? "#065f46"
                          : "#991b1b",
                  }}
                >
                  {getStatusIcon(selectedOrder.status)}{" "}
                  {selectedOrder.status.toUpperCase()}
                </span>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                    Order Date
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1f2937",
                      marginTop: "0.25rem",
                      marginBottom: 0,
                    }}
                  >
                    {new Date(selectedOrder.date_created).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Sender & Receiver Info */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                {/* Sender Details */}
                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    borderLeft: "4px solid #3b82f6",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#1e3a8a",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      <Send size={20} />
                    </span>{" "}
                    Sender Information
                  </h3>
                  <div style={{ fontSize: "14px" }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Name:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="text"
                          value={editedOrder.sender_name || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              sender_name: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #3b82f6",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.sender_name || "N/A"}
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Email:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="email"
                          value={editedOrder.sender_email || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              sender_email: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #3b82f6",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.sender_email || selectedOrder.email}
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Phone:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="tel"
                          value={editedOrder.sender_phone || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              sender_phone: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #3b82f6",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.sender_phone || "N/A"}
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Address:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="text"
                          value={editedOrder.sender_address || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              sender_address: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #3b82f6",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.sender_address || "N/A"}
                        </p>
                      )}
                    </div>
                    <div>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Location:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.5rem",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="City"
                            value={editedOrder.sender_city || ""}
                            onChange={(e) =>
                              setEditedOrder({
                                ...editedOrder,
                                sender_city: e.target.value,
                              })
                            }
                            style={{
                              padding: "0.5rem",
                              border: "2px solid #3b82f6",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={editedOrder.sender_state || ""}
                            onChange={(e) =>
                              setEditedOrder({
                                ...editedOrder,
                                sender_state: e.target.value,
                              })
                            }
                            style={{
                              padding: "0.5rem",
                              border: "2px solid #3b82f6",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Country"
                            value={editedOrder.sender_country || ""}
                            onChange={(e) =>
                              setEditedOrder({
                                ...editedOrder,
                                sender_country: e.target.value,
                              })
                            }
                            style={{
                              gridColumn: "1 / -1",
                              padding: "0.5rem",
                              border: "2px solid #3b82f6",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.sender_city},{" "}
                          {selectedOrder.sender_state},{" "}
                          {selectedOrder.sender_country}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Receiver Details */}
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    borderLeft: "4px solid #22c55e",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#14532d",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      <Inbox size={20} />
                    </span>{" "}
                    Receiver Information
                  </h3>
                  <div style={{ fontSize: "14px" }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Name:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="text"
                          value={editedOrder.receiver_name || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              receiver_name: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #22c55e",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.receiver_name || "N/A"}
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Phone:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="tel"
                          value={editedOrder.receiver_phone || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              receiver_phone: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #22c55e",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.receiver_phone || "N/A"}
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Address:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="text"
                          value={editedOrder.receiver_address || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              receiver_address: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #22c55e",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.receiver_address || "N/A"}
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Location:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.5rem",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="City"
                            value={editedOrder.receiver_city || ""}
                            onChange={(e) =>
                              setEditedOrder({
                                ...editedOrder,
                                receiver_city: e.target.value,
                              })
                            }
                            style={{
                              padding: "0.5rem",
                              border: "2px solid #22c55e",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={editedOrder.receiver_state || ""}
                            onChange={(e) =>
                              setEditedOrder({
                                ...editedOrder,
                                receiver_state: e.target.value,
                              })
                            }
                            style={{
                              padding: "0.5rem",
                              border: "2px solid #22c55e",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Country"
                            value={editedOrder.receiver_country || ""}
                            onChange={(e) =>
                              setEditedOrder({
                                ...editedOrder,
                                receiver_country: e.target.value,
                              })
                            }
                            style={{
                              gridColumn: "1 / -1",
                              padding: "0.5rem",
                              border: "2px solid #22c55e",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.receiver_city},{" "}
                          {selectedOrder.receiver_state},{" "}
                          {selectedOrder.receiver_country}
                        </p>
                      )}
                    </div>
                    <div>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Postal Code:
                      </span>
                      {isEditingOrder && editedOrder ? (
                        <input
                          type="text"
                          value={editedOrder.receiver_post_code || ""}
                          onChange={(e) =>
                            setEditedOrder({
                              ...editedOrder,
                              receiver_post_code: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "2px solid #22c55e",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p style={{ color: "#1f2937", margin: 0 }}>
                          {selectedOrder.receiver_post_code || "N/A"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipment Details */}
              <div
                style={{
                  backgroundColor: "#fefce8",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  borderLeft: "4px solid #eab308",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#713f12",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <Package size={20} />
                  </span>{" "}
                  Shipment Details
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    fontSize: "14px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Description:
                    </span>
                    {isEditingOrder && editedOrder ? (
                      <input
                        type="text"
                        value={editedOrder.shipment_description || ""}
                        onChange={(e) =>
                          setEditedOrder({
                            ...editedOrder,
                            shipment_description: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #eab308",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    ) : (
                      <p style={{ color: "#1f2937", margin: 0 }}>
                        {selectedOrder.shipment_description || "N/A"}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Quantity:
                    </span>
                    {isEditingOrder && editedOrder ? (
                      <input
                        type="number"
                        min="1"
                        value={editedOrder.shipment_quantity || ""}
                        onChange={(e) =>
                          setEditedOrder({
                            ...editedOrder,
                            shipment_quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #eab308",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    ) : (
                      <p style={{ color: "#1f2937", margin: 0 }}>
                        {selectedOrder.shipment_quantity || "N/A"} items
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Weight:
                    </span>
                    {isEditingOrder && editedOrder ? (
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={editedOrder.weight || ""}
                        onChange={(e) =>
                          setEditedOrder({
                            ...editedOrder,
                            weight: parseFloat(e.target.value) || 0,
                            shipment_weight: parseFloat(e.target.value) || 0,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #eab308",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          color: "#1f2937",
                          fontWeight: "bold",
                          margin: 0,
                        }}
                      >
                        {selectedOrder.shipment_weight || selectedOrder.weight}{" "}
                        kg
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Value:
                    </span>
                    {isEditingOrder && editedOrder ? (
                      <input
                        type="number"
                        min="0"
                        value={editedOrder.shipment_value || ""}
                        onChange={(e) =>
                          setEditedOrder({
                            ...editedOrder,
                            shipment_value: parseFloat(e.target.value) || 0,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #eab308",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    ) : (
                      <p style={{ color: "#1f2937", margin: 0 }}>
                        ₦
                        {selectedOrder.shipment_value?.toLocaleString() ||
                          "N/A"}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Zone:
                    </span>
                    {isEditingOrder && editedOrder ? (
                      <input
                        type="text"
                        value={editedOrder.zone_picked || ""}
                        onChange={(e) =>
                          setEditedOrder({
                            ...editedOrder,
                            zone_picked: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #eab308",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    ) : (
                      <p style={{ color: "#1f2937", margin: 0 }}>
                        {selectedOrder.zone_picked.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Delivery Speed:
                    </span>
                    {isEditingOrder && editedOrder ? (
                      <select
                        value={editedOrder.delivery_speed || ""}
                        onChange={(e) =>
                          setEditedOrder({
                            ...editedOrder,
                            delivery_speed: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #eab308",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      >
                        <option value="economy">UPS (Economy)</option>
                        <option value="standard">FedEx (Standard)</option>
                        <option value="express">DHL (Express)</option>
                      </select>
                    ) : (
                      <p
                        style={{
                          color: "#1f2937",
                          textTransform: "capitalize",
                          margin: 0,
                        }}
                      >
                        {getCarrierName(selectedOrder.delivery_speed)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div
                style={{
                  background:
                    "linear-gradient(90deg, #f0fdf4 0%, #d1fae5 100%)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  borderLeft: "4px solid #10b981",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#064e3b",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <BadgeDollarSign size={20} />
                  </span>{" "}
                  Payment Information
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p
                      style={{ fontSize: "14px", color: "#047857", margin: 0 }}
                    >
                      Amount Paid
                    </p>
                    <p
                      style={{
                        fontSize: "30px",
                        fontWeight: "bold",
                        color: "#059669",
                        marginTop: "0.25rem",
                        marginBottom: 0,
                      }}
                    >
                      ₦{selectedOrder.amount_paid.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <CheckCircle size={48} />
                  </div>
                </div>
              </div>

              {/* Tracking Information */}
              <div
                style={{
                  background:
                    "linear-gradient(90deg, #f0fdf4 0%, #d1fae5 100%)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  borderLeft: "4px solid #10b981",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#064e3b",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <Truck size={20} />
                  </span>{" "}
                  Tracking Information
                </h3>

                {selectedOrder.tracking_id && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#047857",
                        fontWeight: "600",
                        margin: "0 0 0.4rem 0",
                      }}
                    >
                      Current Tracking ID
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        background: "#bbf7d0",
                        border: "1px solid #6ee7b7",
                        borderRadius: "8px",
                        padding: "0.75rem 1rem",
                      }}
                    >
                      <CheckCircle size={18} color="#15803d" />
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "#14532d",
                          wordBreak: "break-all",
                        }}
                      >
                        {selectedOrder.tracking_id}
                      </span>
                    </div>
                  </div>
                )}

                {selectedOrder.status === "approved" ? (
                  <div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#065f46",
                        fontWeight: "600",
                        margin: "0 0 0.5rem 0",
                      }}
                    >
                      {selectedOrder.tracking_id
                        ? "Update Tracking ID"
                        : "Assign Tracking ID"}
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <input
                        type="text"
                        placeholder="e.g. SH-J1LGVGMI5KXKPD4N"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAssignTracking()
                        }
                        style={{
                          flex: 1,
                          padding: "0.75rem 1rem",
                          border: "1.5px solid #6ee7b7",
                          borderRadius: "8px",
                          fontSize: "14px",
                          outline: "none",
                          fontFamily: "monospace",
                          background: "white",
                          color: "#1f2937",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }}
                      />
                      <button
                        onClick={handleAssignTracking}
                        disabled={trackingLoading || !trackingInput.trim()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem 1.25rem",
                          background:
                            trackingLoading || !trackingInput.trim()
                              ? "#9ca3af"
                              : "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor:
                            trackingLoading || !trackingInput.trim()
                              ? "not-allowed"
                              : "pointer",
                          whiteSpace: "nowrap",
                          transition: "all 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                        onMouseOver={(e) => {
                          if (!trackingLoading && trackingInput.trim())
                            e.currentTarget.style.backgroundColor = "#15803d";
                        }}
                        onMouseOut={(e) => {
                          if (!trackingLoading && trackingInput.trim())
                            e.currentTarget.style.backgroundColor = "#16a34a";
                        }}
                      >
                        <Truck size={16} />{" "}
                        {trackingLoading ? "Saving..." : "Assign"}
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: "0.5rem 0 0 0",
                      }}
                    >
                      Assigning a tracking ID automatically emails the customer
                      their tracking number.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: "#fefce8",
                      border: "1px solid #fbbf24",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      fontSize: "13px",
                      color: "#92400e",
                    }}
                  >
                    <Clock size={16} color="#f59e0b" />
                    Tracking ID can only be assigned to{" "}
                    <strong style={{ marginLeft: "0.25rem" }}>approved</strong>
                    &nbsp;orders. Approve this order first.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "0.75rem",
                  }}
                >
                  Update Order Status
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  {selectedOrder.status !== "approved" && (
                    <button
                      onClick={() =>
                        handleStatusChange(selectedOrder, "approved")
                      }
                      disabled={actionLoading}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        fontWeight: "600",
                        color: "white",
                        border: "none",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        backgroundColor: actionLoading ? "#9ca3af" : "#16a34a",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) =>
                        !actionLoading &&
                        (e.currentTarget.style.backgroundColor = "#15803d")
                      }
                      onMouseOut={(e) =>
                        !actionLoading &&
                        (e.currentTarget.style.backgroundColor = "#16a34a")
                      }
                    >
                      <CheckCircle size={16} /> Approve Order
                    </button>
                  )}

                  {selectedOrder.status !== "rejected" && (
                    <button
                      onClick={() =>
                        handleStatusChange(selectedOrder, "rejected")
                      }
                      disabled={actionLoading}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        fontWeight: "600",
                        color: "white",
                        border: "none",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        backgroundColor: actionLoading ? "#9ca3af" : "#dc2626",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) =>
                        !actionLoading &&
                        (e.currentTarget.style.backgroundColor = "#b91c1c")
                      }
                      onMouseOut={(e) =>
                        !actionLoading &&
                        (e.currentTarget.style.backgroundColor = "#dc2626")
                      }
                    >
                      <XCircle size={16} /> Reject Order
                    </button>
                  )}

                  {selectedOrder.status !== "pending" && (
                    <button
                      onClick={() =>
                        handleStatusChange(selectedOrder, "pending")
                      }
                      disabled={actionLoading}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        fontWeight: "600",
                        color: "white",
                        border: "none",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        backgroundColor: actionLoading ? "#9ca3af" : "#ca8a04",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) =>
                        !actionLoading &&
                        (e.currentTarget.style.backgroundColor = "#a16207")
                      }
                      onMouseOut={(e) =>
                        !actionLoading &&
                        (e.currentTarget.style.backgroundColor = "#ca8a04")
                      }
                    >
                      <Clock size={16} /> Set to Pending
                    </button>
                  )}
                </div>

                <div
                  style={{
                    paddingTop: "1rem",
                    borderTop: "1px solid #e5e7eb",
                    marginTop: "1rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder._id)}
                    disabled={actionLoading}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      fontWeight: "600",
                      color: "white",
                      border: "none",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      backgroundColor: actionLoading ? "#9ca3af" : "#b91c1c",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) =>
                      !actionLoading &&
                      (e.currentTarget.style.backgroundColor = "#991b1b")
                    }
                    onMouseOut={(e) =>
                      !actionLoading &&
                      (e.currentTarget.style.backgroundColor = "#b91c1c")
                    }
                  >
                    <Trash2 size={16} /> Delete Order
                  </button>

                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "2px solid #d1d5db",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#e5e7eb")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f3f4f6")
                    }
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setShowUserModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(90deg, #1B5E20 0%, #2E7D32 100%)",
                color: "white",
                padding: "1.5rem",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                User Details
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  color: "white",
                  fontSize: "36px",
                  fontWeight: "bold",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: "1",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              {/* User Information Grid */}
              <div style={{ display: "grid", gap: "1.5rem" }}>
                {/* User ID */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "0.25rem",
                    }}
                  >
                    User ID
                  </label>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#1f2937",
                      fontWeight: "600",
                    }}
                  >
                    {selectedUser.id}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Email
                  </label>
                  <div style={{ fontSize: "14px", color: "#1f2937" }}>
                    {selectedUser.email}
                  </div>
                </div>

                {/* Name */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      First Name
                    </label>
                    <div style={{ fontSize: "14px", color: "#1f2937" }}>
                      {selectedUser.firstname || "N/A"}
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Last Name
                    </label>
                    <div style={{ fontSize: "14px", color: "#1f2937" }}>
                      {selectedUser.lastname || "N/A"}
                    </div>
                  </div>
                </div>

                {/* User Type */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Account Type
                  </label>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor:
                        selectedUser.user_type === "Business"
                          ? "#dbeafe"
                          : "#f3e8ff",
                      color:
                        selectedUser.user_type === "Business"
                          ? "#1e40af"
                          : "#6b21a8",
                    }}
                  >
                    {selectedUser.user_type || "Individual"}
                  </span>
                </div>

                {/* Phone */}
                {selectedUser.phone && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Phone
                    </label>
                    <div style={{ fontSize: "14px", color: "#1f2937" }}>
                      {selectedUser.phone}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Account Status
                  </label>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: selectedUser.is_suspended
                        ? "#fef3c7"
                        : "#d1fae5",
                      color: selectedUser.is_suspended ? "#92400e" : "#065f46",
                    }}
                  >
                    {selectedUser.is_suspended ? "Suspended" : "Active"}
                  </span>
                </div>

                {/* Created At */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Account Created
                  </label>
                  <div style={{ fontSize: "14px", color: "#1f2937" }}>
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Delivery Details if available */}
                {selectedUser.delivery_info && (
                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: "1rem",
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
                      Delivery Information
                    </h3>
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {selectedUser.delivery_info.address && (
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#6b7280",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Address
                          </label>
                          <div style={{ fontSize: "14px", color: "#1f2937" }}>
                            {selectedUser.delivery_info.address}
                          </div>
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                        }}
                      >
                        {selectedUser.delivery_info.city && (
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                marginBottom: "0.25rem",
                              }}
                            >
                              City
                            </label>
                            <div style={{ fontSize: "14px", color: "#1f2937" }}>
                              {selectedUser.delivery_info.city}
                            </div>
                          </div>
                        )}
                        {selectedUser.delivery_info.state && (
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                marginBottom: "0.25rem",
                              }}
                            >
                              State
                            </label>
                            <div style={{ fontSize: "14px", color: "#1f2937" }}>
                              {selectedUser.delivery_info.state}
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedUser.delivery_info.country && (
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#6b7280",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Country
                          </label>
                          <div style={{ fontSize: "14px", color: "#1f2937" }}>
                            {selectedUser.delivery_info.country}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                {selectedUser.is_suspended ? (
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      handleUserAction(selectedUser.id, "unsuspend");
                    }}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1.5rem",
                      backgroundColor: actionLoading ? "#9ca3af" : "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    Unsuspend User
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      handleUserAction(selectedUser.id, "suspend");
                    }}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1.5rem",
                      backgroundColor: actionLoading ? "#9ca3af" : "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    Suspend User
                  </button>
                )}
                <button
                  onClick={() => setShowUserModal(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "2px solid #d1d5db",
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

      {/* Toast Notifications */}
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "400px",
        }}
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              backgroundColor: "#fff",
              borderLeft: `4px solid ${
                notification.type === "success"
                  ? "#10b981"
                  : notification.type === "error"
                    ? "#ef4444"
                    : notification.type === "warning"
                      ? "#f59e0b"
                      : "#3b82f6"
              }`,
              borderRadius: "8px",
              padding: "1rem",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              display: "flex",
              alignItems: "start",
              gap: "0.75rem",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                fontSize: "1.25rem",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {notification.type === "success"
                ? "✓"
                : notification.type === "error"
                  ? "✕"
                  : notification.type === "warning"
                    ? "⚠"
                    : "ℹ"}
            </div>
            <div style={{ flex: 1, fontSize: "14px", color: "#374151" }}>
              {notification.message}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.25rem",
                color: "#9ca3af",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
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
            zIndex: 10001,
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (confirmDialog.onCancel) confirmDialog.onCancel();
              setConfirmDialog({
                isOpen: false,
                title: "",
                message: "",
                onConfirm: () => {},
                onCancel: () => {},
              });
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              maxWidth: "500px",
              width: "100%",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                {confirmDialog.title || "Confirm Action"}
              </h3>
            </div>
            <div
              style={{
                padding: "1.5rem",
                fontSize: "15px",
                color: "#374151",
                lineHeight: "1.6",
              }}
            >
              {confirmDialog.message}
            </div>
            <div
              style={{
                padding: "1.5rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog({
                    isOpen: false,
                    title: "",
                    message: "",
                    onConfirm: () => {},
                    onCancel: () => {},
                  });
                }}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "2px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {confirmDialog.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({
                    isOpen: false,
                    title: "",
                    message: "",
                    onConfirm: () => {},
                    onCancel: () => {},
                  });
                }}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: confirmDialog.isDangerous
                    ? "#ef4444"
                    : "#1B5E20",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {confirmDialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .admin-header-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .admin-header-brand {
            flex-direction: column;
            align-items: flex-start;
          }

          .admin-logout-btn {
            width: 100%;
            justify-content: center;
            display: inline-flex;
            align-items: center;
          }

          .admin-modal-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .admin-status-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }

        @media (max-width: 1024px) {
          /* Make email composer single column on tablets and mobile */
          .email-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
