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
  ShieldCheck, 
  UserPlus, 
  Mail, 
  User as UserIcon, 
  Lock, 
  Loader2, 
  Search, 
  Plus, 
  Trash2, 
  Calendar,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/users", {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      } else {
        toast.error(data.message || "Failed to fetch admins");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("An error occurred while fetching admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "super-admin") {
      fetchUsers();
    }
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Admin created successfully!");
        setName("");
        setEmail("");
        setPassword("");
        setShowPassword(false);
        setShowAddForm(false);
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to create admin");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("An error occurred while creating the admin");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? They will lose all access immediately.")) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("An error occurred while deleting the user");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (n: string) => {
    return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
  };

  if (!loading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUser?.role !== "super-admin") {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
          <ShieldCheck className="h-20 w-20 text-destructive opacity-10" />
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground text-lg">Only Super Admins can access administrative management.</p>
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage user access to the system</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={cn(
              "shadow-lg transition-all duration-300 gap-2 h-11 px-6 font-semibold",
              showAddForm ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary hover:bg-primary/90"
            )}
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add User"}
          </Button>
        </div>

        {/* Add Admin Form Section (Conditional) */}
        {showAddForm && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <Card className="border-primary/20 bg-primary/5 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Create New User
                </CardTitle>
                <CardDescription>
                  Enter the details below to add a new user to the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="User Name"
                        className="pl-10 h-11 bg-background"
                        value={name}
                        onChange={(e) => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          setName(capitalized);
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        className="pl-10 h-11 bg-background"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <Label htmlFor="password" className="text-sm font-semibold mb-2">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 bg-background"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <Button type="submit" className="h-11 px-8 font-bold" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create User Account"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admins Table Section */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Active Users
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
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
                      <TableHead className="py-4 pl-6 text-xs font-bold tracking-wider">User</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider">Email</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider">Role</TableHead>
                      <TableHead className="py-4 text-xs font-bold tracking-wider">Joined</TableHead>
                      <TableHead className="py-4 pr-6 text-right text-xs font-bold tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                          No users found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-primary/20">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  <UserIcon className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-foreground">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground font-medium">
                              <Mail className="h-4 w-4 opacity-50" />
                              {u.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "h-2 w-2 rounded-full ring-2 ring-offset-2",
                                u.role === "super-admin" ? "bg-amber-500 ring-amber-500/20" : "bg-blue-500 ring-blue-500/20"
                              )} />
                              <Badge variant="outline" className={cn(
                                "border-none font-semibold",
                                u.role === "super-admin" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              )}>
                                {u.role === "super-admin" ? "Super Admin" : "User"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Calendar className="h-4 w-4 opacity-50" />
                              {formatDate(u.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            {u.role !== 'super-admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                onClick={() => handleDeleteUser(u._id)}
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
