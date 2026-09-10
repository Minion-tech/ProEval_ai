import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/common/layout/LayoutWrapper";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, ThemeScript } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProEval AI",
  description: "Advanced AI-powered student project evaluation and progress tracking system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-200">
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </AuthProvider>
          {/* Global floating ThemeToggle — single source, fixed bottom-right on every page */}
          <div className="fixed bottom-4 right-4 z-50 md:bottom-5 md:right-5">
            <ThemeToggle className="h-11 w-11 rounded-full border border-white/10 bg-[#171717] text-white shadow-lg hover:bg-[#1e1e1e] hover:text-white dark:bg-[#1e1e1e] dark:border-white/10 dark:text-white dark:hover:bg-[#262626]" />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
