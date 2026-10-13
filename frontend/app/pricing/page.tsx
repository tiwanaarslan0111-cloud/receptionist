"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  Building2,
  Stethoscope,
  UtensilsCrossed,
  MessageSquare,
  Bot,
  CalendarCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import { submitDemoLead } from "@/lib/api";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("pro");

  // Lead Modal state
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadBusinessName, setLeadBusinessName] = useState("");
  const [leadBusinessType, setLeadBusinessType] = useState("clinic");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleOpenPlan = (plan: "free" | "pro") => {
    setSelectedPlan(plan);
    setIsDemoModalOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);
    setLeadError(null);
    try {
      await submitDemoLead({
        name: leadName.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        business_name: leadBusinessName.trim(),
        business_type: leadBusinessType,
        notes: `Selected Plan: ${selectedPlan.toUpperCase()} (${billingCycle})`,
      });
      setLeadSubmitted(true);
    } catch (err: any) {
      setLeadError(err?.message || "Failed to submit request.");
    } finally {
      setSubmittingLead(false);
    }
  };

  const faqs = [
    {
      q: "What counts towards the 1,000 monthly bookings/orders on the Free plan?",
      a: "Every appointment successfully scheduled for a physician or dining order confirmed for a restaurant counts as 1 booking. General inquiry conversations, FAQs, and symptom triages are completely unlimited.",
    },
    {
      q: "Can I use my existing WhatsApp business number?",
      a: "Yes! You can link any standard WhatsApp or WhatsApp Business mobile number simply by scanning a QR code in your dashboard. Zero telecom configuration or meta developer approvals needed.",
    },
    {
      q: "What payment methods are supported for the Paid Pro plan?",
      a: "We support direct local bank transfers (Raast, IBAN in Pakistan), credit/debit cards, and corporate invoicing. You can pay monthly with zero lock-in contracts.",
    },
    {
      q: "Is there any software setup required for patients or dining guests?",
      a: "None at all. Your patients and guests can simply talk or chat via WhatsApp or click the voice button on your website widget. It runs seamlessly on any mobile or desktop browser.",
    },
    {
      q: "Does the AI support both Roman Urdu and English?",
      a: "Yes. The AI automatically detects whether the customer speaks Roman Urdu or English and replies naturally in the same language with natural Pakistani accent voice synthesis.",
    },
  ];

  return (
    <div className="relative overflow-hidden py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transparent &amp; Simple Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Pick the Plan that Powers Your{" "}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
            AI Reception Desk
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          No hidden fees. No hardware required. Start free with 1,000 monthly bookings, or upgrade to Pro for unlimited volume.
        </p>

        {/* Monthly / Annual Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span
            className={`text-xs font-semibold cursor-pointer ${
              billingCycle === "monthly"
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly Billing
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
            className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-800 p-1 transition-colors relative cursor-pointer"
            aria-label="Toggle Billing Cycle"
          >
            <div
              className={`w-4 h-4 rounded-full bg-emerald-600 transition-transform ${
                billingCycle === "annual" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
              billingCycle === "annual"
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
            onClick={() => setBillingCycle("annual")}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* ==================== 2 PRICING CARDS ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {/* CARD 1: FREE PLAN */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 relative">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Free Starter</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Essential AI receptionist for emerging clinics &amp; cafes
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Bot className="w-5 h-5" />
              </div>
            </div>

            {/* Price block */}
            <div className="my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-mono">
                  Rs. 0
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1,000 Bookings / Orders Included</span>
              </div>
            </div>

            {/* Features List */}
            <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>1,000 confirmed bookings &amp; orders</strong> per month</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Bilingual Roman Urdu &amp; English AI voice synthesis</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>1-line embeddable web widget for any website</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct WhatsApp automation gateway pairing</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Full doctor roster &amp; dining menu items management</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Atomic database row locking to prevent conflicts</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Standard community &amp; documentation support</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleOpenPlan("free")}
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* CARD 2: PAID PRO PLAN (RECOMMENDED) */}
        <div className="glass-panel p-8 rounded-3xl border-2 border-emerald-500/60 dark:border-emerald-500/80 flex flex-col justify-between shadow-2xl relative glow-emerald">
          {/* Most Popular Badge */}
          <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Professional Pro</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  High-volume practices, diagnostic clinics &amp; busy restaurants
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            {/* Price block */}
            <div className="my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {billingCycle === "monthly" ? "Rs. 5,000" : "Rs. 4,000"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  / month {billingCycle === "annual" && "(billed annually)"}
                </span>
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600/15 to-teal-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Unlimited Orders &amp; Bookings</span>
              </div>
            </div>

            {/* Features List */}
            <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Unlimited bookings &amp; orders</strong> (no volume caps)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Bilingual Roman Urdu &amp; English natural speech</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Sub-1.2s voice synthesis latency with barge-in interruption</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Bulk doctor calendar slot generator &amp; break windows</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Kitchen status notifications &amp; dispatch tracking</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Dedicated account manager &amp; WhatsApp concierge support</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>99.9% uptime SLA &amp; zero-interruption guarantee</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleOpenPlan("pro")}
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to Unlimited Pro</span>
          </button>
        </div>
      </div>

      {/* ==================== PLAN FEATURE COMPARISON MATRIX ==================== */}
      <div className="mt-20 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Plan Feature Comparison
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare all capabilities side-by-side
          </p>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300">Feature</th>
                  <th className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 text-center">
                    Free Starter
                  </th>
                  <th className="py-3.5 px-6 font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                    Professional Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">Monthly Bookings / Orders</td>
                  <td className="py-3 px-6 text-center text-slate-600 dark:text-slate-300">1,000 / month</td>
                  <td className="py-3 px-6 text-center font-bold text-emerald-600 dark:text-emerald-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">Bilingual Roman Urdu &amp; English</td>
                  <td className="py-3 px-6 text-center">✓</td>
                  <td className="py-3 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">WhatsApp QR Automation</td>
                  <td className="py-3 px-6 text-center">✓</td>
                  <td className="py-3 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">1-Line Script Web Widget</td>
                  <td className="py-3 px-6 text-center">✓</td>
                  <td className="py-3 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">Atomic Slot &amp; Table Locking</td>
                  <td className="py-3 px-6 text-center">✓</td>
                  <td className="py-3 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">Bulk Slot Generator</td>
                  <td className="py-3 px-6 text-center text-slate-400 dark:text-slate-500">—</td>
                  <td className="py-3 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">Priority Voice Latency (&lt;1.2s)</td>
                  <td className="py-3 px-6 text-center text-slate-400 dark:text-slate-500">—</td>
                  <td className="py-3 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">Support SLA</td>
                  <td className="py-3 px-6 text-center text-slate-600 dark:text-slate-300">Standard Email</td>
                  <td className="py-3 px-6 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    24/7 Priority WhatsApp
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================== PRICING FAQ ==================== */}
      <div className="mt-20 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Everything you need to know about plans and billing
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== BOTTOM CTA ==================== */}
      <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to Automate Your Front Desk?
          </h3>
          <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
            Join hundreds of doctors and restaurateurs delivering instantaneous 24/7 bilingual bookings with zero effort.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenPlan("pro")}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-lg cursor-pointer"
            >
              Get Started with Pro (5,000 / mo)
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700/60 hover:bg-emerald-700/80 text-white font-bold text-xs border border-white/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== PLAN SELECTION / SIGNUP MODAL ==================== */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative glow-emerald">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedPlan === "free" ? "Start Free Plan" : "Get Unlimited Pro Plan"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPlan === "free"
                      ? "1,000 monthly bookings included • Free forever"
                      : "Unlimited bookings & orders • Rs. 5,000 / month"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leadSubmitted ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Setup Request Confirmed!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Thank you! Our onboarding specialist will contact you immediately to activate your {selectedPlan.toUpperCase()} plan workspace.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDemoModalOpen(false);
                      setLeadSubmitted(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                {leadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 dark:text-rose-300">
                    {leadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Dr. Ahmed Khan"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="ahmed@clinic.com"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadBusinessName}
                      onChange={(e) => setLeadBusinessName(e.target.value)}
                      placeholder="e.g. City Health Clinic"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Industry Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leadBusinessType}
                    onChange={(e) => setLeadBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="clinic">Medical Clinic / Healthcare</option>
                    <option value="restaurant">Restaurant / Dining Bistro</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingLead}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingLead ? (
                      <span>Processing Setup...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          Confirm {selectedPlan === "free" ? "Free Starter" : "Unlimited Pro (Rs. 5,000/mo)"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
