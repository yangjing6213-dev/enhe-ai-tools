"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ locale = "zh" }: { locale?: "zh" | "en" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = locale === "en"
    ? (isDark ? "Switch to light mode" : "Switch to dark mode")
    : (isDark ? "切换到浅色模式" : "切换到深色模式");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="theme-toggle rounded-full border-border bg-background/80 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary hover:bg-accent hover:text-accent-foreground"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
