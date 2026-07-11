"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Building2, Save, Loader2, ShieldCheck, Phone } from "lucide-react";

interface HospitalDetails {
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string | null;
  registrationNumber: string | null;
  website: string | null;
  logoUrl: string | null;
  footerText: string | null;
}

export default function HospitalBrandingPage() {
  const [form, setForm] = useState<HospitalDetails>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    registrationNumber: "",
    website: "",
    logoUrl: "",
    footerText: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadHospital() {
      try {
        const data = await apiClient<HospitalDetails>("/api/admin/hospital");
        setForm({
          name: data.name || "",
          code: data.code || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          gstNumber: data.gstNumber || "",
          registrationNumber: data.registrationNumber || "",
          website: data.website || "",
          logoUrl: data.logoUrl || "",
          footerText: data.footerText || ""
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load hospital profile.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    loadHospital();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient("/api/admin/hospital", {
        method: "PUT",
        body: JSON.stringify(form)
      });
      toast.success("Hospital branding configurations updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update hospital configuration.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-xs font-mono">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
        <span>Loading Hospital Profile...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-5 overflow-y-auto pb-6 scrollbar-thin">
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Hospital Branding & Identity</h1>
          <p className="text-xs text-slate-400 mt-1">Configure clinical profile names, logos, registrations, and contact details</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-md">
        
        {/* Core Profile */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5">
            <Building2 className="text-emerald-400 w-3.5 h-3.5" />
            <span>Hospital Base Identity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hospital Name */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Hospital Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>

            {/* Hospital Code */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Hospital Code</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all uppercase"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5">
            <Phone className="text-emerald-400 w-3.5 h-3.5" />
            <span>Contact Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Physical Address</label>
              <textarea
                rows={2}
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs p-3 rounded-xl outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Registrations & Branding */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5">
            <ShieldCheck className="text-emerald-400 w-3.5 h-3.5" />
            <span>Licensing & Branding Assets</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration Number */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Registration Number</label>
              <input
                type="text"
                value={form.registrationNumber || ""}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>

            {/* GST Number */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">GST Number</label>
              <input
                type="text"
                value={form.gstNumber || ""}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Website URL</label>
              <input
                type="text"
                value={form.website || ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
              />
            </div>

            {/* Logo Upload & Preview */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Hospital Logo Image</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
                {form.logoUrl ? (
                  <div className="relative w-20 h-20 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logoUrl}
                      alt="Hospital Logo Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center shrink-0 text-slate-600 text-[10px]">
                    <span>No Logo</span>
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("Image size must be under 2MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setForm({ ...form, logoUrl: result });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 hover:border-slate-650 cursor-pointer transition-all inline-block select-none"
                    >
                      Choose Logo File
                    </label>
                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logoUrl: "" })}
                        className="px-4 py-2 bg-red-950/40 hover:bg-red-650 text-red-200 hover:text-white text-xs font-semibold rounded-xl border border-red-900/50 hover:border-red-500 cursor-pointer transition-all"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Supported formats: PNG, JPG, WEBP. Max size: 2MB. Logo will be embedded directly in templates.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Default Print Footer Text</label>
              <textarea
                rows={2}
                value={form.footerText || ""}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 text-xs p-3 rounded-xl outline-none transition-all"
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
                <span>Saving Branding...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Branding Configurations</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
