"use client";

import dynamic from 'next/dynamic';
import { Database } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Import the view component with SSR disabled to prevent jspdf/fflate build errors
const ActivityLogView = dynamic(
  () => import('@/src/components/activity-log/ActivityLogView'),
  { 
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Database className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">Loading Activity Logs...</p>
        </div>
      </DashboardLayout>
    )
  }
);

export default function ActivityLogPage() {
  return <ActivityLogView />;
}
