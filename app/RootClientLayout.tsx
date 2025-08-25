'use client';

import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import { WagmiProvider } from "@/providers/WagmiProvider";
import { DateProvider } from "@/providers/DateProvider";
import AppLayout from "./AppLayout";
import { usePathname } from "next/navigation";

// List of paths that are part of the app (not marketing site)
const APP_PATHS = [
  '/dashboard',
  '/portfolio',
  '/investments',
  '/opportunities',
  '/transactions',
  '/wallet-management',
  '/settings',
];

export default function RootClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // Check if the current path is part of the app
  const isAppPath = APP_PATHS.some(path => pathname?.startsWith(path));

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <WagmiProvider>
        <DateProvider>
          <div className="flex min-h-screen flex-col bg-gray-900">
            {!isAppPath && <Header />}
            <main className="flex-1">
              <AppLayout>{children}</AppLayout>
            </main>
          </div>
        </DateProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
