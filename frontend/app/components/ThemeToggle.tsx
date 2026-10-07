"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check initial state from html element class
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    // Listen for custom theme change events to sync multiple toggle buttons
    const handleThemeChange = (e: CustomEvent<"light" | "dark">) => {
      setTheme(e.detail);
    };

    window.addEventListener("theme-change" as any, handleThemeChange);
    return () => {
      window.removeEventListener("theme-change" as any, handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setTheme(nextTheme);

    // Notify other toggle instances
    window.dispatchEvent(
      new CustomEvent("theme-change", { detail: nextTheme })
    );
  };

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm ${
        theme === "dark"
          ? "bg-slate-900/90 border-slate-700/80 text-amber-400 hover:text-amber-300 hover:bg-slate-800 hover:border-slate-600 shadow-slate-950/40"
          : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100/90 hover:border-slate-300 shadow-slate-200/50"
      } ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 hover:-rotate-12 text-slate-700" />
      )}
    </button>
  );
}
