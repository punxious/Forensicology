# Forensicology

Web-based forensic escape rooms. Players examine evidence, crack forensic puzzles and make a final accusation (suspect + motive + method) against the clock.

**Status: Phase 2a.** The case engine, eight puzzle components and the free sample case, *The Greenhouse Affair*, are playable end to end without an account, in an immersive 3D crime lab (with a flat fallback). Accounts and leaderboards (2b), payments, co-op and deployment come next.

## Quick start

Requires Node 22+ and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev                 # compiles cases, then serves http://localhost:3000
```

- Play: http://localhost:3000/play/greenhouse-affair
- Playtest/debug panel (dev only): http://localhost:3000/debug/greenhouse-affair. It shows the unlock graph, the answers, validation results and your run's progress. In dev, each task also has a "force-solve" button.

You don't need a `.env.local` for development because safe dev secrets are used. For a local production build, copy `.env.example` to `.env.local` and fill in both secrets.

### Tests

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests: answer normalisation and hashing, unlock-graph validation, scoring, a full engine play-through, leak checks on every API view, run-token tampering, and the rate limiter |
| `pnpm test:e2e` | Builds for production. Plays the whole case in the flat layout at desktop and phone sizes, with axe WCAG 2.1 AA checks on every puzzle. Drives the 3D lab through its prop labels, the archive shelf and the landing hero (software WebGL). Checks that progress survives a reload and that locked puzzles are refused |
| `pnpm test:leaks` | Run after `pnpm build`. Scans the client bundle for answer hashes, hints, lab results and the epilogue |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript |
| `pnpm case:build --check` | Validates every case without writing output |

## How it works

```
cases/<slug>/case.yaml + documents/*.md + assets/*
        │  pnpm case:build  (validate → render Markdown → HMAC-hash answers)
        ▼
lib/server/generated/<slug>.json   ← server-only, git-ignored, rebuilt on dev/build
        │
lib/engine/game.ts  (pure rules: attempt, hint, lab, buildView)
        │
app/api/runs/[slug]/…  (route handlers: same-origin check, rate limits, signed run cookie)
        │  RunView: only what the player has unlocked
        ▼
components/game/GamePlayer.tsx + components/puzzles/*
```

**Answer security**
- Answers are normalised and HMAC-SHA256-hashed with `ANSWER_PEPPER` at compile time. Plaintext answers never leave the compiler.
- Guesses are checked on the server and rate-limited per puzzle and per IP.
- The client only receives unlocked evidence, available puzzles and the hints it has paid for. Locked evidence, unrevealed hints, lab result slips and the epilogue stay on the server.
- Case images are served through a route that checks the evidence they belong to is unlocked.

**Progress.** In Phase 1, run state lives in an HMAC-signed, httpOnly cookie, so it survives reloads and return visits in the same browser. Phase 2 moves runs to Postgres. That also closes the one Phase 1 gap: a determined player could replay an old cookie to undo wrong guesses. This only matters once leaderboards exist.

**Scoring.** Score = 10,000 − 50/min − hints (200/400/800 per tier) − 100 per wrong guess − 1,000 per wrong accusation. After the time limit, play continues in overtime at 150/min, and the rank is capped at Detective. Ranks: Rookie, Investigator, Detective, Senior Examiner, Chief Examiner. All the numbers can be overridden per case under `scoring:`.

## Writing a new case

1. Create `cases/<slug>/case.yaml`. The folder name must equal `slug`. Use `cases/greenhouse-affair/` as a template.
2. Put documents in `documents/*.md` and images (SVG/PNG/JPG/WebP, ≤ 1 MB) in `assets/`.
3. Run `pnpm case:build`. It lists every problem it finds (see below). Then playtest at `/play/<slug>` with `/debug/<slug>` open.

### The YAML

```yaml
slug: my-case
version: 1
title: …
tagline: …
difficulty: 3          # 1–5
durationMinutes: 60
players: { min: 1, max: 6 }
free: false            # true = no purchase needed
briefing: documents/briefing.md
epilogue: documents/epilogue.md   # shown only after the correct accusation

evidence:
  - id: police-report            # lowercase-kebab ids
    kind: document               # document | transcript | print | image
    title: …
    tag: EV-01
    summary: …
    initial: true                # visible from the start; otherwise a puzzle must unlock it
    document: documents/police-report.md

puzzles:
  - id: drawer
    type: lock                   # lock | timeline | statements | lab | fingerprint | board | accusation
    title: …
    prompt: …                    # Markdown
    requires: []                 # puzzles that must be solved first
    uses: [police-report]        # evidence the player needs (checked for reachability)
    unlocks: { evidence: [access-log] }
    config: { variant: keypad, length: 4 }
    answer: "6092"               # or `answers: [...]` to accept several
    hints: [nudge, pointer, near-solution]   # exactly three
    solvedText: …
```

**Markdown extras in documents**

| Syntax | Effect |
|---|---|
| `{{uv: text}}` | Ink that only shows under the UV torch (hidden from screen readers until it's found) |
| `[[redacted]]` | A black redaction bar |
| `[[stamp: TEXT]]` | A rubber stamp |

Single line breaks are kept.

### Puzzle types

| type | config | answer format |
|---|---|---|
| `lock` | `variant` (keypad / padlock / dial / word), `length`, optional `dialSize` | `"6092"`, `"NERIUM"`, or `[12, 30, 5]` for dials. Case, spaces and punctuation are ignored |
| `timeline` | `cards: [{id, source, stamp, text}]` | ordered list of card ids |
| `statements` | `transcripts: [evidence ids]`, `flagCount` | list of transcript line ids, in any order |
| `lab` | `samples`, `tests`, `processingSeconds`, plus top-level `results: {"sample\|test": text, default: text}` (server-only) | `{sample, test}` |
| `fingerprint` | `latent` (a print with `latent: true`), `cards`, `minMarks` | the matching card's evidence id |
| `board` | `nodes: [{id, label, group: left\|right, evidence?, note?}]` | list of `[nodeA, nodeB]` pairs, in any order and either direction |
| `accusation` | `suspects`, `motives`, `methods` | `{suspect, motive, method}`. Exactly one per case |

Fingerprint evidence uses `kind: print` with `print: {pattern: loop|whorl|arch, grid: 6, seed, features: [{cell: B2, type: ending|bifurcation|dot|enclosure}], smudged: [cells]}`. The ridges are drawn procedurally from `pattern` and `seed`.

### What the validator catches

- Malformed YAML or schema errors, with the path to the problem.
- Duplicate ids and unknown references.
- Unlock cycles.
- Evidence that is never unlocked, or unlocked twice.
- A puzzle that needs evidence the player can't have yet.
- A missing accusation, or more than one.
- An authored answer that its own lock could never accept (e.g. 5 digits on a 4-digit keypad).
- Lab answers with no result slip.
- Images without alt text.

It also warns when a puzzle can be skipped on the way to the accusation.

## The 3D world

Built with three.js via react-three-fiber. Every prop is modelled in code (`components/three/objects.tsx`) with procedural canvas textures (`textures.ts`), so there are no model or image downloads.

| Page | Scene | Loading |
|---|---|---|
| `/` | A desk under a lamp, with a UV torch sweeping hidden ink | A still poster paints first. The live scene loads on first interaction (desktop) or when you tap "View in 3D" (phones). |
| `/cases` | An archive shelf of case boxes; real cases sit among sealed "classified" boxes | Same as `/` |
| `/play/<slug>` | The crime lab. Each puzzle is a prop on the desk or wall; locked puzzles are taped "sealed" and show only their prop | Loads immediately when 3D is on |

**How a puzzle maps to a prop.** The puzzle type picks the prop automatically (`lib/engine/stations.ts`), so cases need no scene data:

| Puzzle type | Prop |
|---|---|
| Keypad or padlock lock | Lockbox |
| Word lock | Journal |
| Dial lock | Safe |
| Timeline | Wall timeline |
| Statements | Tape recorder |
| Lab | Microscope |
| Fingerprint | Light box |
| Board | Corkboard |
| Accusation | Final report |

**Readable overlays.** Clicking a prop eases the camera to it. The puzzle or document then opens in a sheet over the scene, and the case file opens as a drawer. Prop labels are real DOM buttons positioned over the scene each frame (`Projector.tsx`), so they are keyboard- and screen-reader-accessible. The canvas itself is `aria-hidden`.

**Fallbacks.**
- The ◆ 3D button in every header switches to the flat layout, and the choice is remembered.
- Devices that report low memory or data-saver mode, or that lack WebGL, default to flat.
- If the WebGL context fails, the page drops back to flat automatically.
- Reduced motion turns off camera easing, drift and parallax.

**Posters.** After changing `LandingScene` or `GalleryScene`, run `pnpm dev`, then `node scripts/capture-posters.mjs` to regenerate `public/posters/*.jpg`.

**Lighthouse (landing page, production build):** Performance 92–94 mobile / 100 desktop (varies run to run), Accessibility 100, SEO 100, Best practices 100.

## Accessibility

Every puzzle can be played with a keyboard and a touch screen, and none of them rely on colour alone:
- Flags are marked with ⚑ and an underline.
- Fingerprint features are distinguished by shape and a text label.
- Board strings are also listed as text.
- The UV torch has a "Sweep the page" alternative, and it lists and announces what it finds.

Timers announce the 30/10/5/1-minute marks. Reduced-motion settings are respected. The e2e suite fails on any serious or critical axe violation.

## Deploying (preview; full guide in Phase 5)

Deploy to Vercel with `ANSWER_PEPPER` and `RUN_TOKEN_SECRET` set for the Production, Preview and Build environments. The build fails if `ANSWER_PEPPER` is missing on CI or Vercel. `pnpm build` compiles cases automatically.

## Roadmap

- **Phase 2b:** Supabase auth (Sydney region), runs in Postgres, scores, leaderboards, and the rest of the landing page (pricing, FAQ, teams).
- **Phase 3:** Stripe Checkout, webhooks and entitlements, gift codes, admin case uploader. It reuses `lib/engine/compile.ts` and the debug panel.
- **Phase 4:** Real-time co-op with Supabase Realtime.
- **Phase 5:** Accessibility audit, performance, SEO, analytics, Sentry, production deploy.
