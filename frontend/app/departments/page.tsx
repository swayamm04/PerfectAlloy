"use client";

import dynamic from "next/dynamic";
import { Loader2, Building2 } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load DepartmentsView dynamically with SSR disabled to bypass build failures
const DepartmentsView = dynamic(
  () => import("@/src/components/admin/DepartmentsView"),
  {
    ssr: false,
    loading: () => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <Building2 className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Departments View...</p>
        </div>
      )
  }
);

export default function DepartmentsPage() {
  return (
    <DashboardLayout>
      <DepartmentsView />
    </DashboardLayout>
  );
}
