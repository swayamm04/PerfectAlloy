"use client";

import dynamic from "next/dynamic";
import { Loader2, Calculator } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load SalaryCapitalChargesView with SSR disabled to prevent jsPDF Node dependencies from breaking the build
const SalaryCapitalChargesView = dynamic(
  () => import("@/src/components/admin/SalaryCapitalChargesView"),
  {
    ssr: false,
    loading: () => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <Calculator className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Salary Charges View...</p>
        </div>
      )
  }
);

export default function SalaryCapitalChargesPage() {
  return (
    <DashboardLayout>
      <SalaryCapitalChargesView />
    </DashboardLayout>
  );
}
