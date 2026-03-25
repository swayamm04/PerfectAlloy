"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Plus, 
  Table as TableIcon, 
  Loader2, 
  Search, 
  X, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Building2
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

interface Department {
  _id: string;
  name: string;
}

interface MasterTable {
  _id: string;
  name: string;
  departments: Department[];
  createdAt: string;
}

export default function ProductionTablesPage() {
  const { user: currentUser } = useAuth();
  const [tables, setTables] = useState<MasterTable[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [tableName, setTableName] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const fetchTables = async () => {
    try {
      const response = await fetch(`${API_URL}/api/master-tables`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setTables(data);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/departments`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setDepartments(data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTables();
      if (currentUser.role === "super-admin") {
        fetchDepartments();
      }
    }
  }, [currentUser]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDepts.length === 0) {
      toast.error("Please select at least one department");
      return;
    }
    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/api/master-tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ name: tableName, departments: selectedDepts }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Master Table created successfully!");
        setTableName("");
        setSelectedDepts([]);
        setShowAddForm(false);
        fetchTables();
      } else {
        toast.error(data.message || "Failed to create table");
      }
    } catch (error) {
      console.error("Error creating table:", error);
      toast.error("An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!window.confirm("Are you sure? This will delete all data within this table.")) return;

    try {
      const response = await fetch(`${API_URL}/api/master-tables/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      if (response.ok) {
        toast.success("Table deleted successfully");
        fetchTables();
      }
    } catch (error) {
      toast.error("Error deleting table");
    }
  };

  const toggleDept = (deptId: string) => {
    setSelectedDepts(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId) 
        : [...prev, deptId]
    );
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Production Tables</h1>
            <p className="text-muted-foreground mt-1">Manage dynamic production tracking matrices</p>
          </div>
          {currentUser?.role === "super-admin" && (
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className={cn(
                "shadow-lg transition-all duration-300 gap-2 h-11 px-6 font-semibold",
                showAddForm ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary hover:bg-primary/90"
              )}
            >
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddForm ? "Cancel" : "Create Table"}
            </Button>
          )}
        </div>

        {showAddForm && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <Card className="border-primary/20 bg-primary/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-primary" />
                  Define New Production Table
                </CardTitle>
                <CardDescription>
                  Choose a name and select the departments that will form the columns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTable} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tableName" className="text-sm font-semibold">Table Name</Label>
                    <Input
                      id="tableName"
                      placeholder="e.g. Master Production Flow 2026"
                      className="h-11 bg-background"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-primary">Select Departments (Columns)</Label>
                    <div className="flex flex-col gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-11 bg-background"
                          >
                            <div className="flex gap-1 flex-wrap overflow-hidden">
                              {selectedDepts.length > 0 
                                ? selectedDepts
                                    .map(id => departments.find(d => d._id === id))
                                    .filter(Boolean)
                                    .map(d => (
                                      <Badge key={d?._id} variant="secondary" className="mr-1">
                                        {d?.name}
                                      </Badge>
                                    ))
                                : "Select departments..."}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search departments..." />
                            <CommandList>
                              <CommandEmpty>No department found.</CommandEmpty>
                              <CommandGroup>
                                {departments.map((dept) => (
                                  <CommandItem
                                    key={dept._id}
                                    value={dept.name}
                                    onSelect={() => toggleDept(dept._id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedDepts.includes(dept._id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {dept.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Selected tags display (Optional, in case the trigger gets crowded) */}
                      {selectedDepts.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedDepts
                            .map(id => departments.find(d => d._id === id))
                            .filter(Boolean)
                            .map(d => (
                              <Badge key={d?._id} variant="default" className="pl-2 pr-1 py-1 gap-1">
                                {d?.name}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (d) toggleDept(d._id);
                                  }}
                                />
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="h-11 px-8 font-bold" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Initialize Table"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Active Production Matrices
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tables..." 
                  className="pl-10 h-10 bg-background/50 border-muted-foreground/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
                      <TableHead className="py-4 pl-6 text-xs font-bold tracking-wider">Table Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider">Columns (Departments)</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider text-center">Row Count</TableHead>
                      <TableHead className="py-4 pr-6 text-right text-xs font-bold tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                          No production tables found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTables.map((t) => (
                        <TableRow key={t._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <TableIcon className="h-5 w-5 text-primary" />
                              </div>
                              <span className="font-bold text-foreground">{t.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {t.departments.map(d => (
                                <Badge key={d._id} variant="secondary" className="text-[10px] h-5 bg-muted/50 border-none font-medium">
                                  {d.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <Badge variant="outline" className="font-bold">Row Data Enabled</Badge>
                          </TableCell>
                          <TableCell className="pr-6 text-right space-x-2">
                            <Link href={`/production-tables/${t._id}`}>
                              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            {currentUser?.role === "super-admin" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteTable(t._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
    </DashboardLayout>
  );
}
