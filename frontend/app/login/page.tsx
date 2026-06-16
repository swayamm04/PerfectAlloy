"use client";

import { useState } from "react";
import { Eye, EyeOff, Shield, Wallet } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { API_URL } from "@/src/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [isAdminFlipped, setIsAdminFlipped] = useState(false);

  // Admin Portal State
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Expenses Portal State
  const [expensesEmail, setExpensesEmail] = useState("");
  const [expensesPassword, setExpensesPassword] = useState("");
  const [showExpensesPassword, setShowExpensesPassword] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const { login } = useAuth();

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: adminEmail, password: adminPassword, portal: "admin" }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data);
        toast.success("Login successful!");
      } else {
        toast.error(data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login. Please try again.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleExpensesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpensesLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: expensesEmail, password: expensesPassword, portal: "expenses" }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data);
        toast.success("Expenses Portal Login successful!");
      } else {
        toast.error(data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login. Please try again.");
    } finally {
      setExpensesLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 transition-colors duration-500">
      
      {/* Sliding Portal Switcher */}
      <div className="flex bg-card p-1 rounded-xl border border-muted-foreground/10 shadow-sm w-fit mb-6 z-10">
        <button
          type="button"
          onClick={() => setIsAdminFlipped(false)}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
            !isAdminFlipped
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Shield size={16} />
          Admin Portal
        </button>
        <button
          type="button"
          onClick={() => setIsAdminFlipped(true)}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
            isAdminFlipped
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Wallet size={16} />
          Expenses Portal
        </button>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 w-full max-w-md h-[550px] relative">
        <div className={cn(
          "w-full h-full duration-700 preserve-3d relative",
          isAdminFlipped ? "rotate-y-180" : ""
        )}>
          
          {/* Front Card: Admin Login */}
          <div className="absolute inset-0 backface-hidden w-full h-full">
            <Card className="w-full h-full border-none shadow-2xl flex flex-col justify-between p-6">
              <CardHeader className="space-y-3 flex flex-col items-center p-0">
                <div className="bg-primary/10 p-3 rounded-2xl w-fit">
                  <Image src="/logo.png" alt="PAC Logo" width={60} height={60} className="object-contain" priority />
                </div>
                <div className="text-center">
                  <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1 text-sm">
                    Enter your credentials to access your Admin account
                  </CardDescription>
                </div>
              </CardHeader>
              <form onSubmit={handleAdminSubmit} className="flex-1 flex flex-col justify-between mt-4">
                <CardContent className="space-y-4 p-0">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email Address</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@pac.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showAdminPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        className="h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 p-0 mt-4">
                  <Button type="submit" className="w-full h-11 text-sm font-semibold transition-all duration-200" disabled={adminLoading}>
                    {adminLoading ? "Authenticating..." : "Sign In"}
                  </Button>
                  <div className="text-xs text-center text-muted-foreground bg-muted/40 p-2.5 rounded-lg w-full border border-muted-foreground/5">
                    <p className="font-semibold text-foreground/80 mb-0.5">Demo Credentials:</p>
                    <p>Email: admin@pac.com | Password: perfect</p>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Back Card: Expenses Login */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full">
            <Card className="w-full h-full border border-purple-500/10 shadow-2xl shadow-purple-500/5 bg-card flex flex-col justify-between p-6">
              <CardHeader className="space-y-3 flex flex-col items-center p-0">
                <div className="bg-purple-50 p-3 rounded-2xl w-fit dark:bg-purple-950/20">
                  <Image src="/logo.png" alt="PAC Logo" width={60} height={60} className="object-contain" priority />
                </div>
                <div className="text-center">
                  <CardTitle className="text-2xl font-bold tracking-tight text-purple-900 dark:text-purple-400">Expenses Portal</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1 text-sm">
                    Enter your credentials to access the Expenses module
                  </CardDescription>
                </div>
              </CardHeader>
              <form onSubmit={handleExpensesSubmit} className="flex-1 flex flex-col justify-between mt-4">
                <CardContent className="space-y-4 p-0">
                  <div className="space-y-2">
                    <Label htmlFor="expenses-email" className="text-purple-950 dark:text-purple-300">Email Address</Label>
                    <Input
                      id="expenses-email"
                      type="email"
                      placeholder="admin@pac.com"
                      value={expensesEmail}
                      onChange={(e) => setExpensesEmail(e.target.value)}
                      required
                      className="h-11 border-purple-200/50 dark:border-purple-900/30 focus:border-purple-600 focus:ring-purple-600 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenses-password" className="text-purple-950 dark:text-purple-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="expenses-password"
                        type={showExpensesPassword ? "text" : "password"}
                        value={expensesPassword}
                        onChange={(e) => setExpensesPassword(e.target.value)}
                        required
                        className="h-11 border-purple-200/50 dark:border-purple-900/30 focus:border-purple-600 focus:ring-purple-600 transition-all duration-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowExpensesPassword(!showExpensesPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600/70 hover:text-purple-600 focus:outline-none"
                      >
                        {showExpensesPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 p-0 mt-4">
                  <Button type="submit" className="w-full h-11 text-sm font-semibold transition-all duration-200 bg-purple-600 hover:bg-purple-700 text-white" disabled={expensesLoading}>
                    {expensesLoading ? "Authenticating..." : "Sign In to Expenses"}
                  </Button>
                  <div className="text-xs text-center text-muted-foreground bg-purple-50/50 dark:bg-purple-950/10 p-2.5 rounded-lg w-full border border-purple-200/20 dark:border-purple-950/20">
                    <p className="font-semibold text-purple-900 dark:text-purple-400 mb-0.5">Expenses Demo Credentials:</p>
                    <p>Email: admin@pac.com | Password: expences</p>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
