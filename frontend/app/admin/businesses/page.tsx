"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UtensilsCrossed,
  MessageSquare,
  Trash2,
  Code2,
  ArrowLeft,
  Shield,
  Copy,
  Check,
  CheckCircle2,
  X,
  Phone,
  HelpCircle,
} from "lucide-react";
import {
  getAuth,
  getBusinesses,
  toggleBusinessWidget,
  deleteBusiness,
  BusinessResponse,
  ProvisionBusinessResponse,
} from "@/lib/api";
import AddBusinessModal from "@/app/components/AddBusinessModal";
import {
  AdminOnboardingGuideModal,
  AdminOnboardingGuideBanner,
} from "@/app/components/AdminOnboardingGuide";

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [adminSecret, setAdminSecret] = useState<string>("admin_master_secret_key_change_me");
  const [businesses, setBusinesses] = useState<BusinessResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "clinic" | "restaurant">("all");

  // Onboarding Guide & Add Business Modals
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Widget Details Modal
  const [selectedWidgetModal, setSelectedWidgetModal] = useState<BusinessResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      router.push("/login");
      return;
    }
    const secret = auth.admin_secret || localStorage.getItem("admin_secret_key") || "admin_master_secret_key_change_me";
    setAdminSecret(secret);
    loadBusinesses(secret);
  }, []);

  const loadBusinesses = async (secret: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBusinesses(secret);
      setBusinesses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load businesses.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWidget = async (biz: BusinessResponse) => {
    try {
      const updated = await toggleBusinessWidget(biz.id, adminSecret);
      setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (selectedWidgetModal && selectedWidgetModal.id === updated.id) {
        setSelectedWidgetModal(updated);
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle widget.");
    }
  };

  const handleDeleteBusiness = async (biz: BusinessResponse) => {
    if (!confirm(`Are you sure you want to delete "${biz.name}"? All associated data will be removed.`)) {
      return;
    }
    try {
      await deleteBusiness(biz.id, adminSecret);
      setBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
      if (selectedWidgetModal?.id === biz.id) {
        setSelectedWidgetModal(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete business.");
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesType = typeFilter === "all" || b.business_type === typeFilter;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.slug && b.slug.toLowerCase().includes(q)) ||
        (b.owner_email && b.owner_email.toLowerCase().includes(q)) ||
        (b.inbound_phone_id && b.inbound_phone_id.includes(q)) ||
        (b.username && b.username.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [businesses, typeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-emerald-500/20 glass-panel px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Client Business Management</h1>
            <p className="text-[10px] text-slate-400">Multi-tenant accounts, WhatsApp Cloud bindings &amp; credentials</p>
          </div>
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
            onClick={() => loadBusinesses(adminSecret)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Business</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Quick Onboarding Workflow Guide Banner */}
        <AdminOnboardingGuideBanner
          onOpenModal={() => setIsGuideModalOpen(true)}
          onOpenAddBusiness={() => setIsAddModalOpen(true)}
          defaultExpanded={true}
        />

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl glass-panel border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Total Businesses</span>
            <span className="text-xl font-bold text-white mt-1 block">{businesses.length}</span>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800">
            <span className="text-[11px] text-emerald-400 block font-medium">Medical Clinics</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {businesses.filter((b) => b.business_type === "clinic").length}
            </span>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800">
            <span className="text-[11px] text-amber-400 block font-medium">Restaurants &amp; Cafes</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {businesses.filter((b) => b.business_type === "restaurant").length}
            </span>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800">
            <span className="text-[11px] text-teal-400 block font-medium">WhatsApp Connected</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {businesses.filter((b) => !!b.inbound_phone_id).length}
            </span>
          </div>
        </div>

        {/* Filters and Search */}
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
                typeFilter === "restaurant" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Restaurants ({businesses.filter((b) => b.business_type === "restaurant").length})
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, slug, email, phone ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading registered businesses...</div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-3">
              <p>No businesses found.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Add Your First Business
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Business &amp; Slug</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Owner Account</th>
                    <th className="px-5 py-3 font-semibold">WhatsApp Cloud Binding</th>
                    <th className="px-5 py-3 font-semibold">Widget Status</th>
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
                              {isWidgetActive ? "Active" : "Disabled"}
                            </span>

                            <button
                              onClick={() => handleToggleWidget(biz)}
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
                              <span>Embed Code</span>
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
      </main>

      {/* Add Business Modal */}
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

      {/* Widget Embed Code Modal */}
      {selectedWidgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>AI Voice Widget Integration for {selectedWidgetModal.name}</span>
              </div>
              <button
                onClick={() => setSelectedWidgetModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Paste this HTML snippet right before the closing <code className="text-emerald-400">&lt;/body&gt;</code> tag on the client&apos;s website:
              </p>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 break-all select-all">
                {selectedWidgetModal.embed_snippet}
              </div>

              <button
                onClick={() => copyToClipboard(selectedWidgetModal.embed_snippet, "modal_snippet")}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {copiedKey === "modal_snippet" ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Embed Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Embed Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
