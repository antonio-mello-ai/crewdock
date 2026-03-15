"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Bot,
  KanbanSquare,
  Activity,
  BookOpen,
  DollarSign,
  Zap,
  Settings,
  Menu,
  Anchor,
  Sparkles,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Templates", href: "/templates", icon: Sparkles },
  { name: "Tasks", href: "/tasks", icon: KanbanSquare },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Costs", href: "/costs", icon: DollarSign },
  { name: "Skills", href: "/skills", icon: Zap },
  { name: "Settings", href: "/settings", icon: Settings },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {navigation.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Anchor className="h-5 w-5 text-primary" />
            CrewDock
          </SheetTitle>
        </SheetHeader>
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">CrewDock</span>
          </div>
          <ThemeToggle />
        </div>
        <NavLinks pathname={pathname} />
        <div className="border-t p-3">
          <p className="text-xs text-muted-foreground">v0.3.0</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <MobileNav pathname={pathname} />
        <div className="flex flex-1 items-center gap-2">
          <Anchor className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold">CrewDock</span>
        </div>
        <ThemeToggle />
      </div>
    </>
  );
}
