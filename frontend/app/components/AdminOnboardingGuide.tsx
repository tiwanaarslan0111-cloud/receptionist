"use client";

import { useState } from "react";
import {
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Clock,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Send,
  Plus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface AdminOnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddBusiness?: () => void;
  defaultClientEmail?: string;
  defaultTempPassword?: string;
  defaultPortalUrl?: string;
}

export function AdminOnboardingGuideModal({
  isOpen,
  onClose,
  onOpenAddBusiness,
  defaultClientEmail = "client-admin@example.com",
  defaultTempPassword = "TemporaryPassword123",
  defaultPortalUrl,
}: AdminOnboardingGuideModalProps) {
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [templateEmail, setTemplateEmail] = useState(defaultClientEmail);
  const [templatePassword, setTemplatePassword] = useState(defaultTempPassword);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
  const portalUrl = defaultPortalUrl || `${origin}/login`;

  const welcomeMessage = `Assalam-o-Alaikum / Hello,

Your AI Receptionist portal has been created!

- Portal Login: ${portalUrl}
- Email: ${templateEmail}
- Temporary Password: ${templatePassword}

Please log in to set up your doctors, schedule slots, and consultation hours. Your WhatsApp bot is already linked and ready to answer patient inquiries once your schedule is added.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(welcomeMessage);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl p-6 sm:p-8 rounded-2xl border border-emerald-500/30 shadow-2xl relative my-8 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
          title="Close Guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Super Admin Operational Playbook</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Client Onboarding Guide</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
              ~3 Minutes Total
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Standard operating procedure to register a tenant SIM on Meta Cloud API, provision their isolated workspace, and hand over access.
          </p>
        </div>

        {/* Warning & Callout Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300 block font-semibold mb-0.5">Crucial Pre-requisite:</strong>
              The client MUST delete their existing WhatsApp account from the mobile app on that SIM number before registering it in Meta Manager.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-cyan-200/90 leading-relaxed">
              <strong className="text-cyan-300 block font-semibold mb-0.5">Zero-Downtime Routing:</strong>
              Incoming webhooks automatically route via Meta <code className="text-cyan-200 font-mono">phone_number_id</code>. No server restarts or manual deployments required.
            </div>
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="space-y-4">
          {/* STEP 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Register SIM in Meta Business Manager</span>
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                <span>~2 mins</span>
              </span>
            </div>

            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
              <li>
                Open Meta Business Manager &rarr; navigate to <strong>WhatsApp Manager</strong> &rarr; <strong>Phone Numbers</strong>.
              </li>
              <li>
                Click <span className="text-emerald-300 font-medium font-mono">Add Phone Number</span> and enter the client&apos;s business profile details.
              </li>
              <li>
                Enter the client&apos;s SIM phone number (verify it is not actively registered on a personal WhatsApp app).
              </li>
              <li>
                Request the 6-digit SMS OTP from the client and verify the phone number.
              </li>
              <li>
                Copy the generated <strong>Phone Number ID</strong> (15–17 digit integer).
              </li>
            </ol>

            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Direct Meta link:</span>
              <a
                href="https://business.facebook.com/wa/manage/phone-numbers/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/30 hover:border-emerald-500 transition-all"
              >
                <span>Open Meta WhatsApp Manager</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Create Business &amp; Assign Credentials</span>
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                <span>~1 min</span>
              </span>
            </div>

            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
              <li>
                Click <strong className="text-cyan-300">+ Add New Business</strong> in this dashboard.
              </li>
              <li>
                Enter Business Name, Category (<code className="text-slate-200 font-mono">clinic</code> or <code className="text-slate-200 font-mono">restaurant</code>), and custom Slug.
              </li>
              <li>
                Paste the <strong>Phone Number ID</strong> copied from Step 1 into <em>Meta Phone Number ID</em>.
              </li>
              <li>
                Enter the client&apos;s account username and click <em>Generate Random Password</em>.
              </li>
              <li>
                Click <strong>Create Business &amp; Credentials</strong> to atomically provision the workspace.
              </li>
            </ol>

            {onOpenAddBusiness && (
              <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Ready to provision now?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddBusiness();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm shadow-emerald-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Add Business Modal</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-400" />
                  <span>Send Login Details to Client (Autonomous Handover)</span>
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3" />
                <span>Instant</span>
              </span>
            </div>

            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
              <li>
                Send the client their portal URL, login email, and initial temporary password.
              </li>
              <li>
                The business owner logs in independently to create doctors, timing slots, or restaurant tables.
              </li>
              <li>
                All incoming WhatsApp chats to that SIM automatically trigger the AI agent using the client&apos;s live database schedule.
              </li>
            </ol>

            {/* Welcome Handover Template Box */}
            <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Client Handover Message Template</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  {copiedTemplate ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Template</span>
                    </>
                  )}
                </button>
              </div>

              {/* Template Customizer fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Client Email"
                  value={templateEmail}
                  onChange={(e) => setTemplateEmail(e.target.value)}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Temp Password"
                  value={templatePassword}
                  onChange={(e) => setTemplatePassword(e.target.value)}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 leading-relaxed max-h-36 overflow-y-auto select-all">
                {welcomeMessage}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Need support? Meta Cloud API webhooks require a verified Phone Number ID.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors ml-auto"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdminOnboardingGuideBannerProps {
  onOpenModal?: () => void;
  onOpenAddBusiness?: () => void;
  defaultExpanded?: boolean;
}

export function AdminOnboardingGuideBanner({
  onOpenModal,
  onOpenAddBusiness,
  defaultExpanded = false,
}: AdminOnboardingGuideBannerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-emerald-500/25 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/60 shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Quick Onboarding Workflow</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                3 Minutes
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Step-by-step SOP for registering client SIMs in Meta WhatsApp Manager and provisioning their portal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Full Interactive Guide</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>{expanded ? "Collapse" : "Expand 3 Steps"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {/* Card 1 */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Step 1 &bull; ~2m
              </span>
              <a
                href="https://business.facebook.com/wa/manage/phone-numbers/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-emerald-400"
                title="Open Meta Manager"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <h4 className="text-xs font-bold text-white">Register SIM in Meta</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Add client SIM in Meta WhatsApp Manager, verify via SMS OTP, and copy the 15-digit <strong>Phone Number ID</strong>.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                Step 2 &bull; ~1m
              </span>
              {onOpenAddBusiness && (
                <button
                  type="button"
                  onClick={onOpenAddBusiness}
                  className="text-slate-400 hover:text-cyan-400"
                  title="Add Business"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <h4 className="text-xs font-bold text-white">Provision Account</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click <strong>+ Add New Business</strong>, paste the Meta Phone Number ID, assign client email &amp; random password.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-400">
                Step 3 &bull; Instant
              </span>
              <Send className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <h4 className="text-xs font-bold text-white">Client Autonomous Setup</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Share credentials. Client logs in independently to configure doctors and slots. Inbound WhatsApp messages route automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOnboardingGuide({
  isOpen,
  onClose,
  onOpenAddBusiness,
}: AdminOnboardingGuideModalProps) {
  return (
    <AdminOnboardingGuideModal
      isOpen={isOpen}
      onClose={onClose}
      onOpenAddBusiness={onOpenAddBusiness}
    />
  );
}
