"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { API_URL } from "@/src/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cpu, 
  Calculator, 
  Settings2, 
  TrendingUp, 
  Users2, 
  Layers, 
  DollarSign,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import Link from "next/link";

interface Machine {
  _id: string;
  name: string;
  description: string;
}

export function ExpensesDashboard() {
  const { user } = useAuth();
  const [operatorCount, setOperatorCount] = useState<number | null>(null);
  const [equipmentCount, setEquipmentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${user?.token}` };
        
        const [resOperators, resEquipments] = await Promise.all([
          fetch(`${API_URL}/api/operator-table`, { headers }),
          fetch(`${API_URL}/api/equipment-table`, { headers })
        ]);

        if (resOperators.ok) {
          const data = await resOperators.json();
          setOperatorCount(data.rows?.length || 0);
        }
        if (resEquipments.ok) {
          const data = await resEquipments.json();
          setEquipmentCount(data.rows?.length || 0);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Premium Gradient Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/35 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-200 border border-purple-500/20 shadow-inner">
            Expenses Portal
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Machine Cost Analysis
          </h1>
          <p className="max-w-xl text-purple-200 text-sm md:text-base leading-relaxed">
            Manage system machines, configure operators salary and capital investment templates, and calculate precise machine hour rates.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {/* Card 1: Operator Designations */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Labour Roles</CardTitle>
            <div className="bg-blue-100 dark:bg-blue-950/40 p-2.5 rounded-2xl text-blue-600 dark:text-blue-400">
              <Users2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">
              {loading ? "..." : (operatorCount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Roles in salary matrix</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Equipments Invoiced */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Invested Units</CardTitle>
            <div className="bg-indigo-100 dark:bg-indigo-950/40 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">
              {loading ? "..." : (equipmentCount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Capital assets tracked</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Operating Budget */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Depreciation Rate</CardTitle>
            <div className="bg-green-100 dark:bg-green-950/40 p-2.5 rounded-2xl text-green-600 dark:text-green-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">15%</div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span>Assumed asset PA decline</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Navigation 1: Machine Hour Rate */}
        <Card className="border border-purple-500/10 shadow-xl bg-gradient-to-b from-card to-purple-50/10 dark:to-purple-950/5 relative overflow-hidden group">
          <CardHeader className="pb-3">
            <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-3 rounded-2xl w-fit mb-2">
              <Calculator className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Machine Hour Rate</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Calculate hourly charges, power costs, wiring, rent, and custom overheads.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/machine-hour-rate" passHref>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all group-hover:gap-3 gap-1.5 flex items-center justify-center">
                Open Calculator
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Navigation 2: Salary & Capital Charges */}
        <Card className="border border-purple-500/10 shadow-xl bg-gradient-to-b from-card to-purple-50/10 dark:to-purple-950/5 relative overflow-hidden group">
          <CardHeader className="pb-3">
            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-2xl w-fit mb-2">
              <Layers className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Salary & Capital Charges</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Configure payroll parameters and capital investment tables in a spreadsheet template.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/salary-capital-charges" passHref>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all group-hover:gap-3 gap-1.5 flex items-center justify-center">
                Configure Sheets
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
