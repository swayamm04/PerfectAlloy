"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : ("url" in input ? (input as any).url : input.toString());
        // Inject header for requests directed to our backend API
        if (url.includes(":5000") || url.includes("/api/")) {
          try {
            const userInfoStr = localStorage.getItem("userInfo");
            if (userInfoStr) {
              const userInfo = JSON.parse(userInfoStr);
              if (userInfo && userInfo.module) {
                init = init || {};
                init.headers = init.headers || {};
                if (init.headers instanceof Headers) {
                  init.headers.set("x-module", userInfo.module);
                } else if (Array.isArray(init.headers)) {
                  init.headers.push(["x-module", userInfo.module]);
                } else {
                  // Standard Record<string, string>
                  (init.headers as Record<string, string>)["x-module"] = userInfo.module;
                }
              }
            }
          } catch (e) {
            console.error("Error setting x-module header on fetch", e);
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
