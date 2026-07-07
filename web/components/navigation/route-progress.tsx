"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RouteProgressContextValue = {
  start: () => void;
};

const RouteProgressContext = createContext<RouteProgressContextValue | null>(null);

export function RouteProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function start() {
    clearTimer();
    timerRef.current = setTimeout(() => setVisible(true), 150);
  }

  useEffect(() => {
    clearTimer();
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), 180);
    return () => clearTimeout(hideTimer);
  }, [pathname, visible]);

  return (
    <RouteProgressContext.Provider value={{ start }}>
      <div
        aria-hidden="true"
        className={cn(
          "fixed left-0 top-0 z-[70] h-0.5 w-full origin-left bg-accent transition-transform duration-300",
          visible ? "scale-x-100" : "scale-x-0"
        )}
      />
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "pointer-events-none fixed right-4 top-4 z-[69] flex items-center gap-2 rounded-full border border-border/80 bg-background/92 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur transition-all duration-200 sm:right-6",
          visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        )}
      >
        <Loader2 className="size-3.5 animate-spin text-accent" />
        <span>加载中...</span>
      </div>
      {children}
    </RouteProgressContext.Provider>
  );
}

function useRouteProgress() {
  return useContext(RouteProgressContext);
}

type PendingLinkProps = React.ComponentProps<typeof Link> & {
  pendingClassName?: string;
};

export const PendingLink = React.forwardRef<HTMLAnchorElement, PendingLinkProps>(function PendingLink(
  { className, pendingClassName, onClick, href, target, ...props },
  ref
) {
  const pathname = usePathname();
  const progress = useRouteProgress();
  const [pending, setPending] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPending(false);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [pathname]);

  return (
    <Link
      ref={ref}
      href={href}
      target={target}
      aria-busy={pending || undefined}
      data-loading={pending || undefined}
      className={cn(className, pending && pendingClassName)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        const targetUrl = new URL(String(href), window.location.href);
        const currentUrl = new URL(window.location.href);
        if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
          return;
        }
        setPending(true);
        resetTimerRef.current = setTimeout(() => setPending(false), 8000);
        progress?.start();
      }}
      {...props}
    />
  );
});
