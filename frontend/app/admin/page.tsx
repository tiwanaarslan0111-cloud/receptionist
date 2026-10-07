"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Building2,
  Stethoscope,
  UtensilsCrossed,
  Plus,
  Search,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Code2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Mail,
  Phone,
  FileText,
  KeyRound,
  X,
  Sparkles,
  Users,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import {
  getAuth,
  clearAuth,
  getBusinesses,
  createBusiness,
  provisionBusiness,
  toggleBusinessWidget,
  deleteBusiness,
  getDemoLeads,
  updateDemoLeadStatus,
  BusinessResponse,
  ProvisionBusinessResponse,
  DemoLead,
  API_BASE,
} from "@/lib/api";
import AddBusinessModal from "@/app/components/AddBusinessModal";
import {
  AdminOnboardingGuideModal,
  AdminOnboardingGuideBanner,
} from "@/app/components/AdminOnboardingGuide";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"businesses" | "leads" | "create" | "overview">("businesses");
  const [adminSecret, setAdminSecret] = useState<string>("admin_master_secret_key_change_me");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Business List State
  const [businesses, setBusinesses] = useState<BusinessResponse[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // Demo Leads State
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "clinic" | "restaurant">("all");
  const [leadsSearch, setLeadsSearch] = useState<string>("");

  // Provision Business Form State
  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [slugEdited, setSlugEdited] = useState<boolean>(false);
  const [businessType, setBusinessType] = useState<"clinic" | "restaurant">("clinic");
  const [inboundPhoneId, setInboundPhoneId] = useState<string>("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState<string>("");
  const [wabaId, setWabaId] = useState<string>("");
  const [showMetaSettings, setShowMetaSettings] = useState<boolean>(false);
  const [ownerEmail, setOwnerEmail] = useState<string>("");
  const [ownerPassword, setOwnerPassword] = useState<string>("");
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<BusinessResponse | null>(null);
  const [createdProvision, setCreatedProvision] = useState<ProvisionBusinessResponse | null>(null);

  // Widget Details Modal State
  const [selectedWidgetModal, setSelectedWidgetModal] = useState<BusinessResponse | null>(null);

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auth Guard
  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      router.push("/login");
      return;
    }
    const secret = auth.admin_secret || localStorage.getItem("admin_secret_key") || "admin_master_secret_key_change_me";
    setAdminSecret(secret);
    loadAllAdminData(secret);
  }, []);

  const loadAllAdminData = async (secret: string) => {
    setLoadingList(true);
    setLoadingLeads(true);
    setListError(null);
    try {
      const [bizData, leadData] = await Promise.all([
        getBusinesses(secret),
        getDemoLeads(secret).catch(() => []),
      ]);
      setBusinesses(bizData);
      setLeads(leadData);
    } catch (err: any) {
      setListError(err.message || "Failed to load admin records.");
    } finally {
      setLoadingList(false);
      setLoadingLeads(false);
    }
  };

  const handleRefresh = () => {
    loadAllAdminData(adminSecret);
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  // Generate strong random password
  const generateStrongPassword = () => {
    const prefixes = ["Clinic", "Care", "Health", "Bistro", "Grill", "Apex"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const chars = "!@#$%&*";
    const char = chars[Math.floor(Math.random() * chars.length)];
    const generated = `${prefix}#${num}${char}`;
    setOwnerPassword(generated);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setSlug(generated);
    }
  };

  // Handle Business Provisioning
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const newProvision = await provisionBusiness(
        {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          type: businessType,
          inbound_phone_id: inboundPhoneId.trim() || undefined,
          display_phone_number: displayPhoneNumber.trim() || undefined,
          waba_id: wabaId.trim() || undefined,
          owner_email: ownerEmail.trim().toLowerCase(),
          owner_password: ownerPassword.trim(),
        },
        adminSecret
      );
      setCreatedProvision(newProvision);
      setCreatedTenant(newProvision);
      setBusinesses((prev) => [newProvision, ...prev]);
    } catch (err: any) {
      setFormError(err.message || "Failed to provision business.");
    } finally {
      setFormLoading(false);
    }
  };

  const resetProvisionForm = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setInboundPhoneId("");
    setDisplayPhoneNumber("");
    setWabaId("");
    setOwnerEmail("");
    setOwnerPassword("");
    setCreatedProvision(null);
    setCreatedTenant(null);
    setFormError(null);
  };

  // Toggle Widget Status
  const handleToggleWidget = async (biz: BusinessResponse) => {
    try {
      const updated = await toggleBusinessWidget(biz.id, adminSecret);
      setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (selectedWidgetModal && selectedWidgetModal.id === updated.id) {
        setSelectedWidgetModal(updated);
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle widget status.");
    }
  };

  // Delete Business
  const handleDeleteBusiness = async (biz: BusinessResponse) => {
    if (biz.name === "Phase 2 Test Clinic") {
      if (!confirm(`Warning: "${biz.name}" is your primary testing tenant. Are you sure you want to delete it?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete business "${biz.name}" (${biz.username})? All associated doctors, slots, and data will be permanently removed.`)) {
        return;
      }
    }

    try {
      await deleteBusiness(biz.id, adminSecret);
      setBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
      if (selectedWidgetModal && selectedWidgetModal.id === biz.id) {
        setSelectedWidgetModal(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete business.");
    }
  };

  // Update Lead Status
  const handleLeadStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const updated = await updateDemoLeadStatus(leadId, newStatus, adminSecret);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err: any) {
      alert(err.message || "Failed to update lead status.");
    }
  };

  const copyToClipboard = (text?: string, key?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesType = typeFilter === "all" || b.business_type === typeFilter;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        b.name.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.widget_token.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [businesses, typeFilter, searchQuery]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = leadsSearch.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.business_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    });
  }, [leads, leadsSearch]);

  const newLeadsCount = leads.filter((l) => l.status === "new").length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#070b14] text-slate-100">
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#0a0f1d] border-r border-emerald-500/10 flex flex-col shrink-0 z-30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
              <div className="w-full h-full bg-[#070b14] rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                VoiceReceptionist
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                Super Admin
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

        {/* Sidebar Navigation */}
        <nav className={`p-3 space-y-1.5 flex-1 ${isMobileMenuOpen ? "block" : "hidden md:block"}`}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("businesses");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "businesses"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4" />
              <span>Client Businesses</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {businesses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("leads");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "leads"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4" />
              <span>Demo & Leads</span>
            </div>
            {newLeadsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                {newLeadsCount} new
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                {leads.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("create");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "create"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4" />
              <span>Register Business</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4" />
              <span>Platform Health</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
        </nav>

        {/* Sidebar Footer User & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Super Admin</span>
                <span className="text-[10px] text-emerald-400 font-medium">Session Active</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout from Admin"
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
              {activeTab === "businesses" && "Client Business Management"}
              {activeTab === "leads" && "Landing Page Demo & Inquiries"}
              {activeTab === "create" && "Register New Business Tenant"}
              {activeTab === "overview" && "Platform Operations & Metrics"}
            </h1>
            <p className="text-[11px] text-slate-400">
              Multi-tenant voice receptionist control panel
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/80 rounded-xl border border-emerald-600/30 transition-all cursor-pointer shadow-sm shadow-emerald-900/20"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Onboarding Guide</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={loadingList}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Business</span>
            </button>
          </div>
        </header>

        {listError && (
          <div className="m-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{listError}</span>
          </div>
        )}

        <div className="p-6 max-w-7xl w-full">
          {/* ==================== TAB 1: BUSINESSES ==================== */}
          {activeTab === "businesses" && (
            <div className="space-y-6">
              {/* Quick Onboarding Workflow Guide Banner */}
              <AdminOnboardingGuideBanner
                onOpenModal={() => setIsGuideModalOpen(true)}
                onOpenAddBusiness={() => setIsAddModalOpen(true)}
                defaultExpanded={false}
              />

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800 w-fit">
                  <button
                    onClick={() => setTypeFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      typeFilter === "all" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({businesses.length})
                  </button>
                  <button
                    onClick={() => setTypeFilter("clinic")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      typeFilter === "clinic" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Clinics ({businesses.filter((b) => b.business_type === "clinic").length})
                  </button>
                  <button
                    onClick={() => setTypeFilter("restaurant")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      typeFilter === "restaurant" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Restaurants ({businesses.filter((b) => b.business_type === "restaurant").length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or username..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Businesses Table */}
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                {loadingList ? (
                  <div className="p-12 text-center text-slate-400 text-xs">Loading businesses...</div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No businesses match your filter. Register one using the New Business tab.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Business</th>
                          <th className="px-5 py-3 font-semibold">Type</th>
                          <th className="px-5 py-3 font-semibold">Owner Account</th>
                          <th className="px-5 py-3 font-semibold">WhatsApp Cloud Binding</th>
                          <th className="px-5 py-3 font-semibold">AI Widget Status</th>
                          <th className="px-5 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {filteredBusinesses.map((biz) => {
                          const isWidgetActive = biz.is_widget_enabled !== false;
                          return (
                            <tr key={biz.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                                      biz.business_type === "clinic"
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    }`}
                                  >
                                    {biz.business_type === "clinic" ? (
                                      <Stethoscope className="w-4 h-4" />
                                    ) : (
                                      <UtensilsCrossed className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-bold text-white block">{biz.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      /{biz.slug || biz.username}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    biz.business_type === "clinic"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  {biz.business_type}
                                </span>
                              </td>

                              <td className="px-5 py-3.5">
                                {biz.owner_email ? (
                                  <span className="text-slate-200 font-mono text-[11px] block">{biz.owner_email}</span>
                                ) : (
                                  <span className="font-mono text-slate-400 text-[11px]">@{biz.username}</span>
                                )}
                              </td>

                              <td className="px-5 py-3.5">
                                {biz.inbound_phone_id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                                      ID: {biz.inbound_phone_id}
                                    </span>
                                    {biz.display_phone_number && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({biz.display_phone_number})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Not Linked</span>
                                )}
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      isWidgetActive
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isWidgetActive ? "bg-emerald-400" : "bg-rose-400"
                                      }`}
                                    />
                                    {isWidgetActive ? "Widget Active" : "Widget Disabled"}
                                  </span>

                                  <button
                                    onClick={() => handleToggleWidget(biz)}
                                    title={isWidgetActive ? "Click to disable widget" : "Click to enable widget"}
                                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                                      isWidgetActive
                                        ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/20"
                                        : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/20"
                                    }`}
                                  >
                                    {isWidgetActive ? "Disable" : "Enable"}
                                  </button>
                                </div>
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedWidgetModal(biz)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Widget Details</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteBusiness(biz)}
                                    title="Delete Business"
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: DEMO LEADS ==================== */}
          {activeTab === "leads" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">Book a Demo Submissions ({leads.length})</h2>
                  <p className="text-xs text-slate-400">Captured live from the public landing page</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                    placeholder="Search leads by name, email..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                {loadingLeads ? (
                  <div className="p-12 text-center text-slate-400 text-xs">Loading demo requests...</div>
                ) : filteredLeads.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No demo leads recorded yet. Submissions from the public landing page appear here automatically.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Contact / Business</th>
                          <th className="px-5 py-3 font-semibold">Type</th>
                          <th className="px-5 py-3 font-semibold">Contact Info</th>
                          <th className="px-5 py-3 font-semibold">Notes / Inquiry</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3.5">
                              <div>
                                <span className="font-bold text-white block">{lead.name}</span>
                                <span className="text-[11px] text-emerald-400">{lead.business_name}</span>
                              </div>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                {lead.business_type}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-200">
                                <Mail className="w-3 h-3 text-slate-500" />
                                <a href={`mailto:${lead.email}`} className="hover:text-emerald-400">
                                  {lead.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <a href={`tel:${lead.phone}`} className="hover:text-emerald-400">
                                  {lead.phone}
                                </a>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 max-w-xs text-slate-400 truncate">
                              {lead.notes || <span className="italic text-slate-600">No notes provided</span>}
                            </td>

                            <td className="px-5 py-3.5">
                              <select
                                value={lead.status}
                                onChange={(e) => handleLeadStatusChange(lead.id, e.target.value)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border focus:outline-none cursor-pointer ${
                                  lead.status === "new"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : lead.status === "contacted"
                                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                <option value="new" className="bg-slate-900 text-white">New</option>
                                <option value="contacted" className="bg-slate-900 text-white">Contacted</option>
                                <option value="qualified" className="bg-slate-900 text-white">Qualified</option>
                                <option value="closed" className="bg-slate-900 text-white">Closed</option>
                              </select>
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500">
                              {new Date(lead.created_at).toLocaleDateString()}
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

          {/* ==================== TAB 3: REGISTER NEW BUSINESS ==================== */}
          {activeTab === "create" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Provision New Business Tenant</h2>
                    <p className="text-xs text-slate-400">
                      Create business account, bind Meta WhatsApp credentials, and issue owner login access.
                    </p>
                  </div>
                </div>

                {formError && (
                  <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {createdProvision ? (
                  /* ==================== SUCCESS CREDENTIAL CARD ==================== */
                  <div className="space-y-5 animate-in fade-in zoom-in-95 mt-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Business Provisioned Successfully!</h3>
                        <p className="text-xs text-emerald-300/80">
                          Client account has been created. Send the credentials below to the business owner.
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400 font-medium">Business Name</span>
                        <span className="font-bold text-white">{createdProvision.name}</span>
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400 font-medium">Owner Email Address</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-300 font-bold">{createdProvision.owner_email}</span>
                          <button
                            onClick={() => copyToClipboard(createdProvision.owner_email, "email-created")}
                            className="p-1 hover:text-white text-slate-400 transition-colors"
                            title="Copy Email"
                          >
                            {copiedKey === "email-created" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400 font-medium">Initial Password</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-300 font-bold">{ownerPassword}</span>
                          <button
                            onClick={() => copyToClipboard(ownerPassword, "pass-created")}
                            className="p-1 hover:text-white text-slate-400 transition-colors"
                            title="Copy Password"
                          >
                            {copiedKey === "pass-created" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400 font-medium">Login Portal URL</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-300 text-[11px]">
                            {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                          </span>
                          <button
                            onClick={() => copyToClipboard(typeof window !== "undefined" ? `${window.location.origin}/login` : "/login", "url-created")}
                            className="p-1 hover:text-white text-slate-400 transition-colors"
                            title="Copy Login URL"
                          >
                            {copiedKey === "url-created" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400 font-medium">Meta WhatsApp Phone ID</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200">
                            {createdProvision.inbound_phone_id || <span className="italic text-slate-500">Not configured</span>}
                          </span>
                          {createdProvision.inbound_phone_id && (
                            <button
                              onClick={() => copyToClipboard(createdProvision.inbound_phone_id || "", "phone-created")}
                              className="p-1 hover:text-white text-slate-400 transition-colors"
                              title="Copy Phone ID"
                            >
                              {copiedKey === "phone-created" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Widget Token</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]">
                            {createdProvision.widget_token}
                          </span>
                          <button
                            onClick={() => copyToClipboard(createdProvision.widget_token, "widget-created")}
                            className="p-1 hover:text-white text-slate-400 transition-colors"
                            title="Copy Widget Token"
                          >
                            {copiedKey === "widget-created" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
                          const text = `🎉 Your AI Receptionist Account Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 Business: ${createdProvision.name}
🌐 Tenant Slug: ${createdProvision.slug}
🔗 Login Portal: ${loginUrl}
📧 Email: ${createdProvision.owner_email}
🔑 Temporary Password: ${ownerPassword}
📱 WhatsApp Phone Number ID: ${createdProvision.inbound_phone_id || "Pending Setup"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please log in to manage your doctors, slots, and services.`;
                          copyToClipboard(text, "all-created");
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        {copiedKey === "all-created" ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Client Credentials Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Client Onboarding Message</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={resetProvisionForm}
                        className="py-2.5 px-5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Provision Another
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ==================== PROVISION FORM ==================== */
                  <form onSubmit={handleCreateBusiness} className="space-y-5 mt-5">
                    {/* SECTION 1: BUSINESS INFO */}
                    <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-2 pb-1 text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800/60">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>1. Business Info</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Business Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g. Al-Razi Dental Clinic"
                          required
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Tenant Slug <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={slug}
                            onChange={(e) => {
                              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                              setSlugEdited(true);
                            }}
                            placeholder="e.g. al-razi-dental"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Business Type <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value as "clinic" | "restaurant")}
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                          >
                            <option value="clinic">Medical Clinic</option>
                            <option value="restaurant">Restaurant &amp; Cafe</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* OPTIONAL ACCORDION: ADVANCED META CLOUD API SETTINGS */}
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowMetaSettings(!showMetaSettings)}
                        className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                          <span>
                            {showMetaSettings ? "−" : "+"} Advanced Meta Cloud API Settings (Optional)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>{showMetaSettings ? "Hide" : "Expand"}</span>
                          {showMetaSettings ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {showMetaSettings && (
                        <div className="p-4 pt-1 space-y-3.5 border-t border-slate-800/60 bg-slate-950/60">
                          <p className="text-[11px] text-slate-400">
                            Optional legacy Meta WhatsApp Cloud API credentials. Businesses can link their WhatsApp number via QR code directly in their dashboard.
                          </p>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Meta Phone Number ID
                            </label>
                            <input
                              type="text"
                              value={inboundPhoneId}
                              onChange={(e) => setInboundPhoneId(e.target.value.trim())}
                              placeholder="e.g. 104928372619482"
                              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Obtained from Meta WhatsApp Manager &gt; Phone Numbers. Maps incoming webhook events to this business.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Display Phone Number
                              </label>
                              <input
                                type="text"
                                value={displayPhoneNumber}
                                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                                placeholder="e.g. +92 300 1234567"
                                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                WABA ID <span className="text-slate-500 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                value={wabaId}
                                onChange={(e) => setWabaId(e.target.value.trim())}
                                placeholder="e.g. 1841329600331081"
                                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: TENANT OWNER LOGIN CREDENTIALS */}
                    <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-2 pb-1 text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800/60">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>2. Tenant Owner Login Credentials</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Owner Email Address <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          placeholder="e.g. admin@alrazi.com"
                          required
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-300">
                            Initial Password <span className="text-rose-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={generateStrongPassword}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Generate Random Password</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          placeholder="Enter or generate temporary password"
                          required
                          minLength={6}
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {formLoading ? (
                          <span>Provisioning Business &amp; Credentials...</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Create Business &amp; Credentials</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: PLATFORM HEALTH ==================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Total Businesses</span>
                  <span className="text-2xl font-bold text-white font-mono">{businesses.length}</span>
                  <span className="text-[10px] text-emerald-400 block mt-1">Multi-tenant isolation active</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Clinics</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {businesses.filter((b) => b.business_type === "clinic").length}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Doctor & slot management</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Restaurants</span>
                  <span className="text-2xl font-bold text-amber-400 font-mono">
                    {businesses.filter((b) => b.business_type === "restaurant").length}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Tables & menu catalog</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Demo Leads</span>
                  <span className="text-2xl font-bold text-cyan-400 font-mono">{leads.length}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">{newLeadsCount} awaiting contact</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== WIDGET DETAILS MODAL ==================== */}
      {selectedWidgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xl p-6 sm:p-7 rounded-2xl border border-emerald-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedWidgetModal.name}</h3>
                  <p className="text-xs text-slate-400">AI Receptionist Embed & Token Config</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWidgetModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  selectedWidgetModal.is_widget_enabled !== false
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedWidgetModal.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <span>
                    Widget is currently{" "}
                    {selectedWidgetModal.is_widget_enabled !== false ? "ACTIVE & LIVE" : "DISABLED"}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleWidget(selectedWidgetModal)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedWidgetModal.is_widget_enabled !== false
                      ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  }`}
                >
                  {selectedWidgetModal.is_widget_enabled !== false ? "Disable Widget" : "Enable Widget"}
                </button>
              </div>

              {/* Token */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Widget Token (x-widget-token)
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-white">
                  <span className="flex-1 truncate">{selectedWidgetModal.widget_token}</span>
                  <button
                    onClick={() => copyToClipboard(selectedWidgetModal.widget_token, "modal-token")}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === "modal-token" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Embed Script */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Website Embed HTML Tag
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 break-all flex items-center justify-between gap-2">
                  <span>{selectedWidgetModal.embed_snippet}</span>
                  <button
                    onClick={() => copyToClipboard(selectedWidgetModal.embed_snippet, "modal-snippet")}
                    className="p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === "modal-snippet" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Live Test Link */}
              <div className="pt-2">
                <a
                  href={`${API_BASE}/static/test_widget.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Live Widget Test Harness</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Business Modal */}
      <AddBusinessModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        adminSecret={adminSecret}
        onSuccess={(newBiz) => {
          setBusinesses((prev) => [newBiz, ...prev]);
        }}
      />

      {/* Client Onboarding Guide Modal */}
      <AdminOnboardingGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onOpenAddBusiness={() => setIsAddModalOpen(true)}
      />
    </div>
  );
}
