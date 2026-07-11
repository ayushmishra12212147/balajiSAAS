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
} from "lucide-react";
import Link from "next/link";

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

/**
 * calculateAge
 * Computes exact years between current date and dob.
 */
function calculateAge(dobString: string): number {
  const birth = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

/**
 * PatientsPage
 * Master Patient Index (MPI) directory and search registry.
 */
export default function PatientsPage() {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load patient records.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search loading
  useEffect(() => {
    const handler = setTimeout(() => {
      loadPatients(search, page);
    }, 300);

    return () => clearTimeout(handler);
  }, [search, page]);

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
        cell: (info) => <span className="uppercase">{info.getValue() as string}</span>,
      },
      {
        header: "Age",
        accessorKey: "dob",
        cell: (info) => <span>{calculateAge(info.getValue() as string)} Yrs</span>,
      },
      {
        header: "Mobile Number",
        accessorKey: "phone",
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
              <Link
                href={`/patients/${row.id}`}
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="View Full Card"
              >
                <Eye size={14} />
              </Link>
              <Link
                href={`/patients/${row.id}/edit`}
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Edit Demographics"
              >
                <Edit size={14} />
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
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Master Patient Index (MPI)</h1>
          <p className="text-xs text-slate-400">Search, register, and manage legal electronic patient profiles</p>
        </div>
        
        <Link
          href="/patients/register"
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-lg hover:shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <PlusCircle size={15} />
          <span>Register New Patient</span>
        </Link>
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
              setPage(1); // Reset page on query updates
            }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-3 outline-none transition-all placeholder-slate-600"
            placeholder="Search patient name, UHID, Aadhaar, phone..."
          />
        </div>
      </div>

      {/* Grid List View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Scanning Master Patient Index...</span>
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
                        No registered patients matching search query filters.
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
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-all"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-all"
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
