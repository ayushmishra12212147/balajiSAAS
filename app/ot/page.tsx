"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

type OTBookingSummary = {
  id: string;
  otId: string;
  operationName: string;
  operationType: string;
  scheduledDate: string;
  completedAt: string | null;
  cancelledAt: string | null;
  patient: {
    id: string;
    uhid: string;
    name: string;
    gender: string;
  };
  primarySurgeon: {
    employee: {
      designation: string;
    };
  };
  department: {
    name: string;
  };
};

export default function OTDirectoryPage() {
  const [bookings, setBookings] = useState<OTBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [otId, setOtId] = useState("");
  const [uhid, setUhid] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("SCHEDULED"); // "SCHEDULED", "COMPLETED", "CANCELLED", ""
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        otId,
        uhid,
        name,
        status,
        page: page.toString(),
        limit: "10",
      });

      const res = await apiClient<{
        otBookings: OTBookingSummary[];
        pagination: { pages: number };
      }>(`/api/ot?${query.toString()}`);

      setBookings(res.otBookings);
      setTotalPages(res.pagination.pages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load OT directory.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Operation Theatre (OT)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage scheduling, allocate consumable charges, close procedures, and log revisions.
          </p>
        </div>

        <Link
          href="/ot/register"
          className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Book OT</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-850 pb-px">
        {[
          { label: "Scheduled Operations", value: "SCHEDULED" },
          { label: "Completed Operations", value: "COMPLETED" },
          { label: "Cancelled Bookings", value: "CANCELLED" },
          { label: "All Procedures", value: "" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`text-xs font-semibold pb-3 px-3 transition-all border-b-2 cursor-pointer ${status === tab.value
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search filters form */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl gap-3 grid grid-cols-1 sm:grid-cols-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400">OT ID</label>
          <input
            type="text"
            value={otId}
            onChange={(e) => setOtId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none placeholder-slate-655"
            placeholder="e.g. OT260001"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400">UHID</label>
          <input
            type="text"
            value={uhid}
            onChange={(e) => setUhid(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none placeholder-slate-655"
            placeholder="UHID"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400">Patient Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none placeholder-slate-655"
            placeholder="Name"
          />
        </div>

        <button
          type="submit"
          className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer h-[34px] transition-all"
        >
          <Search size={13} />
          <span>Apply Filters</span>
        </button>
      </form>

      {/* Main Grid display */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
          <span>Synchronizing operation theatre registrations...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="h-64 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-2">
          <ShieldAlert size={28} className="text-slate-600" />
          <p className="text-xs font-mono">No matching surgical bookings found in directory.</p>
        </div>
      ) : (
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold tracking-wider text-emerald-450 uppercase">
                  <th className="py-3 px-4">OT ID</th>
                  <th className="py-3 px-4">Patient Info</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Procedure Description</th>
                  <th className="py-3 px-4">Surgeon</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {booking.otId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-100">{booking.patient.name}</span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          UHID: {booking.patient.uhid} | {booking.patient.gender}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {new Date(booking.scheduledDate).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {booking.operationName}
                      <span className="text-[9px] text-slate-500 block font-normal mt-0.5 uppercase">
                        Type: {booking.operationType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {booking.primarySurgeon.employee.designation}
                      <span className="text-[9px] text-zinc-550 block mt-0.5">
                        {booking.department.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${booking.cancelledAt
                            ? "bg-red-950/20 text-red-400 border border-red-900/30"
                            : booking.completedAt
                              ? "bg-emerald-950/20 text-emerald-450 border border-emerald-900/30"
                              : "bg-blue-950/20 text-blue-400 border border-blue-900/30"
                          }`}
                      >
                        {booking.cancelledAt ? "Cancelled" : booking.completedAt ? "Closed" : "Scheduled"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/ot/${booking.id}`}
                        className="inline-flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition-all text-[11px]"
                      >
                        <span>Open chart</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t border-slate-800 p-4 bg-slate-900/20 text-[11px]">
              <span className="text-slate-500 font-mono">
                Page {page} of {totalPages}
              </span>
              <div className="flex space-x-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-3 py-1.5 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
