"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HospitalSettingsSchema } from "@/modules/admin/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Building2, Save, Loader2 } from "lucide-react";
import { z } from "zod";

type HospitalFormInputs = z.infer<typeof HospitalSettingsSchema>;

/**
 * HospitalProfile Tab Component
 * Manages core hospital settings. Enforces client-side validation using Zod.
 */
export function HospitalProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HospitalFormInputs>({
    resolver: zodResolver(HospitalSettingsSchema),
    defaultValues: {
      name: "",
      code: "",
      phone: "",
      email: "",
      address: "",
      gstNumber: "",
      registrationNumber: "",
      website: "",
      logoUrl: "",
      footerText: "",
    },
  });

  // Fetch current hospital configs on load
  useEffect(() => {
    async function loadHospital() {
      try {
        const data = await apiClient<HospitalFormInputs>("/api/admin/hospital");
        reset({
          name: data.name || "",
          code: data.code || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          gstNumber: data.gstNumber || "",
          registrationNumber: data.registrationNumber || "",
          website: data.website || "",
          logoUrl: data.logoUrl || "",
          footerText: data.footerText || "",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load hospital settings.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    loadHospital();
  }, [reset]);

  const onSubmit = async (data: HospitalFormInputs) => {
    setSaving(true);
    try {
      await apiClient<HospitalFormInputs>("/api/admin/hospital", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Hospital profile updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update hospital settings.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Hospital Profile...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm max-w-4xl">
      <div className="flex items-center space-x-3 mb-6 border-b border-slate-800 pb-4">
        <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Hospital Profile Settings</h2>
          <p className="text-xs text-slate-400">Manage permanent legal identity parameters for Balaji Hospital</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Hospital Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Hospital Legal Name</label>
            <input
              type="text"
              {...register("name")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="Balaji Hospital"
            />
            {errors.name && <p className="text-red-400 text-[10px]">{errors.name.message}</p>}
          </div>

          {/* Hospital Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Hospital ID Code (Max 10 chars)</label>
            <input
              type="text"
              {...register("code")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all uppercase"
              placeholder="BH"
            />
            {errors.code && <p className="text-red-400 text-[10px]">{errors.code.message}</p>}
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Phone Contact Number</label>
            <input
              type="text"
              {...register("phone")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="+91 9999999999"
            />
            {errors.phone && <p className="text-red-400 text-[10px]">{errors.phone.message}</p>}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Official Email Address</label>
            <input
              type="email"
              {...register("email")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="contact@balajihospital.com"
            />
            {errors.email && <p className="text-red-400 text-[10px]">{errors.email.message}</p>}
          </div>

          {/* GSTIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">GSTIN / Tax Number</label>
            <input
              type="text"
              {...register("gstNumber")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="27AAAAA0000A1Z1"
            />
            {errors.gstNumber && <p className="text-red-400 text-[10px]">{errors.gstNumber.message}</p>}
          </div>

          {/* Registration Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Hospital Registration Number</label>
            <input
              type="text"
              {...register("registrationNumber")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="REG-1002030"
            />
            {errors.registrationNumber && (
              <p className="text-red-400 text-[10px]">{errors.registrationNumber.message}</p>
            )}
          </div>

          {/* Website Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Official Website URL</label>
            <input
              type="text"
              {...register("website")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="https://www.balajihospital.com"
            />
            {errors.website && <p className="text-red-400 text-[10px]">{errors.website.message}</p>}
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Logo Image URL</label>
            <input
              type="text"
              {...register("logoUrl")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              placeholder="https://www.balajihospital.com/logo.png"
            />
            {errors.logoUrl && <p className="text-red-400 text-[10px]">{errors.logoUrl.message}</p>}
          </div>
        </div>

        {/* Full-width Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Hospital Postal Address</label>
          <textarea
            {...register("address")}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all resize-none"
            placeholder="123 Hospital Street, Mumbai, Maharashtra"
          />
          {errors.address && <p className="text-red-400 text-[10px]">{errors.address.message}</p>}
        </div>

        {/* Footer Text */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Invoice / Print Receipt Footer Text</label>
          <input
            type="text"
            {...register("footerText")}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
            placeholder="Thank you for choosing Balaji Hospital. Get well soon."
          />
          {errors.footerText && <p className="text-red-400 text-[10px]">{errors.footerText.message}</p>}
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
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
export default HospitalProfile;
