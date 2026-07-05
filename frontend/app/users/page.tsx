"use client";

import dynamic from "next/dynamic";
import { Loader2, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load UsersView dynamically with SSR disabled to bypass build failures
const UsersView = dynamic(
  () => import("@/src/components/admin/UsersView"),
  {
    ssr: false,
    loading: () => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Users View...</p>
        </div>
      )
  }
);

export default function UsersPage() {
  return (
    <DashboardLayout>
      <UsersView />
    </DashboardLayout>
  );
}
