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
import { DepartmentFormSchema } from "@/modules/admin/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  PlusCircle,
  Edit,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { z } from "zod";

type DepartmentType = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isDeleted: boolean;
};

type DepartmentFormInput = z.infer<typeof DepartmentFormSchema>;

const PRESET_DEPARTMENTS = [
  { name: "Medicine", code: "MED", description: "General medicine" },
  { name: "Surgery", code: "SURG", description: "Surgical care" },
  { name: "Pediatrics", code: "PED", description: "Children wellness" },
  { name: "Orthopedic", code: "ORTHO", description: "Bone & joint care" },
  { name: "Obstetrics & Gynecology", code: "OBGYN", description: "Maternal & OBGYN care" },
  { name: "ENT", code: "ENT", description: "Ear, nose & throat" },
  { name: "Ophthalmology", code: "OPHTH", description: "Ophthalmic & eye health" },
  { name: "Dermatology", code: "DERM", description: "Skin wellness" },
  { name: "Psychiatry", code: "PSYCH", description: "Mental health" },
  { name: "Emergency", code: "EMER", description: "24/7 urgent care" },
  { name: "Dental", code: "DENT", description: "Dental & oral care" },
];

/**
 * DepartmentRegistry Component
 * Lists, provisions, and updates clinical departments.
 */
export function DepartmentRegistry() {
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentType | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  // Forms setup
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<DepartmentFormInput>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isDeleted: false,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<DepartmentFormInput>({
    resolver: zodResolver(DepartmentFormSchema),
  });

  const loadData = async () => {
    try {
      const data = await apiClient<DepartmentType[]>("/api/admin/departments");
      setDepartments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load departments.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (data: DepartmentFormInput) => {
    setSaving(true);
    try {
      await apiClient("/api/admin/departments", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Department created successfully.");
      setCreateOpen(false);
      resetCreate();
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create department.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: DepartmentFormInput) => {
    if (!selectedDept) return;
    setSaving(true);
    try {
      await apiClient(`/api/admin/departments/${selectedDept.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Department updated successfully.");
      setEditOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update department.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreset = async (preset: { name: string; code: string; description: string }) => {
    const existing = departments.find((d) => d.code === preset.code);
    
    setToggling((prev) => ({ ...prev, [preset.code]: true }));
    try {
      if (existing) {
        // Toggle its deleted status (if currently active, set isDeleted=true, else false)
        const updatedStatus = !existing.isDeleted;
        await apiClient(`/api/admin/departments/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: existing.name,
            code: existing.code,
            description: existing.description || "",
            isDeleted: updatedStatus,
          }),
        });
        toast.success(
          `Department '${preset.name}' has been ${updatedStatus ? "disabled" : "activated"} successfully.`
        );
      } else {
        // Create the department
        await apiClient("/api/admin/departments", {
          method: "POST",
          body: JSON.stringify({
            name: preset.name,
            code: preset.code,
            description: preset.description,
            isDeleted: false,
          }),
        });
        toast.success(`Department '${preset.name}' has been created and activated.`);
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle department status.";
      toast.error(msg);
    } finally {
      setToggling((prev) => ({ ...prev, [preset.code]: false }));
    }
  };

  // Filter logic
  const filteredData = useMemo(() => {
    if (!search) return departments;
    const lower = search.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        d.code.toLowerCase().includes(lower)
    );
  }, [departments, search]);

  // Columns definition
  const columns = useMemo<ColumnDef<DepartmentType>[]>(
    () => [
      {
        header: "Dept Code",
        accessorKey: "code",
        cell: (info) => <span className="font-semibold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Department Name",
        accessorKey: "name",
      },
      {
        header: "Description",
        accessorKey: "description",
        cell: (info) => <span>{info.getValue() ? (info.getValue() as string) : "--"}</span>,
      },
      {
        header: "Status",
        accessorKey: "isDeleted",
        cell: (info) => {
          const disabled = info.getValue() as boolean;
          return !disabled ? (
            <span className="flex items-center space-x-1.5 text-emerald-400 text-xs">
              <CheckCircle size={12} />
              <span>Active</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 text-zinc-500 text-xs">
              <X size={12} />
              <span>Disabled</span>
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
            <button
              onClick={() => {
                setSelectedDept(row);
                resetEdit({
                  name: row.name,
                  code: row.code,
                  description: row.description || "",
                  isDeleted: row.isDeleted,
                });
                setEditOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
              title="Edit Department"
            >
              <Edit size={14} />
            </button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, resetEdit]
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
        <span>Loading Department Registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Dashboard for Preset Clinical Departments */}
      <div className="bg-slate-900/10 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Clinical Department Presets Switchboard</span>
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1">
            Toggle preset standard clinical departments to instantly activate or disable them across the HMS system.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {PRESET_DEPARTMENTS.map((preset) => {
            const match = departments.find((d) => d.code === preset.code);
            const isActive = match ? !match.isDeleted : false;
            const isLoading = toggling[preset.code] === true;

            return (
              <div
                key={preset.code}
                onClick={() => !isLoading && handleTogglePreset(preset)}
                className={`bg-slate-950/40 border rounded-2xl p-4 transition-all duration-300 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between h-[120px] group shadow-lg cursor-pointer ${
                  isLoading
                    ? "opacity-50 pointer-events-none border-slate-800"
                    : isActive
                    ? "border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-950/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Glow effect on active hover */}
                {isActive && (
                  <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}

                <div className="flex items-center justify-between w-full relative z-10">
                  <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-md ${
                    isActive 
                      ? "bg-emerald-950/40 border border-emerald-900/30 text-emerald-400" 
                      : "bg-slate-900 border border-slate-800 text-slate-500 group-hover:text-slate-400"
                  }`}>
                    {preset.code}
                  </span>
                  
                  {/* Switch Toggle */}
                  <div className="flex items-center">
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 flex items-center relative ${
                        isActive ? "bg-emerald-500/25 border border-emerald-500/35" : "bg-slate-900 border border-slate-850"
                      }`}>
                        <div className={`w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${
                          isActive ? "translate-x-3.5 bg-emerald-400" : "translate-x-0 bg-slate-500"
                        }`} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="font-bold text-xs text-slate-350 group-hover:text-slate-100 transition-colors">
                    {preset.name}
                  </h4>
                  <p className="text-[9px] text-zinc-550 line-clamp-1 mt-0.5">
                    {preset.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/20 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 h-full" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder-slate-600"
            placeholder="Search code, name..."
          />
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <PlusCircle size={14} />
          <span>Add Clinical Department</span>
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
                    No departments configured.
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-100 mb-4">Add Department</h3>
            <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Department Name</label>
                  <input
                    type="text"
                    {...registerCreate("name")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none"
                    placeholder="Pediatrics"
                  />
                  {errorsCreate.name && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Code (Alphanumeric, Uppercase)</label>
                  <input
                    type="text"
                    {...registerCreate("code")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none uppercase"
                    placeholder="PED"
                  />
                  {errorsCreate.code && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.code.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Description</label>
                  <textarea
                    {...registerCreate("description")}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none resize-none"
                    placeholder="Children wellness department..."
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
                  <span>Save Department</span>
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
            <h3 className="text-base font-bold text-slate-100 mb-4">Edit Department Details</h3>
            <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Department Name</label>
                  <input
                    type="text"
                    {...registerEdit("name")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none"
                  />
                  {errorsEdit.name && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Code (Alphanumeric, Uppercase)</label>
                  <input
                    type="text"
                    {...registerEdit("code")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none uppercase"
                  />
                  {errorsEdit.code && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.code.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Description</label>
                  <textarea
                    {...registerEdit("description")}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Active Status</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDeleted"
                      {...registerEdit("isDeleted")}
                      className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                    />
                    <label htmlFor="isDeleted" className="text-xs text-slate-300">
                      Disable department (requires active doctors reassignment first)
                    </label>
                  </div>
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
export default DepartmentRegistry;
