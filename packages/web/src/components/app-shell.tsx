"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppNotifications } from "@/hooks/use-notifications";
import {
  isOperationalPath,
  isPublicAiosHost,
  protectedOperationalUrl,
} from "@/lib/operational-surface";
import {
  LayoutDashboard,
  MessageSquare,
  SquareTerminal,
  ListTodo,
  Clock,
  DollarSign,
  Inbox,
  Settings,
  BrainCircuit,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  Bot,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    title: "AIOS",
    items: [
      {
        href: "/company-brain/operating",
        label: "Operating",
        icon: BrainCircuit,
      },
      {
        href: "/company-brain",
        label: "Brain Admin",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Runtime Admin",
    items: [
      { href: "/runtime", label: "Runtime Overview", icon: LayoutDashboard },
      { href: "/console", label: "Console", icon: MessageSquare },
      { href: "/terminal", label: "Terminal", icon: SquareTerminal },
      { href: "/jobs", label: "Jobs", icon: ListTodo },
      { href: "/schedules", label: "Schedules", icon: Clock },
      { href: "/costs", label: "Costs", icon: DollarSign },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

type NavItem = (typeof navItems)[number]["items"][number];

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const operationalPath = isOperationalPath(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [surfaceDecision, setSurfaceDecision] = useState<{
    pathname: string | null;
    publicOperationalUrl: string | null;
  }>(() => ({
    pathname: operationalPath ? null : pathname,
    publicOperationalUrl: null,
  }));
  const surfaceChecked =
    !operationalPath || surfaceDecision.pathname === pathname;
  const publicOperationalUrl = surfaceChecked
    ? surfaceDecision.publicOperationalUrl
    : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!operationalPath) {
      setSurfaceDecision({ pathname, publicOperationalUrl: null });
      return;
    }
    let nextUrl: string | null = null;
    if (isPublicAiosHost(window.location.hostname)) {
      nextUrl = protectedOperationalUrl(pathname, window.location.search);
    }
    setSurfaceDecision({ pathname, publicOperationalUrl: nextUrl });
  }, [operationalPath, pathname]);

  // Watch for failed jobs and pending HITL, fire browser notifications,
  // and update tab title badge. Silent if permission not granted.
  useAppNotifications(surfaceChecked && !publicOperationalUrl);

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
                    company brain
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
          <nav className="flex-1 space-y-4 p-2 mt-1">
            {navItems.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = isNavItemActive(pathname, item);

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
                </div>
              </div>
            ))}
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

  if (!surfaceChecked) {
    return <main className="min-h-screen bg-background" />;
  }

  if (publicOperationalUrl) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <LockKeyhole className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Protected operational area</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Open this route in AIOS
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This public domain serves the static app shell. Company Brain and Runtime
            routes use the protected operational API behind Cloudflare Access.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => (window.location.href = publicOperationalUrl)}>
              Open protected route
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Back to public home
            </Button>
          </div>
        </div>
      </main>
    );
  }

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
