"use client";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconSettings,
  IconUserBolt,
  IconLayoutDashboard,
  IconUsers,
  IconMessageCircle,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const links = [
    {
      label: "Home & Workflow",
      href: "/student/dashboard",
      icon: <IconLayoutDashboard className="h-5 w-5 shrink-0 text-muted-foreground" />,
    },
    {
      label: "My Team & Project",
      href: "/student/team",
      icon: <IconUsers className="h-5 w-5 shrink-0 text-muted-foreground" />,
    },
    {
      label: "AI Feedback & Guidance",
      href: "/student/feedback",
      icon: <IconMessageCircle className="h-5 w-5 shrink-0 text-muted-foreground" />,
    },
    {
      label: "My Profile",
      href: "/student/profile",
      icon: <IconUserBolt className="h-5 w-5 shrink-0 text-muted-foreground" />,
    },
    {
      label: "Settings",
      href: "/student/settings",
      icon: <IconSettings className="h-5 w-5 shrink-0 text-muted-foreground" />,
    },
    {
      label: "Logout",
      href: "#",
      onClick: () => {
        logout();
        router.push("/login");
      },
      icon: <IconArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground" />,
    },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-1.5">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} onClick={link.onClick} />
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <SidebarLink
              link={{
                label: user?.name || "User",
                href: "/student/profile",
                icon: (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                    {userInitials}
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-y-auto bg-muted/10">
        {children}
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-2 py-1 text-sm text-foreground">
      <div className="h-5 w-6 shrink-0 rounded-br-lg rounded-tl-lg bg-foreground" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="whitespace-pre text-sm font-semibold tracking-tight text-foreground"
      >
        ProEval
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link href="/" className="flex items-center gap-2 py-1 text-sm text-foreground">
      <div className="h-5 w-6 shrink-0 rounded-br-lg rounded-tl-lg bg-foreground" />
    </Link>
  );
};
