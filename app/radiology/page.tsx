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
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  Activity,
} from "lucide-react";
import Link from "next/link";

type RadiologyScanSummary = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  billableChargeId: string | null;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
    phone: string;
  };
  scanCatalog: {
    name: string;
    code: string;
    category: string;
  };
  orderedByDoctor: {
    employee: {
      designation: string;
    };
  };
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export default function RadiologyDirectoryPage() {
  const [orders, setOrders] = useState<RadiologyScanSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [uhidFilter, setUhidFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/radiology/orders?page=${page}&limit=10`;
      if (uhidFilter.trim()) url += `&uhid=${encodeURIComponent(uhidFilter.trim())}`;
      if (nameFilter.trim()) url += `&name=${encodeURIComponent(nameFilter.trim())}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await apiClient<{
        orders: RadiologyScanSummary[];
        pagination: PaginationMeta;
      }>(url);

      setOrders(res.orders);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load radiology orders.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadOrders();
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, uhidFilter, nameFilter, statusFilter, startDate, endDate]);

  const columns = useMemo<ColumnDef<RadiologyScanSummary>[]>(
    () => [
      {
        header: "Scan ID",
        accessorKey: "id",
        cell: (info) => <span className="font-mono font-semibold text-slate-200">#{ (info.getValue() as string).substring(0, 8).toUpperCase() }</span>,
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
        header: "Scan Name",
        accessorKey: "scanCatalog.name",
        cell: (info) => <span className="text-emerald-450 font-medium">{info.getValue() as string}</span>,
      },
      {
        header: "Category",
        accessorKey: "scanCatalog.category",
        cell: (info) => <span className="text-zinc-550 font-mono text-[10px]">{info.getValue() as string}</span>,
      },
      {
        header: "Doctor",
        accessorKey: "orderedByDoctor.employee.designation",
        cell: (info) => <span>{info.getValue() as string}</span>,
      },
      {
        header: "Date Ordered",
        accessorKey: "createdAt",
        cell: (info) => <span>{new Date(info.getValue() as string).toLocaleDateString()}</span>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (info) => {
          const status = info.getValue() as string;
          let badgeClass = "bg-slate-950/20 text-slate-400 border border-slate-900/30";
          if (status === "COMPLETED") badgeClass = "bg-emerald-950/25 text-emerald-450 border border-emerald-900/20";
          if (status === "CANCELLED") badgeClass = "bg-red-950/20 text-red-400 border border-red-900/20";

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
                href={`/radiology/${row.id}`}
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Open Scan Report"
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
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center">
            <Activity size={20} className="mr-2 text-emerald-400" />
            <span>Radiology & Imaging Registry</span>
          </h1>
          <p className="text-xs text-slate-400">Perform scans, record findings reports, and print radiology charts</p>
        </div>
      </div>

      {/* Grid Filters */}
      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
            <label className="text-[10px] font-semibold text-slate-400">Scan Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-[11px] rounded-lg px-3 py-2 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="COMPLETED">COMPLETED</option>
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
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-[11px] rounded-lg px-3 py-1.5 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid List View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Syncing Radiology scan lining...</span>
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
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="text-center p-12 text-zinc-550 font-mono text-xs">
                        No radiology scan orders found.
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
