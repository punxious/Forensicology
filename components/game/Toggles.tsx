"use client";

import { useEffect, useState } from "react";
import { setSoundEnabled, soundEnabled, play } from "@/lib/client/sfx";

export function SoundToggle() {
  const [on, setOn] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser preference after hydration
  useEffect(() => setOn(soundEnabled()), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setSoundEnabled(!on);
        setOn(!on);
        if (!on) setTimeout(() => play("unlock"), 0);
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-surface-2"
    >
      <span aria-hidden="true">{on ? "🔊" : "🔇"}</span>
      <span className="sr-only sm:not-sr-only">Sound</span>
    </button>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"manila" | "lab">("lab");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read theme set by the pre-paint script
  useEffect(() => setTheme(document.documentElement.dataset.theme === "manila" ? "manila" : "lab"), []);
  const next = theme === "lab" ? "manila" : "lab";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("fx-theme", next);
        } catch {
          /* ignore */
        }
        setTheme(next);
      }}
      title={`Switch to the ${next === "lab" ? "dark lab" : "light case-file"} theme`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-surface-2"
    >
      <span aria-hidden="true">{theme === "lab" ? "🌙" : "📁"}</span>
      <span className="sr-only">Theme: </span>
      <span className="sr-only sm:not-sr-only">{theme === "lab" ? "Lab" : "Case file"}</span>
    </button>
  );
}
