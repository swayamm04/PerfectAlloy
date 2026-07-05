"use client";

import dynamic from "next/dynamic";
import { Loader2, Cpu } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load MachinesView dynamically with SSR disabled to bypass build failures
const MachinesView = dynamic(
  () => import("@/src/components/admin/MachinesView"),
  {
    ssr: false,
    loading: () => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <Cpu className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Machines View...</p>
        </div>
      )
  }
);

export default function MachinesPage() {
  return (
    <DashboardLayout>
      <MachinesView />
    </DashboardLayout>
  );
}
