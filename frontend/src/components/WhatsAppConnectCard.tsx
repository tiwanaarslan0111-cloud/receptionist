"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Unlink,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Radio,
  ArrowRight,
  RotateCcw,
  HelpCircle,
  Info,
} from "lucide-react";
import {
  getWhatsAppStatus,
  getWhatsAppQR,
  disconnectWhatsApp,
  resetWhatsApp,
  WhatsAppStatusResponse,
} from "@/lib/api";

export default function WhatsAppConnectCard() {
  const [status, setStatus] = useState<string>("UNKNOWN");
  const [sessionName, setSessionName] = useState<string>("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingQR, setLoadingQR] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Fetch current connection status
  const checkStatus = useCallback(async (): Promise<string> => {
    try {
      const res: WhatsAppStatusResponse = await getWhatsAppStatus();
      if (!isMountedRef.current) return res.status;

      setStatus(res.status);
      setSessionName(res.session);
      setLastUpdated(new Date());

      if (res.connected || res.status === "WORKING") {
        setQrCode(null);
        setError(null);
      }
      return res.status;
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn("[WAHA Status Check]", err?.message || err);
      }
      return "UNKNOWN";
    }
  }, []);

  // Fetch fresh QR code
  const fetchQR = useCallback(async () => {
    try {
      setLoadingQR(true);
      setError(null);
      const res = await getWhatsAppQR();
      if (!isMountedRef.current) return;

      setStatus(res.status);
      if (res.connected || res.status === "WORKING") {
        setQrCode(null);
      } else {
        setQrCode(res.qr);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(
          err?.message ||
            "Unable to reach WhatsApp gateway. Ensure WAHA service is running."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingQR(false);
      }
    }
  }, []);

  // Force clean session reset and get a brand-new QR code
  const handleResetPairing = async () => {
    try {
      setResetting(true);
      setError(null);
      await resetWhatsApp();
      await fetchQR();
    } catch (err: any) {
      setError(err?.message || "Failed to reset WhatsApp pairing session.");
    } finally {
      setResetting(false);
    }
  };

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setLoadingInitial(true);
      const currentStatus = await checkStatus();
      if (currentStatus !== "WORKING") {
        await fetchQR();
      }
      setLoadingInitial(false);
    };

    init();

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [checkStatus, fetchQR]);

  // Polling effect: polls every 3 seconds while NOT WORKING
  useEffect(() => {
    if (status === "WORKING") {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Set up 3s polling
    pollTimerRef.current = setInterval(async () => {
      const updatedStatus = await checkStatus();
      if (updatedStatus === "WORKING") {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [status, checkStatus]);

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect this WhatsApp number? AI automated replies will pause until a device is linked again."
      )
    ) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);
      await disconnectWhatsApp();
      setStatus("STOPPED");
      setQrCode(null);
      await fetchQR();
    } catch (err: any) {
      setError(err?.message || "Failed to disconnect WhatsApp session.");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = status === "WORKING";

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-xl space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">WhatsApp Automation Setup</h2>
            <p className="text-xs text-slate-400">
              Link your business WhatsApp via QR code for automated 24/7 AI reception & appointments.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {loadingInitial ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking...</span>
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>WhatsApp Connected &amp; AI Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Ready for QR Scan</span>
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchQR}
            className="text-rose-400 hover:text-white underline text-xs font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main State Views */}
      {loadingInitial ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs">Initializing WhatsApp Gateway...</p>
        </div>
      ) : isConnected ? (
        /* ==================== STATE 1: CONNECTED ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-950 border border-emerald-500/30 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  WhatsApp Automation is Live
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Incoming patient messages sent to your linked WhatsApp number are now automatically processed by your clinic's AI Receptionist with real-time doctor availability checking, slot booking, and FAQ handling.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Gateway Session:</span>
                <span className="font-mono text-emerald-400 font-bold">{sessionName || "Active"}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">AI Receptionist:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enabled &amp; Ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              Need to switch phone numbers or reconnect? Disconnect below and scan the QR code with your new device.
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Disconnecting...</span>
                </>
              ) : (
                <>
                  <Unlink className="w-3.5 h-3.5 text-rose-400" />
                  <span>Disconnect / Change Device</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ==================== STATE 2: NOT CONNECTED / SCANNING ==================== */
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Instructions Column (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">How to connect your device:</h3>
                <p className="text-xs text-slate-400">
                  Follow these 3 simple steps to pair your WhatsApp Web session in seconds:
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">Open WhatsApp on your business phone</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Launch the WhatsApp or WhatsApp Business application on your primary mobile phone.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">
                      Tap Settings / 3-dots &rarr; Linked Devices &rarr; Link a Device
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      On Android: Tap the 3-dots in top right. On iOS: Tap Settings tab in bottom right.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">Point your camera at the QR code</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Align your phone's camera viewfinder with the QR code box on the right.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status indicator line */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>
                  Status: <span className="font-mono text-slate-400">{status}</span> &bull; Auto-detecting link every 3 seconds
                </span>
              </div>

              {/* Troubleshooting Tips Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs space-y-2 mt-4">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Troubleshooting "Couldn't link device" issues:</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside pl-1">
                  <li>Ensure WhatsApp on your phone is updated to the latest version.</li>
                  <li>Disconnect any active VPN or proxy on your mobile phone.</li>
                  <li>If you have 4 linked devices already, log one out first.</li>
                  <li>If WhatsApp displays an error, click <strong>"Regenerate QR / Reset Pairing"</strong> below to refresh encryption keys.</li>
                </ul>
              </div>
            </div>

            {/* QR Display Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative p-4 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500/20 flex flex-col items-center justify-center w-64 h-64">
                {loadingQR || resetting ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">
                      {resetting ? "Resetting Handshake..." : "Generating Fresh QR..."}
                    </span>
                  </div>
                ) : qrCode ? (
                  <img
                    src={qrCode}
                    alt="WhatsApp Web QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-center p-4">
                    <QrCode className="w-10 h-10 text-slate-400" />
                    <span className="text-xs font-medium">
                      No active QR available. Click regenerate below to create one.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Refresh & Prominent Reset */}
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handleResetPairing}
                  disabled={resetting || loadingQR}
                  title="Clears corrupted state and generates a fresh pairing handshake"
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                  <span>Regenerate QR / Reset Pairing</span>
                </button>

                <button
                  type="button"
                  onClick={fetchQR}
                  disabled={loadingQR || resetting}
                  title="Reload QR code image without clearing session"
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700/80 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingQR ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Reload</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-500 mt-2 text-center">
                QR codes expire automatically every 20-30 seconds
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
