"use client";

import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { useAuth } from "@/src/context/AuthContext";
import { AdminDashboard } from "@/src/components/dashboard/AdminDashboard";
import { ExpensesDashboard } from "@/src/components/dashboard/ExpensesDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      {user?.module === "expenses" ? <ExpensesDashboard /> : <AdminDashboard />}
    </DashboardLayout>
  );
}
