"use client";

import { useState } from "react";
import type { SubmitResult } from "./types";

/** Shared submit state: busy flag, feedback message, and a shake on wrong answers. */
export function useSubmit(submit: (answer: unknown) => Promise<SubmitResult>, wrongMessage: string) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [shake, setShake] = useState(0);

  const run = async (answer: unknown) => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const r = await submit(answer);
      if (r.status === "correct") setFeedback({ tone: "ok", text: "Correct." });
      else if (r.status === "wrong") {
        setFeedback({ tone: "error", text: r.message ?? wrongMessage });
        setShake((s) => s + 1);
      } else setFeedback({ tone: "info", text: r.message });
    } finally {
      setBusy(false);
    }
  };

  return { busy, feedback, shake, run };
}
