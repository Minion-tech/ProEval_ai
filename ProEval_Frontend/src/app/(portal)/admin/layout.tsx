"use client";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconClipboardList,
  IconLayoutDashboard,
  IconMessageCircle,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <IconLayoutDashboard className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: <IconUsers className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
    {
      label: "Projects",
      href: "/admin/projects",
      icon: <IconClipboardList className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
    {
      label: "Evaluations",
      href: "/admin/evaluations",
      icon: <IconMessageCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: <IconSettings className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: <IconLayoutDashboard className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
    {
      label: "Logout",
      href: "#",
      onClick: () => {
        logout();
        router.push("/login");
      },
      icon: <IconArrowLeft className="h-5 w-5 flex-shrink-0 text-muted-foreground dark:text-muted-foreground/60" />,
    },
  ];

  const userInitials = user
    ? user.name
        .split(" ")
        .map((item) => item[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <div
      className={cn(
        "flex h-screen w-full max-w-full flex-1 flex-col overflow-hidden rounded-md border border-border bg-background md:flex-row dark:border-sidebar-border dark:bg-sidebar"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, index) => (
                <SidebarLink key={index} link={link} onClick={link.onClick} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || "Admin",
                href: "/admin/settings",
                icon: (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                    {userInitials}
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-y-auto bg-card dark:bg-sidebar">{children}</div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-foreground"
    >
      <div className="h-5 w-6 flex-shrink-0 rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-sm bg-foreground dark:bg-background" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="whitespace-pre font-medium text-foreground dark:text-foreground"
      >
        Admin Panel
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-foreground"
    >
      <div className="h-5 w-6 flex-shrink-0 rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-sm bg-foreground dark:bg-background" />
    </Link>
  );
};
