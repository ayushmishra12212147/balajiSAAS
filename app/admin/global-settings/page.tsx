"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Save, Loader2, Globe, Calendar, Layout } from "lucide-react";

interface GlobalSettingsForm {
  global_currency: string;
  global_timezone: string;
  global_date_format: string;
  global_time_format: "12h" | "24h";
  global_decimal_precision: number;
  global_paper_size: "A4" | "A5";
  global_default_printer: string;
  global_print_margins: string;
  
  // Existing baseline fields (required by validation schema)
  invoice_prefix: string;
  opd_prefix: string;
  ipd_prefix: string;
  ot_prefix: string;
  laboratory_prefix: string;
  number_padding: number;
  session_timeout: number;
  lockout_duration: number;
}

export default function GlobalSettingsPage() {
  const [form, setForm] = useState<GlobalSettingsForm>({
    global_currency: "₹",
    global_timezone: "Asia/Kolkata",
    global_date_format: "DD/MM/YYYY",
    global_time_format: "12h",
    global_decimal_precision: 2,
    global_paper_size: "A4",
    global_default_printer: "System Default",
    global_print_margins: "15mm",
    
    invoice_prefix: "INV",
    opd_prefix: "OPD",
    ipd_prefix: "IPD",
    ot_prefix: "OT",
    laboratory_prefix: "LAB",
    number_padding: 5,
    session_timeout: 12,
    lockout_duration: 15
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiClient<Record<string, unknown>>("/api/admin/settings");
        setForm({
          global_currency: String(data.global_currency || "₹"),
          global_timezone: String(data.global_timezone || "Asia/Kolkata"),
          global_date_format: String(data.global_date_format || "DD/MM/YYYY"),
          global_time_format: (data.global_time_format || "12h") as "12h" | "24h",
          global_decimal_precision: Number(data.global_decimal_precision ?? 2),
          global_paper_size: (data.global_paper_size || "A4") as "A4" | "A5",
          global_default_printer: String(data.global_default_printer || "System Default"),
          global_print_margins: String(data.global_print_margins || "15mm"),
          
          invoice_prefix: String(data.invoice_prefix || "INV"),
          opd_prefix: String(data.opd_prefix || "OPD"),
          ipd_prefix: String(data.ipd_prefix || "IPD"),
          ot_prefix: String(data.ot_prefix || "OT"),
          laboratory_prefix: String(data.laboratory_prefix || "LAB"),
          number_padding: Number(data.number_padding ?? 5),
          session_timeout: Number(data.session_timeout ?? 12),
          lockout_duration: Number(data.lockout_duration ?? 15)
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load system preferences.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient("/api/admin/settings", {
        method: "POST", // Router uses POST for bulk update settings keys
        body: JSON.stringify(form)
      });
      toast.success("Global preferences saved successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save system settings.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-xs font-mono">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
        <span>Loading Global Preferences...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-5 overflow-y-auto pb-6 scrollbar-thin">
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Global System Settings</h1>
          <p className="text-xs text-slate-400 mt-1">Configure localized currencies, formats, timezones, and printers parameters</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-md">
        
        {/* Localization & Region */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5 select-none">
            <Globe className="text-emerald-400 w-3.5 h-3.5" />
            <span>Localization & Currency</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currency Symbol */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Currency Symbol (e.g. ₹, $, £)</label>
              <input
                type="text"
                required
                value={form.global_currency}
                onChange={(e) => setForm({ ...form, global_currency: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all font-mono"
              />
            </div>

            {/* Timezone */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">System Timezone</label>
              <select
                value={form.global_timezone}
                onChange={(e) => setForm({ ...form, global_timezone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              >
                <option value="Asia/Kolkata">India (GMT+5:30) - Asia/Kolkata</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
                <option value="America/New_York">Eastern Time (EST/EDT) - America/New_York</option>
                <option value="Europe/London">London (GMT/BST) - Europe/London</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date & Time Formatting */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5 select-none">
            <Calendar className="text-emerald-400 w-3.5 h-3.5" />
            <span>Formatting Preferences</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date format */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Date Format</label>
              <select
                value={form.global_date_format}
                onChange={(e) => setForm({ ...form, global_date_format: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all font-mono"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            {/* Time format */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Time Format</label>
              <select
                value={form.global_time_format}
                onChange={(e) => setForm({ ...form, global_time_format: e.target.value as "12h" | "24h" })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all font-mono"
              >
                <option value="12h">12-Hour (AM/PM)</option>
                <option value="24h">24-Hour (Military)</option>
              </select>
            </div>

            {/* Decimal Precision */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Decimal precision</label>
              <select
                value={form.global_decimal_precision}
                onChange={(e) => setForm({ ...form, global_decimal_precision: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all font-mono"
              >
                <option value="0">0 decimals (₹150)</option>
                <option value="1">1 decimal (₹150.0)</option>
                <option value="2">2 decimals (₹150.00)</option>
                <option value="3">3 decimals (₹150.000)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout & Printer Defaults */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5 select-none">
            <Layout className="text-emerald-400 w-3.5 h-3.5" />
            <span>Printing Options</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paper Size */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Default Document Paper Dimensions</label>
              <select
                value={form.global_paper_size}
                onChange={(e) => setForm({ ...form, global_paper_size: e.target.value as "A4" | "A5" })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              >
                <option value="A4">A4 (Standard portrait size)</option>
                <option value="A5">A5 (Prescription half page)</option>
              </select>
            </div>

            {/* Print Margins */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Default Spacing Margins (mm/in)</label>
              <input
                type="text"
                required
                value={form.global_print_margins}
                onChange={(e) => setForm({ ...form, global_print_margins: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all font-mono"
              />
            </div>

            {/* Default printer */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Logical Default Printer Target</label>
              <input
                type="text"
                required
                value={form.global_default_printer}
                onChange={(e) => setForm({ ...form, global_default_printer: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end pt-4 border-t border-slate-850">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save System Settings</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
