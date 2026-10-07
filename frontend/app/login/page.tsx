"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Stethoscope,
  UtensilsCrossed,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { loginBusiness, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<"business" | "admin">("business");
  const [username, setUsername] = useState<string>("phase2clinic");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (role: "business" | "admin") => {
    setActiveRole(role);
    setError(null);
    if (role === "admin") {
      setUsername("admin");
      setPassword("");
    } else {
      setUsername("phase2clinic");
      setPassword("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginBusiness(username.trim(), password);
      // Save credentials and tenant/admin context
      setAuth(res.access_token, {
        id: res.business_id,
        name: res.business_name,
        business_type: res.business_type,
        username: username.trim(),
        admin_secret: res.admin_secret,
      });

      // Role-based routing
      if (res.business_type === "admin") {
        router.push("/admin");
      } else if (res.business_type === "clinic") {
        router.push("/clinic");
      } else if (res.business_type === "restaurant") {
        router.push("/restaurant");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(
        err.message || "Invalid credentials. Please verify your username and password."
      );
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (user: string, pass: string, role: "business" | "admin") => {
    setActiveRole(role);
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Portal Authentication
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sign in to access your AI receptionist management dashboard
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleChange("business")}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "business"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Clinic & Restaurant</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange("admin")}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeRole === "admin"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>
        </div>

        {/* Login Form Container */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-emerald-500/20 shadow-2xl relative glow-emerald">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {activeRole === "admin" ? "Admin Username" : "Business Account Username"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeRole === "admin" ? "admin" : "e.g. phase2clinic"}
                  required
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {activeRole === "admin" ? "Admin Master Password" : "Account Password"}
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    activeRole === "admin"
                      ? "Enter admin password (e.g. admin or admin123)"
                      : "Enter your secure password"
                  }
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to {activeRole === "admin" ? "Admin Console" : "Dashboard"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Test Demo Helpers */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick Test Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickFill("phase2clinic", "clinicpassword123", "business")}
                className="px-2.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phase 2 Clinic</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("admin", "admin", "admin")}
                className="px-2.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-teal-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>Super Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
          >
            <span>← Back to VoiceReceptionist Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
