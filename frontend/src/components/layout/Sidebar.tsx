"use client";

import { useState, useEffect } from "react";
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

interface SubMenuItem {
  label: string;
  path: string;
  role?: "super-admin" | "admin";
}

interface MenuItem {
  icon: any;
  label: string;
  path?: string;
  role?: "super-admin" | "admin";
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ShieldCheck, label: "Activity Log", path: "/activity-log", role: "super-admin" },
  { icon: LayoutGrid, label: "Master Data", path: "/admin/excel-mode", role: "super-admin" },
  { icon: UsersIcon, label: "Users", path: "/users", role: "super-admin" },
  { icon: Building2, label: "Departments", path: "/departments", role: "super-admin" },
  { icon: Table, label: "Production Tables", path: "/production-tables", role: "super-admin" },
  { icon: Cpu, label: "Machines", path: "/machines", role: "super-admin" },
  { 
    icon: Calculator, 
    label: "Capital Investments", 
    role: "super-admin",
    subItems: [
      { label: "Operators", path: "/capital-investments/operators", role: "super-admin" },
      { label: "Equipments", path: "/capital-investments/equipments", role: "super-admin" },
    ]
  },
  { icon: Calculator, label: "Machine Hour Rate", path: "/machine-hour-rate", role: "super-admin" },
  { icon: Package, label: "Material Rate", path: "/material-rate", role: "super-admin" },
  { icon: FileText, label: "Final Cost Sheet", path: "/final-cost-sheet", role: "super-admin" },
  { icon: FileText, label: "Part no. wise cost sheet", path: "/part-no-wise-cost-sheet", role: "super-admin" },
  { icon: ClipboardList, label: "Task Queue", path: "/task-queue", role: "admin" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Auto-expand the parent menu if its sub-item is active, else keep collapsed
    const newExpanded: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.subItems) {
        const isActive = item.subItems.some((sub) => pathname === sub.path);
        if (isActive) {
          newExpanded[item.label] = true;
        }
      }
    });
    setExpandedMenus(newExpanded);
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const filteredItems = menuItems.filter((item) => {
    if (user?.module === "expenses") {
      const allowedPaths = [
        "/",
        "/users",
        "/settings",
        "/machine-hour-rate",
        "/material-rate",
        "/final-cost-sheet",
        "/part-no-wise-cost-sheet",
        "/capital-investments/operators",
        "/capital-investments/equipments"
      ];
      
      if (item.subItems) {
        // If any subitem is allowed, keep the parent
        return item.subItems.some(sub => allowedPaths.includes(sub.path));
      }
      return item.path ? allowedPaths.includes(item.path) : false;
    }
    
    // For non-expenses module, hide expense related links
    if (
      item.path === "/machine-hour-rate" ||
      item.path === "/material-rate" ||
      item.path === "/final-cost-sheet" ||
      item.path === "/part-no-wise-cost-sheet"
    ) {
      return false;
    }
    
    if (item.label === "Capital Investments") {
      return false; // Hide from admin portal as per original logic? Original logic had salary-capital-charges hidden.
    }

    if (!item.role) return true;
    if (user?.role === "super-admin") return true;
    return item.role === user?.role;
  }).map(item => {
    // Also filter subItems if present based on role
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(sub => {
          if (!sub.role) return true;
          if (user?.role === "super-admin") return true;
          return sub.role === user?.role;
        })
      };
    }
    return item;
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
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.label];
            
            // Check if any sub-item is active
            const isSubItemActive = hasSubItems && item.subItems!.some(sub => pathname === sub.path);
            const isActive = !hasSubItems && pathname === item.path;
            
            return (
              <li key={item.label}>
                {hasSubItems ? (
                  <button
                    onClick={() => !collapsed && toggleExpanded(item.label)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                      isSubItemActive
                        ? "bg-sidebar-accent/50 text-sidebar-primary"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("h-5 w-5 flex-shrink-0")} />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <div className={cn("transition-transform duration-200", isExpanded ? "rotate-90" : "")}>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.path!}
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
                )}
                
                {/* Sub-items rendering */}
                {hasSubItems && !collapsed && isExpanded && (
                  <ul className="mt-1 space-y-1 ml-9">
                    {item.subItems!.map((subItem) => {
                      const isSubActive = pathname === subItem.path;
                      return (
                        <li key={subItem.path}>
                          <Link
                            href={subItem.path}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                              isSubActive
                                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                : "text-sidebar-muted hover:text-sidebar-foreground"
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                            <span>{subItem.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
