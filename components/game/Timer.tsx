"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/client/format";

const WARNINGS = [30, 10, 5, 1];

/** Countdown to the deadline, then overtime. Server time is the source of truth. */
export function Timer({ deadline, startedAt, serverNow, finishedAt }: { deadline: number; startedAt: number; serverNow: number; finishedAt: number | null }) {
  const offset = useRef(0);
  const [now, setNow] = useState(serverNow);
  const [announce, setAnnounce] = useState("");
  const warned = useRef(new Set<number>());

  useEffect(() => {
    offset.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    if (finishedAt) return;
    const id = setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => clearInterval(id);
  }, [finishedAt]);

  const current = finishedAt ?? now;
  const remaining = deadline - current;
  const overtime = remaining < 0;

  useEffect(() => {
    const mins = Math.ceil(remaining / 60_000);
    for (const w of WARNINGS) {
      if (mins === w && !warned.current.has(w) && remaining > 0) {
        warned.current.add(w);
        setAnnounce(`${w} minute${w === 1 ? "" : "s"} left.`);
      }
    }
    if (overtime && !warned.current.has(0)) {
      warned.current.add(0);
      setAnnounce("Time's up. You're in overtime; the clock keeps running at a higher penalty.");
    }
  }, [remaining, overtime]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tracking-widest text-muted uppercase">{overtime ? "Overtime" : "Time left"}</span>
      <span
        role="timer"
        aria-label={overtime ? `Overtime ${formatClock(-remaining)}` : `${formatClock(remaining)} left`}
        className={`font-mono text-lg font-bold tabular-nums ${overtime ? "text-accent" : remaining < 5 * 60_000 ? "text-warn" : ""}`}
      >
        {overtime ? `+${formatClock(-remaining)}` : formatClock(remaining)}
      </span>
      <span className="sr-only" aria-live="assertive">{announce}</span>
      <span className="sr-only">Started {Math.floor((current - startedAt) / 60_000)} minutes ago.</span>
    </div>
  );
}
