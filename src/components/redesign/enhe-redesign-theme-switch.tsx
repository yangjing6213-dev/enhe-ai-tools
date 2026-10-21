"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RedesignLocale } from "./types";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function EnheRedesignThemeSwitch({ locale }: { locale: RedesignLocale }) {
  const { setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = themeOptions.find((option) => option.value === theme) ?? themeOptions[2];
  const SelectedIcon = selected.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="redesign-theme-switch"
          aria-label="Change theme"
          title={locale === "en" ? "Change theme" : "切换主题"}
        >
          <SelectedIcon size={18} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="redesign-theme-menu"
        role="menu"
        aria-label={locale === "en" ? "Choose a theme" : "选择主题"}
      >
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-checked={theme === value}
            className="redesign-theme-option"
            onClick={() => {
              setTheme(value);
              setOpen(false);
            }}
          >
            <span className="redesign-theme-option-selected" aria-hidden="true">
              {theme === value ? "•" : ""}
            </span>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
