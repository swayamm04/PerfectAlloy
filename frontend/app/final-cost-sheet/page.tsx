"use client";

import dynamic from "next/dynamic";
import { Loader2, FileText } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load FinalCostSheetView with SSR disabled to prevent Node dependencies in jsPDF from breaking build
const FinalCostSheetView = dynamic(
  () => import("@/src/components/admin/FinalCostSheetView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <FileText className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider">Initializing Cost Sheet View...</p>
      </div>
    )
  }
);

export default function FinalCostSheetPage() {
  return (
    <DashboardLayout>
      <FinalCostSheetView />
    </DashboardLayout>
  );
}
