"use client";

import { Bell, Search, User, LogOut } from "lucide-react";
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

export const Header = () => {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products, orders, customers..."
          className="pl-10 bg-background"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            3
          </span>
        </Button>

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
