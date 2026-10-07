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
} from "lucide-react";
import {
  getAuth,
  clearAuth,
  getRestaurantMenu,
  createRestaurantMenuItem,
  toggleMenuItemAvailability,
  getRestaurantTables,
  createRestaurantTable,
  getRestaurantReservations,
  getProfile,
  changePassword,
  MenuItem,
  RestaurantTable,
  RestaurantReservation,
  API_BASE,
} from "@/lib/api";

export default function RestaurantDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reservations" | "menu" | "tables" | "widget" | "security">("reservations");
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

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [menuData, tablesData, resData, profData] = await Promise.all([
        getRestaurantMenu(),
        getRestaurantTables(),
        getRestaurantReservations(),
        getProfile().catch(() => null),
      ]);
      setMenuItems(menuData);
      setTables(tablesData);
      setReservations(resData);
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
              {activeTab === "reservations" && "Table Reservations Feed"}
              {activeTab === "menu" && "Restaurant Menu Catalog"}
              {activeTab === "tables" && "Dining Table Configuration"}
              {activeTab === "widget" && "AI Receptionist Web Widget"}
              {activeTab === "security" && "Restaurant Account Security"}
            </h1>
            <p className="text-[11px] text-slate-400">
              Manage dining reservations, food catalog, and embed settings
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
