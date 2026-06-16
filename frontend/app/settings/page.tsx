"use client";

import { useState } from "react";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { toast } from "sonner";
import { User, Mail, Shield, ShieldCheck, Lock, UserCog, Settings as SettingsIcon, Loader2, User as UserIcon, AlertTriangle } from "lucide-react";
import { API_URL } from "@/src/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearingData, setClearingData] = useState(false);

  const handleClearBusinessData = async () => {
    if (clearConfirmText !== "CONFIRM CLEAR") return;

    if (!window.confirm("Are you absolutely sure you want to clear all business data? This action is permanent and cannot be undone.")) {
      return;
    }

    setClearingData(true);
    try {
      const response = await fetch(`${API_URL}/api/users/clear-business-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("All business data cleared successfully");
        setClearConfirmText("");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.message || "Failed to clear business data");
      }
    } catch (error) {
      console.error("Error clearing business data:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setClearingData(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password updated successfully");
        setPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account profile and security preferences.</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary">
                <UserIcon className="h-5 w-5" />
                <CardTitle className="text-xl">Profile Information</CardTitle>
              </div>
              <CardDescription>Your basic account details (Read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input 
                    id="name" 
                    value={user?.name || ""} 
                    readOnly 
                    className="bg-muted/50 border-muted font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    readOnly 
                    className="bg-muted/50 border-muted font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle className="text-xl">Security</CardTitle>
              </div>
              <CardDescription>Update your login password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="new-password" 
                        type="password" 
                        placeholder="••••••••"
                        className="pl-10 h-11 bg-background"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        placeholder="••••••••"
                        className="pl-10 h-11 bg-background"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={updating} className="h-11 px-8 font-semibold transition-all duration-200">
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">System Preferences</CardTitle>
              <CardDescription>Manage your app experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive order updates and system alerts</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone - Only visible to Super Admin */}
          {user?.role === "super-admin" && (
            <Card className="border border-destructive/30 shadow-sm bg-destructive/5 dark:bg-destructive/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <CardTitle className="text-xl font-bold">Danger Zone</CardTitle>
                </div>
                <CardDescription className="text-destructive/80 font-medium">
                  Irreversible administrative system actions. Proceed with extreme caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground dark:text-destructive-foreground space-y-2">
                  <p className="font-semibold text-destructive dark:text-red-400">
                    Warning: Clearing business data will permanently delete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground dark:text-slate-300">
                    <li>All products and stock inventory</li>
                    <li>All supplier records</li>
                    <li>All master production tables and rows</li>
                    <li>All workflow tasks, queue statuses, and historical stages</li>
                    <li>All notifications and system alerts</li>
                    <li>All activity logs (except this reset action itself)</li>
                  </ul>
                  <p className="font-semibold text-destructive dark:text-red-400 pt-2">
                    User accounts and Departments will NOT be deleted.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-clear" className="font-semibold text-foreground">
                      To confirm, type <span className="font-mono text-destructive dark:text-red-400 bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">CONFIRM CLEAR</span> below:
                    </Label>
                    <Input
                      id="confirm-clear"
                      placeholder="CONFIRM CLEAR"
                      className="h-11 bg-background border-muted"
                      value={clearConfirmText}
                      onChange={(e) => setClearConfirmText(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      disabled={clearConfirmText !== "CONFIRM CLEAR" || clearingData}
                      onClick={handleClearBusinessData}
                      className="h-11 px-8 font-semibold shadow-sm hover:bg-destructive/95 transition-all duration-200"
                    >
                      {clearingData ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing Data...
                        </>
                      ) : (
                        "Clear Business Data"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
