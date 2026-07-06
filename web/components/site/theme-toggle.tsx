"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const modes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme ?? resolvedTheme ?? "dark" : "dark";
  const currentIndex = Math.max(
    0,
    modes.findIndex((mode) => mode.value === currentTheme)
  );
  const nextMode = modes[(currentIndex + 1) % modes.length];
  const Icon = modes[currentIndex]?.icon ?? Moon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(nextMode.value)}
            aria-label={`Switch to ${nextMode.label} mode`}
            suppressHydrationWarning
          >
            <Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent suppressHydrationWarning>{`Theme: ${modes[currentIndex]?.label ?? "Dark"}`}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
