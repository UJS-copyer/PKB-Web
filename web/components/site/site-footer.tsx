import type { SiteSettings } from "@/lib/site-settings-types";
import { ContactActions } from "./contact-actions";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
            数字花园
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {settings.description}
          </p>
        </div>
        <ContactActions compact className="md:justify-end" email={settings.email} github={settings.github} resumeUrl={settings.resumeUrl} />
      </div>
    </footer>
  );
}
