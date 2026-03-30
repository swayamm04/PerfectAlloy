"use client";

import { useState, useEffect } from "react";
import { Bell, Building2, User, LogOut, Clock } from "lucide-react";
import { Notifications } from "@/src/components/layout/Notifications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/src/context/AuthContext";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { logout, user } = useAuth();
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Real-time Clock (Now on the left) */}
      <div className="flex flex-col items-start justify-center px-4 py-1 rounded-xl bg-muted/20 border border-muted/30 shadow-inner min-w-[140px]">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="text-sm font-bold tabular-nums text-foreground tracking-tight">
            {formatTime(dateTime)}
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
          {formatDate(dateTime)}
        </span>
      </div>

      {/* Department Display (Now in the middle) */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight">
            {user?.role === 'super-admin' 
              ? "Super Admin" 
              : ((user?.department as any)?.name ? `Dept of ${(user?.department as any)?.name}` : "No Department")}
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Current Workspace
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Notifications />

        {/* User Display (Read-only) */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-muted/30 border border-transparent select-none">
          <Avatar className="h-8 w-8 ring-2 ring-primary/10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {user?.name?.substring(0, 2).toUpperCase() || "AD"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block text-sm font-semibold text-foreground/80">
            {user?.name || (user?.role === 'super-admin' ? "Super Admin" : "User")}
          </span>
        </div>

        {/* Separate Logout Icon (as requested) */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={logout}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Log out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
