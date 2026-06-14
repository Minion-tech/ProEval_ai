"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/common/layout/Navbar";
import Footer from "@/components/common/layout/Footer";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Define paths where Navbar and Footer should NOT be shown
  const isPortal = pathname.startsWith("/student") || pathname.startsWith("/admin");
  const isAuth = pathname === "/login" || pathname === "/register";
  
  if (isPortal || isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
