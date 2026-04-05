"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useJobs, useHitlRequests } from "./use-api";

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

  // Track pending count for tab badge
  const [pendingCount, setPendingCount] = useState(0);

  // Detect new failed jobs
  useEffect(() => {
    const jobs = jobsData?.data ?? [];
    const failed = jobs.filter((j) => j.status === "failed");

    if (!seeded.current) {
      for (const j of failed) seenFailedJobs.current.add(j.id);
      return;
    }

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
  }, [jobsData]);

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
  }, [hitlData, jobsData]);

  // Update tab title with badge
  useEffect(() => {
    if (typeof document === "undefined") return;
    const base = "AIOS Runtime";
    document.title = pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
  }, [pendingCount]);
}

/**
 * Hook for UI to read and request notification permission.
 */
export function useNotificationToggle() {
  const [permission, setPermission] = useState<PermissionState>("default");

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const request = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      // Fire a test notification so the user sees it works
      notify("Notifications enabled", {
        body: "You will be notified of failed jobs and HITL requests.",
        tag: "test",
      });
    }
    return result;
  }, []);

  return { permission, request };
}
