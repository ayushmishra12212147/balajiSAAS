"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  Bed,
  User,
  ArrowLeft,
  Calendar,
  AlertCircle,
  FileText,
  Briefcase,
  Shield,
  Clock,
  Home
} from "lucide-react";
import Link from "next/link";

type PatientType = {
  id: string;
  uhid: string;
  name: string;
  gender: string;
  dob: string;
  bloodGroup?: string | null;
  phone: string;
};

type DoctorDropdown = {
  id: string;
  employee: {
    name: string;
    designation: string;
  };
  specialization: string;
};

type DepartmentDropdown = {
  id: string;
  name: string;
  code: string;
  isDeleted?: boolean;
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
  ward: {
    id: string;
    name: string;
    type: string;
  } | null;
  beds: BedItem[];
};

export default function IPDAdmissionPage() {
  const router = useRouter();

  // Search & Patient Selection
  const [patientSearch, setPatientSearch] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientType[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientType | null>(null);

  // Lookups metadata
  const [doctors, setDoctors] = useState<DoctorDropdown[]>([]);
  const [departments, setDepartments] = useState<DepartmentDropdown[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Form Fields
  const [departmentId, setDepartmentId] = useState("");
  const [attendingDoctorId, setAttendingDoctorId] = useState("");
  const [referredByDoctorId, setRereferredByDoctorId] = useState("");
  const [admissionSource, setAdmissionSource] = useState("DIRECT");
  const [admissionCategory, setAdmissionCategory] = useState("GENERAL");
  const [admissionDateTime, setAdmissionDateTime] = useState(
    new Date().toISOString().substring(0, 16)
  );
  const [initialDepositRequired, setInitialDepositRequired] = useState(0);
  const [isMLC, setIsMLC] = useState(false);
  const [mlcNumber, setMlcNumber] = useState("");
  const [admissionReason, setAdmissionReason] = useState("");
  const [attendantName, setAttendantName] = useState("");
  const [attendantRelationship, setAttendantRelationship] = useState("");
  const [attendantMobile, setAttendantMobile] = useState("");

  // Bed Selection
  const [selectedWardId, setSelectedWardId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Fetch lookups
  useEffect(() => {
    async function loadData() {
      try {
        const [docsData, deptsData, roomsData] = await Promise.all([
          apiClient<any[]>("/api/admin/doctors"),
          apiClient<DepartmentDropdown[]>("/api/admin/departments"),
          apiClient<RoomItem[]>("/api/ipd/beds"),
        ]);
        setDoctors(docsData);
        setDepartments(deptsData.filter((d) => !d.isDeleted));
        setRooms(roomsData);
      } catch (err) {
        toast.error("Failed to load medical metadata directories.");
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadData();
  }, []);

  // Autocomplete patient search
  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientMatches([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await apiClient<{ patients: PatientType[] }>(
          `/api/patients?name=${encodeURIComponent(patientSearch)}&limit=5`
        );
        setPatientMatches(res.patients || []);
      } catch {
        // silent
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [patientSearch]);

  // Group beds by Ward ID
  const wards = useMemo(() => {
    const wardsMap: Record<string, { id: string; name: string; type: string; beds: { id: string; label: string; status: string }[] }> = {};
    rooms.forEach((room) => {
      const ward = room.ward;
      if (!ward) return;
      if (!wardsMap[ward.id]) {
        wardsMap[ward.id] = {
          id: ward.id,
          name: ward.name,
          type: ward.type || "GENERAL",
          beds: [],
        };
      }
      room.beds.forEach((bed) => {
        wardsMap[ward.id].beds.push({
          id: bed.id,
          label: `${room.roomNumber} - Bed ${bed.bedNumber}`,
          status: bed.status,
        });
      });
    });
    return Object.values(wardsMap);
  }, [rooms]);

  // Active beds list in selected ward
  const availableBeds = useMemo(() => {
    if (!selectedWardId) return [];
    const ward = wards.find((w) => w.id === selectedWardId);
    return ward ? ward.beds : [];
  }, [selectedWardId, wards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("Patient selection is required.");
      return;
    }
    if (!departmentId) {
      toast.error("Attending Department is required.");
      return;
    }
    if (!attendingDoctorId) {
      toast.error("Attending Doctor is required.");
      return;
    }
    if (!selectedBedId) {
      toast.error("Target Bed allocation is required.");
      return;
    }
    if (!admissionReason.trim()) {
      toast.error("Reason for Admission is required.");
      return;
    }
    if (!attendantName.trim() || attendantName.length < 2) {
      toast.error("Attendant Name is required (min 2 characters).");
      return;
    }
    if (!attendantRelationship.trim()) {
      toast.error("Relationship description is required.");
      return;
    }
    if (!attendantMobile.trim() || attendantMobile.length < 10) {
      toast.error("Attendant Mobile Number is required (min 10 digits).");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient("/api/ipd/admissions", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: attendingDoctorId,
          departmentId,
          bedId: selectedBedId,
          admissionDate: admissionDateTime ? new Date(admissionDateTime).toISOString() : null,
          referredByDoctorId: referredByDoctorId || null,
          isMLC,
          mlcNumber: isMLC ? mlcNumber : null,
          admissionSource,
          admissionCategory,
          initialDepositRequired: Number(initialDepositRequired),
          admissionReason,
          attendantName,
          attendantRelationship,
          attendantMobile,
        }),
      });

      toast.success("Patient admitted successfully! Bed allocated.");
      router.push("/ipd?tab=active");
    } catch (err: any) {
      toast.error(err.message || "Failed to admit patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Workspace Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/ipd?tab=active"
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
              <span>New Inpatient Admission</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Select demographics, assign clinician departments, and allocate ward beds on a single page.
            </p>
          </div>
        </div>
      </div>

      {loadingMetadata ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading clinical directory metadata...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* STEP 1: PATIENT SELECTION */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-emerald-400 flex items-center space-x-2">
              <User size={15} />
              <span>Step 1: Patient Selection</span>
            </h2>

            <div className="space-y-4">
              <div className="relative">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Search Registered Patient <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Search by name, UHID, or mobile..."
                  />
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                </div>

                {/* Autocomplete Dropdown */}
                {patientMatches.length > 0 && (
                  <div className="absolute z-10 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl divide-y divide-slate-850">
                    {patientMatches.map((pat) => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(pat);
                          setPatientMatches([]);
                          setPatientSearch("");
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-950 text-xs text-slate-200 flex flex-col space-y-0.5"
                      >
                        <span className="font-semibold text-slate-100">{pat.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          UHID: {pat.uhid} | Phone: {pat.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchingPatients && (
                  <div className="absolute right-3 top-7 text-xs text-slate-400 animate-pulse">
                    Searching...
                  </div>
                )}
              </div>

              {/* Selected Patient Preview Card */}
              {selectedPatient ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-100">{selectedPatient.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-[10px] text-red-400 hover:underline font-mono"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-mono text-slate-400">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500">UHID</span>
                      <span className="text-slate-200">{selectedPatient.uhid}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500">DOB</span>
                      <span className="text-slate-200">
                        {new Date(selectedPatient.dob).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500">Gender</span>
                      <span className="text-slate-200">{selectedPatient.gender}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500">Blood Group</span>
                      <span className="text-slate-200">{selectedPatient.bloodGroup || "N/A"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-28 border border-dashed border-slate-850 rounded-xl flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <AlertCircle size={20} className="text-slate-600 mb-1" />
                  <p className="text-[10px] font-mono">No patient selected. Search and select to display demographics.</p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: ADMISSION DETAILS */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-emerald-400 flex items-center space-x-2">
              <FileText size={15} />
              <span>Step 2: Admission & Attendant Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Attending Department <span className="text-red-400">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="">Select Department...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Attending Doctor <span className="text-red-400">*</span>
                </label>
                <select
                  value={attendingDoctorId}
                  onChange={(e) => setAttendingDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.employee.name} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Admission Source <span className="text-red-400">*</span>
                </label>
                <select
                  value={admissionSource}
                  onChange={(e) => setAdmissionSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="DIRECT">Direct Admission</option>
                  <option value="OPD_REFERRAL">OPD Referral</option>
                  <option value="EMERGENCY">Emergency Desk</option>
                  <option value="DOCTOR_REFERRAL">Doctor Reference</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Admission Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={admissionCategory}
                  onChange={(e) => setAdmissionCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="GENERAL">General</option>
                  <option value="PRIVATE">Private</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="GOVERNMENT_SCHEME">Government Scheme</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Admission Date & Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={admissionDateTime}
                  onChange={(e) => setAdmissionDateTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Initial Deposit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialDepositRequired}
                  onChange={(e) => setInitialDepositRequired(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>


              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Referred By Doctor
                </label>
                <select
                  value={referredByDoctorId}
                  onChange={(e) => setRereferredByDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                >
                  <option value="">None / Direct</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.employee.name} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Medico-Legal Case (MLC) Section */}
            <div className="border border-slate-800/80 rounded-xl p-4 bg-slate-900/10 space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMLC}
                  onChange={(e) => setIsMLC(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 outline-none accent-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-300">Medico-Legal Case (MLC)</span>
              </label>

              {isMLC && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    MLC Reference Number
                  </label>
                  <input
                    type="text"
                    value={mlcNumber}
                    onChange={(e) => setMlcNumber(e.target.value)}
                    className="w-full max-w-md bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                    placeholder="e.g. MLC-26-904"
                  />
                </div>
              )}
            </div>

            {/* Reason for Admission */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Reason for Admission <span className="text-red-400">*</span>
              </label>
              <textarea
                value={admissionReason}
                onChange={(e) => setAdmissionReason(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="Initial diagnosis and indicators for inpatient stay..."
              />
            </div>

            {/* Attendant Credentials */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1">
                Attendant Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">
                    Attendant Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                    placeholder="e.g. Sameer Patel"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">
                    Relationship <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={attendantRelationship}
                    onChange={(e) => setAttendantRelationship(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                    placeholder="e.g. Brother, Spouse"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={attendantMobile}
                    onChange={(e) => setAttendantMobile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                    placeholder="10-digit number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: BED ALLOCATION */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-5 lg:col-span-3">
            <h2 className="text-sm font-semibold text-emerald-400 flex items-center space-x-2">
              <Bed size={15} />
              <span>Step 3: Bed Allocation Grid</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Target Ward <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedWardId}
                  onChange={(e) => {
                    setSelectedWardId(e.target.value);
                    setSelectedBedId("");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Ward location...</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.name} ({ward.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bed Button Grid */}
            {selectedWardId ? (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Available Ward Beds
                </span>
                {availableBeds.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono">No beds mapped to this ward.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {availableBeds.map((bed) => {
                      const isOccupied = bed.status !== "AVAILABLE";
                      const isSelected = selectedBedId === bed.id;

                      return (
                        <button
                          key={bed.id}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setSelectedBedId(bed.id)}
                          className={`p-3 text-center border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-semibold cursor-pointer ${
                            isOccupied
                              ? "bg-slate-950 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                              : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <Bed size={14} className={isSelected ? "text-emerald-400" : "text-slate-400"} />
                          <span className="font-mono text-[10px]">{bed.label}</span>
                          <span className={`text-[8px] uppercase font-bold tracking-wider ${
                            isOccupied ? "text-red-500" : isSelected ? "text-emerald-400 animate-pulse" : "text-slate-500"
                          }`}>
                            {isOccupied ? "Occupied" : isSelected ? "Selected" : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-24 border border-dashed border-slate-850 rounded-xl flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <AlertCircle size={18} className="text-slate-600 mb-1" />
                <p className="text-[10px] font-mono">Select a target ward first to display available bed buttons.</p>
              </div>
            )}

            {/* Submit Action */}
            <div className="border-t border-slate-850 pt-5 flex items-center justify-end space-x-3">
              <Link
                href="/ipd?tab=active"
                className="px-4 py-2 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                    <span>Processing Admission...</span>
                  </>
                ) : (
                  <span>Submit Admission</span>
                )}
              </button>
            </div>
          </div>

        </form>
      )}
    </div>
  );
}
