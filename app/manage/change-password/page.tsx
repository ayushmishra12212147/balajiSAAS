"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { KeyRound, Lock, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    try {
      await apiClient("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      toast.success("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-6">
      <div className="flex items-center space-x-3 border-b border-slate-900 pb-5">
        <Link
          href="/manage/profile"
          className="p-1.5 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
            <KeyRound size={16} className="text-emerald-500" />
            <span>Change Password</span>
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono">Update security credentials for your account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Old Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-semibold uppercase block">Current Password</label>
          <div className="relative">
            <Lock className="absolute inset-y-0 left-3 flex items-center text-slate-500 h-full pointer-events-none" size={13} />
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 text-slate-100 pl-9 pr-4 py-2.5 outline-none rounded-xl transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-semibold uppercase block">New Password</label>
          <div className="relative">
            <Lock className="absolute inset-y-0 left-3 flex items-center text-slate-500 h-full pointer-events-none" size={13} />
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 text-slate-100 pl-9 pr-4 py-2.5 outline-none rounded-xl transition-all"
              placeholder="••••••••"
            />
          </div>
          <p className="text-[9px] text-slate-500 leading-normal">
            Must be at least 8 characters, with 1 uppercase letter, 1 number, and 1 special symbol.
          </p>
        </div>

        {/* Confirm New Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-semibold uppercase block">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute inset-y-0 left-3 flex items-center text-slate-500 h-full pointer-events-none" size={13} />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 text-slate-100 pl-9 pr-4 py-2.5 outline-none rounded-xl transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
