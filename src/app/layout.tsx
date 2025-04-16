// src/app/layout.tsx
"use client";
import { Suspense } from 'react'; // <--- Import Suspense
import { Merriweather, Roboto_Slab, Libre_Baskerville, Source_Sans_3, Open_Sans } from "next/font/google";
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from "@/providers/theme-provider";
import Header from '@/components/header';
import "./globals.css";
import 'nprogress/nprogress.css';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect } from "react";
import { useNProgress } from '@/hooks/use-nprogress';
import LoadingSpinner from '@/components/ui/loading-spinner'; // <-- Import a loader for fallback

// --- Font definitions ---
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-merriweather',
  display: 'swap',
});
const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-roboto-slab',
  display: 'swap',
});
const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-libre-baskerville',
  display: 'swap',
});
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
});
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
});
// --- End Font definitions ---

// --- Suspense Fallback Component ---
function RootLayoutFallback() {
  return (
    // Basic fallback, you can customize this further
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initialize NProgress for page transitions
  useNProgress();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fontClasses = [
    merriweather.variable,
    robotoSlab.variable,
    libreBaskerville.variable,
    sourceSans.variable,
    openSans.variable,
    'font-sans'
  ].join(' ');

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontClasses}>
        <AuthProvider>
          <ThemeProvider>
            {isMounted && <Header />}
            {/* Wrap the main content area with Suspense */}
            <Suspense fallback={<RootLayoutFallback />}>
              <main className="min-h-screen">
                {children}
              </main>
            </Suspense>
            {isMounted && <Toaster />}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}