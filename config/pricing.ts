/**
 * Pricing tiers shown on the landing page. Prices are placeholders until you
 * set them: `priceCents: null` shows "Price TBC". Phase 3 links each paid tier
 * to a Stripe Price id and enables checkout.
 *
 * Australian Consumer Law: prices shown to Australian consumers must include GST.
 */
export const CURRENCY = "AUD";
export const PRICES_INCLUDE_GST = true;

export type Tier = {
  id: "free" | "single" | "season" | "monthly" | "team";
  name: string;
  blurb: string;
  priceCents: number | null;
  /** "/case", "/month", "/session"... */
  per?: string;
  features: string[];
  highlight?: boolean;
  /** Purchasable now? Paid tiers switch on in Phase 3. */
  available: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "The first case",
    blurb: "The Greenhouse Affair, start to finish.",
    priceCents: 0,
    features: ["No account needed", "Full case with all puzzle types", "Hints, scoring and ranks"],
    available: true,
  },
  {
    id: "single",
    name: "Single case",
    blurb: "Buy any case, keep it forever.",
    priceCents: null,
    per: "/case",
    features: ["Replay any time", "Leaderboard entry", "Progress saved to your account"],
    available: false,
  },
  {
    id: "season",
    name: "Season pass",
    blurb: "A bundle of cases at a lower price.",
    priceCents: null,
    features: ["Every case in the season", "Yours to keep", "Best value per case"],
    highlight: true,
    available: false,
  },
  {
    id: "monthly",
    name: "Monthly",
    blurb: "A new case every month while subscribed.",
    priceCents: null,
    per: "/month",
    features: ["All cases while subscribed", "New case each month", "Cancel any time"],
    available: false,
  },
  {
    id: "team",
    name: "Team session",
    blurb: "One host, a shared case board, the whole team.",
    priceCents: null,
    per: "/session",
    features: ["Join with a room code", "Shared evidence board in real time", "Great for team-building"],
    available: false,
  },
];

export function formatPrice(cents: number | null): string {
  if (cents === null) return "Price TBC";
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: CURRENCY }).format(cents / 100);
}
