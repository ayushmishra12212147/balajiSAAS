"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OTRegistrationSchema, OTRegistrationInput } from "@/modules/ot/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Search,
  Activity,
  FileText,
} from "lucide-react";
import Link from "next/link";

type PatientSearchMatch = {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  gender: string;
  dob: string;
};

type DoctorDropdown = {
  id: string;
  employee: {
    designation: string;
  };
};

type DepartmentDropdown = {
  id: string;
  name: string;
  isDeleted?: boolean;
};

type ReferenceDropdownItem = {
  id: string;
  label: string; // e.g. "IPD - IPD260001 (Admitted: 2026-06-29)" or "OPD - OPD260001 (Date: 2026-06-29)"
  type: "IPD" | "OPD";
};

export default function OTRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = (searchParams.get("type") || "MINOR") as "MINOR" | "MAJOR";

  const [saving, setSaving] = useState(false);

  // Autocomplete patient search
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSearchMatch[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchMatch | null>(null);

  // Cross references dropdown (IPD / OPD) for selected patient
  const [references, setReferences] = useState<ReferenceDropdownItem[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);

  // General Dropdowns
  const [doctors, setDoctors] = useState<DoctorDropdown[]>([]);
  const [departments, setDepartments] = useState<DepartmentDropdown[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("CUSTOM");
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OTRegistrationInput>({
    resolver: zodResolver(OTRegistrationSchema),
    defaultValues: {
      patientId: "",
      ipdAdmissionId: null,
      opdConsultationId: null,
      operationType: defaultType,
      primarySurgeonId: "",
      assistantSurgeonId: null,
      departmentId: "",
      procedureCatalogId: null,
      operationName: "",
      diagnosis: "",
      scheduledDate: new Date().toISOString().substring(0, 16),
      remarks: "",
    },
  });

  const selectedOpType = watch("operationType", defaultType);

  const loadMetadata = async () => {
    setLoadingMetadata(true);
    try {
      const docsData = await apiClient<DoctorDropdown[]>("/api/admin/doctors");
      setDoctors(docsData);

      const deptsData = await apiClient<DepartmentDropdown[]>("/api/admin/departments");
      setDepartments(deptsData.filter((d) => !d.isDeleted));

      const catsData = await apiClient<any[]>("/api/ipd/charge-catalogs");
      setCatalogs(catsData || []);
    } catch {
      toast.error("Failed to load clinical doctors/departments/catalogs list.");
    } finally {
      setLoadingMetadata(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // Fetch IPD/OPD cross references for patient
  const fetchPatientReferences = async (patId: string, uhid: string) => {
    setLoadingReferences(true);
    try {
      const refsList: ReferenceDropdownItem[] = [];

      // 1. Fetch active IPD admissions
      try {
        const ipds = await apiClient<{ admissions: { id: string; ipdId: string; admissionDate: string }[] }>(
          `/api/ipd/admissions?uhid=${encodeURIComponent(uhid)}&status=ACTIVE`
        );
        ipds.admissions.forEach((ipd) => {
          refsList.push({
            id: ipd.id,
            label: `IPD Admission - Ref: ${ipd.ipdId} (Admitted: ${new Date(ipd.admissionDate).toLocaleDateString()})`,
            type: "IPD",
          });
        });
      } catch {
        // fail silently
      }

      // 2. Fetch OPD consultations
      try {
        const opds = await apiClient<{ opdConsultations: { id: string; opdId: string; consultationDate: string }[] }>(
          `/api/opd?uhid=${encodeURIComponent(uhid)}`
        );
        opds.opdConsultations.forEach((opd) => {
          refsList.push({
            id: opd.id,
            label: `OPD Consultation - Ref: ${opd.opdId} (Dated: ${new Date(opd.consultationDate).toLocaleDateString()})`,
            type: "OPD",
          });
        });
      } catch {
        // fail silently
      }

      setReferences(refsList);

      // Pre-select default type if matches found
      const firstIpd = refsList.find((r) => r.type === "IPD");
      if (firstIpd) {
        setValue("ipdAdmissionId", firstIpd.id);
        setValue("opdConsultationId", null);
      } else {
        const firstOpd = refsList.find((r) => r.type === "OPD");
        if (firstOpd) {
          setValue("opdConsultationId", firstOpd.id);
          setValue("ipdAdmissionId", null);
        }
      }
    } catch {
      toast.error("Failed to load patient visit references.");
    } finally {
      setLoadingReferences(false);
    }
  };

  // Live Patient Autocomplete search
  const triggerPatientSearch = async (val: string) => {
    setPatientSearch(val);
    if (val.trim().length < 2) {
      setPatientMatches([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const res = await apiClient<{ patients: PatientSearchMatch[] }>(
        `/api/patients?name=${encodeURIComponent(val)}&limit=5`
      );
      setPatientMatches(res.patients || []);
    } catch {
      // Slient fail
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatient = (pat: PatientSearchMatch) => {
    setSelectedPatient(pat);
    setValue("patientId", pat.id);
    setPatientMatches([]);
    setPatientSearch("");

    fetchPatientReferences(pat.id, pat.uhid);
  };

  const handleRefSelectionChange = (refId: string) => {
    if (!refId) {
      setValue("ipdAdmissionId", null);
      setValue("opdConsultationId", null);
      return;
    }
    const matched = references.find((r) => r.id === refId);
    if (matched) {
      if (matched.type === "IPD") {
        setValue("ipdAdmissionId", matched.id);
        setValue("opdConsultationId", null);
      } else {
        setValue("opdConsultationId", matched.id);
        setValue("ipdAdmissionId", null);
      }
    }
  };

  const onFormSubmit = async (data: OTRegistrationInput) => {
    setSaving(true);
    try {
      await apiClient("/api/ot", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Surgical booking scheduled successfully!");
      router.push(`/ot?type=${data.operationType}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "OT scheduling failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onValidationError = (errors: any) => {
    console.error("Form validation errors:", errors);
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(firstError.message);
    } else {
      toast.error("Please fill all required fields correctly.");
    }
  };

  if (loadingMetadata) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Synchronizing operation theatre configuration metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header section */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
        <Link
          href={`/ot?type=${defaultType}`}
          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Schedule Surgical Procedure</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Book a scheduled {defaultType === "MAJOR" ? "Major" : "Minor"} surgery.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit, onValidationError)} className="space-y-6 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
        {/* Step 1: Patient Search */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2">
            <User size={14} />
            <span>1. Patient & Demographics Verification</span>
          </h3>

          {!selectedPatient ? (
            <div className="relative">
              <div className="flex items-center bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2">
                <Search size={15} className="text-slate-500 mr-2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => triggerPatientSearch(e.target.value)}
                  className="bg-transparent text-slate-100 text-xs w-full outline-none placeholder-slate-655"
                  placeholder="Search patient by Name or Phone (Type min 2 characters)..."
                />
                {searchingPatients && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
              </div>

              {patientMatches.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl z-50 divide-y divide-slate-900">
                  {patientMatches.map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => handleSelectPatient(pat)}
                      className="w-full text-left p-3 hover:bg-slate-900/60 transition-colors flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{pat.name}</span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          UHID: {pat.uhid} | Phone: {pat.phone}
                        </div>
                      </div>
                      <span className="bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {errors.patientId && (
                <p className="text-red-400 text-[10px] mt-1">{errors.patientId.message}</p>
              )}
            </div>
          ) : (
            <div className="bg-emerald-950/15 border border-emerald-900/30 p-4 rounded-xl flex justify-between items-center text-xs text-zinc-300">
              <div>
                <span className="font-bold text-slate-100">{selectedPatient.name}</span>
                <p className="font-mono text-[10px] text-zinc-550 mt-0.5">
                  UHID: {selectedPatient.uhid} | Phone: {selectedPatient.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setValue("patientId", "");
                  setReferences([]);
                }}
                className="text-red-400 font-semibold hover:underline text-[10px] cursor-pointer"
              >
                Clear / Change
              </button>
            </div>
          )}
        </div>

        {/* Step 2: OPD/IPD Cross-reference verification */}
        {selectedPatient && (
          <div className="space-y-3 pb-6 border-b border-slate-800">
            <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2">
              <FileText size={14} />
              <span>2. Visit Reference Mapping (OPD or IPD Admission) *</span>
            </h3>

            {loadingReferences ? (
              <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>Loading active patient admissions / consultations...</span>
              </div>
            ) : references.length === 0 ? (
              <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-red-400 text-xs leading-normal">
                No active IPD admissions or OPD consultations exist for this patient. You must register an OPD visit or admit the patient to IPD before scheduling surgery.
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400">Map Visit Case *</label>
                <select
                  required
                  onChange={(e) => handleRefSelectionChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none font-mono"
                >
                  <option value="">Select Visit Case Reference</option>
                  {references.map((ref) => (
                    <option key={ref.id} value={ref.id}>
                      {ref.label}
                    </option>
                  ))}
                </select>
                {errors.ipdAdmissionId && (
                  <p className="text-red-400 text-[10px] mt-1">{errors.ipdAdmissionId.message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Clinical Surgeon & Department Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Admitting Department *</label>
            <select
              required
              {...register("departmentId")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.departmentId && (
              <p className="text-red-400 text-[10px]">{errors.departmentId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Primary Surgeon *</label>
            <select
              required
              {...register("primarySurgeonId")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
            >
              <option value="">Select Primary Surgeon</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.employee.designation}
                </option>
              ))}
            </select>
            {errors.primarySurgeonId && (
              <p className="text-red-400 text-[10px]">{errors.primarySurgeonId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Assistant Surgeon (Optional)</label>
            <select
              {...register("assistantSurgeonId")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
            >
              <option value="">Select Assistant Surgeon</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.employee.designation}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 4: Procedure scheduling specifications */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2">
            <Activity size={14} />
            <span>3. Procedure & Date specifications</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">OT Type *</label>
              <select
                required
                {...register("operationType")}
                onChange={(e) => {
                  setValue("operationType", e.target.value as "MINOR" | "MAJOR");
                  setSelectedCatalogId("CUSTOM");
                  setValue("procedureCatalogId", null);
                  setValue("operationName", "");
                }}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
              >
                <option value="MINOR">Minor OT</option>
                <option value="MAJOR">Major OT</option>
              </select>
              {errors.operationType && (
                <p className="text-red-400 text-[10px]">{errors.operationType.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">Select Registered Procedure</label>
              <select
                value={selectedCatalogId}
                onChange={(e) => {
                  const catId = e.target.value;
                  setSelectedCatalogId(catId);
                  if (catId && catId !== "CUSTOM") {
                    const cat = catalogs.find((c) => c.id === catId);
                    if (cat) {
                      setValue("procedureCatalogId", cat.id);
                      setValue("operationName", cat.name);
                    }
                  } else {
                    setValue("procedureCatalogId", null);
                    setValue("operationName", "");
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
              >
                <option value="CUSTOM">Custom / Unregistered Procedure</option>
                {catalogs
                  .filter((cat) => cat.otType === selectedOpType)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (₹{Number(cat.rate).toFixed(2)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                required
                {...register("scheduledDate")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">Procedure Name *</label>
              <input
                type="text"
                required
                {...register("operationName")}
                readOnly={selectedCatalogId !== "CUSTOM"}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none disabled:opacity-60"
                placeholder="e.g. Appendectomy, Cataract surgery"
              />
              {errors.operationName && (
                <p className="text-red-400 text-[10px]">{errors.operationName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Clinical Diagnosis *</label>
            <textarea
              required
              rows={3}
              {...register("diagnosis")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl p-3 outline-none placeholder-slate-655"
              placeholder="e.g. Acute Appendicitis, Senile Nuclear Cataract"
            />
            {errors.diagnosis && (
              <p className="text-red-400 text-[10px]">{errors.diagnosis.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Additional Remarks (Optional)</label>
            <textarea
              rows={2}
              {...register("remarks")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl p-2.5 outline-none placeholder-slate-655"
              placeholder="Post-op instructions, consumables specifications..."
            />
          </div>
        </div>

        {/* Actions submit */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving || !selectedPatient || references.length === 0}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling OT...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Finalize OT Schedule</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
