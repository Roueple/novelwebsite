// src/app/layout.tsx
"use client";

import { Merriweather, Roboto_Slab, Libre_Baskerville, Source_Sans_3, Open_Sans } from "next/font/google";
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from "@/providers/theme-provider";
import Header from '@/components/header';
import "./globals.css";
import { Toaster } from '@/components/ui/sonner'; // Corrected import path
import { useState, useEffect } from "react";

// --- Font definitions remain the same ---
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-merriweather',
  display: 'swap', // Added for performance
});

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-roboto-slab',
  display: 'swap', // Added for performance
});

const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-libre-baskerville',
  display: 'swap', // Added for performance
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap', // Added for performance
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap', // Added for performance
});
// --- End Font definitions ---

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Combine font variables for the body class
  const fontClasses = [
    merriweather.variable,
    robotoSlab.variable,
    libreBaskerville.variable,
    sourceSans.variable,
    openSans.variable,
    // Add default font family class here if needed, e.g., 'font-sans' or 'font-serif'
    'font-sans' // Assuming Open Sans is the default sans-serif
  ].join(' ');

  return (
    // Add suppressHydrationWarning to the html tag
    <html lang="en" suppressHydrationWarning>
      <body className={fontClasses}>
        <AuthProvider>
          {/* ThemeProvider now handles its mount logic internally */}
          <ThemeProvider>
            {/* Conditionally render Header based on mount state */}
            {isMounted && <Header />}
            <main className="min-h-screen">
              {children}
            </main>
            {/* Conditionally render Toaster */}
            {isMounted && <Toaster />}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}