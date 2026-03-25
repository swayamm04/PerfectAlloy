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
  Building2, 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  X,
  ShieldCheck,
  Edit2
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";

interface DepartmentData {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
}

export default function DepartmentsPage() {
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
      } else {
        toast.error(data.message || "Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("An error occurred while fetching departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "super-admin") {
      fetchDepartments();
    }
  }, [currentUser]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const url = editingDepartment 
        ? `${API_URL}/api/departments/${editingDepartment._id}` 
        : `${API_URL}/api/departments`;
      
      const method = editingDepartment ? "PUT" : "POST";

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
        toast.success(editingDepartment ? "Department updated successfully!" : "Department created successfully!");
        setName("");
        setDescription("");
        setEditingDepartment(null);
        setShowAddForm(false);
        fetchDepartments();
      } else {
        toast.error(data.message || "Failed to save department");
      }
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error("An error occurred while saving the department");
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (dept: DepartmentData) => {
    setEditingDepartment(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingDepartment(null);
    setName("");
    setDescription("");
    setShowAddForm(false);
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this department?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/departments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Department removed successfully");
        fetchDepartments();
      } else {
        toast.error(data.message || "Failed to delete department");
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("An error occurred while deleting the department");
    }
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== "super-admin") {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
          <ShieldCheck className="h-20 w-20 text-destructive opacity-10" />
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground text-lg">Only Super Admins can access department management.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Department Management</h1>
            <p className="text-muted-foreground mt-1">Manage system departments and organizational structure</p>
          </div>
          <Button 
            onClick={showAddForm ? handleCancel : () => setShowAddForm(true)}
            className={cn(
              "shadow-lg transition-all duration-300 gap-2 h-11 px-6 font-semibold",
              showAddForm ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary hover:bg-primary/90"
            )}
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Department"}
          </Button>
        </div>

        {/* Add Department Form Section */}
        {showAddForm && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <Card className="border-primary/20 bg-primary/5 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {editingDepartment ? "Edit Department" : "Create New Department"}
                </CardTitle>
                <CardDescription>
                  {editingDepartment ? "Update the department details below." : "Enter the details below to add a new department to the system."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateDepartment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Department Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Engineering, HR, Sales"
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
                      placeholder="Brief description of the department"
                      className="h-11 bg-background"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" className="h-11 px-8 font-bold" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDepartment ? "Update Department" : "Create Department")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Departments Table Section */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Active Departments
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search departments..." 
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
                      <TableHead className="py-4 pl-6 text-xs font-bold tracking-wider">Name</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider">Description</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                          No departments found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDepartments.map((d) => (
                        <TableRow key={d._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 pl-6 font-bold text-foreground">
                            {d.name}
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            {d.description || "No description provided"}
                          </TableCell>
                          <TableCell className="pr-6 text-right space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                              onClick={() => handleEditClick(d)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              onClick={() => handleDeleteDepartment(d._id)}
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
    </DashboardLayout>
  );
}
