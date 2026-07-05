"use client";

import dynamic from "next/dynamic";
import { Loader2, ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load TaskQueueView dynamically with SSR disabled to bypass build failures
const TaskQueueView = dynamic(
  () => import("@/src/components/admin/TaskQueueView"),
  {
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <ClipboardList className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Task Queue View...</p>
        </div>
      </DashboardLayout>
    )
  }
);

export default function TaskQueuePage() {
  return (
    <DashboardLayout>
      <TaskQueueView />
    </DashboardLayout>
  );
}
