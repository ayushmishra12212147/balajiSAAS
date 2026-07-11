"use client";

import React, { useState } from "react";
import { Building2, KeyRound, Mail, Eye, EyeOff, ShieldAlert, AlertCircle } from "lucide-react";
import { AuthClient } from "@/lib/auth-client";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";

/**
 * LoginPage Component
 * Renders the secure terminal access form.
 * Decoupled from service layer logic; delegates connection routines to AuthClient.
 */
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Decoupled UI from auth service:LoginForm -> AuthClient -> API
      const profile = await AuthClient.login(email, password);
      
      // Store user details in global client state
      setUser(profile);

      // Perform a page reload to boot up routing configurations and middleware contexts cleanly
      window.location.href = "/";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during authentication.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg mb-3">
            <Building2 size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Balaji Hospital</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to your HMS terminal</p>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-900/50 p-4 rounded-xl flex items-start space-x-2.5 text-xs text-red-200">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block" htmlFor="email">
              Employee Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                id="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-slate-600 disabled:opacity-50"
                placeholder="name@hospital.com"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block" htmlFor="password">
              Security Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <KeyRound size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all placeholder-slate-600 disabled:opacity-50"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Warnings Panel */}
          <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-start space-x-2 text-[10px] text-slate-400 leading-normal">
            <ShieldAlert size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>
              This is a secure private terminal. All authentication attempts and sessions are logged in the system audit registry.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying Credentials..." : "Authenticate Credentials"}
          </button>
        </form>

        {/* Footer Version Info */}
        <div className="mt-8 text-center text-[10px] text-slate-600 font-mono">
          System Version: V2.0.0-Foundation
        </div>
      </div>
    </div>
  );
}
