"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users as UsersIcon,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Truck,
  Warehouse,
  ClipboardList,
  ShieldCheck,
  LayoutGrid,
  Building2,
  Table,
  Cpu,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  role?: "super-admin" | "admin";
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ShieldCheck, label: "Activity Log", path: "/activity-log", role: "super-admin" },
  { icon: LayoutGrid, label: "Master Data", path: "/admin/excel-mode", role: "super-admin" },
  { icon: UsersIcon, label: "Users", path: "/users", role: "super-admin" },
  { icon: Building2, label: "Departments", path: "/departments", role: "super-admin" },
  { icon: Table, label: "Production Tables", path: "/production-tables", role: "super-admin" },
  { icon: Cpu, label: "Machines", path: "/machines", role: "super-admin" },
  { icon: Calculator, label: "Operators", path: "/operators", role: "super-admin" },
  { icon: Calculator, label: "Equipments", path: "/equipments", role: "super-admin" },
  { icon: Calculator, label: "Machine Hour Rate", path: "/machine-hour-rate", role: "super-admin" },
  { icon: ClipboardList, label: "Task Queue", path: "/task-queue", role: "admin" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredItems = menuItems.filter((item) => {
    if (user?.module === "expenses") {
      return (
        item.path === "/" || 
        item.path === "/users" || 
        item.path === "/settings" || 
        item.path === "/machines" ||
        item.path === "/operators" ||
        item.path === "/equipments" ||
        item.path === "/machine-hour-rate"
      );
    }
    if (!item.role) return true;
    if (user?.role === "super-admin") return true;
    return item.role === user?.role;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <Image 
            src="/logo.png" 
            alt="PAC Logo" 
            width={collapsed ? 40 : 180} 
            height={40} 
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Portal Badge */}
      {!collapsed && (
        <div className="px-4 py-2.5 mx-4 mb-2 rounded-xl bg-black/15 text-sidebar-muted text-xs font-bold text-center border border-white/5 uppercase tracking-widest select-none shadow-inner">
          {user?.module === 'expenses' ? (
            <span className="text-purple-300 font-extrabold">Expenses Portal</span>
          ) : (
            <span className="text-primary-foreground/80 font-extrabold">Admin Portal</span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-4 px-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
