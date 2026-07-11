"use client";

import React, { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
  Eye,
  Trash2,
  Edit,
  User,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type OPDEncounter = {
  id: string;
  opdId: string;
  tokenNumber: number;
  consultationDate: string;
  createdAt: string;
  appliedFee: number;
  symptoms?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  doctorId: string;
  departmentId: string;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
    dob: string;
    phone: string;
    address?: string | null;
  };
  doctor: {
    id: string;
    employee: {
      name: string;
      designation: string;
    };
  };
  department: {
    id: string;
    name: string;
  };
};

type PatientDetailsType = {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  dob: string;
  gender: string;
  bloodGroup: string | null;
  aadhaarNumber: string | null;
  occupation: string | null;
  remarks: string | null;
  version: number;
  address?: {
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  } | null;
  referrals?: {
    referralType: string;
    referralName: string;
    referralNotes: string | null;
  }[];
};

function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

export default function TodayOPDRegistrationsPage() {
  const { user } = useAuthStore();
  const [encounters, setEncounters] = useState<OPDEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");

  // Modals state
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);
  const [detailPatient, setDetailPatient] = useState<PatientDetailsType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState("personal");

  // Cancellation state
  const [cancelEncounterId, setCancelEncounterId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Edit Visit state
  const [editEncounter, setEditEncounter] = useState<any | null>(null);
  const [editDoctorId, setEditDoctorId] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Print Preview state
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);
  const [slipHtml, setSlipHtml] = useState<string | null>(null);
  const [consultHtml, setConsultHtml] = useState<string | null>(null);
  const [activePreviewType, setActivePreviewType] = useState<"slip" | "consult">("slip");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadTodayRegistrations = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const url = `/api/opd?startDate=${todayStr}&endDate=${todayStr}&limit=100`;
      const res = await apiClient<{ encounters: OPDEncounter[] }>(url);
      setEncounters(res.encounters);
    } catch {
      toast.error("Failed to load today's registrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayRegistrations();

    // Fetch active doctors and departments for edit modal
    const loadMetadata = async () => {
      try {
        const [deptsData, docsData] = await Promise.all([
          apiClient<any[]>("/api/admin/departments"),
          apiClient<any[]>("/api/admin/doctors")
        ]);
        setDepartments(deptsData.filter((d: any) => !d.isDeleted));
        setDoctors(docsData);
      } catch (err) {
        console.error("Failed to load metadata for edit visit modal", err);
      }
    };
    loadMetadata();
  }, []);

  // Load view patient details
  useEffect(() => {
    if (!viewPatientId) {
      setDetailPatient(null);
      return;
    }
    async function loadDetails() {
      setLoadingDetail(true);
      try {
        const data = await apiClient<PatientDetailsType>(`/api/patients/${viewPatientId}`);
        setDetailPatient(data);
      } catch {
        toast.error("Failed to load patient profile.");
        setViewPatientId(null);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetails();
  }, [viewPatientId]);

  const filteredEncounters = encounters.filter((item) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase().trim();
    return (
      item.patient.name.toLowerCase().includes(q) ||
      item.patient.uhid.toLowerCase().includes(q) ||
      item.opdId.toLowerCase().includes(q)
    );
  });

  const handlePrintSlip = async (item: OPDEncounter) => {
    try {
      // 1. Compile Registration Slip
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: "OPD_REGISTRATION_SLIP",
          printData: {
            title: "OPD Registration Slip",
            timestamp: new Date(item.createdAt).toLocaleString("en-IN"),
            hospitalName: user?.hospitalName || "Shree Ganesha Hospital",
            content: {
              "OPD ID": item.opdId,
              "Token Number": item.tokenNumber,
              "UHID": item.patient.uhid,
              "Patient Name": item.patient.name,
              "Age": calculateAge(item.patient.dob),
              "Gender": item.patient.gender || "--",
              "Doctor": item.doctor.employee.name,
              "Department": item.department.name,
              "Visit Type": item.cancelledAt ? "CANCELLED" : "Encounter",
              "Consultation Fee": item.appliedFee,
              "Symptoms / Remarks": item.symptoms || "N/A",
              "Date": new Date(item.createdAt).toLocaleDateString("en-IN"),
            },
            footer: "Please wait outside the doctor's room. Retain this slip.",
          },
          options: {
            format: "A5",
          },
        }),
      });

      setSlipHtml(printResult.renderedPayload);
      setPrintPreviewHtml(printResult.renderedPayload);
      setActivePreviewType("slip");

      // 2. Compile Consultation Slip
      try {
        const consultResult = await apiClient<{ renderedPayload: string }>("/api/print", {
          method: "POST",
          body: JSON.stringify({
            templateId: "OPD_PRESCRIPTION",
            printData: {
              title: "OPD Consultation Slip",
              timestamp: new Date(item.createdAt).toLocaleString("en-IN"),
              hospitalName: user?.hospitalName || "Shree Ganesha Hospital",
              content: {
                "OPD ID": item.opdId,
                "Token Number": item.tokenNumber,
                "UHID": item.patient.uhid,
                "Patient Name": item.patient.name,
                "Age": calculateAge(item.patient.dob),
                "Gender": item.patient.gender || "--",
                "Doctor": item.doctor.employee.name,
                "Department": item.department.name,
                "Visit Type": item.cancelledAt ? "CANCELLED" : "Encounter",
                "Consultation Fee": item.appliedFee,
                "Symptoms / Remarks": item.symptoms || "N/A",
                "Date": new Date(item.createdAt).toLocaleDateString("en-IN"),
                "Mobile": item.patient.phone || "--",
                "Address": item.patient.address || "--",
              },
              footer: "Please carry this slip during your visit.",
            },
            options: {
              format: "A4",
            },
          }),
        });
        setConsultHtml(consultResult.renderedPayload);
      } catch (err) {
        console.error("Failed to compile consult slip from list", err);
        setConsultHtml(null);
      }
    } catch {
      toast.error("Failed to compile print slip.");
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelEncounterId || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await apiClient(`/api/opd/${cancelEncounterId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      toast.success("OPD visit cancelled successfully.");
      setCancelEncounterId(null);
      setCancelReason("");
      loadTodayRegistrations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel OPD consultation.";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEncounter) return;
    setSavingEdit(true);
    try {
      await apiClient(`/api/opd/${editEncounter.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          doctorId: editDoctorId,
          departmentId: editDepartmentId,
          symptoms: editSymptoms,
        }),
      });
      toast.success("OPD visit updated successfully.");
      setEditEncounter(null);
      loadTodayRegistrations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update OPD visit.";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrintWindow = () => {
    if (!printPreviewHtml) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please allow popups.");
      return;
    }
    printWindow.document.write(printPreviewHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/opd/register"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Today&apos;s Registered Consultations</h1>
            <p className="text-xs text-slate-400">View and audit all OPD encounters logged today</p>
          </div>
        </div>

        <button
          onClick={loadTodayRegistrations}
          className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Search Filter bar */}
      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={14} />
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder-slate-655"
            placeholder="Search patient, UHID, OPD ID..."
          />
        </div>
      </div>

      {/* Grid List Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Polling Today&apos;s Consultation Records...</span>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/20 text-slate-450 font-semibold select-none">
                  <th className="p-4">OPD ID</th>
                  <th className="p-4">Token</th>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Doctor</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Consultation Fee</th>
                  <th className="p-4">Registration Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-zinc-300">
                {filteredEncounters.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-200">{item.opdId}</td>
                    <td className="p-4 font-bold text-emerald-400 font-mono">{item.tokenNumber}</td>
                    <td className="p-4 font-semibold text-slate-100">{item.patient.name}</td>
                    <td className="p-4 font-medium">{item.doctor.employee.designation}</td>
                    <td className="p-4">{item.department.name}</td>
                    <td className="p-4 font-mono">₹{Number(item.appliedFee).toFixed(2)}</td>
                    <td className="p-4 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-4">
                      {item.cancelledAt ? (
                        <span className="text-red-400 bg-red-950/20 border border-red-900/45 px-2 py-0.5 rounded text-[10px] font-bold">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-emerald-400 bg-emerald-950/20 border border-emerald-900/45 px-2 py-0.5 rounded text-[10px] font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewPatientId(item.patient.id)}
                          className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1"
                          title="Open Patient Details"
                        >
                          <Eye size={13} />
                          <span>View Info</span>
                        </button>
                        <button
                          onClick={() => handlePrintSlip(item)}
                          className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1"
                          title="Print OPD Token Slip"
                        >
                          <Printer size={13} />
                          <span>Print Slip</span>
                        </button>
                        {(() => {
                          const elapsed = Date.now() - new Date(item.createdAt).getTime();
                          const isEditable = elapsed < 3 * 60 * 60 * 1000 && !item.cancelledAt;
                          if (!isEditable) return null;
                          return (
                            <button
                              onClick={() => {
                                setEditEncounter(item);
                                setEditDoctorId(item.doctorId);
                                setEditDepartmentId(item.departmentId);
                                setEditSymptoms(item.symptoms || "");
                              }}
                              className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1 font-semibold"
                              title="Edit Visit Details"
                            >
                              <Edit size={13} />
                              <span>Edit Visit</span>
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEncounters.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center p-12 text-zinc-550 font-mono text-xs">
                      No OPD consultations registered today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}      {/* CENTRAL PRINT ENGINE PREVIEW MODAL */}
      {printPreviewHtml && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  <Printer size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Print Preview - OPD Consultation Slip</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">Verify slip layout compile before printer trigger</p>
                </div>
              </div>
              <button
                onClick={() => setPrintPreviewHtml(null)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Print Selection Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-4 py-2 space-x-2">
              <button
                type="button"
                onClick={() => {
                  setActivePreviewType("slip");
                  setPrintPreviewHtml(slipHtml);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePreviewType === "slip"
                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                1. Registration Slip (Landscape A5)
              </button>
              {consultHtml && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePreviewType("consult");
                    setPrintPreviewHtml(consultHtml);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePreviewType === "consult"
                      ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                }`}
                >
                  2. Consultation Slip (Portrait A4)
                </button>
              )}
            </div>

            {/* Modal Iframe body */}
            <div className="flex-1 bg-slate-900/40 p-4 overflow-auto flex justify-center items-center">
              <div 
                className="bg-white shadow-xl border border-slate-800 rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  width: activePreviewType === "slip" ? "700px" : "495px",
                  height: activePreviewType === "slip" ? "495px" : "700px",
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="OPD Today Slip Print Preview"
                  srcDoc={printPreviewHtml || ""}
                  className="w-full h-full border-0"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end space-x-2">
              <button
                onClick={() => setPrintPreviewHtml(null)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-zinc-355 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrintWindow}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Printer size={13} />
                <span>Trigger Print Job</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PATIENT INFO DETAILS DRAWERS */}
      {viewPatientId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-950 border-b border-slate-805 flex items-center justify-between">
              {loadingDetail ? (
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Loading patient details...</span>
                </div>
              ) : (
                detailPatient && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{detailPatient.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      UHID: {detailPatient.uhid} | Gender: {detailPatient.gender}
                    </p>
                  </div>
                )
              )}
              <button
                onClick={() => setViewPatientId(null)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
                <span>Scanning patient profile...</span>
              </div>
            ) : (
              detailPatient && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center space-x-1 border-b border-slate-800 bg-slate-950/30 px-5 py-2">
                    {[
                      { id: "personal", label: "Personal Details" },
                      { id: "address", label: "Address & Contact" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDetailActiveTab(tab.id)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          detailActiveTab === tab.id
                            ? "bg-slate-800 border-slate-700 text-emerald-400"
                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {detailActiveTab === "personal" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><User size={12} className="mr-1.5" />Demographics</h4>
                          <div className="flex justify-between"><span className="text-zinc-500">Name:</span> <span className="text-zinc-300">{detailPatient.name}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Age / DOB:</span> <span className="text-zinc-300 font-mono">{calculateAge(detailPatient.dob)} Yrs ({new Date(detailPatient.dob).toLocaleDateString()})</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Gender:</span> <span className="text-zinc-300 uppercase">{detailPatient.gender}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Blood Group:</span> <span className="text-zinc-300 font-mono">{detailPatient.bloodGroup?.replace("_POSITIVE", "+").replace("_NEGATIVE", "-") || "--"}</span></div>
                        </div>
                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><ShieldCheck size={12} className="mr-1.5" />Details</h4>
                          <div className="flex justify-between"><span className="text-zinc-500">Aadhaar:</span> <span className="text-zinc-300 font-mono">{detailPatient.aadhaarNumber || "--"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Occupation:</span> <span className="text-zinc-300">{detailPatient.occupation || "--"}</span></div>
                          <div className="pt-2 border-t border-slate-900"><span className="text-zinc-500 block mb-0.5">Remarks:</span> <span className="text-zinc-400 italic">{detailPatient.remarks || "No remarks."}</span></div>
                        </div>
                      </div>
                    )}

                    {detailActiveTab === "address" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><MapPin size={12} className="mr-1.5" />Address</h4>
                          {detailPatient.address ? (
                            <>
                              <div><span className="text-zinc-500 block">Address details:</span><span className="text-zinc-300">{detailPatient.address.addressLine}</span></div>
                              <div className="flex justify-between"><span className="text-zinc-500">City / State:</span><span className="text-zinc-300">{detailPatient.address.city}, {detailPatient.address.state}</span></div>
                              <div className="flex justify-between"><span className="text-zinc-500">Pincode:</span><span className="text-zinc-300 font-mono">{detailPatient.address.pincode}</span></div>
                            </>
                          ) : (
                            <p className="text-zinc-550 italic">No address logged.</p>
                          )}
                        </div>

                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><PhoneCall size={12} className="mr-1.5" />Contacts</h4>
                          <div className="flex justify-between"><span className="text-zinc-500">Primary Phone:</span> <span className="text-zinc-300 font-mono">{detailPatient.phone}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Alternate Phone:</span> <span className="text-zinc-300 font-mono">{detailPatient.alternatePhone || "--"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Email Address:</span> <span className="text-zinc-300">{detailPatient.email || "--"}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewPatientId(null)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPD CANCELLATION MODAL POPUP */}
      {cancelEncounterId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setCancelEncounterId(null);
                setCancelReason("");
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-100 mb-2">Cancel OPD Visit Consultation</h3>
            <p className="text-[10px] text-zinc-400 mb-4">
              Provide a valid cancellation reason. Scheduled laboratory tests and diagnostic charges will be automatically voided.
            </p>
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Cancellation Reason *</label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  placeholder="e.g. Patient did not show up / wrong doctor assigned"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCancelEncounterId(null);
                    setCancelReason("");
                  }}
                  className="bg-slate-850 hover:bg-slate-850 border border-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={cancelling || cancelReason.trim().length < 5}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold disabled:opacity-50"
                >
                  {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPD EDIT VISIT MODAL POPUP */}
      {editEncounter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditEncounter(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-100 mb-2">Edit OPD Visit Consultation</h3>
            <p className="text-[10px] text-zinc-400 mb-4">
              Modify the consulting details for this active OPD encounter card. Changes must be finalized within the 3-hour register window.
            </p>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Consulting Doctor *</label>
                <select
                  required
                  value={editDoctorId}
                  onChange={(e) => setEditDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.employee.name} ({doc.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Clinical Department *</label>
                <select
                  required
                  value={editDepartmentId}
                  onChange={(e) => setEditDepartmentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Symptoms / Remarks</label>
                <textarea
                  value={editSymptoms}
                  onChange={(e) => setEditSymptoms(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="Patient's symptoms, clinical history, or registration remarks..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditEncounter(null)}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
