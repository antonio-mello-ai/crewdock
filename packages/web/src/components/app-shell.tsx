"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  SquareTerminal,
  ListTodo,
  Clock,
  DollarSign,
  Inbox,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/console", label: "Console", icon: MessageSquare },
  { href: "/terminal", label: "Terminal", icon: SquareTerminal },
  { href: "/jobs", label: "Jobs", icon: ListTodo },
  { href: "/schedules", label: "Schedules", icon: Clock },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile nav on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when mobile nav open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const SidebarContent = useCallback(
    ({ isMobile = false }: { isMobile?: boolean }) => {
      const isCollapsed = !isMobile && collapsed;

      return (
        <>
          {/* Brand */}
          <div className="flex h-14 items-center justify-between px-3">
            {!isCollapsed && (
              <Link
                href="/"
                className="flex items-center gap-2.5"
                onClick={() => isMobile && setMobileOpen(false)}
              >
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
            {isCollapsed && (
              <Link href="/" className="mx-auto">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-800 border border-neutral-700/50">
                  <span className="text-xs font-bold tracking-tighter text-neutral-200 font-mono">
                    A
                  </span>
                </div>
              </Link>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-500 hover:text-neutral-300"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
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
                  onClick={() => isMobile && setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-neutral-800/80 text-neutral-100"
                      : "text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle — desktop only */}
          {!isMobile && (
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
          )}
        </>
      );
    },
    [collapsed, pathname]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile hamburger — fixed top-left */}
      <div className="fixed top-0 left-0 z-50 flex h-14 items-center px-3 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-neutral-400 hover:text-neutral-200"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-neutral-950 transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent isMobile />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-neutral-950/50 transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
