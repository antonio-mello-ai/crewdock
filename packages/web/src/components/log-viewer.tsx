"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogViewerProps {
  /** Static lines — rendered all at once */
  lines?: string[];
  /** WebSocket URL — connects for streaming */
  wsUrl?: string;
}

/**
 * Terminal log viewer using a pre/code block with ANSI-aware rendering.
 * We intentionally avoid xterm.js for static content to keep things lightweight.
 * For streaming, we use a dynamic import wrapper.
 */
export function LogViewer({ lines, wsUrl }: LogViewerProps) {
  if (wsUrl) {
    return <XtermViewer wsUrl={wsUrl} />;
  }
  return <StaticLogViewer lines={lines ?? []} />;
}

// ---------------------------------------------------------------------------
// Static viewer (pre/code, no xterm dependency)
// ---------------------------------------------------------------------------

function StaticLogViewer({ lines }: { lines: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [lines, isAtBottom, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 40;
    setIsAtBottom(
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    );
  };

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-auto bg-terminal-bg rounded-lg border border-neutral-800/50 p-4 font-mono text-xs leading-5 text-terminal-fg"
      >
        {lines.length === 0 ? (
          <span className="text-neutral-600">No log output</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))
        )}
      </div>
      {!isAtBottom && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-4 right-4 h-7 gap-1 text-xs opacity-90 hover:opacity-100"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-3 w-3" />
          Bottom
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// xterm.js streaming viewer (dynamically imported)
// ---------------------------------------------------------------------------

function XtermViewer({ wsUrl }: { wsUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  // xterm auto-scrolls; button always visible for manual scroll
  const isAtBottom = false;

  useEffect(() => {
    if (!containerRef.current) return;

    let terminal: any;
    let fitAddon: any;
    let ws: WebSocket | null = null;

    async function init() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      // CSS loaded via globals.css or link tag

      terminal = new Terminal({
        cursorBlink: false,
        disableStdin: true,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: 1.4,
        scrollback: 10000,
        theme: {
          background: "#0a0a0e",
          foreground: "#c8c8d0",
          cursor: "#a78bfa",
          selectionBackground: "rgba(255,255,255,0.1)",
          black: "#1a1a2e",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a78bfa",
          cyan: "#06b6d4",
          white: "#e4e4e7",
          brightBlack: "#52525b",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c4b5fd",
          brightCyan: "#22d3ee",
          brightWhite: "#fafafa",
        },
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current!);
      fitAddon.fit();
      termRef.current = terminal;

      // Resize on window resize
      const onResize = () => fitAddon.fit();
      window.addEventListener("resize", onResize);

      // Connect WebSocket
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "log") {
            terminal.writeln(msg.line);
          } else if (msg.type === "job_complete") {
            terminal.writeln("");
            terminal.writeln(
              `\x1b[90m--- Job ${msg.status} (exit ${msg.exitCode ?? "?"}, cost $${msg.costUsd.toFixed(4)}) ---\x1b[0m`
            );
          } else if (msg.type === "error") {
            terminal.writeln(`\x1b[31m[error] ${msg.message}\x1b[0m`);
          }
        } catch {
          terminal.writeln(event.data);
        }
      };

      return () => {
        window.removeEventListener("resize", onResize);
        ws?.close();
        terminal.dispose();
      };
    }

    const cleanupPromise = init();
    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [wsUrl]);

  const scrollToBottom = () => {
    termRef.current?.scrollToBottom();
  };

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="h-full rounded-lg border border-neutral-800/50 overflow-hidden"
      />
      {!isAtBottom && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-4 right-4 h-7 gap-1 text-xs opacity-90 hover:opacity-100"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-3 w-3" />
          Bottom
        </Button>
      )}
    </div>
  );
}
