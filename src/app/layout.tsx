// src/app/layout.tsx
"use client"; // <--- ADD THIS LINE

import { Merriweather, Roboto_Slab, Libre_Baskerville, Source_Sans_3, Open_Sans } from "next/font/google";
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from "@/providers/theme-provider";
import Header from '@/components/header';
import "./globals.css";
import { Toaster } from 'sonner';
import { useState, useEffect } from "react"; // <--- IMPORT useState, useEffect

// --- Font definitions remain the same ---
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-merriweather',
});

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-roboto-slab',
});

const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-libre-baskerville',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});
// --- End Font definitions ---

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false); // <--- ADD MOUNT STATE

  useEffect(() => {
    setIsMounted(true); // Set to true only on the client-side after mount
  }, []);

  return (
    // Add suppressHydrationWarning to the html tag if you see hydration warnings after this change
    <html lang="en" suppressHydrationWarning>
      <body className={`${merriweather.variable} ${robotoSlab.variable} ${libreBaskerville.variable} ${sourceSans.variable} ${openSans.variable}`}>
        {/* AuthProvider might need "use client" if it internally uses client hooks */}
        <AuthProvider>
          {/* ThemeProvider handles its own mount logic correctly */}
          <ThemeProvider>
            {/* Conditionally render Header */}
            {isMounted && <Header />}
            <main className="min-h-screen">
              {children}
            </main>
          </ThemeProvider>
        </AuthProvider>
        {/* Conditionally render Toaster as well */}
        {isMounted && <Toaster />}
      </body>
    </html>
  );
}