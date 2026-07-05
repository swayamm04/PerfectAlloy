"use client";

import dynamic from "next/dynamic";
import { Loader2, Package } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load MaterialRateView dynamically with SSR disabled
const MaterialRateView = dynamic(
  () => import("@/src/components/admin/MaterialRateView"),
  {
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <Package className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Material Rates View...</p>
        </div>
      </DashboardLayout>
    )
  }
);

export default function MaterialRatePage() {
  return (
    <DashboardLayout>
      <MaterialRateView />
    </DashboardLayout>
  );
}
