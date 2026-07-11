"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SystemSettingsFormSchema, SystemSettingsFormInput } from "@/modules/admin/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Settings, Save, Loader2 } from "lucide-react";

/**
 * SystemConfig Component
 * Manages configurable system settings (e.g., number padding, session expiration limits).
 */
export function SystemConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SystemSettingsFormInput>({
    resolver: zodResolver(SystemSettingsFormSchema),
    defaultValues: {
      invoice_prefix: "INV",
      opd_prefix: "OPD",
      ipd_prefix: "IPD",
      ot_prefix: "OT",
      laboratory_prefix: "LAB",
      number_padding: 5,
      session_timeout: 12,
      lockout_duration: 15,
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiClient<SystemSettingsFormInput>("/api/admin/settings");
        reset({
          invoice_prefix: data.invoice_prefix,
          opd_prefix: data.opd_prefix,
          ipd_prefix: data.ipd_prefix,
          ot_prefix: data.ot_prefix,
          laboratory_prefix: data.laboratory_prefix,
          number_padding: Number(data.number_padding),
          session_timeout: Number(data.session_timeout),
          lockout_duration: Number(data.lockout_duration),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load system settings.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [reset]);

  const onSubmit = async (data: SystemSettingsFormInput) => {
    setSaving(true);
    try {
      await apiClient("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("System configurations saved successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update configurations.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading System Settings...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm max-w-4xl">
      <div className="flex items-center space-x-3 mb-6 border-b border-slate-800 pb-4">
        <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Application Configuration Settings</h2>
          <p className="text-xs text-slate-400">Configure global formatting, session parameters, and lockout limits</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Number Sequence Prefixes */}
        <div>
          <h3 className="text-xs font-bold text-slate-200 mb-3 border-b border-slate-800 pb-1">
            Numbering Sequence Prefixes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Invoice Number Prefix</label>
              <input
                type="text"
                {...register("invoice_prefix")}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none uppercase"
              />
              {errors.invoice_prefix && <p className="text-red-400 text-[10px]">{errors.invoice_prefix.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">OPD Consultation ID Prefix</label>
              <input
                type="text"
                {...register("opd_prefix")}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none uppercase"
              />
              {errors.opd_prefix && <p className="text-red-400 text-[10px]">{errors.opd_prefix.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">IPD Admission ID Prefix</label>
              <input
                type="text"
                {...register("ipd_prefix")}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none uppercase"
              />
              {errors.ipd_prefix && <p className="text-red-400 text-[10px]">{errors.ipd_prefix.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Operation Theater Prefix</label>
              <input
                type="text"
                {...register("ot_prefix")}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none uppercase"
              />
              {errors.ot_prefix && <p className="text-red-400 text-[10px]">{errors.ot_prefix.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Laboratory Prefix</label>
              <input
                type="text"
                {...register("laboratory_prefix")}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none uppercase"
              />
              {errors.laboratory_prefix && (
                <p className="text-red-400 text-[10px]">{errors.laboratory_prefix.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Sequence Code Padding Length</label>
              <input
                type="number"
                {...register("number_padding", { valueAsNumber: true })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none"
              />
              {errors.number_padding && <p className="text-red-400 text-[10px]">{errors.number_padding.message}</p>}
            </div>
          </div>
        </div>

        {/* Security & Access Timeout parameters */}
        <div>
          <h3 className="text-xs font-bold text-slate-200 mb-3 border-b border-slate-800 pb-1">
            Access Security & Session Timeouts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Inactivity Session Timeout (Hours)</label>
              <input
                type="number"
                {...register("session_timeout", { valueAsNumber: true })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none"
              />
              {errors.session_timeout && <p className="text-red-400 text-[10px]">{errors.session_timeout.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Failed Login Lockout Duration (Minutes)</label>
              <input
                type="number"
                {...register("lockout_duration", { valueAsNumber: true })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2 outline-none"
              />
              {errors.lockout_duration && (
                <p className="text-red-400 text-[10px]">{errors.lockout_duration.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-800/80">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Configurations...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Configuration Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
export default SystemConfig;
