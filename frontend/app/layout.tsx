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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  // Light theme is the default! Only activate dark if explicitly set to 'dark'
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100 antialiased selection:bg-emerald-600 selection:text-white transition-colors duration-200">
        {/* Ambient emerald & teal background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/10 dark:bg-teal-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-700/10 rounded-full blur-3xl" />
        </div>

        {/* Global Navigation Header (only on public / login pages) */}
        <GlobalHeader />

        {/* Main Content Area */}
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
