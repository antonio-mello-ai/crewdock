"use client";

import { useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

function subscribe() {
  return () => {};
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Public pages — no auth needed
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // Check auth
  const hasJwt = isAuthenticated();
  const hasStaticToken = !!process.env.NEXT_PUBLIC_API_TOKEN;

  if (!hasJwt && !hasStaticToken) {
    router.replace("/login");
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
