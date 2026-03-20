"use client";

import dynamic from 'next/dynamic';
import { BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Import the analytics view component with SSR disabled to resolve Recharts TypeScript/Hydration issues
const AnalyticsView = dynamic(
  () => import('@/src/components/analytics/AnalyticsView'),
  { 
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <BarChart3 className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">Loading Analytics Dashboard...</p>
        </div>
      </DashboardLayout>
    )
  }
);

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <AnalyticsView />
    </DashboardLayout>
  );
}
