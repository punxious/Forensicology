import "server-only";
import type { CompiledCase } from "@/lib/engine/types";

/**
 * Whether the current visitor may play a case.
 * Phase 1: free cases only. Phase 3 checks purchases, bundles, subscriptions
 * and redeemed gift codes stored in Postgres.
 */
export async function canPlay(c: CompiledCase): Promise<boolean> {
  return c.free;
}
