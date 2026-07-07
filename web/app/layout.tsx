import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteChrome } from "@/components/site/site-chrome";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

function metadataBase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pkb-web-online.vercel.app");
  } catch {
    return new URL("https://pkb-web-online.vercel.app");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: settings.title,
      template: `%s | ${settings.name}`
    },
    description: settings.description,
    metadataBase: metadataBase()
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();

  return {
    themeColor: settings.themeColor,
    colorScheme: "dark light"
  };
}

function themeStyle(themeColor: string): React.CSSProperties {
  return {
    "--accent": themeColor,
    "--ring": themeColor
  } as React.CSSProperties;
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen overflow-x-hidden`}
        style={themeStyle(settings.themeColor)}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={settings.darkMode ? "dark" : "light"}
          enableSystem
          disableTransitionOnChange
        >
          <div className="noise-overlay" />
          <SiteChrome settings={settings}>{children}</SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
