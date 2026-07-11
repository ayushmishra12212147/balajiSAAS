"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MedicineMasterSchema, MedicineMasterFormInput } from "@/modules/pharmacy/schemas";
import {
  Search,
  Plus,
  Loader2,
  Edit2,
  EyeOff,
  Eye,
  AlertTriangle,
} from "lucide-react";

type MedicineType = {
  id: string;
  code: string;
  name: string;
  genericName: string;
  brand: string;
  category: string;
  form: string;
  unit: string;
  hsnCode: string | null;
  gstPercentage: string;
  purchasePrice: string;
  sellingPrice: string;
  minimumStock: number;
  isActive: boolean;
  isExpirable: boolean;
  stock?: {
    id: string;
    batchNumber: string;
    expiryDate: string | null;
    currentQuantity: number;
  }[];
};

export default function MedicineMasterPage() {
  const [medicines, setMedicines] = useState<MedicineType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchName, setSearchName] = useState("");
  const [searchGeneric, setSearchGeneric] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterRecentExpiry, setFilterRecentExpiry] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineType | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MedicineMasterFormInput>({
    resolver: zodResolver(MedicineMasterSchema),
    defaultValues: {
      name: "",
      genericName: "",
      brand: "",
      category: "",
      form: "Tablet",
      unit: "Strips",
      hsnCode: "",
      gstPercentage: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      minimumStock: 0,
      isActive: true,
      isExpirable: true,
      expiryDate: "",
      batchNumber: "",
      initialQuantity: 0,
    },
  });

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        name: searchName,
        genericName: searchGeneric,
        category: filterCategory,
        isActive: filterActive,
        expiringSoon: filterRecentExpiry ? "true" : "false",
        page: page.toString(),
        limit: "10",
      });

      const res = await apiClient<{
        medicines: MedicineType[];
        pagination: { pages: number };
      }>(`/api/pharmacy/medicines?${query.toString()}`);

      setMedicines(res.medicines);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load medicines catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterActive, filterCategory, filterRecentExpiry]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMedicines();
  };

  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    reset({
      name: "",
      genericName: "",
      brand: "",
      category: "",
      form: "Tablet",
      unit: "Strips",
      hsnCode: "",
      gstPercentage: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      minimumStock: 0,
      isActive: true,
      isExpirable: true,
      expiryDate: "",
      batchNumber: "",
      initialQuantity: 0,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (med: MedicineType) => {
    setEditingMedicine(med);
    reset({
      name: med.name,
      genericName: med.genericName,
      brand: med.brand,
      category: med.category,
      form: med.form,
      unit: med.unit,
      hsnCode: med.hsnCode || "",
      gstPercentage: Number(med.gstPercentage),
      purchasePrice: Number(med.purchasePrice),
      sellingPrice: Number(med.sellingPrice),
      minimumStock: med.minimumStock,
      isActive: med.isActive,
      isExpirable: med.isExpirable,
      expiryDate: "",
      batchNumber: "",
      initialQuantity: 0,
    });
    setModalOpen(true);
  };

  const onFormSubmit = async (data: MedicineMasterFormInput) => {
    setSaving(true);
    try {
      if (editingMedicine) {
        // Update Medicine
        await apiClient(`/api/pharmacy/medicines/${editingMedicine.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        toast.success("Medicine catalog card updated.");
      } else {
        // Create Medicine
        await apiClient("/api/pharmacy/medicines", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast.success("New medicine catalog card registered.");
      }
      setModalOpen(false);
      fetchMedicines();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Saving failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveStatus = async (med: MedicineType) => {
    try {
      await apiClient(`/api/pharmacy/medicines/${med.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: med.name,
          genericName: med.genericName,
          brand: med.brand,
          category: med.category,
          form: med.form,
          unit: med.unit,
          hsnCode: med.hsnCode || "",
          gstPercentage: Number(med.gstPercentage),
          purchasePrice: Number(med.purchasePrice),
          sellingPrice: Number(med.sellingPrice),
          minimumStock: med.minimumStock,
          isActive: !med.isActive, // Toggle status
          isExpirable: med.isExpirable,
        }),
      });
      toast.success(`Medicine ${med.name} ${!med.isActive ? "enabled" : "disabled"}.`);
      fetchMedicines();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Medicine Master</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage pharmaceutical catalog cards, categories, HSN tax configurations, and stock alerts limits.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Search Filters */}
      <form onSubmit={handleFilterSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl gap-3 grid grid-cols-1 sm:grid-cols-6 items-end shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-900 uppercase">Medicine Name</label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            placeholder="e.g. Paracetamol"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-900 uppercase">Generic Name</label>
          <input
            type="text"
            value={searchGeneric}
            onChange={(e) => setSearchGeneric(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            placeholder="e.g. Acetaminophen"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-900 uppercase">Category</label>
          <input
            type="text"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            placeholder="e.g. Analgesic"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-900 uppercase">Status</label>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Disabled Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 pb-2.5 select-none">
          <label className="flex items-center space-x-2 font-bold text-red-600 hover:text-red-700 cursor-pointer text-[10px] uppercase">
            <input
              type="checkbox"
              checked={filterRecentExpiry}
              onChange={(e) => setFilterRecentExpiry(e.target.checked)}
              className="rounded border-slate-350 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="animate-pulse">Recent Expiry</span>
          </label>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer h-[34px] transition-all"
        >
          <Search size={13} />
          <span>Apply Filters</span>
        </button>
      </form>

      {/* Main Catalog Table Display */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span>Loading medicines catalog master...</span>
        </div>
      ) : medicines.length === 0 ? (
        <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
          <AlertTriangle size={28} className="text-slate-400" />
          <p className="text-xs font-mono">No matching medicines catalog cards found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Medicine Info</th>
                  <th className="py-3 px-4">Generic Group</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Rates (Pur / Sell)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {med.code}
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-slate-900">{med.name}</span>
                        <div className="text-[10px] text-slate-800 mt-0.5 font-sans">
                          Brand: {med.brand} | Unit: {med.unit}
                        </div>
                        {med.stock && med.stock.length > 0 && med.stock[0].expiryDate && (
                          <div className="text-[10px] text-red-650 font-bold mt-1 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 inline-block">
                            Expiry: {new Date(med.stock[0].expiryDate).toLocaleDateString("en-IN")} ({med.stock[0].batchNumber})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {med.genericName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {med.category}
                      <span className="text-[9px] text-slate-600 block font-normal mt-0.5">
                        Form: {med.form}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      <div>
                        <span className="text-slate-800">₹{Number(med.purchasePrice).toFixed(2)}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-blue-600 font-bold">₹{Number(med.sellingPrice).toFixed(2)}</span>
                        <div className="text-[9px] text-slate-700 font-normal mt-0.5">
                          GST: {Number(med.gstPercentage)}%
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold ${
                          med.isActive
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {med.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(med)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg cursor-pointer transition-all"
                          title="Edit Medicine"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => toggleActiveStatus(med)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                            med.isActive
                              ? "bg-orange-50 hover:bg-orange-100 text-orange-600"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                          }`}
                          title={med.isActive ? "Disable Medicine" : "Enable Medicine"}
                        >
                          {med.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t border-slate-200 p-4 bg-slate-50 text-[11px] font-mono">
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex space-x-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="bg-white border border-slate-350 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="bg-white border border-slate-350 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =======================================================
          FORM MODAL DIALOG
          ======================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4">
              {editingMedicine ? "Modify Medicine Catalog Card" : "Register New Medicine Card"}
            </h3>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    {...register("name")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Paracetamol 650mg"
                  />
                  {errors.name && <p className="text-red-500 text-[9px]">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Generic Name *</label>
                  <input
                    type="text"
                    required
                    {...register("genericName")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Acetaminophen"
                  />
                  {errors.genericName && <p className="text-red-500 text-[9px]">{errors.genericName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Brand *</label>
                  <input
                    type="text"
                    required
                    {...register("brand")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Dolo"
                  />
                  {errors.brand && <p className="text-red-500 text-[9px]">{errors.brand.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Category *</label>
                  <input
                    type="text"
                    required
                    {...register("category")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Antipyretic"
                  />
                  {errors.category && <p className="text-red-500 text-[9px]">{errors.category.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Form *</label>
                  <select
                    {...register("form")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Billing Unit *</label>
                  <input
                    type="text"
                    required
                    {...register("unit")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Strips, Vial, Bottle"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">HSN Code</label>
                  <input
                    type="text"
                    {...register("hsnCode")}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="HSN"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">GST Tax % *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    {...register("gstPercentage", { valueAsNumber: true })}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    {...register("purchasePrice", { valueAsNumber: true })}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    {...register("sellingPrice", { valueAsNumber: true })}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase">Minimum Stock Alert Limit *</label>
                  <input
                    type="number"
                    required
                    {...register("minimumStock", { valueAsNumber: true })}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Optional Initial Stock Configuration */}
              {!editingMedicine && (
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase mb-2">Initial Stock Setup (Optional)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-900 uppercase">Batch Number</label>
                      <input
                        type="text"
                        {...register("batchNumber")}
                        className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                        placeholder="e.g. BAT-01"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-900 uppercase">Expiry Date</label>
                      <input
                        type="date"
                        {...register("expiryDate")}
                        className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-900 uppercase">Initial Quantity</label>
                      <input
                        type="number"
                        {...register("initialQuantity", { valueAsNumber: true })}
                        className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-6 pt-3 pb-3">
                <label className="flex items-center space-x-2 font-semibold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isExpirable")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Medicine features expiry dates</span>
                </label>

                <label className="flex items-center space-x-2 font-semibold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isActive")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active & available for workflows</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl shadow cursor-pointer transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Medicine Card</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
