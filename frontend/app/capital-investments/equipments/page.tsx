"use client";

import dynamic from "next/dynamic";
import { Calculator } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load CapitalInvestmentsView with SSR disabled
const CapitalInvestmentsView = dynamic(
  () => import("@/src/components/admin/CapitalInvestmentsView"),
  {
    ssr: false,
    loading: () => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <Calculator className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Equipments View...</p>
        </div>
      )
  }
);

export default function EquipmentsPage() {
  return (
    <DashboardLayout>
      <CapitalInvestmentsView type="equipments" />
    </DashboardLayout>
  );
}
