"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OPDDirectoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/opd/register");
  }, [router]);

  return (
    <div className="h-64 flex items-center justify-center text-zinc-450 font-mono text-xs">
      <span>Redirecting to OPD Registration Console...</span>
    </div>
  );
}
