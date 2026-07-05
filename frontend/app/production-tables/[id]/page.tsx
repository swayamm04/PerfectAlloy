"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";

// Load ProductionTableView dynamically with SSR disabled to bypass build failures
const ProductionTableView = dynamic(
  () => import("@/src/components/admin/ProductionTableView"),
  {
    ssr: false,
    loading: () => (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse text-xs uppercase tracking-wider font-semibold">Initializing Production Table View...</p>
        </div>
      </DashboardLayout>
    )
  }
);

export default function ProductionTablePage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  return (
    <DashboardLayout>
      <ProductionTableView id={id} />
    </DashboardLayout>
  );
}
