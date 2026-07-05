"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  X,
  ShieldCheck,
  FolderOpen,
  Edit2,
  Download,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";

interface MachineData {
  _id: string;
  name: string;
  description: string;
  fields: Array<{ label: string; value: string }>;
  createdAt?: string;
}

export default function MachinesView() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMachine, setEditingMachine] = useState<MachineData | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchMachines = async () => {
    try {
      const response = await fetch(`${API_URL}/api/machines`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMachines(data);
      } else {
        toast.error(data.message || "Failed to fetch machines");
      }
    } catch (error) {
      console.error("Error fetching machines:", error);
      toast.error("An error occurred while fetching machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "super-admin") {
      fetchMachines();
    }
  }, [currentUser]);

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const url = editingMachine 
        ? `${API_URL}/api/machines/${editingMachine._id}`
        : `${API_URL}/api/machines`;
      const method = editingMachine ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingMachine ? "Machine updated successfully!" : "Machine created successfully!");
        setName("");
        setDescription("");
        setEditingMachine(null);
        setShowAddForm(false);
        fetchMachines();
      } else {
        toast.error(data.message || "Failed to save machine");
      }
    } catch (error) {
      console.error("Error saving machine:", error);
      toast.error("An error occurred while saving the machine");
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (machine: MachineData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMachine(machine);
    setName(machine.name);
    setDescription(machine.description || "");
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setEditingMachine(null);
    setShowAddForm(false);
  };

  const handleDeleteMachine = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this machine?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/machines/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Machine removed successfully");
        fetchMachines();
      } else {
        toast.error(data.message || "Failed to delete machine");
      }
    } catch (error) {
      console.error("Error deleting machine:", error);
      toast.error("An error occurred while deleting the machine");
    }
  };

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToExcel = () => {
    if (filteredMachines.length === 0) return;

    const headers = ["Sl No", "Machine Name", "Description", "Fields Count"];
    const dataRows = filteredMachines.map((m, index) => [
      index + 1,
      m.name,
      m.description || "No description provided",
      m.fields?.length || 0
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Machines");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Machines_${todayStr}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const exportToPDF = () => {
    if (filteredMachines.length === 0) return;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PERFECT ALLOY COMPONENTS (P) LTD., SHIMOGA", 15, 15);
    doc.setFontSize(12);
    doc.text("MACHINES LIST", 15, 22);

    const headers = ["Sl No", "Machine Name", "Description", "Fields Count"];
    const tableRows = filteredMachines.map((m, index) => [
      (index + 1).toString(),
      m.name,
      m.description || "No description provided",
      (m.fields?.length || 0).toString()
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 30,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255]
      }
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    doc.save(`Machines_${todayStr}.pdf`);
    toast.success("PDF exported successfully!");
  };

  if (currentUser?.role !== "super-admin") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
        <ShieldCheck className="h-20 w-20 text-destructive opacity-10" />
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground text-lg">Only Super Admins can access machine management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Machine Management</h1>
          <p className="text-muted-foreground mt-1">Manage system machines, attributes, and fields</p>
        </div>
        <Button 
          onClick={showAddForm ? handleCancel : () => setShowAddForm(true)}
          className={cn(
            "shadow-lg transition-all duration-300 gap-2 h-11 px-6 font-semibold",
            showAddForm ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary hover:bg-primary/90"
          )}
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Machine"}
        </Button>
      </div>

      {/* Add Machine Form Section */}
      {showAddForm && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <Card className="border-primary/20 bg-primary/5 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                {editingMachine ? "Edit Machine" : "Create New Machine"}
              </CardTitle>
              <CardDescription>
                {editingMachine ? "Update the machine details below." : "Enter the details below to add a new machine to the system."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMachine} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Machine Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. CNC Lathe, Laser Cutter, Hydraulic Press"
                    className="h-11 bg-background"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description or location of the machine"
                    className="h-11 bg-background"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" className="h-11 px-8 font-bold" disabled={creating}>
                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingMachine ? "Update Machine" : "Create Machine")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Machines Table Section */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Active Machines
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search machines..." 
                  className="pl-10 h-10 bg-background/50 border-muted-foreground/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 px-4 font-bold border-muted-foreground/20 hover:bg-primary/5 transition-colors gap-2 text-xs">
                    <Download className="h-4 w-4" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer gap-2 text-xs">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Download as PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer gap-2 text-xs">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Download as Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-4 pl-6 text-xs font-bold tracking-wider">Name</TableHead>
                    <TableHead className="py-4 text-xs font-bold tracking-wider">Description</TableHead>
                    <TableHead className="py-4 text-xs font-bold tracking-wider">Fields Count</TableHead>
                    <TableHead className="py-4 text-xs font-bold tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                        No machines found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMachines.map((m) => (
                      <TableRow 
                        key={m._id} 
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => router.push(`/machines/${m._id}`)}
                      >
                        <TableCell className="py-4 pl-6 font-bold text-foreground">
                          {m.name}
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground">
                          {m.description || "No description provided"}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {m.fields?.length || 0} fields
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all font-semibold gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/machines/${m._id}`);
                            }}
                          >
                            <FolderOpen className="h-4 w-4" />
                            Manage
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                            onClick={(e) => handleEditClick(m, e)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            onClick={(e) => handleDeleteMachine(m._id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
