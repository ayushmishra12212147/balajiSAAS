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
  PlusCircle,
  Eye,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Calendar,
} from "lucide-react";
import Link from "next/link";import { useSearchParams } from "next/navigation";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  totalAmount: number;
  discountAmount: number;
  payableAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  createdAt: string;
  patient: {
    id: string;
    uhid: string;
    name: string;
    phone: string;
  };
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export default function BillingDirectoryPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState("");
  const [uhidFilter, setUhidFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let url = `/api/billing/invoices?page=${page}&limit=10`;
      if (invoiceNumberFilter.trim()) url += `&invoiceNumber=${encodeURIComponent(invoiceNumberFilter.trim())}`;
      if (uhidFilter.trim()) url += `&uhid=${encodeURIComponent(uhidFilter.trim())}`;
      if (nameFilter.trim()) url += `&name=${encodeURIComponent(nameFilter.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await apiClient<{
        invoices: InvoiceSummary[];
        pagination: PaginationMeta;
      }>(url);

      setInvoices(res.invoices);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to retrieve billing logs.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadInvoices();
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, invoiceNumberFilter, uhidFilter, nameFilter, statusFilter, startDate, endDate]);

  const columns = useMemo<ColumnDef<InvoiceSummary>[]>(
    () => [
      {
        header: "Invoice No",
        accessorKey: "invoiceNumber",
        cell: (info) => <span className="font-mono font-bold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "UHID",
        accessorKey: "patient.uhid",
        cell: (info) => <span className="font-mono text-zinc-400">{info.getValue() as string}</span>,
      },
      {
        header: "Patient Name",
        accessorKey: "patient.name",
        cell: (info) => <span className="font-semibold text-slate-200">{info.getValue() as string}</span>,
      },
      {
        header: "Net Payable",
        accessorKey: "payableAmount",
        cell: (info) => <span className="font-mono text-slate-300">₹{Number(info.getValue()).toFixed(2)}</span>,
      },
      {
        header: "Paid",
        accessorKey: "paidAmount",
        cell: (info) => <span className="font-mono text-emerald-400">₹{Number(info.getValue()).toFixed(2)}</span>,
      },
      {
        header: "Balance Due",
        accessorKey: "balanceAmount",
        cell: (info) => {
          const bal = Number(info.getValue());
          return (
            <span className={`font-mono font-semibold ${bal > 0 ? "text-amber-400" : "text-zinc-500"}`}>
              ₹{bal.toFixed(2)}
            </span>
          );
        },
      },
      {
        header: "Date Created",
        accessorKey: "createdAt",
        cell: (info) => <span>{new Date(info.getValue() as string).toLocaleDateString()}</span>,
      },
      {
        header: "Status",
        accessorKey: "paymentStatus",
        cell: (info) => {
          const status = info.getValue() as string;
          let badgeClass = "bg-slate-950/20 text-slate-400 border border-slate-900/30";
          if (status === "PAID") badgeClass = "bg-emerald-950/20 text-emerald-450 border border-emerald-900/20";
          if (status === "PARTIALLY_PAID") badgeClass = "bg-amber-950/20 text-amber-400 border border-amber-900/20";
          if (status === "CANCELLED") badgeClass = "bg-red-950/20 text-red-400 border border-red-900/20";
          if (status === "REFUNDED") badgeClass = "bg-purple-950/25 text-purple-400 border border-purple-900/20";

          return (
            <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${badgeClass}`}>
              {status}
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
              <Link
                href={`/billing/${row.id}`}
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="View Invoice Details"
              >
                <Eye size={14} />
              </Link>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Billing & Invoice Registers</h1>
          <p className="text-xs text-slate-400">Process checkout collections, ledger adjustments, and prints</p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Link
            href="/billing/generate"
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Generate Patient Invoice</span>
          </Link>
        </div>
      </div>

      {/* Grid Filters */}
      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumberFilter}
              onChange={(e) => setInvoiceNumberFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-[11px] rounded-lg px-3 py-2 outline-none"
              placeholder="INV26000001"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">UHID</label>
            <input
              type="text"
              value={uhidFilter}
              onChange={(e) => setUhidFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-[11px] rounded-lg px-3 py-2 outline-none"
              placeholder="Search UHID"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Patient Name</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-[11px] rounded-lg px-3 py-2 outline-none"
              placeholder="Search Name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Payment Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-[11px] rounded-lg px-3 py-2 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              <option value="PAID">PAID</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-[11px] rounded-lg px-3 py-1.5 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-850 pt-3">
          <div className="flex items-center space-x-2">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-400">Filter End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-100 text-[11px] rounded-lg px-2 py-1 outline-none ml-2"
            />
          </div>
        </div>
      </div>

      {/* Grid List View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Synchronizing Financial Statements...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-md">
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
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="text-center p-12 text-zinc-550 font-mono text-xs">
                        No financial invoice statements found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border border-slate-800 bg-slate-900/20 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-mono text-slate-400">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total records)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
