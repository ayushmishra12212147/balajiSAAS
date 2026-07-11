"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  AlertTriangle,
  Activity,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

type InventorySummaryItem = {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: string;
  brand: string;
  unit: string;
  minimumStock: number;
  isActive: boolean;
  sellingPrice: string;
  purchasePrice: string;
  currentStock: number;
  isLowStock: boolean;
};

type BatchStockItem = {
  id: string;
  batchNumber: string;
  expiryDate: string | null;
  currentQuantity: number;
  purchaseRate: string;
  sellingRate: string;
};

export default function InventoryDashboardPage() {
  const [inventory, setInventory] = useState<InventorySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchName, setSearchName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal batches history
  const [selectedMed, setSelectedMed] = useState<InventorySummaryItem | null>(null);
  const [batches, setBatches] = useState<BatchStockItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        name: searchName,
        category: filterCategory,
        page: page.toString(),
        limit: "10",
      });
      const res = await apiClient<{
        inventory: InventorySummaryItem[];
        pagination: { pages: number };
      }>(`/api/pharmacy/inventory?${query.toString()}`);
      setInventory(res.inventory);
      setTotalPages(res.pagination.pages || 1);
    } catch {
      toast.error("Failed to load inventory levels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  const handleOpenDetails = async (med: InventorySummaryItem) => {
    setSelectedMed(med);
    setLoadingBatches(true);
    try {
      const res = await apiClient<BatchStockItem[]>(`/api/pharmacy/inventory/batches?medicineId=${med.id}`);
      setBatches(res);
    } catch {
      toast.error("Failed to load medicine batch logs.");
    } finally {
      setLoadingBatches(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Stock Inventory Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Display global stock counts summaries. Load detailed batch histories clinically when requested.
          </p>
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl gap-3 flex flex-wrap items-end shadow-sm text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Medicine / Generic Name</label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
            placeholder="Search keyword..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
          <input
            type="text"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
            placeholder="Category name"
          />
        </div>

        <button
          type="submit"
          className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg cursor-pointer h-[32px] transition-all"
        >
          <Search size={13} />
          <span>Apply Filters</span>
        </button>
      </form>

      {/* Summary Table list */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span>Loading inventory summary levels...</span>
        </div>
      ) : inventory.length === 0 ? (
        <div className="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
          <AlertTriangle size={28} className="text-slate-400" />
          <p className="text-xs font-mono">No inventory stock levels recorded.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Medicine Info</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Minimum Level</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-right">Rates (Pur/Sell)</th>
                  <th className="py-3 px-4 text-right">Batch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">{item.code}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
                          Brand: {item.brand} | Generic: {item.genericName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">{item.category}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold">{item.minimumStock}</td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          item.isLowStock
                            ? "bg-red-50 text-red-650 border border-red-100"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      <span className="text-slate-500">₹{Number(item.purchasePrice).toFixed(2)}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-blue-600 font-bold">₹{Number(item.sellingPrice).toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(item)}
                        className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-250 transition-all cursor-pointer text-[10px]"
                      >
                        <span>View Batches</span>
                        <ArrowRight size={10} />
                      </button>
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
          DETAILED BATCHES MODAL DIALOG
          ======================================================= */}
      {selectedMed && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setSelectedMed(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>

            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center space-x-2">
              <Activity size={16} className="text-blue-600" />
              <span>Granular Batch Stock History: {selectedMed.name}</span>
            </h3>

            {loadingBatches ? (
              <div className="h-32 flex items-center justify-center text-slate-500 font-mono text-[11px]">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                <span>Loading active batches history logs...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 space-y-1">
                <TrendingDown size={24} className="text-slate-400" />
                <p className="font-mono text-[11px]">No active stock batches found for this medicine.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Batch Number</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3 text-center">Remaining stock Qty</th>
                      <th className="py-2.5 px-3 text-right">Purchase Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Selling Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {batches.map((batch) => {
                      const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();

                      return (
                        <tr key={batch.id} className={`hover:bg-slate-50/20 ${isExpired ? "bg-red-50/15" : ""}`}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{batch.batchNumber}</td>
                          <td className="py-2.5 px-3">
                            {batch.expiryDate ? (
                              <span className={isExpired ? "text-red-650 font-bold" : "text-slate-600"}>
                                {new Date(batch.expiryDate).toLocaleDateString()} {isExpired ? "(EXPIRED)" : ""}
                              </span>
                            ) : (
                              <span className="text-slate-400">No Expiry</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {batch.currentQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">₹{Number(batch.purchaseRate).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-blue-600 font-bold">₹{Number(batch.sellingRate).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMed(null)}
                className="bg-slate-100 text-slate-700 px-5 py-2 rounded-xl border border-slate-200 cursor-pointer font-semibold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
