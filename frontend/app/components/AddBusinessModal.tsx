"use client";

import { useState } from "react";
import {
  X,
  Building2,
  Phone,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  provisionBusiness,
  ProvisionBusinessPayload,
  ProvisionBusinessResponse,
} from "@/lib/api";

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminSecret: string;
  onSuccess: (newBusiness: ProvisionBusinessResponse) => void;
}

export default function AddBusinessModal({
  isOpen,
  onClose,
  adminSecret,
  onSuccess,
}: AddBusinessModalProps) {
  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [businessType, setBusinessType] = useState<"clinic" | "restaurant">("clinic");

  // WhatsApp Config
  const [inboundPhoneId, setInboundPhoneId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [showMetaSettings, setShowMetaSettings] = useState(false);

  // Owner Credentials
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<ProvisionBusinessResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-generate slug from name
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

  const generateRandomPassword = () => {
    const words = ["Care", "Health", "Pulse", "Smile", "Dine", "Bistro", "Apex"];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const chars = "!@#$%&*";
    const char = chars[Math.floor(Math.random() * chars.length)];
    setOwnerPassword(`${word}#${num}${char}`);
  };

  const copyToClipboard = (text?: string, key?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const copyAllClientCredentials = () => {
    if (!createdResult) return;
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
    const text = `🎉 Your AI Receptionist Account Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 Business: ${createdResult.name}
🌐 Tenant Slug: ${createdResult.slug}
🔗 Login Portal: ${loginUrl}
👤 Username: ${createdResult.owner_email}
🔑 Temporary Password: ${ownerPassword}
📱 WhatsApp Phone Number ID: ${createdResult.inbound_phone_id || "Pending Setup"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please log in to manage your doctors, slots, and services.`;

    copyToClipboard(text, "all_credentials");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: ProvisionBusinessPayload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        type: businessType,
        inbound_phone_id: inboundPhoneId.trim() || undefined,
        display_phone_number: displayPhoneNumber.trim() || undefined,
        waba_id: wabaId.trim() || undefined,
        owner_email: ownerEmail.trim().toLowerCase(),
        owner_password: ownerPassword.trim(),
      };

      const result = await provisionBusiness(payload, adminSecret);
      setCreatedResult(result);
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || "Failed to provision business.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setBusinessType("clinic");
    setInboundPhoneId("");
    setDisplayPhoneNumber("");
    setWabaId("");
    setShowMetaSettings(false);
    setOwnerEmail("");
    setOwnerPassword("");
    setCreatedResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add New Business Tenant</h2>
              <p className="text-[11px] text-slate-400">
                Provision client workspace, WhatsApp number binding & admin login credentials
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {createdResult ? (
            /* ==================== SUCCESS CREDENTIAL CARD ==================== */
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Business Provisioned Successfully!</h3>
                  <p className="text-xs text-emerald-300/80">
                    Client account has been created. Send the credentials below to the business owner.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Business Name</span>
                  <span className="font-bold text-white">{createdResult.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Account Username</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-300 font-bold">{createdResult.owner_email}</span>
                    <button
                      onClick={() => copyToClipboard(createdResult.owner_email, "username")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy Username"
                    >
                      {copiedKey === "username" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Initial Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300 font-bold">{ownerPassword}</span>
                    <button
                      onClick={() => copyToClipboard(ownerPassword, "password")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy Password"
                    >
                      {copiedKey === "password" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Login Portal URL</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-300 text-[11px]">
                      {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                    </span>
                    <button
                      onClick={() => copyToClipboard(typeof window !== "undefined" ? `${window.location.origin}/login` : "/login", "portal_url")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy Login URL"
                    >
                      {copiedKey === "portal_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Meta WhatsApp Phone ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-200">
                      {createdResult.inbound_phone_id || <span className="italic text-slate-500">Not configured</span>}
                    </span>
                    {createdResult.inbound_phone_id && (
                      <button
                        onClick={() => copyToClipboard(createdResult.inbound_phone_id || "", "phone_id")}
                        className="p-1 hover:text-white text-slate-400 transition-colors"
                        title="Copy Phone ID"
                      >
                        {copiedKey === "phone_id" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Widget Token</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]">
                      {createdResult.widget_token}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdResult.widget_token, "widget_token")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy Widget Token"
                    >
                      {copiedKey === "widget_token" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyAllClientCredentials}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {copiedKey === "all_credentials" ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Credentials Copied to Clipboard!</span>
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
                  onClick={handleResetAndClose}
                  className="py-2.5 px-5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ==================== PROVISION FORM ==================== */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: BUSINESS INFO */}
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
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
                    <span className="text-[10px] text-slate-500 mt-1 block">Used for routing and portal identification</span>
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
                      <option value="clinic">Medical Clinic (Doctors, Slots, Appointments)</option>
                      <option value="restaurant">Restaurant (Tables, Menu, Reservations)</option>
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
                        Obtained from Meta WhatsApp Manager &gt; Phone Numbers. Maps incoming webhook events to this clinic.
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
              <div className="space-y-3.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2 pb-1 text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>2. Tenant Owner Login Credentials</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. rooster or alrazi"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    The business admin will use this username to log in to their scoped dashboard.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Initial Password <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
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
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Provisioning Tenant Account...</span>
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
    </div>
  );
}
