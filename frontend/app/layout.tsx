import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import GlobalHeader from "./components/GlobalHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: false,
});

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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${newsreader.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-[#D97757] selection:text-white transition-colors duration-200">
        {/* Ambient warm clay & subtle background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#D97757]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#D97757]/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#D97757]/8 rounded-full blur-3xl" />
        </div>

        {/* Global Navigation Header (only on public / login pages) */}
        <GlobalHeader />

        {/* Main Content Area */}
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
