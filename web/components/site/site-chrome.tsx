"use client";

import { usePathname } from "next/navigation";
import { RouteProgressProvider } from "@/components/navigation/route-progress";
import type { SiteSettings } from "@/lib/site-settings-types";
import { SiteFooter } from "./site-footer";
import { SiteNavbar } from "./site-navbar";

export function SiteChrome({ children, settings }: { children: React.ReactNode; settings: SiteSettings }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <RouteProgressProvider>{children}</RouteProgressProvider>;
  }

  return (
    <RouteProgressProvider>
      <SiteNavbar settings={settings} />
      {children}
      <SiteFooter settings={settings} />
    </RouteProgressProvider>
  );
}
