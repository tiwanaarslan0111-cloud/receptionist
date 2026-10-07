"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  BookOpen,
  LayoutGrid,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  Users,
  Calendar,
  Clock,
  ToggleLeft,
  ToggleRight,
  ShoppingBag,
  Code2,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Menu,
  Sparkles,
  MessageSquare,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
  Flame,
  MapPin,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAuth,
  clearAuth,
  getRestaurantMenu,
  createRestaurantMenuItem,
  toggleMenuItemAvailability,
  getRestaurantTables,
  createRestaurantTable,
  getRestaurantReservations,
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getProfile,
  changePassword,
  MenuItem,
  RestaurantTable,
  RestaurantReservation,
  RestaurantOrder,
  API_BASE,
} from "@/lib/api";
import WhatsAppConnectCard from "@/src/components/WhatsAppConnectCard";

export default function RestaurantDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "reservations" | "menu" | "tables" | "whatsapp" | "widget" | "security">("orders");
  const [tenantName, setTenantName] = useState<string>("Restaurant");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile & Widget State
  const [restaurantProfile, setRestaurantProfile] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Change Password State
  const [changePasswordCurrent, setChangePasswordCurrent] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Data State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [reservations, setReservations] = useState<RestaurantReservation[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "received" | "in_kitchen" | "ready" | "completed">("active");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Menu Item Form
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("Mains");
  const [itemPrice, setItemPrice] = useState<number>(15.0);
  const [creatingItem, setCreatingItem] = useState(false);
  const [itemSuccessMsg, setItemSuccessMsg] = useState<string | null>(null);

  // New Table Form
  const [tableNumber, setTableNumber] = useState("");
  const [tableCapacity, setTableCapacity] = useState<number>(4);
  const [creatingTable, setCreatingTable] = useState(false);
  const [tableSuccessMsg, setTableSuccessMsg] = useState<string | null>(null);

  // Filters
  const [reservationSearch, setReservationSearch] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("All");

  // Auth Guard
  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      router.push("/login");
      return;
    }
    if (auth.business_type && auth.business_type !== "restaurant") {
      router.push("/clinic");
      return;
    }
    if (auth.name) {
      setTenantName(auth.name);
    }
    loadAllData();
  }, []);

  // Real-time polling for incoming orders (every 10s)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const freshOrders = await getRestaurantOrders();
        setOrders(freshOrders);
      } catch (e) {
        // quiet background poll
      }
    }, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [menuData, tablesData, resData, ordersData, profData] = await Promise.all([
        getRestaurantMenu(),
        getRestaurantTables(),
        getRestaurantReservations(),
        getRestaurantOrders().catch(() => []),
        getProfile().catch(() => null),
      ]);
      setMenuItems(menuData);
      setTables(tablesData);
      setReservations(resData);
      setOrders(ordersData);
      if (profData) {
        setRestaurantProfile(profData);
        if (profData.name) setTenantName(profData.name);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load restaurant data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: "received" | "in_kitchen" | "ready" | "completed" | "cancelled"
  ) => {
    setUpdatingOrderId(orderId);
    setStatusToast(null);
    try {
      const updated = await updateRestaurantOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

      const statusLabels = {
        in_kitchen: "Preparing in Kitchen",
        ready: "Ready / Out for Delivery",
        completed: "Delivered & Completed",
        cancelled: "Cancelled",
        received: "Marked Received",
      };

      setStatusToast({
        msg: `Order #${updated.order_number} marked as "${statusLabels[newStatus]}". WhatsApp update message automatically sent to ${updated.customer_phone}!`,
        type: "success",
      });
      setTimeout(() => setStatusToast(null), 7000);
    } catch (err: any) {
      setStatusToast({
        msg: err.message || "Failed to update order status.",
        type: "error",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError("New password and confirm password do not match.");
      return;
    }
    if (changePasswordNew.length < 6) {
      setChangePasswordError("New password must be at least 6 characters.");
      return;
    }
    setChangePasswordLoading(true);
    try {
      await changePassword(changePasswordCurrent, changePasswordNew);
      setChangePasswordSuccess("Password successfully changed!");
      setChangePasswordCurrent("");
      setChangePasswordNew("");
      setChangePasswordConfirm("");
    } catch (err: any) {
      setChangePasswordError(err.message || "Failed to update password.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Create Menu Item Handler
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingItem(true);
    setItemSuccessMsg(null);
    setError(null);

    try {
      const created = await createRestaurantMenuItem({
        name: itemName.trim(),
        category: itemCategory.trim(),
        price: Number(itemPrice),
      });
      setMenuItems((prev) => [...prev, created]);
      setItemSuccessMsg(`Item '${created.name}' registered!`);
      setItemName("");
      setItemPrice(15.0);
    } catch (err: any) {
      setError(err.message || "Failed to add menu item.");
    } finally {
      setCreatingItem(false);
    }
  };

  // Toggle Menu Item Availability
  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      const updated = await toggleMenuItemAvailability(item.id, !item.is_available);
      setMenuItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err: any) {
      setError(err.message || "Failed to toggle availability.");
    }
  };

  // Create Table Handler
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTable(true);
    setTableSuccessMsg(null);
    setError(null);

    try {
      const created = await createRestaurantTable({
        table_number: tableNumber.trim(),
        capacity: Number(tableCapacity),
      });
      setTables((prev) => [...prev, created]);
      setTableSuccessMsg(`Table '${created.table_number}' registered!`);
      setTableNumber("");
      setTableCapacity(4);
    } catch (err: any) {
      setError(err.message || "Failed to add table.");
    } finally {
      setCreatingTable(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(menuItems.map((m) => m.category)))];

  const filteredReservations = reservations.filter((r) => {
    const q = reservationSearch.toLowerCase();
    return r.customer_name.toLowerCase().includes(q) || r.customer_phone.includes(q);
  });

  const filteredMenuItems = menuItems.filter((item) => {
    if (menuCategoryFilter === "All") return true;
    return item.category.toLowerCase() === menuCategoryFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#070b14] text-slate-100">
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#0a0f1d] border-r border-emerald-500/10 flex flex-col shrink-0 z-30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
              <div className="w-full h-full bg-[#070b14] rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block truncate max-w-[150px]">
                {tenantName}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                Restaurant Portal
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className={`p-3 space-y-1.5 flex-1 ${isMobileMenuOpen ? "block" : "hidden md:block"}`}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("orders");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Kitchen Orders</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {orders.filter((o) => o.status === "received" || o.status === "in_kitchen").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("reservations");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "reservations"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4" />
              <span>Reservations</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {reservations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("menu");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "menu"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Menu Catalog</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {menuItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("tables");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tables"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="w-4 h-4" />
              <span>Dining Tables</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {tables.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("whatsapp");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Automation</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("widget");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "widget"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Code2 className="w-4 h-4" />
              <span>AI Widget & Embed</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                restaurantProfile?.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("security");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block truncate max-w-[110px]">
                  {tenantName}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Online</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout from Restaurant"
              className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-emerald-500/10 glass-panel px-6 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-white capitalize">
              {activeTab === "orders" && "Kitchen & Customer Food Orders"}
              {activeTab === "reservations" && "Table Reservations Feed"}
              {activeTab === "menu" && "Restaurant Menu Catalog"}
              {activeTab === "tables" && "Dining Table Configuration"}
              {activeTab === "whatsapp" && "WhatsApp Automation & QR Setup"}
              {activeTab === "widget" && "AI Receptionist Web Widget"}
              {activeTab === "security" && "Restaurant Account Security"}
            </h1>
            <p className="text-[11px] text-slate-400">
              {activeTab === "orders" && "Manage incoming WhatsApp food orders and dispatch kitchen progress notifications"}
              {activeTab === "whatsapp" && "Scan QR code to bind restaurant WhatsApp number for AI reservations & queries"}
              {activeTab !== "orders" && activeTab !== "whatsapp" && "Manage dining reservations, food catalog, and embed settings"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {restaurantProfile && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  restaurantProfile.is_widget_enabled !== false
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    restaurantProfile.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                {restaurantProfile.is_widget_enabled !== false ? "AI Receptionist Active" : "Widget Disabled"}
              </span>
            )}
            <ThemeToggle />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="m-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 max-w-7xl w-full">
          {/* ==================== TAB 0: KITCHEN ORDERS ==================== */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Status Toast Banner */}
              {statusToast && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in ${
                    statusToast.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{statusToast.msg}</span>
                  </div>
                  <button
                    onClick={() => setStatusToast(null)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Kitchen Overview Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl glass-panel border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Kitchen Queue
                  </span>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <span className="text-xl font-bold text-white font-mono">
                      {orders.filter((o) => o.status === "received" || o.status === "in_kitchen").length}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    New Orders
                  </span>
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-300 font-mono">
                      {orders.filter((o) => o.status === "received").length}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Ready for Rider / Pickup
                  </span>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-purple-400" />
                    <span className="text-xl font-bold text-purple-300 font-mono">
                      {orders.filter((o) => o.status === "ready").length}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Completed
                  </span>
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-xl font-bold text-emerald-300 font-mono">
                      {orders.filter((o) => o.status === "completed").length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "active", label: "Active Queue", count: orders.filter((o) => o.status === "received" || o.status === "in_kitchen").length },
                    { id: "all", label: "All Orders", count: orders.length },
                    { id: "received", label: "New (Received)", count: orders.filter((o) => o.status === "received").length },
                    { id: "in_kitchen", label: "Cooking", count: orders.filter((o) => o.status === "in_kitchen").length },
                    { id: "ready", label: "Ready", count: orders.filter((o) => o.status === "ready").length },
                    { id: "completed", label: "Completed", count: orders.filter((o) => o.status === "completed").length },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setOrderFilter(pill.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        orderFilter === pill.id
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300">
                        {pill.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order #, phone, guest..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Orders List / Cards */}
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-xs">Loading kitchen orders...</div>
              ) : orders.filter((o) => {
                  if (orderFilter === "active" && o.status !== "received" && o.status !== "in_kitchen") return false;
                  if (orderFilter !== "all" && orderFilter !== "active" && o.status !== orderFilter) return false;
                  if (!orderSearch.trim()) return true;
                  const q = orderSearch.toLowerCase();
                  return (
                    o.order_number.toLowerCase().includes(q) ||
                    o.customer_name.toLowerCase().includes(q) ||
                    o.customer_phone.includes(q) ||
                    (o.delivery_address && o.delivery_address.toLowerCase().includes(q))
                  );
                }).length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
                  <ChefHat className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No orders found in this view</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When customers ask for the menu and confirm their dishes on WhatsApp, their orders will appear here automatically in real time!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders
                    .filter((o) => {
                      if (orderFilter === "active" && o.status !== "received" && o.status !== "in_kitchen") return false;
                      if (orderFilter !== "all" && orderFilter !== "active" && o.status !== orderFilter) return false;
                      if (!orderSearch.trim()) return true;
                      const q = orderSearch.toLowerCase();
                      return (
                        o.order_number.toLowerCase().includes(q) ||
                        o.customer_name.toLowerCase().includes(q) ||
                        o.customer_phone.includes(q) ||
                        (o.delivery_address && o.delivery_address.toLowerCase().includes(q))
                      );
                    })
                    .map((order) => {
                      const isUpdating = updatingOrderId === order.id;
                      const items = Array.isArray(order.items) ? order.items : [];

                      return (
                        <div
                          key={order.id}
                          className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-lg relative overflow-hidden"
                        >
                          {/* Status bar & Order Header */}
                          <div>
                            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  #{order.order_number}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </span>
                              </div>

                              {/* Status badge */}
                              <div className="flex items-center gap-1.5">
                                {order.status === "received" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    New Order
                                  </span>
                                )}
                                {order.status === "in_kitchen" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                    <Flame className="w-3 h-3 text-blue-400" />
                                    Cooking in Kitchen
                                  </span>
                                )}
                                {order.status === "ready" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    <Truck className="w-3 h-3 text-purple-400" />
                                    Ready / Out for Delivery
                                  </span>
                                )}
                                {order.status === "completed" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    Completed
                                  </span>
                                )}
                                {order.status === "cancelled" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                    Cancelled
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer & Delivery Section */}
                            <div className="pt-3 pb-2 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-sm">
                                  {order.customer_name}
                                </span>
                                <a
                                  href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{order.customer_phone}</span>
                                </a>
                              </div>

                              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                {order.order_type === "delivery" ? (
                                  <>
                                    <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span className="text-slate-300 font-medium">Delivery:</span>
                                    <span className="truncate">{order.delivery_address || "No address provided"}</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3 h-3 text-teal-400 shrink-0" />
                                    <span className="text-slate-300 font-medium capitalize">{order.order_type}</span>
                                  </>
                                )}
                              </div>

                              {order.special_instructions && (
                                <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-300/90">
                                  <span className="font-semibold text-amber-400">Note: </span>
                                  {order.special_instructions}
                                </div>
                              )}
                            </div>

                            {/* Items List */}
                            <div className="pt-2 border-t border-slate-800/60">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                Items Ordered ({items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0)})
                              </span>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-800/60"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                                        {item.quantity}x
                                      </span>
                                      <div>
                                        <span className="text-slate-200 font-medium">{item.name}</span>
                                        {item.notes && (
                                          <span className="text-[10px] text-amber-300 block">
                                            ({item.notes})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="font-mono text-slate-300 text-[11px]">
                                      Rs. {(item.subtotal || (Number(item.price) * Number(item.quantity)) || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Bill Total & Actions */}
                          <div className="pt-3 border-t border-slate-800/80 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400 font-medium">Total Amount:</span>
                              <span className="text-base font-bold text-emerald-400 font-mono">
                                Rs. {Number(order.total_amount).toLocaleString()}
                              </span>
                            </div>

                            {/* Status Transition Buttons */}
                            <div className="space-y-1.5">
                              {order.status === "received" && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateOrderStatus(order.id, "in_kitchen")}
                                    className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    <ChefHat className="w-3.5 h-3.5" />
                                    <span>{isUpdating ? "Updating..." : "Accept & Start Cooking"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {order.status === "in_kitchen" && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateOrderStatus(order.id, "ready")}
                                    className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>{isUpdating ? "Updating..." : "Mark Ready & Send Rider"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {order.status === "ready" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>{isUpdating ? "Updating..." : "Mark as Delivered / Completed"}</span>
                                </button>
                              )}

                              <span className="text-[10px] text-slate-500 block text-center">
                                💬 Status change automatically sends a WhatsApp message to customer
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 1: RESERVATIONS ==================== */}
          {activeTab === "reservations" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Live Guest Reservations ({reservations.length})</h2>
                  <p className="text-xs text-slate-400">Captured automatically via AI receptionist</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reservationSearch}
                    onChange={(e) => setReservationSearch(e.target.value)}
                    placeholder="Search guest or phone..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                {loading ? (
                  <div className="p-12 text-center text-slate-400 text-xs">Loading reservations...</div>
                ) : filteredReservations.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No reservations recorded yet. New AI chat bookings appear here instantly.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Guest Name</th>
                          <th className="px-5 py-3 font-semibold">Phone</th>
                          <th className="px-5 py-3 font-semibold">Date & Time</th>
                          <th className="px-5 py-3 font-semibold">Party Size</th>
                          <th className="px-5 py-3 font-semibold">Pre-ordered Items</th>
                          <th className="px-5 py-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {filteredReservations.map((res) => (
                          <tr key={res.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-white">{res.customer_name}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-300">
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                {res.customer_phone}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col font-mono text-[11px]">
                                <span className="text-white font-semibold">{res.booking_date}</span>
                                <span className="text-slate-400">{res.booking_time.slice(0, 5)}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                <Users className="w-3 h-3" />
                                {res.party_size} Guests
                              </span>
                            </td>
                            <td className="px-5 py-3.5 max-w-xs">
                              {res.order_items && res.order_items.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {res.order_items.map((item: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60"
                                    >
                                      {item.quantity || 1}x {item.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">No pre-orders</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed
                              </span>
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

          {/* ==================== TAB 2: MENU ==================== */}
          {activeTab === "menu" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Add Menu Item Form */}
              <div className="lg:col-span-5">
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
                  <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Add Item to Menu</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-5">AI receptionist uses this menu for guest recommendations.</p>

                  {itemSuccessMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{itemSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateMenuItem} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. Truffle Mushroom Risotto"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                      <input
                        type="text"
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        placeholder="e.g. Starters, Mains, Desserts, Drinks"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(Number(e.target.value))}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creatingItem}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingItem ? "Saving Item..." : "Add to Menu"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Menu Items List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-white">Menu Catalog ({filteredMenuItems.length})</h2>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setMenuCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          menuCategoryFilter === cat
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  {filteredMenuItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No menu items match category. Add dishes using the form on the left.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {filteredMenuItems.map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                          <div>
                            <span className="font-bold text-white text-xs block">{item.name}</span>
                            <span className="text-[11px] text-emerald-400">{item.category}</span>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-xs text-white">${item.price}</span>
                            <button
                              onClick={() => handleToggleItemAvailability(item)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                item.is_available
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {item.is_available ? "In Stock" : "Sold Out"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: TABLES ==================== */}
          {activeTab === "tables" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Add Table Form */}
              <div className="lg:col-span-4">
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
                  <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Add Dining Table</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-5">Define table identifiers and seating capacities.</p>

                  {tableSuccessMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{tableSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateTable} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Table Number / Label</label>
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. Table 4, Patio 2, Booth A"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Seating Capacity</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={tableCapacity}
                        onChange={(e) => setTableCapacity(Number(e.target.value))}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creatingTable}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingTable ? "Adding..." : "Add Table"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Active Tables Grid */}
              <div className="lg:col-span-8 space-y-4">
                <h2 className="text-base font-bold text-white">Active Dining Tables ({tables.length})</h2>

                {tables.length === 0 ? (
                  <div className="glass-panel p-8 rounded-2xl text-center text-slate-500 text-xs">
                    No dining tables configured. Add your first dining table using the form.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {tables.map((t) => (
                      <div
                        key={t.id}
                        className="glass-panel p-4 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center space-y-2 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-white">{t.table_number}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {t.capacity} Seats
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: WHATSAPP AUTOMATION ==================== */}
          {activeTab === "whatsapp" && (
            <div className="max-w-4xl space-y-6">
              <WhatsAppConnectCard />
            </div>
          )}

          {/* ==================== TAB 4: WIDGET ==================== */}
          {activeTab === "widget" && (
            <div className="max-w-3xl space-y-6">
              <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">AI Voice Receptionist Widget</h2>
                    <p className="text-xs text-slate-400">
                      Embed this widget onto your restaurant website for 24/7 guest table reservations.
                    </p>
                  </div>
                </div>

                {/* Status Alert */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    restaurantProfile?.is_widget_enabled !== false
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        restaurantProfile?.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    <span>
                      {restaurantProfile?.is_widget_enabled !== false
                        ? "Your AI receptionist widget is LIVE and accepting table bookings."
                        : "Your AI widget has been disabled by administrator."}
                    </span>
                  </div>
                </div>

                {/* Token */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Restaurant Widget Token (x-widget-token)
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400">
                    <span className="flex-1 truncate">{restaurantProfile?.widget_token || "Loading token..."}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (restaurantProfile?.widget_token) {
                          navigator.clipboard.writeText(restaurantProfile.widget_token);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Script Snippet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    HTML Embed Code Snippet
                  </label>
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 break-all flex items-center justify-between gap-3">
                    <span>
                      {restaurantProfile?.widget_token
                        ? `<script src="${API_BASE}/static/widget.js" data-token="${restaurantProfile.widget_token}" defer></script>`
                        : "Loading snippet..."}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (restaurantProfile?.widget_token) {
                          navigator.clipboard.writeText(
                            `<script src="${API_BASE}/static/widget.js" data-token="${restaurantProfile.widget_token}" defer></script>`
                          );
                          setCopiedSnippet(true);
                          setTimeout(() => setCopiedSnippet(false), 2000);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                    >
                      {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Test Harness Link */}
                <div className="pt-2">
                  <a
                    href={`${API_BASE}/static/test_widget.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Preview Live Web Widget</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 5: SECURITY ==================== */}
          {activeTab === "security" && (
            <div className="max-w-md space-y-6">
              <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Change Account Password</h2>
                    <p className="text-xs text-slate-400">Update your restaurant dashboard access password.</p>
                  </div>
                </div>

                {changePasswordSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{changePasswordSuccess}</span>
                  </div>
                )}

                {changePasswordError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{changePasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Current Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={changePasswordCurrent}
                      onChange={(e) => setChangePasswordCurrent(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={changePasswordNew}
                      onChange={(e) => setChangePasswordNew(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm New Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={changePasswordConfirm}
                      onChange={(e) => setChangePasswordConfirm(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={changePasswordLoading}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {changePasswordLoading ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
