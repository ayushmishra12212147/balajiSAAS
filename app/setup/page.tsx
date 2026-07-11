"use client";

/**
 * First-Run Setup Wizard
 *
 * Multi-step setup form using the existing HMS design system.
 * Communicates with Electron Main Process via window.electronAPI.
 * Only functional inside the Electron desktop application.
 *
 * Steps:
 *  1. Welcome — Hospital name
 *  2. Database — Connection details
 *  3. Test Connection
 *  4. Run Migrations
 *  5. Seed Database
 *  6. Super Admin Account
 *  7. Complete — Launch HMS
 */

import { useState } from "react";
import {
  Hospital,
  Database,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Rocket,
  AlertTriangle,
  Server,
  User,
  Key,
} from "lucide-react";

// Electron API types are declared globally in types/electron.d.ts

// ── Setup Steps ─────────────────────────────────────────────────────────

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Hospital },
  { id: "database", label: "Database", icon: Database },
  { id: "test", label: "Test", icon: Server },
  { id: "migrate", label: "Migrate", icon: Rocket },
  { id: "seed", label: "Seed", icon: Shield },
  { id: "admin", label: "Admin", icon: User },
  { id: "complete", label: "Complete", icon: CheckCircle2 },
] as const;

// ── Component ───────────────────────────────────────────────────────────

export default function SetupWizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stepOutput, setStepOutput] = useState("");

  // Form state
  const [hospitalName, setHospitalName] = useState("");
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState(5432);
  const [dbUsername, setDbUsername] = useState("postgres");
  const [dbPassword, setDbPassword] = useState("");
  const [dbName, setDbName] = useState("hms");
  const [adminEmail, setAdminEmail] = useState("admin@hms.com");
  const [adminPassword, setAdminPassword] = useState("");

  // Status tracking
  const [connectionTested, setConnectionTested] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  // Check if running inside Electron
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  if (!isElectron) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-200">Desktop Only</h1>
          <p className="text-sm text-zinc-400">
            This setup wizard is only available in the Balaji HMS desktop application.
            Please launch HMS from the installed desktop application.
          </p>
        </div>
      </div>
    );
  }

  const api = window.electronAPI!;

  // ── Step Handlers ───────────────────────────────────────────────────

  const handleTestConnection = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.database.testConnection({
        host: dbHost,
        port: dbPort,
        username: dbUsername,
        password: dbPassword,
        database: dbName,
      });
      if (result.success) {
        setConnectionTested(true);
        setStepOutput(result.message);
        setCurrentStep(3); // Auto-advance to migration
      } else {
        setError(result.message);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Connection test failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunMigrations = async () => {
    setLoading(true);
    setError("");
    try {
      // Save config first so migrations can use it
      await api.config.save({
        database: {
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbName,
        },
        hospital: { name: hospitalName, setupComplete: false },
        server: { port: 0 },
        app: { version: "2.0.0", lastStartup: new Date().toISOString() },
      });

      const result = await api.database.runMigrations();
      if (result.success) {
        setMigrationDone(true);
        setStepOutput(result.output);
        setCurrentStep(4); // Auto-advance to seed
      } else {
        setError(result.output || "Migration failed.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Migration execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunSeed = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.database.runSeed();
      if (result.success) {
        setSeedDone(true);
        setStepOutput(result.output);
        setCurrentStep(5); // Auto-advance to admin
      } else {
        setError(result.output || "Seed failed.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Database seeding failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      await api.config.save({
        database: {
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbName,
        },
        hospital: { name: hospitalName, setupComplete: true },
        server: { port: 0 },
        app: { version: "2.0.0", lastStartup: new Date().toISOString() },
      });

      // Redirect to HMS login
      window.location.href = "/login";
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save final configuration.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return hospitalName.trim().length >= 2;
      case 1: return dbHost.trim() && dbUsername.trim() && dbName.trim();
      case 2: return connectionTested;
      case 3: return migrationDone;
      case 4: return seedDone;
      case 5: return adminEmail.trim() && adminPassword.trim().length >= 8;
      default: return true;
    }
  };

  const handleNext = () => {
    setError("");
    setStepOutput("");
    if (currentStep === 2) {
      handleTestConnection();
    } else if (currentStep === 3) {
      handleRunMigrations();
    } else if (currentStep === 4) {
      handleRunSeed();
    } else if (currentStep === 6) {
      handleComplete();
    } else {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : isActive
                        ? "bg-slate-800 border-emerald-500 text-emerald-400"
                        : "bg-slate-900 border-slate-700 text-zinc-500"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Icon size={14} />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-20 h-0.5 mx-1 transition-colors duration-300 ${
                      isDone ? "bg-emerald-600" : "bg-slate-800"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 px-1">
          {STEPS.map((step, i) => (
            <span
              key={step.id}
              className={`text-[9px] font-mono uppercase tracking-wider ${
                i === currentStep ? "text-emerald-400" : "text-zinc-600"
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-lg p-8 min-h-[400px] flex flex-col">
        {/* Step 0: Welcome */}
        {currentStep === 0 && (
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="text-center space-y-2">
              <Hospital className="w-16 h-16 text-emerald-500 mx-auto" />
              <h1 className="text-2xl font-bold text-slate-100">Welcome to Balaji HMS</h1>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Hospital Management System v2.0 — Let&apos;s set up your system for the first time.
              </p>
            </div>
            <div className="max-w-sm mx-auto w-full space-y-2">
              <label className="text-xs font-medium text-slate-400">Hospital Name</label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="Enter your hospital name"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 1: Database */}
        {currentStep === 1 && (
          <div className="flex-1 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Database size={20} className="text-blue-400" /> Database Configuration
              </h2>
              <p className="text-xs text-zinc-500">Configure your PostgreSQL database connection.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Host</label>
                <input
                  type="text" value={dbHost} onChange={(e) => setDbHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Port</label>
                <input
                  type="number" value={dbPort} onChange={(e) => setDbPort(parseInt(e.target.value) || 5432)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Username</label>
                <input
                  type="text" value={dbUsername} onChange={(e) => setDbUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Password</label>
                <input
                  type="password" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-400">Database Name</label>
                <input
                  type="text" value={dbName} onChange={(e) => setDbName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Test Connection */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Server className={`w-16 h-16 ${connectionTested ? "text-emerald-500" : "text-zinc-500"}`} />
            <h2 className="text-lg font-bold text-slate-200">Test Database Connection</h2>
            <p className="text-sm text-zinc-400 text-center max-w-sm">
              Verifying connectivity to <span className="text-slate-200 font-mono">{dbHost}:{dbPort}/{dbName}</span>
            </p>
            {stepOutput && (
              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded p-3 text-xs text-emerald-300 max-w-md">
                {stepOutput}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Migrations */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Rocket className={`w-16 h-16 ${migrationDone ? "text-emerald-500" : "text-zinc-500"}`} />
            <h2 className="text-lg font-bold text-slate-200">Run Database Migrations</h2>
            <p className="text-sm text-zinc-400 text-center max-w-sm">
              This will create all required database tables and indexes.
            </p>
            {stepOutput && (
              <div className="bg-slate-950 border border-slate-800 rounded p-3 text-[10px] font-mono text-zinc-400 max-w-md max-h-40 overflow-y-auto whitespace-pre-wrap">
                {stepOutput}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Seed */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Shield className={`w-16 h-16 ${seedDone ? "text-emerald-500" : "text-zinc-500"}`} />
            <h2 className="text-lg font-bold text-slate-200">Seed Default Data</h2>
            <p className="text-sm text-zinc-400 text-center max-w-sm">
              Inserts default permissions, roles, and configuration data.
            </p>
            {stepOutput && (
              <div className="bg-slate-950 border border-slate-800 rounded p-3 text-[10px] font-mono text-zinc-400 max-w-md max-h-40 overflow-y-auto whitespace-pre-wrap">
                {stepOutput}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Admin Account */}
        {currentStep === 5 && (
          <div className="flex-1 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Key size={20} className="text-amber-400" /> Super Admin Account
              </h2>
              <p className="text-xs text-zinc-500">Create the initial administrator account.</p>
            </div>
            <div className="max-w-sm space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Admin Email</label>
                <input
                  type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Admin Password (min 8 characters)</label>
                <input
                  type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="text-[10px] text-zinc-500">
                These credentials can be changed after login from the Admin panel.
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {currentStep === 6 && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="w-20 h-20 text-emerald-500" />
            <h2 className="text-2xl font-bold text-slate-100">Setup Complete!</h2>
            <p className="text-sm text-zinc-400 text-center max-w-sm">
              <span className="text-emerald-400 font-bold">{hospitalName}</span> HMS is ready.
              Click below to launch the application.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-900/40 rounded text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 mt-auto border-t border-slate-800">
          <button
            onClick={() => { setCurrentStep((s) => Math.max(s - 1, 0)); setError(""); setStepOutput(""); }}
            disabled={currentStep === 0 || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <span className="text-[10px] font-mono text-zinc-600">
            Step {currentStep + 1} of {STEPS.length}
          </span>

          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-xs font-semibold text-white rounded transition cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Processing...</>
            ) : currentStep === 6 ? (
              <><Rocket size={14} /> Launch HMS</>
            ) : (
              <><ArrowRight size={14} /> {currentStep === 2 ? "Test Connection" : currentStep === 3 ? "Run Migrations" : currentStep === 4 ? "Seed Database" : "Next"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
