// src/app/layout.tsx
"use client";
import { Suspense } from 'react';
import { Merriweather, Roboto_Slab, Libre_Baskerville, Source_Sans_3, Open_Sans } from "next/font/google";
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from "@/providers/theme-provider";
import Header from '@/components/header';
import "./globals.css";
import 'nprogress/nprogress.css';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect } from "react";
// import { useNProgress } from '@/hooks/use-nprogress'; // <-- Remove direct hook import
import NProgressWrapper from '@/components/nprogress-wrapper'; // <-- Import the wrapper component
import LoadingSpinner from '@/components/ui/loading-spinner';

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

// --- Suspense Fallback Components ---
function RootLayoutFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function HeaderFallback() {
    return <div className="h-[56px] md:h-[60px] bg-background border-b border-border"></div>;
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  // useNProgress(); // <-- REMOVE direct hook call here

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

  // Return null or a basic structure until mounted
  if (!isMounted) {
      return (
          <html lang="en" suppressHydrationWarning>
              <body className={fontClasses}>
                  <RootLayoutFallback />
              </body>
          </html>
      );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontClasses}>
        <AuthProvider>
          <ThemeProvider>
            {/* Header needs Suspense as it uses usePathname */}
            <Suspense fallback={<HeaderFallback />}>
              <Header />
            </Suspense>

            {/* Main Content Area needs Suspense for potential client components */}
            <Suspense fallback={<RootLayoutFallback />}>
               {/* Render the NProgress wrapper inside the main Suspense boundary */}
               <NProgressWrapper />
               <main className="min-h-screen">
                {children}
              </main>
            </Suspense>

            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}