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
    <header className="sticky top-0 z-50 glass-panel border-b border-[#E8E6DC] dark:border-[#3D3D3A] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#D97757] p-[1px] shadow-lg shadow-[#D97757]/20 group-hover:shadow-[#D97757]/40 transition-all duration-300">
            <div className="w-full h-full bg-[#FAF9F5] dark:bg-[#262624] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#D97757] group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-[#141413] dark:text-[#FAF9F5]">
              VoiceReceptionist
            </span>
            <span className="text-[10px] uppercase tracking-wider block font-semibold text-[#D97757] -mt-1">
              AI Voice &amp; Booking Platform
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/#features"
            className="hidden md:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-[#5E5D59] hover:text-[#141413] dark:text-[#B0AEA5] dark:hover:text-[#FAF9F5] rounded-lg hover:bg-[#E8E6DC]/50 dark:hover:bg-[#3D3D3A]/60 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#solutions"
            className="hidden md:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-[#5E5D59] hover:text-[#141413] dark:text-[#B0AEA5] dark:hover:text-[#FAF9F5] rounded-lg hover:bg-[#E8E6DC]/50 dark:hover:bg-[#3D3D3A]/60 transition-colors"
          >
            Solutions
          </Link>
          <Link
            href="/pricing"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-[#5E5D59] hover:text-[#141413] dark:text-[#B0AEA5] dark:hover:text-[#FAF9F5] rounded-lg hover:bg-[#E8E6DC]/50 dark:hover:bg-[#3D3D3A]/60 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/#demo"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium text-[#D97757] hover:text-[#C6613F] rounded-lg hover:bg-[#D97757]/10 transition-colors"
          >
            Live Demo
          </Link>
          
          <div className="h-4 w-[1px] bg-[#E8E6DC] dark:bg-[#3D3D3A] mx-1 hidden sm:block" />

          {/* Theme Toggle Button */}
          <ThemeToggle />

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#D97757] hover:bg-[#C6613F] rounded-xl shadow-md shadow-[#D97757]/20 transition-all hover:shadow-[#D97757]/40 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Portal Login</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
