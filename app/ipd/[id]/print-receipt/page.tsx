"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

export default function PaymentReceiptPrintPage() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId") || "";
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) {
      setHtml("<p style='color:red;font-family:sans-serif;padding:20px;'>Missing paymentId query parameter.</p>");
      setLoading(false);
      return;
    }
    async function loadPrint() {
      try {
        const res = await apiClient<{ renderedPayload: string }>("/api/print", {
          method: "POST",
          body: JSON.stringify({
            templateId: "PAYMENT_RECEIPT",
            contextId: paymentId,
          }),
        });
        setHtml(res.renderedPayload);
      } catch {
        setHtml("<p style='color:red;font-family:sans-serif;padding:20px;'>Failed to render Payment Receipt print layout.</p>");
      } finally {
        setLoading(false);
      }
    }
    loadPrint();
  }, [paymentId]);

  useEffect(() => {
    if (!loading && html && !html.includes("Failed to render") && !html.includes("Missing paymentId")) {
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
        <span className="text-xs font-mono">Compiling Payment Receipt A5 Slip...</span>
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
