"use client";

import dynamic from "next/dynamic";
import { Loader2, FileText } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load PartNoWiseCostSheetView with SSR disabled to prevent Node dependencies in jsPDF from breaking build
const PartNoWiseCostSheetView = dynamic(
  () => import("@/src/components/admin/PartNoWiseCostSheetView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <FileText className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider">Initializing Part No. Wise Cost Sheet...</p>
      </div>
    )
  }
);

export default function PartNoWiseCostSheetPage() {
  return (
    <DashboardLayout>
      <PartNoWiseCostSheetView />
    </DashboardLayout>
  );
}
