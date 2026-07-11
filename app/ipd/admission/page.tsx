"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdmissionFormSchema, AdmissionFormInput } from "@/modules/ipd/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Bed,
  Search,
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
    name: string;
    designation: string;
  };
};

type DepartmentDropdown = {
  id: string;
  name: string;
  code: string;
  isDeleted: boolean;
};

type BedItem = {
  id: string;
  bedNumber: string;
  status: string;
};

type RoomItem = {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  chargePerDay: string;
  beds: BedItem[];
};

export default function IPDAdmissionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Autocomplete patient search state
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSearchMatch[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchMatch | null>(null);

  // Dropdowns lists
  const [doctors, setDoctors] = useState<DoctorDropdown[]>([]);
  const [departments, setDepartments] = useState<DepartmentDropdown[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(AdmissionFormSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      departmentId: "",
      bedId: "",
      admissionDate: new Date().toISOString().substring(0, 16),
      referredByDoctorId: null,
      isMLC: false,
      mlcNumber: null,
      admissionSource: "DIRECT",
      admissionCategory: "GENERAL",
      initialDepositRequired: 0,
      admissionReason: "Routine IPD Admission",
      attendantName: "None",
      attendantRelationship: "Other",
      attendantMobile: "0000000000",
    },
  });

  const loadMetadata = async () => {
    setLoadingMetadata(true);
    try {
      const docsData = await apiClient<DoctorDropdown[]>("/api/admin/doctors");
      setDoctors(docsData);

      const deptsData = await apiClient<DepartmentDropdown[]>("/api/admin/departments");
      setDepartments(deptsData.filter((d) => !d.isDeleted));

      const roomsData = await apiClient<RoomItem[]>("/api/ipd/beds");
      setRooms(roomsData);
    } catch {
      toast.error("Failed to load metadata required for admission.");
    } finally {
      setLoadingMetadata(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // Live search for matching patients
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
  };

  const onFormSubmit = async (data: AdmissionFormInput) => {
    setSaving(true);
    try {
      const res = await apiClient<{ id: string }>("/api/ipd/admissions", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Patient admitted successfully!");
      router.push(`/ipd/${res.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Admission failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingMetadata) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Synchronizing admission configuration metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header section */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
        <Link
          href="/ipd"
          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">IPD Inpatient Admission</h1>
          <p className="text-xs text-slate-400 mt-0.5">Admit a patient, allocate bed room, and print slip.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
        {/* Step 1: Patient Search & Select */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2">
            <User size={14} />
            <span>1. Patient Search & Verification</span>
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
                <p className="text-red-400 text-[10px] mt-1">{errors.patientId.message as any}</p>
              )}
            </div>
          ) : (
            <div className="bg-emerald-950/15 border border-emerald-900/30 p-4 rounded-xl flex justify-between items-center text-xs text-zinc-300">
              <div>
                <span className="font-bold text-slate-100">{selectedPatient.name}</span>
                <p className="font-mono text-[10px] text-zinc-550 mt-0.5">
                  UHID: {selectedPatient.uhid} | DOB: {new Date(selectedPatient.dob).toLocaleDateString()} | Phone: {selectedPatient.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setValue("patientId", "");
                }}
                className="text-red-400 font-semibold hover:underline text-[10px] cursor-pointer"
              >
                Clear / Change
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Department, Doctor & Date */}
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
              <p className="text-red-400 text-[10px]">{errors.departmentId.message as any}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Admitting Primary Doctor *</label>
            <select
              required
              {...register("doctorId")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
            >
              <option value="">Select Primary Doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.employee.name}
                </option>
              ))}
            </select>
            {errors.doctorId && (
              <p className="text-red-400 text-[10px]">{errors.doctorId.message as any}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Admission Date & Time</label>
            <input
              type="datetime-local"
              {...register("admissionDate")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
            />
          </div>
        </div>

        {/* Step 3: Ward bed room allocation */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-emerald-450 uppercase flex items-center space-x-2">
            <Bed size={14} />
            <span>2. Room & Bed Allocation</span>
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Select Available Bed *</label>
            <select
              required
              {...register("bedId")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
            >
              <option value="">Select Bed Location (Vacant only)</option>
              {rooms.map((room) => {
                const availableBeds = room.beds.filter((b) => b.status === "AVAILABLE");
                if (availableBeds.length === 0) return null;
                return (
                  <optgroup
                    key={room.id}
                    label={`Room: ${room.roomNumber} - Floor ${room.floor} (${room.roomType}) - ₹${room.chargePerDay}/Day`}
                  >
                    {availableBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        Bed: {bed.bedNumber}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {errors.bedId && (
              <p className="text-red-400 text-[10px]">{errors.bedId.message as any}</p>
            )}
          </div>
        </div>

        {/* Actions Submit */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Admitting Inpatient...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Finalize Inpatient Admission</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
