"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

export default function IPDBillPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrint() {
      try {
        const printData = await apiClient<any>(`/api/ipd/admissions/${id}/print?type=bill`);
        const res = await apiClient<{ renderedPayload: string }>("/api/print", {
          method: "POST",
          body: JSON.stringify({
            templateId: "HOSPITAL_INVOICE",
            printData,
            options: { format: "A4" },
          }),
        });
        setHtml(res.renderedPayload);
      } catch {
        setHtml("<p style='color:red;font-family:sans-serif;padding:20px;'>Failed to render Detailed IPD Bill print layout. Ensure an invoice exists for this admission.</p>");
      } finally {
        setLoading(false);
      }
    }
    loadPrint();
  }, [id]);

  useEffect(() => {
    if (!loading && html && !html.includes("Failed to render")) {
      const delay = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [loading, html]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-2 bg-white text-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-xs font-mono">Compiling Detailed Inpatient Bill...</span>
      </div>
    );
  }

  return (
    <div
      className="print-content-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
