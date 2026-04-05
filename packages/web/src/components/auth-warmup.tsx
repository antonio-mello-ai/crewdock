"use client";

import { useEffect, useState } from "react";
import { DAEMON_URL } from "@/lib/utils";

/**
 * CF Access cookie warmup.
 *
 * Problem: fetch(api.crewdock.ai, {credentials:"include"}) from
 * ai.felhen.ai cannot follow cross-origin 302 redirects, so the first
 * call fails before the CF Access app cookie is set on api.crewdock.ai.
 *
 * Fix: load api.crewdock.ai/api/ping inside an invisible iframe. Iframes
 * follow cross-origin redirects freely, so the CF Access SSO chain
 * completes silently and the cookie lands in the browser. All subsequent
 * fetch/WS calls then carry the cookie and succeed.
 *
 * Heuristic: only runs when DAEMON_URL points to a remote host (not
 * localhost). Local dev has no CF Access in front of the daemon, so
 * warmup is unnecessary.
 *
 * The iframe is removed from the DOM after it loads or after a 5s
 * timeout (hard ceiling).
 */
export function AuthWarmup() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (done) return;

    // Local dev: daemon is localhost, no CF Access — skip.
    try {
      const u = new URL(DAEMON_URL);
      if (
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname === "0.0.0.0"
      ) {
        setDone(true);
        return;
      }
    } catch {
      setDone(true);
      return;
    }

    // Session-scoped cache: once warmed in this tab, don't redo.
    try {
      if (sessionStorage.getItem("aios_auth_warmed") === "1") {
        setDone(true);
        return;
      }
    } catch {
      // ignore storage failures
    }

    // Hard ceiling: if the iframe never fires `onLoad` within 5s (CF down,
    // DNS slow, etc.), give up on the warmup and let the app continue.
    // Intentionally do NOT mark warmed — next mount should retry. Only
    // `handleLoad` marks success.
    const timeout = window.setTimeout(() => {
      setDone(true);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [done]);

  const handleLoad = () => {
    try {
      sessionStorage.setItem("aios_auth_warmed", "1");
    } catch {
      // ignore
    }
    setDone(true);
  };

  if (done) return null;

  return (
    <iframe
      src={`${DAEMON_URL}/api/ping`}
      onLoad={handleLoad}
      style={{
        position: "fixed",
        width: 0,
        height: 0,
        border: 0,
        visibility: "hidden",
      }}
      aria-hidden="true"
      tabIndex={-1}
      title="auth-warmup"
    />
  );
}
