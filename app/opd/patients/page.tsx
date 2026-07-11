"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  PlusCircle,
  Eye,
  Edit,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Calendar,
  X,
  Save,
  User,
  MapPin,
  PhoneCall,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PatientFormSchema, PatientFormInput } from "@/modules/patients/schemas";
import { Gender, BloodGroup, MaritalStatus } from "@prisma/client";
import Link from "next/link";
import QuickPatientForm from "@/components/quick-patient-form";

type PatientMinimalType = {
  id: string;
  uhid: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  version: number;
  address?: {
    city: string;
  } | null;
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
  photoUrl: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  remarks: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
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

export default function OPDPatientsPage() {
  const [patients, setPatients] = useState<PatientMinimalType[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);

  // Patient detail viewing state
  const [detailPatient, setDetailPatient] = useState<PatientDetailsType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Patient editing form state
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editVersion, setEditVersion] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadPatients = async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const url = `/api/patients?search=${encodeURIComponent(query)}&page=${pageNum}&limit=10`;
      const data = await apiClient<{
        patients: PatientMinimalType[];
        pagination: PaginationMeta;
      }>(url);
      setPatients(data.patients);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load patient records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadPatients(search, page);
    }, 300);
    return () => clearTimeout(handler);
  }, [search, page]);

  // Load details for View Drawer
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

  // Edit details form handling
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<PatientFormInput>({
    resolver: zodResolver(PatientFormSchema),
  });

  useEffect(() => {
    if (!editPatientId) return;
    async function loadEditData() {
      setLoadingEditData(true);
      try {
        const data = await apiClient<PatientDetailsType>(`/api/patients/${editPatientId}`);
        setEditVersion(data.version);
        const dobFormatted = data.dob ? new Date(data.dob).toISOString().split("T")[0] : "";

        resetEdit({
          name: data.name,
          phone: data.phone,
          alternatePhone: data.alternatePhone || "",
          email: data.email || "",
          dob: dobFormatted as unknown as Date,
          gender: data.gender as Gender,
          bloodGroup: data.bloodGroup as BloodGroup | null,
          aadhaarNumber: data.aadhaarNumber || "",
          occupation: data.occupation || "",
          maritalStatus: data.maritalStatus as MaritalStatus | null,
          nationality: data.nationality || "Indian",
          remarks: data.remarks || "",
          photoUrl: data.photoUrl || "",
          addressLine: data.address?.addressLine || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          pincode: data.address?.pincode || "",
          emergencyContactName: data.emergencyContact?.name || "",
          emergencyContactPhone: data.emergencyContact?.phone || "",
          emergencyContactRelation: data.emergencyContact?.relation || "",
          referralType: data.referrals?.[0]?.referralType || "SELF",
          referralName: data.referrals?.[0]?.referralName || "Self",
          referralNotes: data.referrals?.[0]?.referralNotes || "",
          confirmDuplicate: false,
        });
      } catch {
        toast.error("Failed to load patient demographics.");
        setEditPatientId(null);
      } finally {
        setLoadingEditData(false);
      }
    }
    loadEditData();
  }, [editPatientId, resetEdit]);

  const onSaveEdit = async (data: PatientFormInput) => {
    if (!editPatientId) return;
    setSavingEdit(true);
    try {
      await apiClient(`/api/patients/${editPatientId}`, {
        method: "PUT",
        body: JSON.stringify({ ...data, version: editVersion }),
      });
      toast.success("Patient details updated successfully.");
      setEditPatientId(null);
      loadPatients(search, page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save edits.";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const columns = useMemo<ColumnDef<PatientMinimalType>[]>(
    () => [
      {
        header: "UHID",
        accessorKey: "uhid",
        cell: (info) => (
          <span className="font-mono font-bold text-slate-200">{info.getValue() as string}</span>
        ),
      },
      {
        header: "Patient Name",
        accessorKey: "name",
        cell: (info) => <span className="font-semibold text-slate-100">{info.getValue() as string}</span>,
      },
      {
        header: "Gender",
        accessorKey: "gender",
        cell: (info) => <span className="uppercase font-mono text-[10px]">{info.getValue() as string}</span>,
      },
      {
        header: "Age",
        accessorKey: "dob",
        cell: (info) => <span>{calculateAge(info.getValue() as string)} Yrs</span>,
      },
      {
        header: "Mobile Number",
        accessorKey: "phone",
        cell: (info) => <span className="font-mono">{info.getValue() as string}</span>,
      },
      {
        header: "City",
        accessorKey: "address.city",
        cell: (info) => <span>{info.getValue() ? (info.getValue() as string) : "--"}</span>,
      },
      {
        header: "Actions",
        id: "actions",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewPatientId(row.id)}
                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1"
                title="View Details"
              >
                <Eye size={13} />
                <span>View Details</span>
              </button>
              <button
                onClick={() => setEditPatientId(row.id)}
                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1"
                title="Edit Details"
              >
                <Edit size={13} />
                <span>Edit Details</span>
              </button>
              <Link
                href={`/opd/register?patientId=${row.id}`}
                className="p-1.5 bg-slate-900 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/20 hover:border-emerald-600 rounded-xl transition-all cursor-pointer text-xs flex items-center space-x-1 font-semibold"
              >
                <CalendarDays size={13} />
                <span>Schedule OPD</span>
              </Link>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Patient Directory</h1>
          <p className="text-xs text-slate-400">Search and manage electronic patient records within the OPD module</p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <PlusCircle size={15} />
          <span>+ New Patient</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center bg-slate-900/20 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full max-w-md">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 h-full" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-3 outline-none transition-all placeholder-slate-600"
            placeholder="Search patient name, UHID, Phone..."
          />
        </div>
      </div>

      {/* Patients Table Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Scanning Patient Records...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-800/80 bg-slate-950/20">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="p-4 font-semibold text-slate-400 select-none">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4 text-zinc-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {patients.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="text-center p-12 text-zinc-500 font-mono text-xs">
                        No registered patients matching search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border border-slate-800 bg-slate-900/20 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-mono text-slate-400">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total patients)
              </div>
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
            </div>
          )}
        </div>
      )}

      {/* QUICK PATIENT REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <QuickPatientForm
              onSuccess={() => {
                setShowRegisterModal(false);
                loadPatients(search, page);
              }}
              onCancel={() => setShowRegisterModal(false)}
            />
          </div>
        </div>
      )}

      {/* VIEW DETAILS DIALOG/DRAWER */}
      {viewPatientId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
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

            {/* Modal Body & Tabs */}
            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
                <span>Scanning patient profile details...</span>
              </div>
            ) : (
              detailPatient && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Tabs select bar */}
                  <div className="flex items-center space-x-1 border-b border-slate-800 bg-slate-950/30 px-5 py-2">
                    {[
                      { id: "personal", label: "Personal Details" },
                      { id: "address", label: "Address & Contact" },
                      { id: "history", label: "Clinical History Logs" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          activeTab === tab.id
                            ? "bg-slate-800 border-slate-700 text-emerald-400"
                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab contents */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {activeTab === "personal" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><User size={12} className="mr-1.5" />Demographics</h4>
                          <div className="flex justify-between"><span className="text-zinc-500">Name:</span> <span className="text-zinc-300">{detailPatient.name}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Age / DOB:</span> <span className="text-zinc-300 font-mono">{calculateAge(detailPatient.dob)} Yrs ({new Date(detailPatient.dob).toLocaleDateString()})</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Gender:</span> <span className="text-zinc-300 uppercase">{detailPatient.gender}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Blood Group:</span> <span className="text-zinc-300 font-mono">{detailPatient.bloodGroup?.replace("_POSITIVE", "+").replace("_NEGATIVE", "-") || "--"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Marital Status:</span> <span className="text-zinc-300 capitalize">{detailPatient.maritalStatus?.toLowerCase() || "--"}</span></div>
                        </div>

                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><ShieldCheck size={12} className="mr-1.5" />Identifiers & Remarks</h4>
                          <div className="flex justify-between"><span className="text-zinc-500">Aadhaar Number:</span> <span className="text-zinc-300 font-mono">{detailPatient.aadhaarNumber || "--"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Occupation:</span> <span className="text-zinc-300">{detailPatient.occupation || "--"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Nationality:</span> <span className="text-zinc-300">{detailPatient.nationality || "Indian"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Version:</span> <span className="text-zinc-300 font-mono">{detailPatient.version}</span></div>
                          <div className="pt-2 border-t border-slate-900"><span className="text-zinc-500 block mb-0.5">Remarks:</span> <span className="text-zinc-400 italic">{detailPatient.remarks || "No remarks."}</span></div>
                        </div>
                      </div>
                    )}

                    {activeTab === "address" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><MapPin size={12} className="mr-1.5" />Permanent Address</h4>
                          {detailPatient.address ? (
                            <>
                              <div><span className="text-zinc-500 block">Address details:</span><span className="text-zinc-300">{detailPatient.address.addressLine}</span></div>
                              <div className="flex justify-between"><span className="text-zinc-500">City / State:</span><span className="text-zinc-300">{detailPatient.address.city}, {detailPatient.address.state}</span></div>
                              <div className="flex justify-between"><span className="text-zinc-500">Pincode:</span><span className="text-zinc-300 font-mono">{detailPatient.address.pincode}</span></div>
                            </>
                          ) : (
                            <p className="text-zinc-500 italic">No address details logged.</p>
                          )}
                        </div>

                        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-2 text-xs">
                          <h4 className="font-bold text-emerald-400 uppercase tracking-wide text-[10px] mb-2 flex items-center"><PhoneCall size={12} className="mr-1.5" />Emergency & Contact</h4>
                          <div className="flex justify-between"><span className="text-zinc-500">Primary Phone:</span> <span className="text-zinc-300 font-mono">{detailPatient.phone}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Alternate Phone:</span> <span className="text-zinc-300 font-mono">{detailPatient.alternatePhone || "--"}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-500">Email Address:</span> <span className="text-zinc-300">{detailPatient.email || "--"}</span></div>
                          {detailPatient.emergencyContact && (
                            <div className="pt-2 border-t border-slate-900 space-y-1">
                              <span className="text-zinc-500 block text-[10px] font-bold uppercase">Emergency Contact:</span>
                              <div className="flex justify-between"><span className="text-zinc-500">Name:</span> <span className="text-zinc-300">{detailPatient.emergencyContact.name} ({detailPatient.emergencyContact.relation})</span></div>
                              <div className="flex justify-between"><span className="text-zinc-500">Phone:</span> <span className="text-zinc-300 font-mono">{detailPatient.emergencyContact.phone}</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "history" && (
                      <div className="bg-slate-950 border border-slate-850/60 p-6 rounded-xl text-center space-y-2">
                        <Calendar className="w-8 h-8 text-slate-655 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-300">Clinical Logs Placeholder</h4>
                        <p className="text-[10px] text-zinc-500 max-w-md mx-auto leading-relaxed">
                          Clinical logs synchronise automatically with consultations, queue allocations, and laboratory test requests in the patient record ledger.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Modal Footer */}
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

      {/* EDIT PATIENT DETAILS INLINE MODAL */}
      {editPatientId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">Edit Demographics Card</h3>
              <button
                onClick={() => setEditPatientId(null)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {loadingEditData ? (
                <div className="h-64 flex items-center justify-center text-zinc-450 font-mono text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
                  <span>Loading Demographics Editor...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-6">
                  {/* Demographics Block */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center"><User size={13} className="mr-1.5" />1. Personal Demographics</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Full Name *</label>
                        <input
                          type="text"
                          {...registerEdit("name")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        />
                        {editErrors.name && <p className="text-red-400 text-[10px]">{editErrors.name.message}</p>}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Mobile Number *</label>
                        <input
                          type="text"
                          {...registerEdit("phone")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        />
                        {editErrors.phone && <p className="text-red-400 text-[10px]">{editErrors.phone.message}</p>}
                      </div>

                      {/* DOB */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Date of Birth *</label>
                        <input
                          type="date"
                          {...registerEdit("dob")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        />
                        {editErrors.dob && <p className="text-red-400 text-[10px]">{editErrors.dob.message}</p>}
                      </div>

                      {/* Gender */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Gender *</label>
                        <select
                          {...registerEdit("gender")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      {/* Blood Group */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Blood Group</label>
                        <select
                          {...registerEdit("bloodGroup")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        >
                          <option value="">Unknown</option>
                          {Object.values(BloodGroup).map((bg) => (
                            <option key={bg} value={bg}>
                              {bg.replace("_POSITIVE", "+").replace("_NEGATIVE", "-")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Aadhaar Number */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Aadhaar Number</label>
                        <input
                          type="text"
                          {...registerEdit("aadhaarNumber")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        />
                        {editErrors.aadhaarNumber && (
                          <p className="text-red-400 text-[10px]">{editErrors.aadhaarNumber.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center"><MapPin size={13} className="mr-1.5" />2. Address Details</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Address Details Line</label>
                        <input
                          type="text"
                          {...registerEdit("addressLine")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-400">City / Town</label>
                          <input
                            type="text"
                            {...registerEdit("city")}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-400">State</label>
                          <input
                            type="text"
                            {...registerEdit("state")}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-400">Pincode</label>
                          <input
                            type="text"
                            {...registerEdit("pincode")}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center"><ShieldCheck size={13} className="mr-1.5" />3. Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Contact Person Name</label>
                        <input
                          type="text"
                          {...registerEdit("emergencyContactName")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Emergency Phone</label>
                        <input
                          type="text"
                          {...registerEdit("emergencyContactPhone")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">Relationship</label>
                        <input
                          type="text"
                          {...registerEdit("emergencyContactRelation")}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Submission controls */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditPatientId(null)}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-lg cursor-pointer"
                    >
                      {savingEdit ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} className="mr-1.5" />
                          <span>Save Demographics</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
