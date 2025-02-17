// src/app/layout.tsx
import { Merriweather, Roboto_Slab, Libre_Baskerville, Source_Sans_3, Open_Sans } from "next/font/google";
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from "@/providers/theme-provider";
import Header from '@/components/header';
import "./globals.css";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${merriweather.variable} ${robotoSlab.variable} ${libreBaskerville.variable} ${sourceSans.variable} ${openSans.variable}`}>
        <AuthProvider>
          <ThemeProvider>
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}