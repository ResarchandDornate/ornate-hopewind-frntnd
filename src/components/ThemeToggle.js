"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";

/**
 * One-click light/dark switch for the topbar.
 *
 * Shows the theme you would get by clicking, not the one you are in: on a dark
 * dashboard the sun is the affordance, and the label spells it out for anyone
 * who reads the icon the other way round.
 */
export function ThemeToggle({ className = "" }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // Before mount the stored preference is unknown, so the icon would
      // hydrate wrong and visibly swap. Reserve the space and fade it in.
      className={`rounded-xl p-2 text-slate-500 transition hover:bg-white/60 hover:text-slate-700 ${
        mounted ? "" : "invisible"
      } ${className}`}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Full three-way picker for the settings page. "System" is offered here rather
 * than in the topbar toggle because it is a preference you set once, not one
 * you cycle through several times a day.
 */
export function ThemePicker() {
  const { preference, mounted, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded-xl border border-white/60 bg-white/50 p-1 backdrop-blur"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mounted && preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(option.value)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
