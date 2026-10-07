import type { Metadata } from "next";
import GlobalHeader from "./components/GlobalHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceReceptionist — Autonomous AI Voice & Booking Receptionist",
  description: "Next-generation AI receptionist for medical clinics and restaurants with bilingual voice synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-emerald-600 selection:text-white">
        {/* Ambient emerald & teal background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl" />
        </div>

        {/* Global Navigation Header (only on public / login pages) */}
        <GlobalHeader />

        {/* Main Content Area */}
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
