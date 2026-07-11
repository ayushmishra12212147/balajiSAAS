"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Save, Loader2, Lock, Unlock, AlertCircle } from "lucide-react";

interface SequenceConfig {
  sequenceName: string;
  currentValue: string; // BigInt serialized as string
  prefix: string;
  paddingLength: number;
  isActive: boolean;
  description: string | null;
}

export default function NumberingConfigurationPage() {
  const [sequences, setSequences] = useState<SequenceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  // Buffer fields for edits
  const [editBuffers, setEditBuffers] = useState<Record<string, {
    prefix: string;
    paddingLength: number;
    currentValue: string;
  }>>({});

  const loadSequences = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<SequenceConfig[]>("/api/admin/sequences");
      setSequences(data || []);
      
      // Initialize edit buffers
      const buffers: typeof editBuffers = {};
      for (const seq of data || []) {
        buffers[seq.sequenceName] = {
          prefix: seq.prefix,
          paddingLength: seq.paddingLength,
          currentValue: seq.currentValue
        };
      }
      setEditBuffers(buffers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sequence numbering.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSequences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async (name: string) => {
    const buffer = editBuffers[name];
    const original = sequences.find(s => s.sequenceName === name);
    if (!buffer || !original) return;

    // UI validations
    if (BigInt(buffer.currentValue) < BigInt(original.currentValue)) {
      toast.error(`Cannot decrease starting sequence number from ${original.currentValue} to ${buffer.currentValue}.`);
      return;
    }

    setUpdatingName(name);
    try {
      const updated = await apiClient<SequenceConfig>(`/api/admin/sequences/${name}`, {
        method: "PUT",
        body: JSON.stringify({
          prefix: buffer.prefix,
          paddingLength: Number(buffer.paddingLength),
          currentValue: buffer.currentValue
        })
      });

      toast.success(`Numbering sequence '${name}' updated successfully.`);
      
      // Update local baseline value
      setSequences(sequences.map(s => s.sequenceName === name ? updated : s));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update numbering configuration.";
      toast.error(msg);
    } finally {
      setUpdatingName(null);
    }
  };

  const handleBufferChange = (name: string, key: "prefix" | "paddingLength" | "currentValue", val: string | number) => {
    setEditBuffers({
      ...editBuffers,
      [name]: {
        ...editBuffers[name],
        [key]: val
      }
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-xs font-mono">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
        <span>Loading Sequences...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-5 overflow-y-auto pb-6 scrollbar-thin">
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Numbering & Sequences Configuration</h1>
          <p className="text-xs text-slate-400 mt-1">Configure identifier formats, prefixes, padding length, and next auto-increment indices</p>
        </div>
      </div>

      {/* Safety Alert */}
      <div className="max-w-5xl bg-amber-950/20 border border-amber-900/50 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-300 shadow-sm shrink-0">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-450">Continuous Value Sequence Constraints</h3>
          <p className="mt-0.5 text-zinc-450 leading-relaxed">
            Sequence starting values can only be increased. Decreasing active sequence values is blocked to prevent primary key duplications and index collisions on clinical records.
          </p>
        </div>
      </div>

      {/* Grid List */}
      <div className="max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-450 font-semibold select-none">
                <th className="p-4">Sequence Code</th>
                <th className="p-4">Prefix</th>
                <th className="p-4">Padding Length</th>
                <th className="p-4">Next Number (Sequence Value)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-zinc-300">
              {sequences.map((seq) => {
                const buffer = editBuffers[seq.sequenceName] || {
                  prefix: seq.prefix,
                  paddingLength: seq.paddingLength,
                  currentValue: seq.currentValue
                };
                const isSaving = updatingName === seq.sequenceName;
                const isIncremented = BigInt(seq.currentValue) > BigInt(0);

                return (
                  <tr key={seq.sequenceName} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-100 font-mono text-[11px]">{seq.sequenceName}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 font-sans leading-relaxed">{seq.description || "Auto increment sequence code."}</div>
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        disabled={isSaving}
                        value={buffer.prefix}
                        onChange={(e) => handleBufferChange(seq.sequenceName, "prefix", e.target.value)}
                        className="bg-slate-900 border border-slate-850 focus:border-emerald-500 w-24 text-center font-bold px-2 py-1.5 rounded-lg outline-none text-slate-100 font-mono"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        disabled={isSaving}
                        min={1}
                        max={10}
                        value={buffer.paddingLength}
                        onChange={(e) => handleBufferChange(seq.sequenceName, "paddingLength", Number(e.target.value))}
                        className="bg-slate-900 border border-slate-850 focus:border-emerald-500 w-20 text-center px-2 py-1.5 rounded-lg outline-none text-slate-100 font-mono"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          disabled={isSaving}
                          value={buffer.currentValue}
                          onChange={(e) => handleBufferChange(seq.sequenceName, "currentValue", e.target.value)}
                          className="bg-slate-900 border border-slate-850 focus:border-emerald-500 w-28 text-center px-2.5 py-1.5 rounded-lg outline-none text-slate-100 font-mono"
                        />
                        {isIncremented ? (
                          <div className="text-[10px] text-slate-500 flex items-center space-x-0.5 select-none" title="Sequence is already active in production. Editing is restricted to increasing value only.">
                            <Lock size={10} />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-500 flex items-center space-x-0.5 select-none" title="Sequence has not generated numbers yet. Configuration is open.">
                            <Unlock size={10} />
                            <span>Draft</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center select-none">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans uppercase">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleUpdate(seq.sequenceName)}
                        disabled={isSaving}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-200 px-3.5 py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-1 ml-auto cursor-pointer transition-all active:scale-[0.98]"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                        ) : (
                          <Save size={12} />
                        )}
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
