"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LogIn, Stethoscope, UtensilsCrossed, Shield } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function GlobalHeader() {
  const pathname = usePathname();

  // Hide the global top navigation bar on dedicated dashboard pages
  const isDashboard =
    pathname.startsWith("/clinic") ||
    pathname.startsWith("/restaurant") ||
    pathname.startsWith("/admin");

  if (isDashboard) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-emerald-500/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300">
            <div className="w-full h-full bg-white dark:bg-[#070b14] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-600 dark:from-white dark:via-slate-100 dark:to-emerald-200 bg-clip-text text-transparent">
              VoiceReceptionist
            </span>
            <span className="text-[10px] uppercase tracking-wider block font-semibold text-emerald-600 dark:text-emerald-400 -mt-1">
              AI Voice & Booking Platform
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/#features"
            className="hidden md:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#solutions"
            className="hidden md:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            Solutions
          </Link>
          <Link
            href="/#demo"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition-colors"
          >
            Live Demo
          </Link>
          
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Theme Toggle Button */}
          <ThemeToggle />

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:shadow-emerald-600/40 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Portal Login</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
