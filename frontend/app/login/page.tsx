"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { loginBusiness, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

      // Role-based routing: automatically route admin, clinic, or restaurant
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative">
      {/* Radial warm accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D97757]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 text-[#D97757] mb-3 shadow-lg shadow-[#D97757]/10">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portal Authentication
          </h1>
          <p className="text-xs sm:text-sm text-[#5E5D59] dark:text-[#B0AEA5] mt-1">
            Sign in to access your business receptionist dashboard or admin console
          </p>
        </div>

        {/* Login Form Container */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#E8E6DC] dark:border-[#3D3D3A] shadow-2xl relative">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-[#262624] border border-[#E8E6DC] dark:border-[#3D3D3A] rounded-xl text-sm text-[#141413] dark:text-[#FAF9F5] placeholder-[#5E5D59]/60 dark:placeholder-[#B0AEA5]/60 focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-[#262624] border border-[#E8E6DC] dark:border-[#3D3D3A] rounded-xl text-sm text-[#141413] dark:text-[#FAF9F5] placeholder-[#5E5D59]/60 dark:placeholder-[#B0AEA5]/60 focus:outline-none focus:ring-2 focus:ring-[#D97757]/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E5D59] hover:text-[#141413] dark:text-[#B0AEA5] dark:hover:text-[#FAF9F5] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#D97757] hover:bg-[#C6613F] shadow-md shadow-[#D97757]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-[#5E5D59] hover:text-[#D97757] dark:text-[#B0AEA5] dark:hover:text-[#E58A6B] transition-colors inline-flex items-center gap-1"
          >
            <span>← Back to VoiceReceptionist Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
