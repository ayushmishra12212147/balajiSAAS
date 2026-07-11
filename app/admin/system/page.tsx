"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  HardDrive,
  Database,
  ShieldAlert,
  LogOut,
  KeyRound,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Search,
  Sliders,
  Terminal,
  Activity,
  History,
  Lock,
  Loader2,
} from "lucide-react";

interface BackupMetadata {
  filename: string;
  size: number;
  type: "FULL" | "INCREMENTAL";
  timestamp: string;
  checksum: string;
  status: string;
  version: string;
}

interface RestoreLog {
  backupFile: string;
  backupVersion: string;
  restoredBy: string;
  restoreStarted: string;
  restoreCompleted: string;
  restoreStatus: "SUCCESS" | "FAILED";
}

interface SessionRow {
  id: string;
  userId: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    employeeCode: string;
    email: string;
    role: string;
    designation: string;
  };
}

interface LicenseStatus {
  isValid: boolean;
  daysRemaining: number;
  registeredHospital: string;
  registeredOwner: string;
  expiryDate: string | null;
  version: string;
  isExpired: boolean;
  blockOnExpiry: boolean;
}

interface AuditRow {
  id: string;
  timestamp: string;
  userId: string | null;
  clientIp: string | null;
  action: string;
  resource: string | null;
  entityId: string | null;
  description: string;
  user: {
    email: string;
    employeeCode: string;
  } | null;
}

interface SystemTelemetry {
  databaseHealth: {
    connection: string;
    version: string;
    size: string;
    lastBackup: string | null;
  };
  applicationHealth: {
    activeSessions: number;
    backgroundJobs: {
      running: number;
      queued: number;
    };
    queueStatus: string;
    systemVersion: string;
  };
  storage: {
    database: string;
    logs: string;
    backups: string;
    uploads: string;
    templatesCount: number;
  };
}

import { useCallback } from "react";

interface RestorePreview {
  isValid: boolean;
  metadata: {
    filename: string;
    checksum: string;
    type: "FULL" | "INCREMENTAL";
    timestamp: string;
    version: string;
  };
  restoreHistory: RestoreLog[];
}

export default function SystemAdministration() {
  const [activeTab, setActiveTab] = useState<"telemetry" | "backups" | "audits" | "sessions" | "license" | "maintenance">("telemetry");
  const [loading, setLoading] = useState(true);

  // States
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [restoreHistory, setRestoreHistory] = useState<RestoreLog[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string; blockOnExpiry: boolean } | null>(null);
  
  // Audits states
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [auditFilterResource, setAuditFilterResource] = useState("");

  // Modals & triggers
  const [actionLoading, setActionLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
  const [restorePreviewData, setRestorePreviewData] = useState<RestorePreview | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseDataInput, setLicenseDataInput] = useState("");
  const [maintenanceMsgInput, setMaintenanceMsgInput] = useState("");

  // Load telemetry & configs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telemetryRes, licenseRes, maintenanceRes] = await Promise.all([
        apiClient<SystemTelemetry>("/api/admin/system/dashboard"),
        apiClient<LicenseStatus>("/api/admin/license"),
        apiClient<{ active: boolean; message: string; blockOnExpiry: boolean }>("/api/admin/maintenance"),
      ]);
      setTelemetry(telemetryRes);
      setLicense(licenseRes);
      setMaintenance(maintenanceRes);
      setMaintenanceMsgInput(maintenanceRes.message);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load system metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load backups list
  const loadBackups = useCallback(async () => {
    try {
      const list = await apiClient<BackupMetadata[]>("/api/admin/backups");
      setBackups(list);
      const history = await apiClient<RestoreLog[]>("/api/admin/backups/restore");
      setRestoreHistory(history);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load backups.");
    }
  }, []);

  // Load active sessions
  const loadSessions = useCallback(async () => {
    try {
      const list = await apiClient<SessionRow[]>("/api/admin/sessions");
      setSessions(list);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load active sessions.");
    }
  }, []);

  // Load audit logs
  const loadAudits = useCallback(async () => {
    try {
      const url = `/api/admin/audits?page=${auditPage}&limit=15` +
        (auditSearch ? `&search=${encodeURIComponent(auditSearch)}` : "") +
        (auditFilterAction ? `&action=${encodeURIComponent(auditFilterAction)}` : "") +
        (auditFilterResource ? `&resource=${encodeURIComponent(auditFilterResource)}` : "");
      
      const res = await apiClient<{ data: AuditRow[]; pagination: { total: number } }>(url);
      setAudits(res.data);
      setAuditTotal(res.pagination.total);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load audit logs.");
    }
  }, [auditPage, auditSearch, auditFilterAction, auditFilterResource]);

  // Load state when tab changes
  useEffect(() => {
    if (activeTab === "backups") {
      loadBackups();
    } else if (activeTab === "sessions") {
      loadSessions();
    } else if (activeTab === "audits") {
      loadAudits();
    }
  }, [activeTab, auditPage, loadBackups, loadSessions, loadAudits]);

  // Trigger new backup
  const handleCreateBackup = async (type: "FULL" | "INCREMENTAL") => {
    setActionLoading(true);
    try {
      const backup = await apiClient<BackupMetadata>("/api/admin/backups", {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      toast.success(`${type} Backup generated: ${backup.filename}`);
      if (activeTab === "backups") loadBackups();
      else loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create backup.");
    } finally {
      setActionLoading(false);
    }
  };

  // Verify backup checksum
  const handleVerifyChecksum = async (filename: string) => {
    try {
      const res = await apiClient<{ isValid: boolean; metadata: { checksum: string } }>("/api/admin/backups/restore", {
        method: "POST",
        body: JSON.stringify({ filename, action: "PREVIEW" }),
      });
      if (res.isValid) {
        toast.success(`Backup checksum verified successfully: ${res.metadata.checksum.substring(0, 16)}...`);
      } else {
        toast.error("Checksum validation failed: File signature does not match or is corrupted.");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Checksum verification failed.");
    }
  };

  // Initialize restore process
  const triggerRestorePreview = async (filename: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient<RestorePreview>("/api/admin/backups/restore", {
        method: "POST",
        body: JSON.stringify({ filename, action: "PREVIEW" }),
      });
      setRestorePreviewData(res);
      setShowRestoreConfirm(filename);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to parse restore preview.");
    } finally {
      setActionLoading(false);
    }
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    if (!showRestoreConfirm) return;
    setActionLoading(true);
    try {
      await apiClient("/api/admin/backups/restore", {
        method: "POST",
        body: JSON.stringify({
          filename: showRestoreConfirm,
          action: "RESTORE",
          confirmed: true,
        }),
      });
      toast.success("Restore complete! Schema and objects reloaded.");
      setShowRestoreConfirm(null);
      setRestorePreviewData(null);
      loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || "System restore execution failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Terminate session
  const handleTerminateSession = async (id: string) => {
    try {
      await apiClient(`/api/admin/sessions?id=${id}`, {
        method: "DELETE",
      });
      toast.success("Session invalidated.");
      loadSessions();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Cannot terminate session.");
    }
  };

  // Terminate all other sessions
  const handleTerminateAllOtherSessions = async () => {
    try {
      await apiClient(`/api/admin/sessions?all=true`, {
        method: "DELETE",
      });
      toast.success("All other sessions cleared.");
      loadSessions();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to clear other sessions.");
    }
  };

  // Register license key
  const handleRegisterLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim() || !licenseDataInput.trim()) {
      toast.error("Both activation key and JSON details are required.");
      return;
    }
    setActionLoading(true);
    try {
      const parsedData = JSON.parse(licenseDataInput);
      const res = await apiClient<{ message?: string }>("/api/admin/license", {
        method: "POST",
        body: JSON.stringify({
          licenseKey: licenseKeyInput.trim(),
          licenseData: parsedData,
        }),
      });
      toast.success(res.message || "License activated.");
      setLicenseKeyInput("");
      setLicenseDataInput("");
      loadData();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Invalid JSON details format or validation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Update maintenance toggle
  const handleToggleMaintenance = async (active: boolean) => {
    try {
      const res = await apiClient<{ active: boolean; messageText: string }>("/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ active, message: maintenanceMsgInput }),
      });
      setMaintenance(prev => prev ? { ...prev, active: res.active, message: res.messageText } : null);
      toast.success(active ? "Maintenance mode activated." : "Maintenance mode disabled. System online.");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to toggle maintenance mode.");
    }
  };

  // Update block on expiry
  const handleToggleBlockOnExpiry = async (blockOnExpiry: boolean) => {
    try {
      await apiClient<unknown>("/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ blockOnExpiry }),
      });
      setMaintenance(prev => prev ? { ...prev, blockOnExpiry } : null);
      toast.success(`License expiry lock set to: ${blockOnExpiry}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to toggle lock preference.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
        <span className="text-xs font-mono">Querying System Telemetry & Logs...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sliders className="text-emerald-500" /> System Administration Workspace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure global interlocks, manage pg_dump backup recovery archives, review immutable logs, and view server telemetry.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <RefreshCcw size={14} className={actionLoading ? "animate-spin" : ""} /> Refresh Status
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        {(["telemetry", "backups", "audits", "sessions", "license", "maintenance"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setAuditPage(1);
            }}
            className={`px-4 py-2 text-xs font-mono border-b-2 capitalize whitespace-nowrap transition cursor-pointer ${
              activeTab === tab
                ? "border-emerald-500 text-emerald-400 bg-slate-900/30"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab === "telemetry" && "Infrastructure Telemetry"}
            {tab === "backups" && "Backups & Restore"}
            {tab === "audits" && "Security Audits"}
            {tab === "sessions" && "Active Sessions"}
            {tab === "license" && "License Registration"}
            {tab === "maintenance" && "Maintenance Interlock"}
          </button>
        ))}
      </div>

      {/* Main Tab Workspace Layouts */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-lg p-6 space-y-6">
        
        {/* Tab 1: Telemetry Dashboard */}
        {activeTab === "telemetry" && telemetry && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Health Card */}
            <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Database className="text-blue-400" size={16} /> Database Health (Infrastructure)
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block">Connection status</span>
                  <span className={`font-semibold ${telemetry.databaseHealth.connection === "CONNECTED" ? "text-emerald-400" : "text-red-400"}`}>
                    {telemetry.databaseHealth.connection}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Database Size</span>
                  <span className="text-slate-300 font-semibold">{telemetry.databaseHealth.size}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500 block">PostgreSQL Engine Version</span>
                  <span className="text-slate-300 select-all block truncate text-[10px] bg-slate-900 p-1.5 rounded mt-1 border border-slate-800/80">
                    {telemetry.databaseHealth.version}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500 block">Last Backup Completed</span>
                  <span className="text-slate-300 font-semibold">
                    {telemetry.databaseHealth.lastBackup ? new Date(telemetry.databaseHealth.lastBackup).toLocaleString() : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Application Health Card */}
            <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Activity className="text-emerald-400" size={16} /> Application Health (State Registry)
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block">Active Device Sessions</span>
                  <span className="text-slate-300 font-semibold">{telemetry.applicationHealth.activeSessions} online</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">System Version</span>
                  <span className="text-slate-300 font-semibold">v{telemetry.applicationHealth.systemVersion}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Background Queue Status</span>
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {telemetry.applicationHealth.queueStatus}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Background Jobs</span>
                  <span className="text-slate-300 font-semibold">
                    {telemetry.applicationHealth.backgroundJobs.running} running / {telemetry.applicationHealth.backgroundJobs.queued} queued
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Allocations */}
            <div className="col-span-1 md:col-span-2 border border-slate-800 rounded-lg bg-slate-950/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <HardDrive className="text-yellow-400" size={16} /> Local File System Storage Sizing (Electron Local Device)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                  <span className="text-zinc-500 block">Backup Archives</span>
                  <span className="text-slate-200 font-bold text-sm block mt-1">{telemetry.storage.backups}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                  <span className="text-zinc-500 block">Diagnostic & System Logs</span>
                  <span className="text-slate-200 font-bold text-sm block mt-1">{telemetry.storage.logs}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                  <span className="text-zinc-500 block">Uploaded Files Size</span>
                  <span className="text-slate-200 font-bold text-sm block mt-1">{telemetry.storage.uploads}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                  <span className="text-zinc-500 block">Print Templates Count</span>
                  <span className="text-slate-200 font-bold text-sm block mt-1">{telemetry.storage.templatesCount} Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Backups & Restore */}
        {activeTab === "backups" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-mono text-zinc-300 flex items-center gap-1">
                <Terminal size={14} className="text-emerald-500" /> Database & Settings Backup Console
              </h3>
              <div className="flex gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleCreateBackup("FULL")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-xs font-mono font-medium text-white transition cursor-pointer"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Trigger Full Backup (pg_dump)
                </button>
              </div>
            </div>

            {/* Backups List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400">Available Backup Archives on Local Disk</h4>
              <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-950/20">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-zinc-400">
                    <tr>
                      <th className="p-3">File Name</th>
                      <th className="p-3">Creation Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">File Size</th>
                      <th className="p-3">SHA-256 Checksum Signature</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-zinc-500">
                          No backup archives detected on local storage. Click above to trigger a new full pg_dump backup.
                        </td>
                      </tr>
                    ) : (
                      backups.map((b) => (
                        <tr key={b.filename} className="hover:bg-slate-900/30">
                          <td className="p-3 font-semibold text-slate-200 select-all">{b.filename}</td>
                          <td className="p-3 text-zinc-400">{new Date(b.timestamp).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.type === "FULL" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                            }`}>
                              {b.type}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-400">{(b.size / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="p-3 text-[10px] text-zinc-500 font-mono select-all truncate max-w-[150px]" title={b.checksum}>
                            {b.checksum.substring(0, 16)}...
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              onClick={() => handleVerifyChecksum(b.filename)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold transition cursor-pointer"
                            >
                              Verify Checksum
                            </button>
                            <button
                              onClick={() => triggerRestorePreview(b.filename)}
                              className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900/80 text-[10px] font-semibold text-red-400 border border-red-900/30 transition cursor-pointer"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Restore Logs */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <History size={14} className="text-blue-400" /> Permanent Restore Operations History Log
              </h4>
              <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-950/20">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-zinc-400">
                    <tr>
                      <th className="p-3">Restore Triggered Time</th>
                      <th className="p-3">Restored Backup File</th>
                      <th className="p-3">Operator ID</th>
                      <th className="p-3">Completed Time</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {restoreHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-500">
                          No restore operations have been performed on this installation.
                        </td>
                      </tr>
                    ) : (
                      restoreHistory.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30">
                          <td className="p-3">{new Date(h.restoreStarted).toLocaleString()}</td>
                          <td className="p-3 text-slate-200 select-all truncate max-w-[200px]">{h.backupFile}</td>
                          <td className="p-3 text-zinc-400 select-all text-[10px]">{h.restoredBy}</td>
                          <td className="p-3 text-zinc-400">{new Date(h.restoreCompleted).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              h.restoreStatus === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            }`}>
                              {h.restoreStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security Audits */}
        {activeTab === "audits" && (
          <div className="space-y-4">
            {/* Filter Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
              <div className="col-span-1 sm:col-span-2 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search descriptions..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <select
                  value={auditFilterAction}
                  onChange={(e) => setAuditFilterAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                  <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
                  <option value="SETTING_UPDATE">SETTING_UPDATE</option>
                  <option value="BACKUP_CREATED">BACKUP_CREATED</option>
                  <option value="RESTORE_EXECUTED">RESTORE_EXECUTED</option>
                  <option value="SESSION_TERMINATED">SESSION_TERMINATED</option>
                  <option value="LICENSE_UPDATED">LICENSE_UPDATED</option>
                  <option value="MAINTENANCE_ENABLED">MAINTENANCE_ENABLED</option>
                  <option value="MAINTENANCE_DISABLED">MAINTENANCE_DISABLED</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAuditPage(1);
                    loadAudits();
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-xs font-medium text-white transition cursor-pointer"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    setAuditSearch("");
                    setAuditFilterAction("");
                    setAuditFilterResource("");
                    setAuditPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Audits Table */}
            <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-950/20">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-zinc-400">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Operator</th>
                    <th className="p-3">Client IP</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Resource Target</th>
                    <th className="p-3">Log Audit Detail Message (Read-only Trails)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {audits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-zinc-500">
                        No audit trace logs matched the search filter options.
                      </td>
                    </tr>
                  ) : (
                    audits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-900/30">
                        <td className="p-3 text-zinc-400">{new Date(a.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-slate-200">
                          {a.user ? (
                            <div>
                              <span>{a.user.email}</span>
                              <span className="block text-[10px] text-zinc-500 font-bold">{a.user.employeeCode}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">System Engine</span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400">{a.clientIp || "localhost"}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-zinc-300">
                            {a.action}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400">{a.resource || "N/A"}</td>
                        <td className="p-3 text-zinc-300 font-sans max-w-sm truncate select-text" title={a.description}>
                          {a.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {auditTotal > 0 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-mono text-zinc-500">Total audits: {auditTotal}</span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage(prev => prev - 1)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-300 rounded cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-mono text-slate-300 py-1 px-2 bg-slate-950 border border-slate-800 rounded">
                    Page {auditPage} of {Math.ceil(auditTotal / 15)}
                  </span>
                  <button
                    disabled={auditPage >= Math.ceil(auditTotal / 15)}
                    onClick={() => setAuditPage(prev => prev + 1)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-300 rounded cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Active Sessions */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-semibold text-slate-400">Authenticated Active Sessions list</h3>
              <button
                onClick={handleTerminateAllOtherSessions}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-900/30 text-xs font-medium rounded transition cursor-pointer"
              >
                Logout All Other Devices
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {sessions.length === 0 ? (
                <div className="text-center p-6 text-zinc-500 font-mono text-xs">
                  No active user sessions found.
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-950/60 rounded-lg border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{s.user.email}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-zinc-400 border border-slate-700">
                          {s.user.role}
                        </span>
                      </div>
                      <div className="text-zinc-500 text-[10px] space-y-0.5">
                        <span className="block">Employee Code: {s.user.employeeCode} | Designation: {s.user.designation}</span>
                        <span className="block">IP Address: {s.ipAddress || "Unknown"}</span>
                        <span className="block">Created At: {new Date(s.createdAt).toLocaleString()} | Expires: {new Date(s.expiresAt).toLocaleString()}</span>
                        <span className="block truncate max-w-lg text-slate-500" title={s.userAgent || ""}>Browser: {s.userAgent || "Unknown"}</span>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex gap-2">
                      <button
                        onClick={() => handleTerminateSession(s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-red-400 text-xs font-semibold rounded border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                      >
                        <LogOut size={12} /> Force Invalidate
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: License Registration */}
        {activeTab === "license" && license && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Status Panel */}
            <div className="md:col-span-1 space-y-4 border border-slate-800 rounded-lg bg-slate-950/40 p-5 font-mono text-xs">
              <h3 className="text-slate-200 font-semibold flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <KeyRound size={16} className="text-emerald-500" /> Active License Indicators
              </h3>
              
              <div className="space-y-4 pt-2">
                {/* Days remaining badge */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded border border-slate-800 text-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Days Remaining</span>
                  <span className={`text-3xl font-extrabold mt-1 ${license.daysRemaining > 30 ? "text-emerald-400" : "text-amber-500 animate-pulse"}`}>
                    {license.daysRemaining} Days
                  </span>
                  <span className="text-[9px] text-zinc-400 mt-1">
                    Expiry: {license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : "No active license"}
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Status Validity:</span>
                    <span className={`font-bold ${license.isValid ? "text-emerald-400" : "text-red-400"}`}>
                      {license.isValid ? "AUTHENTIC" : "INVALID / TAMPERED"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Registered Hospital:</span>
                    <span className="text-slate-200 font-bold">{license.registeredHospital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Registered Owner:</span>
                    <span className="text-slate-200">{license.registeredOwner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Target Core Version:</span>
                    <span className="text-slate-200">v{license.version}</span>
                  </div>
                </div>

                {license.isExpired && (
                  <div className="p-3 bg-red-950/40 border border-red-900/30 rounded text-red-400 flex items-start gap-1.5 text-[10px]">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>Your active license activation has expired. Business transactions are locked until verification is resolved.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Registration Form */}
            <div className="md:col-span-2 border border-slate-800 rounded-lg bg-slate-950/40 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <CheckCircle2 size={16} className="text-blue-400" /> Apply Activation Key
              </h3>
              
              <form onSubmit={handleRegisterLicense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">License Activation Key</label>
                  <input
                    type="text"
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">License Metadata Details (JSON Format)</label>
                  <textarea
                    rows={6}
                    placeholder={`{\n  "expiryDate": "2026-12-31",\n  "registeredHospital": "Shreeganesha Hospital",\n  "registeredOwner": "Dr. Ayush Dev",\n  "version": "2.0.0"\n}`}
                    value={licenseDataInput}
                    onChange={(e) => setLicenseDataInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-xs font-medium px-4 py-2 rounded text-white flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />} Validate & Activate System License
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 6: Maintenance Mode */}
        {activeTab === "maintenance" && maintenance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div className="md:col-span-1 space-y-4 border border-slate-800 rounded-lg bg-slate-950/40 p-5">
              <h3 className="text-slate-200 font-semibold flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Sliders size={16} className="text-amber-500" /> Maintenance Options
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider">Maintenance State</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleToggleMaintenance(!maintenance.active)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        maintenance.active ? "bg-amber-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          maintenance.active ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className={`font-bold ${maintenance.active ? "text-amber-400 animate-pulse" : "text-zinc-400"}`}>
                      {maintenance.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider">License Expiry Lock</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleToggleBlockOnExpiry(!maintenance.blockOnExpiry)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        maintenance.blockOnExpiry ? "bg-red-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          maintenance.blockOnExpiry ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className={`font-bold ${maintenance.blockOnExpiry ? "text-red-400" : "text-zinc-400"}`}>
                      {maintenance.blockOnExpiry ? "LOCK ACTIVE" : "LOCK INACTIVE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 border border-slate-800 rounded-lg bg-slate-950/40 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Terminal size={16} className="text-amber-400" /> Maintenance Message Override Settings
              </h3>
              
              <div className="space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-400">Display Intercept Warning Message</label>
                  <textarea
                    rows={4}
                    value={maintenanceMsgInput}
                    onChange={(e) => setMaintenanceMsgInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    placeholder="Provide a reason for maintenance lockout periods..."
                  />
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-start gap-2">
                  <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Important Administration Interlocks</span>
                    <span className="mt-1 block text-zinc-400">
                      When maintenance mode is active, only users registered with the <strong>SUPER_ADMIN</strong> role can access the portal structure. All normal users (doctors, billers, and technicians) will be logged out and intercepted with the message specified above.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dangerous Operations: Database Restore Confirmation Modal */}
      {showRestoreConfirm && restorePreviewData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/80 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-red-950 pb-2 text-red-400 font-mono font-bold text-sm">
              <AlertTriangle className="animate-bounce" /> HIGH RISK ADMINISTRATION ACTION
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-zinc-300 font-sans">
                You are about to restore database objects from backup <strong>{showRestoreConfirm}</strong>. This operation will wipe the active PostgreSQL schema and reset data.
              </p>
              
              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono space-y-1 text-zinc-400">
                <div className="flex justify-between">
                  <span>File:</span>
                  <span className="text-slate-300 font-bold select-all truncate max-w-[200px]">{restorePreviewData.metadata.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span>Backup Type:</span>
                  <span className="text-slate-300">{restorePreviewData.metadata.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="text-slate-300">{new Date(restorePreviewData.metadata.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Hash:</span>
                  <span className="text-slate-300 truncate max-w-[200px] select-all font-mono">{restorePreviewData.metadata.checksum}</span>
                </div>
              </div>

              <div className="p-3 bg-red-950/40 border border-red-900/40 rounded text-red-400 flex gap-2 text-[10px]">
                <Lock className="flex-shrink-0 mt-0.5" size={14} />
                <div>
                  <span className="font-bold block">Safe recovery pre-restore snapshot enabled</span>
                  <span className="block text-zinc-400 mt-1">
                    An automatic rollback full backup will be generated before restoration begins.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                disabled={actionLoading}
                onClick={() => {
                  setShowRestoreConfirm(null);
                  setRestorePreviewData(null);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleExecuteRestore}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded font-semibold transition cursor-pointer"
              >
                {actionLoading ? "Executing Restore..." : "Confirm & Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
