"use client";

/**
 * Crash Recovery Page
 *
 * Shown when the HMS embedded server crashes and automatic restart fails.
 * Provides options to retry, reconfigure, view/export logs, or quit.
 * Only functional inside the Electron desktop application.
 */

import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Settings,
  FileText,
  Download,
  Power,
  Loader2,
  Server,
} from "lucide-react";

// Electron API types are declared globally in types/electron.d.ts


// ── Component ───────────────────────────────────────────────────────────

export default function CrashRecoveryPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<
    Array<{ filename: string; timestamp: string; processType: string; message: string }>
  >([]);
  const [showLogs, setShowLogs] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, string> | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  if (!isElectron) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 text-center space-y-4">
          <Server className="w-12 h-12 text-zinc-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-200">No Crash Detected</h1>
          <p className="text-sm text-zinc-400">
            This page is only relevant inside the desktop application.
          </p>
        </div>
      </div>
    );
  }

  const api = window.electronAPI!;

  const handleRetry = () => {
    setStatusMessage("Restarting HMS server...");
    // Simply reload — the Electron main process will restart the server
    window.location.href = "/";
  };

  const handleReconfigure = () => {
    window.location.href = "/setup";
  };

  const handleViewLogs = async () => {
    setLoading(true);
    try {
      const crashLogs = await api.crash.getLogs();
      setLogs(crashLogs);
      setShowLogs(true);

      const diag = await api.system.getDiagnostics();
      setDiagnostics(diag);
    } catch {
      setStatusMessage("Failed to load crash logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = async () => {
    setLoading(true);
    try {
      await api.crash.exportLogs("");
      setStatusMessage("Logs exported successfully.");
    } catch {
      setStatusMessage("Log export cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuit = () => {
    api.app.quit();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-red-900/50 rounded-lg p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-bold text-red-400">HMS Server Crash</h1>
          <p className="text-sm text-zinc-400">
            The embedded server encountered a fatal error and could not recover automatically.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} /> Retry Server
          </button>

          <button
            onClick={handleReconfigure}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <Settings size={14} /> Reconfigure
          </button>

          <button
            onClick={handleViewLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            View Logs
          </button>

          <button
            onClick={handleExportLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <Download size={14} /> Export Logs
          </button>
        </div>

        {/* Quit */}
        <button
          onClick={handleQuit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/40 hover:bg-red-950/60 text-red-400 text-xs font-medium rounded border border-red-900/30 transition cursor-pointer"
        >
          <Power size={14} /> Quit Application
        </button>

        {/* Status */}
        {statusMessage && (
          <p className="text-center text-xs text-zinc-400">{statusMessage}</p>
        )}

        {/* Crash Logs Viewer */}
        {showLogs && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 border-t border-slate-800 pt-3">
              Recent Crash Logs
            </h3>
            {logs.length === 0 ? (
              <p className="text-xs text-zinc-500">No crash logs found.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {logs.slice(0, 10).map((log, i) => (
                  <div
                    key={i}
                    className="bg-slate-950 border border-slate-800 rounded p-2.5 text-[10px] font-mono space-y-1"
                  >
                    <div className="flex justify-between text-zinc-500">
                      <span className="text-red-400 font-bold uppercase">{log.processType}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-zinc-300 break-words">{log.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* System Diagnostics */}
            {diagnostics && (
              <div className="bg-slate-950 border border-slate-800 rounded p-3 text-[10px] font-mono space-y-1">
                <h4 className="text-zinc-500 uppercase font-bold tracking-wider mb-2">System Info</h4>
                {Object.entries(diagnostics).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-zinc-500">{key}:</span>
                    <span className="text-zinc-300">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
