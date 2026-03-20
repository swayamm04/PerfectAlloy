"use client";

import { useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { API_URL } from "@/src/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
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
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <div className="bg-primary/10 p-3 rounded-2xl w-fit">
            <Image src="/logo.png" alt="PAC Logo" width={60} height={60} className="object-contain" priority />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-base">
              Enter your credentials to access your account
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@pac.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-muted-foreground/20 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-muted-foreground/20 focus:border-primary transition-all duration-200"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8 pt-2">
            <Button type="submit" className="w-full h-12 text-base font-semibold transition-all duration-200" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              <p>Demo Credentials:</p>
              <p>Email: admin@pac.com | Password: perfect</p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
