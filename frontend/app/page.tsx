"use client";

import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { TopProducts } from "@/components/dashboard/TopProducts";

const SalesChart = dynamic(() => import("@/components/dashboard/SalesChart").then(mod => mod.SalesChart), { ssr: false });
const InventoryStatus = dynamic(() => import("@/components/dashboard/InventoryStatus").then(mod => mod.InventoryStatus), { ssr: false });

import {
  Package,
  ShoppingCart,
  DollarSign,
  Users,
} from "lucide-react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your inventory.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Products"
            value="2,847"
            change="+12.5% from last month"
            changeType="positive"
            icon={Package}
            iconColor="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Total Orders"
            value="1,234"
            change="+8.2% from last month"
            changeType="positive"
            icon={ShoppingCart}
            iconColor="bg-success/10 text-success"
          />
          <StatsCard
            title="Revenue"
            value="$45,231"
            change="+20.1% from last month"
            changeType="positive"
            icon={DollarSign}
            iconColor="bg-warning/10 text-warning"
          />
          <StatsCard
            title="Active Customers"
            value="573"
            change="+5.4% from last month"
            changeType="positive"
            icon={Users}
            iconColor="bg-info/10 text-info"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesChart />
          </div>
          <InventoryStatus />
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentOrders />
          <TopProducts />
        </div>
      </div>
    </DashboardLayout>
  );
}
