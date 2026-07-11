"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DoctorFormSchema } from "@/modules/admin/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Stethoscope,
  Search,
  PlusCircle,
  Edit,
  X,
  Loader2,
} from "lucide-react";
import { z } from "zod";

type DoctorType = {
  id: string;
  registrationNumber: string;
  qualification: string;
  specialization: string;
  consultationFee: number;
  roomNumber: string | null;
  dutySchedule: unknown;
  employee: {
    name: string;
    employeeCode: string;
    email: string;
    mobileNumber: string;
    joiningDate: string;
    isActive: boolean;
    department: { name: string } | null;
  };
};

type DepartmentType = {
  id: string;
  name: string;
  code: string;
  isDeleted: boolean;
};

type DoctorFormInput = z.input<typeof DoctorFormSchema>;

/**
 * DoctorDirectory Component
 * Lists, provisions, and updates clinical doctors.
 */
export function DoctorDirectory() {
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DoctorType | null>(null);
  const [saving, setSaving] = useState(false);

  // Forms setup
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<DoctorFormInput>({
    resolver: zodResolver(DoctorFormSchema),
    defaultValues: {
      name: "",
      registrationNumber: "",
      qualification: "",
      specialization: "",
      consultationFee: 0,
      roomNumber: "",
      employeeCode: "",
      email: "",
      passwordRaw: "",
      mobileNumber: "",
      joiningDate: new Date().toISOString().split("T")[0],
    },
  });

  // Edit form excludes Employee initial values (which are managed in the Employee tab)
  const doctorUpdateSchema = DoctorFormSchema.partial({
    employeeCode: true,
    email: true,
    passwordRaw: true,
    mobileNumber: true,
    joiningDate: true,
    departmentId: true,
  });

  type DoctorEditInputs = z.input<typeof doctorUpdateSchema>;

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<DoctorEditInputs>({
    resolver: zodResolver(doctorUpdateSchema),
  });

  const loadData = async () => {
    try {
      const docData = await apiClient<DoctorType[]>("/api/admin/doctors");
      setDoctors(docData);
      
      const deptData = await apiClient<DepartmentType[]>("/api/admin/departments");
      setDepartments(deptData.filter((d) => !d.isDeleted));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load doctor directory.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (data: DoctorFormInput) => {
    setSaving(true);
    try {
      await apiClient("/api/admin/doctors", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Doctor record created successfully.");
      setCreateOpen(false);
      resetCreate();
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create doctor.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: DoctorEditInputs) => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await apiClient(`/api/admin/doctors/${selectedDoc.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Doctor profile updated successfully.");
      setEditOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update doctor.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Filter logic
  const filteredData = useMemo(() => {
    if (!search) return doctors;
    const lower = search.toLowerCase();
    return doctors.filter(
      (d) =>
        d.employee.email.toLowerCase().includes(lower) ||
        d.registrationNumber.toLowerCase().includes(lower) ||
        d.specialization.toLowerCase().includes(lower)
    );
  }, [doctors, search]);

  // Columns definition
  const columns = useMemo<ColumnDef<DoctorType>[]>(
    () => [
      {
        header: "Reg Number",
        accessorKey: "registrationNumber",
        cell: (info) => <span className="font-semibold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Doctor Name",
        accessorKey: "employee.name",
        cell: (info) => <span className="font-bold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Email Address",
        accessorKey: "employee.email",
        cell: (info) => <span className="text-zinc-400">{info.getValue() as string}</span>,
      },
      {
        header: "Specialization",
        accessorKey: "specialization",
      },
      {
        header: "Qualification",
        accessorKey: "qualification",
      },
      {
        header: "Consultation Fee",
        accessorKey: "consultationFee",
        cell: (info) => {
          const val = Number(info.getValue());
          return <span className="tabular-nums">₹{val.toFixed(2)}</span>;
        },
      },
      {
        header: "Room No",
        accessorKey: "roomNumber",
        cell: (info) => <span>{info.getValue() ? (info.getValue() as string) : "--"}</span>,
      },
      {
        header: "Department",
        accessorKey: "employee.department.name",
        cell: (info) => <span>{info.getValue() ? (info.getValue() as string) : "--"}</span>,
      },
      {
        header: "Actions",
        id: "actions",
        cell: (info) => {
          const row = info.row.original;
          return (
            <button
              onClick={() => {
                setSelectedDoc(row);
                resetEdit({
                  name: row.employee.name,
                  registrationNumber: row.registrationNumber,
                  qualification: row.qualification,
                  specialization: row.specialization,
                  consultationFee: Number(row.consultationFee),
                  roomNumber: row.roomNumber || "",
                });
                setEditOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
              title="Edit Doctor Qualifications"
            >
              <Edit size={14} />
            </button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doctors, resetEdit]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Doctor Directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/20 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder-slate-600"
            placeholder="Search reg no, specialization, email..."
          />
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <PlusCircle size={14} />
          <span>Provision Doctor Registry</span>
        </button>
      </div>

      {/* Grid List View */}
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
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-center p-8 text-zinc-500 font-mono">
                    No doctor profiles configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-800 pb-3">
              <Stethoscope size={18} className="text-emerald-400 animate-pulse" />
              <h3 className="text-base font-bold text-slate-100">Provision Doctor Profile</h3>
            </div>
            <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    {...registerCreate("name")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="Dr. Amit Sharma"
                  />
                  {errorsCreate.name && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.name.message}</p>
                  )}
                </div>
                {/* Doctor-specific variables */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Registration Number</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Auto-Generated"
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 text-xs rounded-lg p-2 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Medical Qualification</label>
                  <input
                    type="text"
                    {...registerCreate("qualification")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="MD, MBBS"
                  />
                  {errorsCreate.qualification && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.qualification.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Specialization</label>
                  <input
                    type="text"
                    {...registerCreate("specialization")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="Pediatrician, Cardiologist"
                  />
                  {errorsCreate.specialization && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.specialization.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Consultation Fee (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerCreate("consultationFee", { valueAsNumber: true })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="500.00"
                  />
                  {errorsCreate.consultationFee && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.consultationFee.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Consulting Room / Cabin</label>
                  <input
                    type="text"
                    {...registerCreate("roomNumber")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="Room-102"
                  />
                </div>

                {/* Embedded Employee details */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Clinical Department</label>
                  <select
                    {...registerCreate("departmentId")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  {errorsCreate.departmentId && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.departmentId.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Employee Staff Code</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Auto-Generated"
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 text-xs rounded-lg p-2 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    {...registerCreate("email")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="doctor@hospital.com"
                  />
                  {errorsCreate.email && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.email.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Mobile Number</label>
                  <input
                    type="text"
                    {...registerCreate("mobileNumber")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="9999999999"
                  />
                  {errorsCreate.mobileNumber && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.mobileNumber.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Login Password</label>
                  <input
                    type="password"
                    {...registerCreate("passwordRaw")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="••••••••"
                  />
                  {errorsCreate.passwordRaw && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.passwordRaw.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Joining Date</label>
                  <input
                    type="date"
                    {...registerCreate("joiningDate")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Doctor Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-100 mb-4">Edit Doctor Qualifications</h3>
            <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    {...registerEdit("name")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="Dr. Amit Sharma"
                  />
                  {errorsEdit.name && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Medical Registration Number</label>
                  <input
                    type="text"
                    {...registerEdit("registrationNumber")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                  {errorsEdit.registrationNumber && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.registrationNumber.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Medical Qualification</label>
                  <input
                    type="text"
                    {...registerEdit("qualification")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                  {errorsEdit.qualification && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.qualification.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Specialization</label>
                  <input
                    type="text"
                    {...registerEdit("specialization")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                  {errorsEdit.specialization && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.specialization.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Consultation Fee (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerEdit("consultationFee", { valueAsNumber: true })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                  {errorsEdit.consultationFee && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.consultationFee.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Room / Cabin Number</label>
                  <input
                    type="text"
                    {...registerEdit("roomNumber")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
export default DoctorDirectory;
