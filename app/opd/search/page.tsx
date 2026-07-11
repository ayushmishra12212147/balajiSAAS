"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/modules/auth/hooks/use-auth-store";
import { toast } from "sonner";
import {
  Eye,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Printer,
  X,
  User,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type EncounterType = {
  id: string;
  opdId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  consultationDate: string;
  depositAmount: number;
  originalFee: number;
  appliedFee: number;
  tokenNumber: number;
  createdAt: string;
  symptoms?: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  patient: {
    id: string;
    uhid: string;
    name: string;
    phone: string;
    gender: string;
    dob: string;
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

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
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

export default function SearchOPDPage() {
  const { user } = useAuthStore();
  const [encounters, setEncounters] = useState<EncounterType[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter States
  const [opdIdFilter, setOpdIdFilter] = useState("");
  const [uhidFilter, setUhidFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals state
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);
  const [detailPatient, setDetailPatient] = useState<PatientDetailsType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState("personal");

  // Cancellation state
  const [cancelEncounterId, setCancelEncounterId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Print Preview state
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadEncounters = async () => {
    setLoading(true);
    try {
      let url = `/api/opd?page=${page}&limit=${limit}`;
      if (opdIdFilter.trim()) url += `&opdId=${encodeURIComponent(opdIdFilter.trim())}`;
      if (uhidFilter.trim()) url += `&uhid=${encodeURIComponent(uhidFilter.trim())}`;
      if (nameFilter.trim()) url += `&name=${encodeURIComponent(nameFilter.trim())}`;
      if (phoneFilter.trim()) url += `&phone=${encodeURIComponent(phoneFilter.trim())}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await apiClient<{
        encounters: EncounterType[];
        pagination: PaginationMeta;
      }>(url);

      setEncounters(res.encounters);
      setPagination(res.pagination);
    } catch {
      toast.error("Failed to load historical OPD logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadEncounters();
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, opdIdFilter, uhidFilter, nameFilter, phoneFilter, startDate, endDate]);

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

  const handlePrintSlip = useCallback(async (item: EncounterType) => {
    try {
      const printResult = await apiClient<{ renderedPayload: string }>("/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: "opd-slip",
          printData: {
            title: "OPD Consultation Slip",
            timestamp: new Date(item.createdAt).toLocaleString("en-IN"),
            hospitalName: user?.hospitalName || "Shree Ganesha Hospital",
            content: {
              opdId: item.opdId,
              tokenNumber: item.tokenNumber,
              uhid: item.patient.uhid,
              patientName: item.patient.name,
              age: calculateAge(item.patient.dob),
              gender: item.patient.gender,
              doctor: item.doctor.employee.name,
              department: item.department.name,
              visitType: item.cancelledAt ? "CANCELLED" : "Encounter",
              fee: item.appliedFee,
              symptoms: item.symptoms || "N/A",
            },
            footer: "Please wait outside the doctor's room. Retain this slip.",
          },
          options: {
            format: "A4",
          },
        }),
      });

      setPrintPreviewHtml(printResult.renderedPayload);
    } catch {
      toast.error("Failed to compile print slip.");
    }
  }, [user]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelEncounterId || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await apiClient(`/api/opd/${cancelEncounterId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      toast.success("OPD encounter cancelled successfully.");
      setCancelEncounterId(null);
      setCancelReason("");
      loadEncounters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel OPD encounter.";
      toast.error(msg);
    } finally {
      setCancelling(false);
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

  const columns = useMemo<ColumnDef<EncounterType>[]>(
    () => [
      {
        header: "Token #",
        accessorKey: "tokenNumber",
        cell: (info) => <span className="font-bold font-mono text-emerald-400">{info.getValue() as number}</span>,
      },
      {
        header: "OPD ID",
        accessorKey: "opdId",
        cell: (info) => <span className="font-mono font-semibold text-slate-205">{info.getValue() as string}</span>,
      },
      {
        header: "UHID",
        accessorKey: "patient.uhid",
        cell: (info) => <span className="font-mono text-slate-350">{info.getValue() as string}</span>,
      },
      {
        header: "Patient Name",
        accessorKey: "patient.name",
        cell: (info) => <span className="font-semibold text-slate-100">{info.getValue() as string}</span>,
      },
      {
        header: "Doctor / Dept",
        id: "doctorDept",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-medium text-slate-200">{row.doctor.employee.designation}</div>
              <div className="text-[10px] text-zinc-500">{row.department.name}</div>
            </div>
          );
        },
      },
      {
        header: "Fee Paid",
        accessorKey: "appliedFee",
        cell: (info) => <span className="font-mono text-slate-200">₹{Number(info.getValue() || 0).toFixed(2)}</span>,
      },
      {
        header: "Date / Time",
        accessorKey: "consultationDate",
        cell: (info) => <span>{new Date(info.getValue() as string).toLocaleString()}</span>,
      },
      {
        header: "Status",
        id: "status",
        cell: (info) => {
          const row = info.row.original;
          return row.cancelledAt ? (
            <span className="bg-red-955/20 text-red-400 border border-red-900/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold">
              Cancelled
            </span>
          ) : (
            <span className="bg-emerald-955/20 text-emerald-400 border border-emerald-900/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold">
              Active
            </span>
          );
        },
      },
      {
        header: "Actions",
        id: "actions",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewPatientId(row.patient.id)}
                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1"
                title="View Patient details"
              >
                <Eye size={13} />
                <span>Info</span>
              </button>
              <button
                onClick={() => handlePrintSlip(row)}
                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1"
                title="Print OPD slip"
              >
                <Printer size={13} />
                <span>Print</span>
              </button>
              {!row.cancelledAt && (
                <button
                  onClick={() => setCancelEncounterId(row.id)}
                  className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1 font-semibold"
                  title="Cancel Consultation"
                >
                  <Trash2 size={13} />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [handlePrintSlip]
  );

  const table = useReactTable({
    data: encounters,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/opd/register"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Search OPD Consultation Logs</h1>
            <p className="text-xs text-slate-400">Search historical outpatient consultation records and token ledgers</p>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-slate-900/20 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Search Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-bold">OPD ID</label>
            <input
              type="text"
              value={opdIdFilter}
              onChange={(e) => { setOpdIdFilter(e.target.value); setPage(1); }}
              placeholder="e.g. OPD260001"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-455 font-bold">Patient UHID</label>
            <input
              type="text"
              value={uhidFilter}
              onChange={(e) => { setUhidFilter(e.target.value); setPage(1); }}
              placeholder="e.g. SGH2600001"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-455 font-bold">Patient Name</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
              placeholder="Search Name..."
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-455 font-bold">Phone Number</label>
            <input
              type="text"
              value={phoneFilter}
              onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }}
              placeholder="Search Mobile..."
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-455 font-bold">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-455 font-bold">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid List View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Polling OPD Logs directory...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-800/80 bg-slate-950/20 text-slate-450">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="p-4 font-semibold select-none">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-zinc-300">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {encounters.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="text-center p-12 text-zinc-550 font-mono text-xs">
                        No historical OPD registrations match active search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {/* Pagination & Page Size Control */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 bg-slate-900/20 rounded-2xl px-4 py-3">
            <div className="flex items-center space-x-4">
              <div className="text-[10px] font-mono text-slate-400">
                Showing page {pagination.page} of {pagination.pages || 1} ({pagination.total} total consultations)
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <span>Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-[10px] rounded-lg px-2 py-1 outline-none transition-all cursor-pointer font-semibold font-mono"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-350 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-all"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-355 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-all"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CENTRAL PRINT ENGINE PREVIEW MODAL */}
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
            <div className="flex-1 bg-white p-4 relative overflow-hidden">
              <iframe
                ref={iframeRef}
                title="OPD Search Slip Print Preview"
                srcDoc={printPreviewHtml}
                className="w-full h-full border-0"
              />
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end space-x-2">
              <button
                onClick={() => setPrintPreviewHtml(null)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-zinc-350 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
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
    </div>
  );
}
