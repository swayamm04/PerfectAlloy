"use client";

import dynamic from 'next/dynamic';
import { LayoutGrid } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Import the view component with SSR disabled to prevent hydration/build issues with complex interactive grids
const ExcelModeView = dynamic(
  () => import('@/src/components/admin/ExcelModeView'),
  { 
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <LayoutGrid className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">Initializing Spreadsheet Mode...</p>
        </div>
      </DashboardLayout>
    )
  }
);

export default function ExcelModePage() {
  return (
    <DashboardLayout>
      <ExcelModeView />
    </DashboardLayout>
  );
}
