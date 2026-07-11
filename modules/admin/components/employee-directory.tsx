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
import { EmployeeFormSchema } from "@/modules/admin/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  KeyRound,
  Unlock,
  Edit,
  ShieldCheck,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { z } from "zod";
import { PermissionsManager } from "./permissions-manager";

type EmployeeType = {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  role: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "EMPLOYEE";
  designation: string;
  departmentId: string | null;
  department?: { name: string } | null;
  mobileNumber: string;
  joiningDate: string;
  isActive: boolean;
  lockedUntil: string | null;
  failedLoginCount: number;
};

type DepartmentType = {
  id: string;
  name: string;
  code: string;
  isDeleted: boolean;
};

type EmployeeFormInput = z.input<typeof EmployeeFormSchema>;

/**
 * EmployeeDirectory Component
 * Lists, creates, updates, resets password, and unlocks employee accounts.
 */
export function EmployeeDirectory() {
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<EmployeeType | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeType | null>(null);
  const [saving, setSaving] = useState(false);

  // Forms setup
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<EmployeeFormInput>({
    resolver: zodResolver(EmployeeFormSchema),
    defaultValues: {
      name: "",
      employeeCode: "",
      email: "",
      passwordRaw: "",
      role: "EMPLOYEE",
      designation: "",
      departmentId: null,
      mobileNumber: "",
      joiningDate: new Date().toISOString().split("T")[0],
      isActive: true,
    },
  });

  const employeeUpdateSchema = EmployeeFormSchema.partial({ passwordRaw: true });
  type EmployeeEditInputs = z.input<typeof employeeUpdateSchema>;

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<EmployeeEditInputs>({
    resolver: zodResolver(employeeUpdateSchema),
  });

  const [newPassword, setNewPassword] = useState("");

  const loadData = async () => {
    try {
      const empData = await apiClient<EmployeeType[]>("/api/admin/employees");
      setEmployees(empData);
      
      const deptData = await apiClient<DepartmentType[]>("/api/admin/departments");
      // Filter out deleted departments
      setDepartments(deptData.filter((d) => !d.isDeleted));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load directory data.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (data: EmployeeFormInput) => {
    setSaving(true);
    try {
      await apiClient("/api/admin/employees", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Employee account created successfully.");
      setCreateOpen(false);
      resetCreate();
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create employee.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: EmployeeEditInputs) => {
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      await apiClient(`/api/admin/employees/${selectedEmployee.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Employee profile updated successfully.");
      setEditOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update employee.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    setSaving(true);
    try {
      await apiClient(`/api/admin/employees/${selectedEmployee.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ passwordRaw: newPassword }),
      });
      toast.success("Password reset successfully. Active sessions revoked.");
      setResetOpen(false);
      setNewPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      await apiClient(`/api/admin/employees/${id}/unlock`, {
        method: "POST",
      });
      toast.success("Employee account unlocked successfully.");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unlock account.";
      toast.error(msg);
    }
  };

  // Filter logic
  const filteredData = useMemo(() => {
    if (!search) return employees;
    const lower = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.email.toLowerCase().includes(lower) ||
        e.employeeCode.toLowerCase().includes(lower) ||
        e.designation.toLowerCase().includes(lower)
    );
  }, [employees, search]);

  // React Table Columns
  const columns = useMemo<ColumnDef<EmployeeType>[]>(
    () => [
      {
        header: "Full Name",
        accessorKey: "name",
        cell: (info) => <span className="font-bold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Staff Code",
        accessorKey: "employeeCode",
        cell: (info) => <span className="font-semibold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Email Address",
        accessorKey: "email",
        cell: (info) => <span className="text-zinc-400">{info.getValue() as string}</span>,
      },
      {
        header: "Role Type",
        accessorKey: "role",
        cell: (info) => (
          <span className="bg-slate-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700/60 uppercase">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        header: "Designation",
        accessorKey: "designation",
      },
      {
        header: "Department",
        accessorKey: "department.name",
        cell: (info) => <span>{info.getValue() ? (info.getValue() as string) : "--"}</span>,
      },
      {
        header: "Status",
        accessorKey: "isActive",
        cell: (info) => {
          const active = info.getValue() as boolean;
          const locked = info.row.original.lockedUntil && new Date(info.row.original.lockedUntil) > new Date();

          if (locked) {
            return (
              <span className="flex items-center space-x-1.5 text-amber-400 text-xs">
                <AlertTriangle size={12} className="animate-pulse" />
                <span>Locked</span>
              </span>
            );
          }
          return active ? (
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
          const locked = row.lockedUntil && new Date(row.lockedUntil) > new Date();

          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedEmployee(row);
                  resetEdit({
                    name: row.name,
                    employeeCode: row.employeeCode,
                    email: row.email,
                    role: row.role,
                    designation: row.designation,
                    departmentId: row.departmentId,
                    mobileNumber: row.mobileNumber,
                    joiningDate: new Date(row.joiningDate).toISOString().split("T")[0],
                    isActive: row.isActive,
                  });
                  setEditOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                title="Edit Employee"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => {
                  setSelectedEmployee(row);
                  setResetOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                title="Reset Password"
              >
                <KeyRound size={14} />
              </button>
              {locked && (
                <button
                  onClick={() => handleUnlock(row.id)}
                  className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 rounded transition-all cursor-pointer"
                  title="Unlock Account"
                >
                  <Unlock size={14} />
                </button>
              )}
              <button
                onClick={() => setPermissionUser(row)}
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                title="Permissions Mappings"
              >
                <ShieldCheck size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, resetEdit]
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
        <span>Loading Employee Directory...</span>
      </div>
    );
  }

  // Check if Permission Matrix page is requested via action button
  if (permissionUser) {
    return (
      <PermissionsManager
        employeeId={permissionUser.id}
        employeeEmail={permissionUser.email}
        employeeCode={permissionUser.employeeCode}
        onBack={() => {
          setPermissionUser(null);
          loadData();
        }}
      />
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
            placeholder="Search email, code, designation..."
          />
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <UserPlus size={14} />
          <span>Provision New Employee</span>
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
                    No employees matching the search filters.
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-100 mb-4">Provision Employee Account</h3>
            <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    {...registerCreate("name")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="John Doe"
                  />
                  {errorsCreate.name && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Employee Code</label>
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
                    placeholder="doc@hospital.com"
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
                  <label className="text-[10px] font-semibold text-slate-400">Security Password</label>
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
                  <label className="text-[10px] font-semibold text-slate-400">System Role</label>
                  <select
                    {...registerCreate("role")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  >
                    <option value="EMPLOYEE">Employee Staff</option>
                    <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Designation</label>
                  <input
                    type="text"
                    {...registerCreate("designation")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="Receptionist, Doctor, etc."
                  />
                  {errorsCreate.designation && (
                    <p className="text-red-400 text-[9px]">{errorsCreate.designation.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Clinical Department</label>
                  <select
                    {...registerCreate("departmentId")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  >
                    <option value="">None (Non-Clinical)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
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
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-100 mb-4">Edit Staff Profile</h3>
            <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    {...registerEdit("name")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                    placeholder="John Doe"
                  />
                  {errorsEdit.name && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Employee Code</label>
                  <input
                    type="text"
                    disabled
                    {...registerEdit("employeeCode")}
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 text-xs rounded-lg p-2 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    disabled
                    {...registerEdit("email")}
                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 text-xs rounded-lg p-2 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Mobile Number</label>
                  <input
                    type="text"
                    {...registerEdit("mobileNumber")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                  {errorsEdit.mobileNumber && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.mobileNumber.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">System Role</label>
                  <select
                    {...registerEdit("role")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  >
                    <option value="EMPLOYEE">Employee Staff</option>
                    <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Designation</label>
                  <input
                    type="text"
                    {...registerEdit("designation")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  />
                  {errorsEdit.designation && (
                    <p className="text-red-400 text-[9px]">{errorsEdit.designation.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Clinical Department</label>
                  <select
                    {...registerEdit("departmentId")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2 outline-none"
                  >
                    <option value="">None (Non-Clinical)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Account Active Status</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      {...registerEdit("isActive")}
                      className="w-4 h-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                    />
                    <label htmlFor="isActive" className="text-xs text-slate-300">
                      Enable Employee access. Deactivating instantly logs them out.
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
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Updates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setResetOpen(false);
                setNewPassword("");
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-100 mb-2">Override Credentials</h3>
            <p className="text-[10px] text-zinc-400 mb-4">
              Enter a new secure password for <strong className="text-zinc-200">{selectedEmployee?.email}</strong>.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">New Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(false);
                    setNewPassword("");
                  }}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default EmployeeDirectory;
