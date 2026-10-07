"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Volume2,
  CalendarCheck,
  Stethoscope,
  UtensilsCrossed,
  Shield,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Lock,
  Phone,
  Mail,
  Building2,
  X,
  Play,
  Check,
  Zap,
  Globe,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { submitDemoLead, API_BASE } from "@/lib/api";

export default function HomePage() {
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  // Demo Booking Form State
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadBusinessName, setLeadBusinessName] = useState("");
  const [leadBusinessType, setLeadBusinessType] = useState("clinic");
  const [leadNotes, setLeadNotes] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Live Sound wave simulation
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => {
        if (res.ok) {
          setApiOnline(true);
        } else {
          fetch(`${API_BASE}/health`)
            .then((r) => setApiOnline(r.ok))
            .catch(() => setApiOnline(false));
        }
      })
      .catch(() => {
        fetch(`${API_BASE}/health`)
          .then((res) => setApiOnline(res.ok))
          .catch(() => setApiOnline(false));
      });
  }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
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
        notes: leadNotes.trim() || undefined,
      });
      setLeadSubmitted(true);
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setLeadBusinessName("");
      setLeadNotes("");
    } catch (err: any) {
      setLeadError(err.message || "Failed to submit demo request. Please try again.");
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Autonomous Voice & Chat AI Receptionist Platform</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-300 font-mono text-[11px]">
              {apiOnline ? "AI Service Live" : "Connecting..."}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Never Miss a Patient or Guest Again. Meet Your{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              24/7 AI Receptionist
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Empower your medical clinic or restaurant with a bilingual AI receptionist. Speaks Roman Urdu & English, locks calendar slots and dining tables in real-time, and embeds in 1 line of code.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => {
                setLeadSubmitted(false);
                setIsDemoModalOpen(true);
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book a Live Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Portal Login</span>
            </Link>
          </div>

          {/* Trust stats pill bar */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/15">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono block">99.8%</span>
              <span className="text-xs text-slate-400">Appointment Accuracy</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/15">
              <span className="text-2xl font-extrabold text-teal-400 font-mono block">&lt;1.2s</span>
              <span className="text-xs text-slate-400">Voice Synthesis Latency</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/15">
              <span className="text-2xl font-extrabold text-cyan-400 font-mono block">24/7/365</span>
              <span className="text-xs text-slate-400">Continuous Availability</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/15">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono block">0 Conflict</span>
              <span className="text-xs text-slate-400">Atomic Slot Locking</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== INTERACTIVE AGENT DEMO CARD ==================== */}
      <section id="demo" className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/25 glow-emerald relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Interactive AI Voice Preview</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                    Bilingual
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Natural Roman Urdu & English reception flow simulation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isPlayingAudio
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? "animate-bounce" : ""}`} />
                <span>{isPlayingAudio ? "Audio Playing..." : "Simulate Voice Response"}</span>
              </button>

              <a
                href={`${API_BASE}/static/test_widget.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
              >
                <span>Full Test Harness</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Conversation Simulation Bubbles */}
          <div className="pt-6 space-y-4 max-w-3xl mx-auto">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-md p-4 rounded-2xl bg-slate-800/90 text-slate-200 text-xs border border-slate-700/60 shadow-md">
                <span className="font-semibold text-emerald-400 block text-[10px] uppercase mb-1">
                  Patient (Roman Urdu)
                </span>
                <p>&ldquo;Mujhe kal Dr. Sarah Jenkins se appointment chahiye, bukhar aur sar dard hai.&rdquo;</p>
              </div>
            </div>

            {/* AI Response */}
            <div className="flex justify-start">
              <div className="max-w-lg p-4 rounded-2xl bg-emerald-950/40 text-emerald-100 text-xs border border-emerald-500/30 shadow-lg glow-emerald">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-400 text-[10px] uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    AI Receptionist (Voice + Text)
                  </span>
                  <span className="text-[10px] text-teal-300 font-mono">0.9s latency</span>
                </div>
                <p className="leading-relaxed">
                  &ldquo;Ji bilkul! Dr. Sarah Jenkins General Physician hain aur fever & headache treat karti hain. Kal subah 09:00 AM aur 09:30 AM ke slots available hain. Consultation fee $50 hai. Aap ka poora naam aur phone number kya hai?&rdquo;
                </p>

                {/* Animated Soundwave bars */}
                <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="flex items-center gap-1 h-3 flex-1">
                    {[40, 75, 50, 90, 60, 100, 45, 80, 55, 95, 65, 85, 40, 70].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          isPlayingAudio ? "bg-emerald-400 animate-pulse" : "bg-emerald-600/40"
                        }`}
                        style={{ height: `${isPlayingAudio ? h : 30}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">TTS Audio Streaming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SOLUTIONS COMPARISON ==================== */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Tailored Industry Solutions
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Engineered specifically for medical clinics and high-volume dining establishments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Clinic Card */}
          <div className="glass-panel p-8 rounded-3xl border border-emerald-500/20 space-y-6 hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Medical & Healthcare Clinics</h3>
              <p className="text-xs text-slate-400 mt-1">
                Automate patient triage, physician selection, and schedule bookings around the clock.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Physician roster with specialty-based symptom matching and fee lookup.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Single and bulk calendar slot generator with lunch break windows.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Atomic database locks to eliminate double-booking disputes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Interactive appointment details modal with one-click slot release.</span>
              </li>
            </ul>

            <button
              onClick={() => {
                setLeadBusinessType("clinic");
                setIsDemoModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            >
              Schedule Clinic Demo →
            </button>
          </div>

          {/* Restaurant Card */}
          <div className="glass-panel p-8 rounded-3xl border border-amber-500/20 space-y-6 hover:border-amber-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Restaurants, Cafes & Bistros</h3>
              <p className="text-xs text-slate-400 mt-1">
                Capture table bookings, answer menu questions, and accept pre-orders hands-free.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Dynamic party seating and real-time dining table capacity verification.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Interactive menu items catalog with instant in-stock/sold-out toggles.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Guest order capture and special reservation requirements handling.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Zero software install required for dining guests.</span>
              </li>
            </ul>

            <button
              onClick={() => {
                setLeadBusinessType("restaurant");
                setIsDemoModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            >
              Schedule Restaurant Demo →
            </button>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Built for Extreme Speed, Reliability, & Simplicity
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Bilingual Language Mirroring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Responds naturally in Roman Urdu when customers speak Roman Urdu, and English when addressed in English. Maintains warm hospitable Pakistani receptionist tone.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Atomic Concurrency Locks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uses database-level row locking with <code>SELECT ... FOR UPDATE</code> to ensure concurrent requests never book the same doctor slot or table.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">1-Line Embeddable Widget</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standalone, zero-dependency script tag embeds onto any website, Shopify store, or WordPress site with custom tenant token authentication.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Multi-Tenant Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every tenant operates in strict isolation. Clinics cannot access restaurant data, and tenants cannot view or interfere with competitor records.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Barge-In Audio Interruption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Users can interrupt the AI at any time. When the user starts speaking or sends a message, current AI voice playback stops instantly.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Remote Admin Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Super admins can provision new accounts, auto-generate secure passwords, and instantly toggle widgets active or disabled across the platform.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">VoiceReceptionist Platform</span>
              <span>© {new Date().getFullYear()} VoiceReceptionist Inc. All rights reserved.</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-emerald-400 transition-colors">
              Portal Sign In
            </Link>
            <Link href="/admin" className="hover:text-emerald-400 transition-colors">
              Admin Console
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Request Enterprise Demo
            </button>
          </div>
        </div>
      </footer>

      {/* ==================== BOOK A DEMO MODAL ==================== */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative glow-emerald">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Book a Live Platform Demo</h3>
                  <p className="text-xs text-slate-400">See our AI receptionist live on your phone or website</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leadSubmitted ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Demo Request Received!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Thank you! Our solutions specialist will reach out to schedule your personalized live demo session.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Close & Explore Website
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                {leadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                    {leadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Dr. Usman Tariq"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Work Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="usman@careclinic.com"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Business / Practice Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadBusinessName}
                      onChange={(e) => setLeadBusinessName(e.target.value)}
                      placeholder="e.g. City Care Medical"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Industry Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={leadBusinessType}
                    onChange={(e) => setLeadBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="clinic">Medical Clinic / Physician Practice</option>
                    <option value="dental">Dental & Specialized Care</option>
                    <option value="restaurant">Restaurant / Dining Cafe</option>
                    <option value="hospitality">Hospitality & Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    What is your primary goal or question? <span className="text-slate-500 text-[10px]">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    placeholder="e.g. Need WhatsApp or Web widget for booking 5 doctors..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingLead}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingLead ? (
                      <span>Sending Demo Request...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm & Schedule Demo</span>
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
