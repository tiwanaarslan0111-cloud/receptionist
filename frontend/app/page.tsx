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
  MessageSquare,
  Flame,
  Award,
  Users,
  Star,
  ChevronDown,
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

  // Interactive Simulator State
  const [demoType, setDemoType] = useState<"clinic" | "restaurant">("clinic");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const faqs = [
    {
      q: "How does the bilingual Roman Urdu & English reception work?",
      a: "Our neural language model automatically identifies whether the patient or guest speaks Roman Urdu (e.g., 'Mujhe appointment chahiye') or standard English. It maintains natural conversational flow, clarifying doctor schedules, fee structures, and dining options with zero robotic lag.",
    },
    {
      q: "Can I connect my clinic or restaurant WhatsApp number?",
      a: "Yes! Connecting takes under 60 seconds: simply scan the WhatsApp Web QR code in your dashboard. Incoming messages are immediately answered by the AI receptionist, while confirmed bookings sync straight to your calendar.",
    },
    {
      q: "How does the system prevent double-booking conflicts?",
      a: "Our backend utilizes atomic database row locking (SELECT ... FOR UPDATE). When a slot or dining table is being reserved, it is locked in a microsecond transaction, eliminating double-booking disputes 100%.",
    },
    {
      q: "What are the limits on the Free Plan?",
      a: "The Free plan includes 1,000 confirmed appointments or kitchen orders per month. Once you grow beyond 1,000 bookings, you can seamlessly upgrade to the Unlimited Pro plan for Rs. 5,000/month.",
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ==================== 1. HERO SECTION ==================== */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Autonomous Voice &amp; Chat AI Receptionist Platform</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold">
              {apiOnline ? "AI Engine Online" : "Connecting..."}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Never Miss a Patient or Guest Again. Meet Your{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
              24/7 AI Receptionist
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Empower your medical clinic or restaurant with an autonomous bilingual receptionist. Speaks Roman Urdu &amp; English, locks appointments and dining tables in real-time, and embeds in 60 seconds.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              type="button"
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
              href="/pricing"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:text-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:border-slate-700/80 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Pricing (Free Plan)</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Portal Login &rarr;</span>
            </Link>
          </div>

          {/* Trust stats pill bar */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono block">99.8%</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Appointment Accuracy</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-teal-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-400 font-mono block">&lt;1.2s</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Voice Synthesis Latency</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-400 font-mono block">24/7/365</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Continuous Availability</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 shadow-sm">
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono block">0 Conflict</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Atomic Slot Locking</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 2. TRUSTED LOGOS / BADGES BAR ==================== */}
      <section className="py-8 border-y border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
            Trusted by medical practices, diagnostic centers, &amp; dining establishments
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 dark:opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <span>Al-Razi Healthcare</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>CarePlus Medical</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <UtensilsCrossed className="w-5 h-5 text-amber-600" />
              <span>Artisan Bistro</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Flame className="w-5 h-5 text-rose-600" />
              <span>Downtown Grill</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Award className="w-5 h-5 text-cyan-600" />
              <span>Apex Dental Suite</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 3. INTERACTIVE AGENT DEMO SIMULATOR ==================== */}
      <section id="demo" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-panel p-6 sm:p-9 rounded-3xl border border-emerald-500/25 glow-emerald relative shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Interactive AI Voice &amp; Chat Preview</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Bilingual
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Natural Roman Urdu &amp; English dialogue processing with real-time slot checking
                </p>
              </div>
            </div>

            {/* Toggle Demo Type */}
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setDemoType("clinic")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    demoType === "clinic"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Medical Clinic
                </button>
                <button
                  type="button"
                  onClick={() => setDemoType("restaurant")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    demoType === "restaurant"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Restaurant Dining
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isPlayingAudio
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
                title="Toggle Voice Wave Simulation"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </div>

          {/* Conversation Simulation */}
          {demoType === "clinic" ? (
            <div className="pt-6 space-y-4 max-w-3xl mx-auto animate-in fade-in">
              {/* Patient Message */}
              <div className="flex justify-end">
                <div className="max-w-md p-4 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800/90 dark:text-slate-200 text-xs dark:border-slate-700/60 shadow-sm">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase mb-1">
                    Patient (Roman Urdu)
                  </span>
                  <p>&ldquo;Mujhe kal Dr. Sarah Jenkins se appointment chahiye, bukhar aur sar dard hai.&rdquo;</p>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex justify-start">
                <div className="max-w-lg p-4 rounded-2xl bg-emerald-50 text-emerald-950 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 text-xs dark:border-emerald-500/30 shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      AI Clinic Receptionist (Voice + Text)
                    </span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-mono font-bold">
                      0.8s response
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    &ldquo;Ji bilkul! Dr. Sarah Jenkins General Physician hain aur fever &amp; headache treat karti hain. Kal subah 09:00 AM aur 09:30 AM ke slots available hain. Consultation fee Rs. 2,000 hai. Aap ka poora naam aur phone number kya hai?&rdquo;
                  </p>

                  {/* Audio Waveform */}
                  <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex items-center gap-1 h-3 flex-1">
                      {[40, 75, 50, 90, 60, 100, 45, 80, 55, 95, 65, 85, 40, 70].map((h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all ${
                            isPlayingAudio ? "bg-emerald-500 animate-pulse" : "bg-emerald-600/30"
                          }`}
                          style={{ height: `${isPlayingAudio ? h : 30}%` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      Bilingual Speech Engine
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-6 space-y-4 max-w-3xl mx-auto animate-in fade-in">
              {/* Guest Message */}
              <div className="flex justify-end">
                <div className="max-w-md p-4 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800/90 dark:text-slate-200 text-xs dark:border-slate-700/60 shadow-sm">
                  <span className="font-semibold text-amber-700 dark:text-amber-400 block text-[10px] uppercase mb-1">
                    Guest (Roman Urdu &amp; English)
                  </span>
                  <p>&ldquo;Kal raat 8 baje 4 logon ke liye table book ho sakti hai? Aur BBQ Platter available hai?&rdquo;</p>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex justify-start">
                <div className="max-w-lg p-4 rounded-2xl bg-amber-50 text-amber-950 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 text-xs dark:border-amber-500/30 shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-amber-700 dark:text-amber-400 text-[10px] uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      AI Dining Receptionist (Voice + Text)
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-bold">
                      0.9s response
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    &ldquo;Khush Amdeed! Kal raat 8:00 PM par 4 guests ke liye Indoor Table 4 available hai. Aur hamara Special BBQ Platter bilkul fresh in-stock hai! Kya main aap ki table reserve kar loon?&rdquo;
                  </p>

                  {/* Audio Waveform */}
                  <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="flex items-center gap-1 h-3 flex-1">
                      {[50, 85, 45, 95, 70, 90, 60, 75, 65, 80, 50, 70, 60, 85].map((h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all ${
                            isPlayingAudio ? "bg-amber-500 animate-pulse" : "bg-amber-600/30"
                          }`}
                          style={{ height: `${isPlayingAudio ? h : 30}%` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold">
                      Live Table Availability
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================== 4. HOW IT WORKS (3 SIMPLE STEPS) ==================== */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Simple 3-Step Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Operational in Under 60 Seconds
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Zero complex software setups or telecom approvals needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Connect WhatsApp or Web
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Scan your WhatsApp Web QR code or paste our 1-line script tag onto your clinic website or restaurant landing page.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configure Roster &amp; Hours
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Add your doctors, consultation fees, and working hours — or your dining tables and menu items with in-stock toggles.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI Handles Bookings 24/7
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Calls and chats are answered instantly in Roman Urdu &amp; English. Confirmed bookings appear immediately in your live portal.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== 5. SOLUTIONS COMPARISON ==================== */}
      <section id="solutions" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Tailored Industry Solutions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Built Specifically for Clinics &amp; Restaurants
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Pre-trained industry intelligence designed for real-world operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Clinic Card */}
          <div className="glass-panel p-8 rounded-3xl border border-emerald-500/25 space-y-6 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Medical &amp; Healthcare Clinics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Automate patient triage, physician selection, and consultation schedules around the clock.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Physician roster with specialty-based symptom matching and fee lookup.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Bulk calendar slot generator with customizable lunch break windows.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Atomic database locks eliminating double-booking disputes 100%.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click patient cancellation and slot release workflow.</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => {
                setLeadBusinessType("clinic");
                setIsDemoModalOpen(true);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            >
              Schedule Clinic Demo &rarr;
            </button>
          </div>

          {/* Restaurant Card */}
          <div className="glass-panel p-8 rounded-3xl border border-amber-500/25 space-y-6 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Restaurants, Bistros &amp; Cafes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Capture dining reservations, answer menu questions, and accept advance orders hands-free.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Dynamic party seating and real-time dining table capacity verification.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Interactive food catalog with instant in-stock/sold-out kitchen toggles.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Guest dietary requirement handling and special celebration requests.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Kitchen dispatch notifications sent directly to staff.</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => {
                setLeadBusinessType("restaurant");
                setIsDemoModalOpen(true);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            >
              Schedule Restaurant Demo &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 6. PRICING SECTION (2 CARDS EMBEDDED) ==================== */}
      <section id="pricing" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Simple &amp; Predictable Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Choose the Perfect Plan for Your Business
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Start completely free or unlock unlimited volume. Zero setup fees or surprise charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Card 1: Free Plan */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Free Starter</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For individual doctors &amp; boutique cafes
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Free Forever
                </span>
              </div>

              <div className="my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                    Rs. 0
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1,000 Bookings / Orders Included</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1,000 confirmed orders/bookings</strong> per month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Bilingual Roman Urdu &amp; English AI voice synthesis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>WhatsApp QR gateway integration &amp; Web widget</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Atomic database slot locking with zero conflicts</span>
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
            >
              <span>Get Started Free (1,000 Bookings)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Pro Unlimited Plan */}
          <div className="glass-panel p-8 rounded-3xl border-2 border-emerald-500/60 dark:border-emerald-500/80 flex flex-col justify-between shadow-xl relative glow-emerald">
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30">
              Recommended
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Professional Pro</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For multi-physician clinics &amp; busy restaurants
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

              <div className="my-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                    Rs. 5,000
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600/15 to-teal-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Unlimited Orders &amp; Bookings</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Unlimited bookings &amp; orders</strong> (no volume caps)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Sub-1.2s voice synthesis with audio interruption (barge-in)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Bulk slot generator, break windows &amp; kitchen notifications</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>24/7 Priority support &amp; dedicated onboarding specialist</span>
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to Pro (Rs. 5,000 / mo)</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== 7. TESTIMONIALS ==================== */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Client Success Stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Loved by Medical Practices &amp; Dining Hotspots
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              &ldquo;Patients love how naturally the AI speaks Roman Urdu. It triage symptoms, books appointments with Dr. Sarah Jenkins, and has eliminated our front-desk phone congestion completely.&rdquo;
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">Dr. Tariq Mahmood</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Director, Lahore Medical Complex</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              &ldquo;On Friday and Saturday nights, we used to miss dozens of WhatsApp reservation inquiries. Now the AI receptionist books tables, confirms party size, and notifies our kitchen in real-time.&rdquo;
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">Hamza Siddiqui</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">General Manager, Artisan Bistro</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              &ldquo;Setting up the WhatsApp QR code took literally 30 seconds. The database locking is rock-solid — not a single double booking across our 4 dental consultation rooms.&rdquo;
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">Dr. Ayesha Malik</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Head of Dental Surgery, Apex Clinic</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 8. FAQ ACCORDION ==================== */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
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
      </section>

      {/* ==================== 9. BOTTOM CONVERSION BANNER ==================== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Upgrade to 24/7 Autonomous Reception?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-lg mx-auto">
              Empower your staff, delight patients and dining guests, and never miss a revenue opportunity again.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setLeadSubmitted(false);
                  setIsDemoModalOpen(true);
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-all shadow-lg cursor-pointer"
              >
                Schedule Live Demo
              </button>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-700/60 hover:bg-emerald-700/80 text-white font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Plans &amp; Pricing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 10. FOOTER ==================== */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">VoiceReceptionist Platform</span>
              <span>© {new Date().getFullYear()} VoiceReceptionist Inc. All rights reserved.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              Portal Sign In
            </Link>
            <Link href="/admin" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              Admin Console
            </Link>
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Request Enterprise Demo
            </button>
          </div>
        </div>
      </footer>

      {/* ==================== DEMO / CONTACT MODAL ==================== */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative glow-emerald">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Book a Live Platform Demo</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">See our AI receptionist live on your phone or website</p>
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
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Demo Request Received!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Thank you! Our solutions specialist will reach out to schedule your personalized live demo session.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Close &amp; Explore Website
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
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
                      placeholder="e.g. Dr. Usman Tariq"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Work Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="usman@careclinic.com"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business / Practice Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadBusinessName}
                      onChange={(e) => setLeadBusinessName(e.target.value)}
                      placeholder="e.g. City Care Medical"
                      required
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                    <option value="clinic">Medical Clinic / Physician Practice</option>
                    <option value="dental">Dental &amp; Specialized Care</option>
                    <option value="restaurant">Restaurant / Dining Cafe</option>
                    <option value="hospitality">Hospitality &amp; Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    What is your primary goal or question? <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    placeholder="e.g. Need WhatsApp or Web widget for booking 5 doctors..."
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                        <span>Confirm &amp; Schedule Demo</span>
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
