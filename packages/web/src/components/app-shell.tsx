"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Terminal,
  ListTodo,
  Clock,
  DollarSign,
  Inbox,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/console", label: "Console", icon: Terminal },
  { href: "/jobs", label: "Jobs", icon: ListTodo },
  { href: "/schedules", label: "Schedules", icon: Clock },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-neutral-950/50 transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between px-3">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-800 border border-neutral-700/50">
                <span className="text-xs font-bold tracking-tighter text-neutral-200 font-mono">
                  A
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-neutral-100">
                  AIOS
                </span>
                <span className="text-[10px] leading-none text-neutral-500 font-mono">
                  runtime
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-800 border border-neutral-700/50">
                <span className="text-xs font-bold tracking-tighter text-neutral-200 font-mono">
                  A
                </span>
              </div>
            </Link>
          )}
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2 mt-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-neutral-800/80 text-neutral-100"
                    : "text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-neutral-300"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
