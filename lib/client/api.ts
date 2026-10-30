import type { RunView } from "@/lib/engine/game";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong.", data.retryAfter);
  return data as T;
}

export type Unlocks = { unlockedEvidence: string[]; unlockedPuzzles: string[] };

export function gameApi(slug: string) {
  const base = `/api/runs/${encodeURIComponent(slug)}`;
  return {
    start: (restart = false) => request<RunView>("POST", base, { restart }),
    abandon: () => request<void>("DELETE", base, {}),
    attempt: (puzzleId: string, answer: unknown) =>
      request<Unlocks & { correct: boolean; view: RunView }>("POST", `${base}/attempt`, { puzzleId, answer }),
    hint: (puzzleId: string) => request<{ tier: number; hintHtml: string; view: RunView }>("POST", `${base}/hint`, { puzzleId }),
    lab: (puzzleId: string, sample: string, test: string) =>
      request<Unlocks & { resultHtml: string; solved: boolean; view: RunView }>("POST", `${base}/lab`, { puzzleId, sample, test }),
    debugSolve: (puzzleId: string) => request<{ view: RunView }>("POST", `/api/debug/${encodeURIComponent(slug)}/solve`, { puzzleId }),
    assetUrl: (path: string) => `${base}/assets/${path.split("/").map(encodeURIComponent).join("/")}`,
  };
}

export type GameApi = ReturnType<typeof gameApi>;
