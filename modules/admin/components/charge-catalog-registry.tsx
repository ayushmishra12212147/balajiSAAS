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
import { ChargeCatalogFormSchema } from "@/modules/admin/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  PlusCircle,
  Edit,
  X,
  CheckCircle,
  Loader2,
  DollarSign,
} from "lucide-react";
import { z } from "zod";

type ChargeCatalogType = {
  id: string;
  code: string;
  name: string;
  category: string;
  rate: number;
  isDeleted: boolean;
  otType?: "MINOR" | "MAJOR" | null;
};

type ChargeCatalogFormInput = z.infer<typeof ChargeCatalogFormSchema>;

export function ChargeCatalogRegistry() {
  const [catalogs, setCatalogs] = useState<ChargeCatalogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<ChargeCatalogType | null>(null);
  const [saving, setSaving] = useState(false);

  // Forms setup
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<ChargeCatalogFormInput>({
    resolver: zodResolver(ChargeCatalogFormSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "",
      rate: 0,
      otType: null,
      isDeleted: false,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<ChargeCatalogFormInput>({
    resolver: zodResolver(ChargeCatalogFormSchema),
  });

  const loadData = async () => {
    try {
      const data = await apiClient<ChargeCatalogType[]>("/api/admin/charge-catalogs");
      setCatalogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load charge catalog.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (data: ChargeCatalogFormInput) => {
    setSaving(true);
    try {
      await apiClient("/api/admin/charge-catalogs", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Charge catalog item created successfully.");
      setCreateOpen(false);
      resetCreate();
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create charge item.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: ChargeCatalogFormInput) => {
    if (!selectedCatalog) return;
    setSaving(true);
    try {
      await apiClient(`/api/admin/charge-catalogs/${selectedCatalog.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Charge catalog item updated successfully.");
      setEditOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update charge item.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Filter logic
  const filteredData = useMemo(() => {
    if (!search) return catalogs;
    const lower = search.toLowerCase();
    return catalogs.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.code.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower)
    );
  }, [catalogs, search]);

  // Columns definition
  const columns = useMemo<ColumnDef<ChargeCatalogType>[]>(
    () => [
      {
        header: "Item Code",
        accessorKey: "code",
        cell: (info) => <span className="font-mono text-slate-300 font-semibold">{info.getValue() as string}</span>,
      },
      {
        header: "Name",
        accessorKey: "name",
        cell: (info) => <span className="text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Category",
        accessorKey: "category",
        cell: (info) => <span className="text-slate-400 text-[11px]">{info.getValue() as string}</span>,
      },
      {
        header: "Standard Rate",
        accessorKey: "rate",
        cell: (info) => <span className="font-mono text-emerald-400 font-medium">₹{Number(info.getValue()).toFixed(2)}</span>,
      },
      {
        header: "OT Category",
        accessorKey: "otType",
        cell: (info) => {
          const otType = info.getValue() as string | null;
          if (!otType) return <span className="text-zinc-650">-</span>;
          return (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
              otType === "MINOR"
                ? "bg-blue-950/40 text-blue-400 border border-blue-900/30"
                : "bg-purple-950/40 text-purple-400 border border-purple-900/30"
            }`}>
              {otType === "MINOR" ? "Minor" : "Major"}
            </span>
          );
        },
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
                setSelectedCatalog(row);
                resetEdit({
                  name: row.name,
                  code: row.code,
                  category: row.category,
                  rate: Number(row.rate),
                  otType: row.otType || null,
                  isDeleted: row.isDeleted,
                });
                setEditOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
              title="Edit Item"
            >
              <Edit size={12} />
              <span className="text-[10px]">Edit</span>
            </button>
          );
        },
      },
    ],
    [resetEdit]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-xs font-mono">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
        <span>Syncing charges master catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex-1 w-full max-w-sm relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            size={14}
          />
          <input
            type="text"
            placeholder="Filter catalog by name, code, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-lg transition-all shrink-0"
        >
          <PlusCircle size={14} />
          <span>Provision New Charge</span>
        </button>
      </div>

      {/* Main Table view */}
      <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-850 bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400 select-none"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-4 font-semibold">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-850">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-900/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center p-8 text-zinc-550 italic"
                >
                  No clinical charge items found matching the filter query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setCreateOpen(false);
                resetCreate();
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
              Provision New Charge Item
            </h3>

            <form
              onSubmit={handleSubmitCreate(handleCreate)}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Item Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IPD_WARD_SPECIAL"
                  {...registerCreate("code")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none font-mono"
                />
                {errorsCreate.code && (
                  <p className="text-red-400 text-[10px]">{errorsCreate.code.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Deluxe Room Rent"
                  {...registerCreate("name")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                />
                {errorsCreate.name && (
                  <p className="text-red-400 text-[10px]">{errorsCreate.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Category *
                  </label>
                  <select
                    required
                    {...registerCreate("category")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="Ward Rent">Ward Rent</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Nursing">Nursing</option>
                    <option value="OT">OT Services</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                  {errorsCreate.category && (
                    <p className="text-red-400 text-[10px]">{errorsCreate.category.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    {...registerCreate("rate", { valueAsNumber: true })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none font-mono"
                  />
                  {errorsCreate.rate && (
                    <p className="text-red-400 text-[10px]">{errorsCreate.rate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  OT Category Mapping (Optional)
                </label>
                <select
                  {...registerCreate("otType")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                >
                  <option value="">None (Not an OT Procedure)</option>
                  <option value="MINOR">Minor OT Procedure</option>
                  <option value="MAJOR">Major OT Procedure</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreate();
                  }}
                  className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {saving ? "Creating..." : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedCatalog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
              Modify Charge Catalog Item
            </h3>

            <form
              onSubmit={handleSubmitEdit(handleEdit)}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Item Code *
                </label>
                <input
                  type="text"
                  required
                  {...registerEdit("code")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none font-mono"
                />
                {errorsEdit.code && (
                  <p className="text-red-400 text-[10px]">{errorsEdit.code.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  {...registerEdit("name")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                />
                {errorsEdit.name && (
                  <p className="text-red-400 text-[10px]">{errorsEdit.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Category *
                  </label>
                  <select
                    required
                    {...registerEdit("category")}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="Ward Rent">Ward Rent</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Nursing">Nursing</option>
                    <option value="OT">OT Services</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                  {errorsEdit.category && (
                    <p className="text-red-400 text-[10px]">{errorsEdit.category.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    {...registerEdit("rate", { valueAsNumber: true })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none font-mono"
                  />
                  {errorsEdit.rate && (
                    <p className="text-red-400 text-[10px]">{errorsEdit.rate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  OT Category Mapping (Optional)
                </label>
                <select
                  {...registerEdit("otType")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                >
                  <option value="">None (Not an OT Procedure)</option>
                  <option value="MINOR">Minor OT Procedure</option>
                  <option value="MAJOR">Major OT Procedure</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Service Availability Status
                </label>
                <select
                  {...registerEdit("isDeleted")}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none"
                  onChange={(e) => resetEdit((prev) => ({ ...prev, isDeleted: e.target.value === "true" }))}
                >
                  <option value="false">Active / Available</option>
                  <option value="true">Disabled / Soft Deleted</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
