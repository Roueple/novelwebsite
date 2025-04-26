// src/app/layout.tsx (REVISED - NProgress removed)
"use client";
import { Suspense } from 'react';
import { Merriweather, Roboto_Slab, Libre_Baskerville, Source_Sans_3, Open_Sans } from "next/font/google"; // [cite: 674]
import { AuthProvider } from '@/providers/auth-provider'; // [cite: 675]
import { ThemeProvider } from "@/providers/theme-provider"; // [cite: 675]
import Header from '@/components/header'; // [cite: 675]
import "./globals.css"; // [cite: 675]
import { Toaster } from '@/components/ui/sonner'; // [cite: 676]
import { useState, useEffect } from "react"; // [cite: 677]
import LoadingSpinner from '@/components/ui/loading-spinner'; // [cite: 678]
import { Analytics } from "@vercel/analytics/react"

// --- Font definitions ---
const merriweather = Merriweather({
  subsets: ['latin'], // [cite: 678]
  weight: ['300', '400', '700', '900'], // [cite: 678]
  variable: '--font-merriweather', // [cite: 678]
  display: 'swap', // [cite: 678]
}); // [cite: 678]
const robotoSlab = Roboto_Slab({
  subsets: ['latin'], // [cite: 679]
  variable: '--font-roboto-slab', // [cite: 679]
  display: 'swap', // [cite: 679]
}); // [cite: 679]
const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'], // [cite: 680]
  style: ['normal', 'italic'], // [cite: 680]
  subsets: ['latin'], // [cite: 680]
  variable: '--font-libre-baskerville', // [cite: 680]
  display: 'swap', // [cite: 680]
}); // [cite: 680]
const sourceSans = Source_Sans_3({
  subsets: ['latin'], // [cite: 681]
  variable: '--font-source-sans', // [cite: 681]
  display: 'swap', // [cite: 681]
}); // [cite: 681]
const openSans = Open_Sans({
  subsets: ['latin'], // [cite: 682]
  variable: '--font-open-sans', // [cite: 682]
  display: 'swap', // [cite: 682]
}); // [cite: 682]
// --- End Font definitions ---

// --- Suspense Fallback Components ---
function RootLayoutFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoadingSpinner size="lg" />
    </div>
  ); // [cite: 684]
}

function HeaderFallback() {
    return <div className="h-[56px] md:h-[60px] bg-background border-b border-border"></div>; // [cite: 685]
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false); // [cite: 686]
  useEffect(() => {
    setIsMounted(true); // [cite: 686]
  }, []); // [cite: 687]

  const fontClasses = [
    merriweather.variable, // [cite: 687]
    robotoSlab.variable, // [cite: 687]
    libreBaskerville.variable, // [cite: 687]
    sourceSans.variable, // [cite: 687]
    openSans.variable, // [cite: 687]
    'font-sans' // Ensure a fallback sans font is always applied // [cite: 687]
  ].join(' '); // [cite: 687]

  // Return null or a basic structure until mounted
  if (!isMounted) { // Assuming you need isMounted check for other reasons // [cite: 688]
      return (
          <html lang="en" suppressHydrationWarning>
              <body className={fontClasses}>
                  <RootLayoutFallback />
              </body>
          </html>
      ); // [cite: 689]
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontClasses}>
        <AuthProvider>
          {/* REMOVED incorrect props from here */}
          <ThemeProvider>
            {/* Header */}
            <Suspense fallback={<HeaderFallback />}>
              <Header />
            </Suspense>


            {/* Main Content Area */} {/* [cite: 690] */}
            <Suspense fallback={<RootLayoutFallback />}>
               <main className="min-h-screen">
                 {children}
                 <Analytics />
               </main>
            </Suspense> {/* [cite: 691] */}

            <Toaster /> {/* [cite: 691] */}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  ); // [cite: 692]
}