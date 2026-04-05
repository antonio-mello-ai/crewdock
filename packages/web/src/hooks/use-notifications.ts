"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useJobs, useHitlRequests } from "./use-api";
import { DAEMON_URL } from "@/lib/utils";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// Convert base64url VAPID public key to Uint8Array (required by Push API)
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Std = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Std);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return await reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications not supported by this browser");
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error(
      "VAPID public key not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY)"
    );
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  // Send to daemon
  const json = sub.toJSON();
  const res = await fetch(`${DAEMON_URL}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });
  if (!res.ok) {
    throw new Error(`Subscribe failed: ${res.status}`);
  }

  return sub;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  // Tell the daemon to drop the record
  await fetch(`${DAEMON_URL}/api/push/subscribe`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): PermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result as PermissionState;
}

interface NotifyOptions {
  body?: string;
  link?: string;
  tag?: string;
}

export function notify(title: string, options?: NotifyOptions): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const { link, ...opts } = options ?? {};
  const n = new Notification(title, {
    icon: "/icon.svg",
    ...opts,
  });
  if (link) {
    n.onclick = () => {
      window.focus();
      window.location.href = link;
      n.close();
    };
  }
}

/**
 * Hook that watches jobs and HITL requests and fires browser notifications
 * when new failed jobs or pending HITL requests appear.
 *
 * Updates document.title with a badge showing pending count.
 *
 * Skips notifications on the first load (seed phase) so the user doesn't
 * get blasted with history when they open the tab.
 */
export function useAppNotifications() {
  const { data: jobsData } = useJobs({ limit: 20 });
  const { data: hitlData } = useHitlRequests("pending");

  const seenFailedJobs = useRef<Set<string>>(new Set());
  const seenHitl = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  // If Web Push is active, server-side push handles notifications — we must
  // NOT fire in-tab notifications to avoid duplicates. We still track pending
  // count for the tab title badge though.
  const [pushActive, setPushActive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sub = await getExistingPushSubscription();
      if (!cancelled) setPushActive(!!sub);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track pending count for tab badge
  const [pendingCount, setPendingCount] = useState(0);

  // Detect new failed jobs (only if push is NOT active — otherwise SW handles it)
  useEffect(() => {
    const jobs = jobsData?.data ?? [];
    const failed = jobs.filter((j) => j.status === "failed");

    if (!seeded.current) {
      for (const j of failed) seenFailedJobs.current.add(j.id);
      return;
    }

    if (pushActive) return; // server-side push will notify

    for (const j of failed) {
      if (!seenFailedJobs.current.has(j.id)) {
        seenFailedJobs.current.add(j.id);
        notify(`Job failed: ${j.agentId ?? "unknown"}`, {
          body: j.objective ?? undefined,
          link: `/jobs/detail?id=${j.id}`,
          tag: `job-${j.id}`,
        });
      }
    }
  }, [jobsData, pushActive]);

  // Detect new HITL requests + update pending count
  useEffect(() => {
    const requests = hitlData?.data ?? [];
    setPendingCount(requests.length);

    if (!seeded.current) {
      for (const r of requests) seenHitl.current.add(r.id);
      // Mark as seeded only after both datasets loaded at least once
      if (jobsData?.data) seeded.current = true;
      return;
    }

    if (pushActive) return; // server-side push will notify

    for (const r of requests) {
      if (!seenHitl.current.has(r.id)) {
        seenHitl.current.add(r.id);
        notify(`HITL request`, {
          body: r.question?.slice(0, 200),
          link: `/inbox`,
          tag: `hitl-${r.id}`,
        });
      }
    }
  }, [hitlData, jobsData, pushActive]);

  // Update tab title with badge
  useEffect(() => {
    if (typeof document === "undefined") return;
    const base = "AIOS Runtime";
    document.title = pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
  }, [pendingCount]);
}

/**
 * Hook for UI to read and request notification permission, and manage the
 * Web Push subscription (which enables notifications even with the tab closed).
 */
export function useNotificationToggle() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
    getExistingPushSubscription().then((sub) => setPushSubscribed(!!sub));
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      notify("Notifications enabled", {
        body: "You will be notified of failed jobs and HITL requests.",
        tag: "test",
      });
    }
    return result;
  }, []);

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      // Ensure permission first
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      await subscribeToPush();
      setPushSubscribed(true);
      return true;
    } catch (err) {
      console.error("Failed to enable push:", err);
      return false;
    } finally {
      setPushBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      await unsubscribeFromPush();
      setPushSubscribed(false);
    } finally {
      setPushBusy(false);
    }
  }, []);

  return {
    permission,
    pushSubscribed,
    pushBusy,
    request: requestPermission,
    enablePush,
    disablePush,
  };
}
