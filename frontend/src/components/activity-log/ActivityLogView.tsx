"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/src/context/AuthContext";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  ChevronRight,
  Database,
  ShieldCheck,
  Download,
  FileDown,
  FileSpreadsheet
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/src/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/src/lib/api";

interface Activity {
  _id: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  method: string;
  resource: string;
  details: string;
  timestamp: string;
}

export default function ActivityLogView() {
  const { user: currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{_id: string, name: string}[]>([]);
  
  // Filters
  const [selectedUser, setSelectedUser] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const formatLogDetails = (details: string | undefined | null) => {
    if (!details) return <span className="text-primary-foreground text-xs opacity-70 italic">No extra details recorded.</span>;
    
    if (details.startsWith('Deleted Resource')) {
      return (
        <div className="flex items-center gap-2 p-1">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-primary-foreground font-semibold text-xs tracking-tight">{details}</span>
        </div>
      );
    }
    
    try {
      const parsed = JSON.parse(details);
      const masked = { ...parsed };
      if (masked.password) masked.password = "••••••••";
      
      return (
        <div className="flex flex-col gap-2 p-1 max-w-[320px] divide-y divide-white/5">
          {Object.entries(masked).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3 py-1.5 first:pt-0 last:pb-0">
              <span className="font-black text-primary/60 uppercase text-[9px] tracking-widest min-w-[75px] pt-1 leading-none">{key}</span>
              <span className="text-primary-foreground font-bold text-xs break-all leading-normal flex-1">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <span className="text-primary-foreground font-medium text-xs p-1">{details}</span>;
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/activities?user=${selectedUser}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        toast.error("Failed to fetch activity logs");
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("An error occurred while fetching logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'super-admin') {
      fetchActivities();
      fetchUsers();
    }
  }, [currentUser]);

  const exportToCSV = () => {
    if (activities.length === 0) return;
    
    const headers = ["Timestamp", "User", "Role", "Action", "Resource"];
    const rows = activities.map(log => [
      format(new Date(log.timestamp), 'dd/MM/yyyy hh:mm:ss a'),
      log.user?.name || "Unknown",
      log.user?.role || "N/A",
      log.action,
      log.resource
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity_log_${format(new Date(), 'ddMMyyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Exported successfully");
  };

  const exportToPDF = async () => {
    if (activities.length === 0) return;

    // Dynamically import jspdf to avoid SSR build errors
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Activity Log Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy hh:mm a')}`, 14, 30);
    
    const tableColumn = ["Date", "Time", "User", "Action", "Resource"];
    const tableRows = activities.map(log => [
      format(new Date(log.timestamp), 'dd MMM yyyy'),
      format(new Date(log.timestamp), 'hh:mm:ss a'),
      log.user?.name || "Unknown",
      log.action,
      log.resource
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 }
    });

    doc.save(`activity_log_${format(new Date(), 'ddMMyyyy')}.pdf`);
    toast.success("PDF Exported successfully");
  };

  const handleApplyFilters = () => {
    fetchActivities();
  };

  const resetFilters = () => {
    setSelectedUser("all");
    setStartDate("");
    setEndDate("");
  };

  if (currentUser?.role !== "super-admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Database className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only Super Admins can access system activity logs.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
              <p className="text-muted-foreground">Monitor and track every system activity across the platform.</p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer gap-2">
                    <FileDown className="h-4 w-4 text-red-500" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="secondary" size="sm" onClick={fetchActivities} disabled={loading} className="h-9 gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary">
                <Filter className="h-5 w-5" />
                <CardTitle className="text-lg">Filter Activities</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10 focus-visible:ring-primary h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10 focus-visible:ring-primary h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="pl-10 h-11">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 h-11">
                  <Button onClick={handleApplyFilters} className="flex-1 font-semibold">
                    <Search className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                  <Button variant="ghost" onClick={resetFilters} className="px-3" title="Clear Filters">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Resource</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell className="text-right"><div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : activities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          No activities found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activities.map((log) => (
                        <TableRow key={log._id} className="hover:bg-muted/30 transition-colors group">
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium">{format(new Date(log.timestamp), 'dd MMM yyyy')}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(log.timestamp), 'hh:mm:ss a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <UserIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{log.user?.name || "Unknown User"}</span>
                                <span className="text-xs text-muted-foreground">{log.user?.role}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-semibold text-sm group-hover:text-primary transition-colors underline decoration-primary/30 decoration-2 underline-offset-4 cursor-pointer">
                                  {log.action}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="bg-slate-900 border-primary/20 shadow-xl p-3">
                                {formatLogDetails(log.details)}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="capitalize bg-muted/20 border-muted-foreground/20 font-medium">
                              {log.resource}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
