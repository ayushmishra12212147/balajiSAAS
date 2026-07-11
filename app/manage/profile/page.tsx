"use client";

import React from "react";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";
import { User, Shield, Briefcase, Building, Mail, Hash } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-xs font-mono">
        <span>Loading Profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-6">
      <div className="flex items-center space-x-4 border-b border-slate-900 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
          <User size={24} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">User Account Profile</h2>
          <p className="text-[10px] text-zinc-500 font-mono">Current authenticated credentials metadata</p>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        {/* Email */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-900 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <Mail size={14} className="text-emerald-500" />
            <span className="text-slate-400">Email Address</span>
          </div>
          <span className="font-semibold text-slate-100 font-mono">{user.email}</span>
        </div>

        {/* Role */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-900 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <Shield size={14} className="text-emerald-500" />
            <span className="text-slate-400">Access Role</span>
          </div>
          <span className="font-semibold text-emerald-450 uppercase font-mono tracking-wider text-[10px]">
            {user.role}
          </span>
        </div>

        {/* Designation */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-900 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <Briefcase size={14} className="text-emerald-500" />
            <span className="text-slate-400">Designation</span>
          </div>
          <span className="font-semibold text-slate-100">{user.designation}</span>
        </div>

        {/* Hospital */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-900 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <Building size={14} className="text-emerald-500" />
            <span className="text-slate-400">Tenant Hospital</span>
          </div>
          <span className="font-semibold text-slate-100">{user.hospitalName}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-900 flex justify-end space-x-2">
        <Link
          href="/manage/change-password"
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
        >
          Change Password
        </Link>
      </div>
    </div>
  );
}
