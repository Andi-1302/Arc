# Project Spec: "Blocks" — Personal Goal & Training Tracker (PWA)

> This document is the single source of truth. Build exactly this scope. Everything under "Roadmap (v2)" is explicitly OUT of scope — do not architect against it, but do not build it.
> Working title "Blocks" (after training blocks / periodization). Rename only if the user asks.

## 1. Purpose & philosophy

A personal, local-first goal tracker for one user (Hagen), built around **sports periodization**:

- Life is organized in **cycles (blocks)**: ~12-week periods with exactly ONE focus goal and max. 3 secondary goals. Everything else is automatically de-prioritized (grayed out, moved down) — never deleted.
- Each block ends with a **reflection phase** (block-end flow), then a new cycle starts.
- The week is the planning unit: **Sunday review** (auto-computed process quota + metrics + reflection + plan next week). The day is the execution unit: **Today checklist** with one-tap check-ins.
- Goals are built from a **module kit** (metrics, milestones, routines, resources, flashcards, photos, notes) — so ANY future goal type (sport, university, rhetoric, knowledge) works without new code.
- Motivation design follows the research the user did: **forgiving habit-strength score instead of fragile streaks** (Loop Habit Tracker principle), competence feedback instead of XP/trophies/levels (no gamification), loss-aversion softened by design ("never miss twice", not "don't break the chain").

The user is technical (GitHub, has shipped a GitHub Pages site) but the app must be zero-maintenance: no backend, no accounts, no server, no costs.

## 2. Tech stack (fixed — do not substitute)

- **React 18 + TypeScript + Vite**
- **Tailwind CSS**
- **Recharts** for charts
- **Dexie.js** (IndexedDB) for ALL persistence — local-first, fully offline
- **vite-plugin-pwa** — installable, offline app shell
- **Deployment: GitHub Pages** (static). Set Vite `base` to the repo name. Provide a GitHub Actions workflow (build + deploy on push to `main`). Test asset paths, manifest and service-worker scope against the base path — this is the most common deploy bug.
- **Playwright** smoke tests (see §12)
- Single device, single user. No sync, no auth, no external APIs in v1.

## 3. Data model

Dexie tables. IDs = `crypto.randomUUID()`. Dates = ISO strings (`YYYY-MM-DD` for day-keyed data).

```ts
interface Area {                 // (areas)
  id: string;
  name: string;                  // "Sport", "University", "Skills"
  color: string;                 // hex accent
  image?: string;                // header image (compressed base64)
  sortOrder: number;
}

interface Goal {                 // (goals)
  id: string;
  areaId: string;
  name: string;
  description?: string;
  coverImage?: string;           // compressed base64
  modules: Module[];             // which modules are enabled, see §5
  status: "active" | "paused" | "archived";
  createdAt: string;
}
type Module = "metrics" | "milestones" | "routines" | "resources" | "cards" | "photos" | "notes";

interface Metric {               // (metrics)
  id: string;
  goalId: string | null;         // null = global metric (body weight, daily rating)
  name: string;
  unit: string;                  // "reps", "km", "kg", "%", "/10"
  direction: "increase" | "decrease";
  aggregation: "sum" | "max" | "last" | "avg";  // weekly chart aggregation, chosen from templates at creation
  showOnDashboard: boolean;      // flag: appears on Stats dashboard
  target?: number;               // optional block target
}

interface MetricEntry {          // (entries)
  id: string;
  metricId: string;
  date: string;
  value: number;
  note?: string;
}

interface Milestone {            // (milestones)
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  doneAt?: string;
  sortOrder: number;
}

interface Routine {              // (routines)
  id: string;
  name: string;
  goalIds: string[];
  schedule: number[];            // weekdays 0–6 (0 = Monday)
  quickMetricIds: string[];      // metrics offered in the quick-entry sheet after check-off
  active: boolean;
}

interface RoutineCheck {         // (routineChecks)
  id: string;
  routineId: string;
  date: string;
  done: boolean;
}

interface HabitStrength {        // (strengths) — one row per routine, updated daily, see §6
  routineId: string;
  value: number;                 // 0..1
  lastUpdated: string;
}

interface Block {                // (blocks)
  id: string;
  name: string;                  // "Block 1 — Base + Arm Rehab"
  startDate: string;
  endDate: string;
  focusGoalId: string;           // exactly one
  secondaryGoalIds: string[];    // max 3 — enforce in UI
  weeklyFocusNotes: Record<string, string>;  // isoWeek -> one-line focus
  reflection?: string;           // filled by block-end flow
  closedAt?: string;
}

interface WeeklyReview {         // (reviews)
  id: string;
  isoWeek: string;               // "2026-W28"
  processQuota: number;          // auto-computed, snapshot at review time
  note: string;
  nextWeekFocus?: string;
  createdAt: string;
}

interface DayLog {               // (dayLogs) — daily check-in
  date: string;                  // primary key
  rating?: number;               // 1–10
  note?: string;
  tomorrowFocus?: string;        // editable focus line for the next day
}

interface Resource {             // (resources) — knowledge module
  id: string;
  goalId: string;
  title: string;
  url?: string;                  // YouTube, article, Claude share link…
  note?: string;                 // own summary / key takeaways
  createdAt: string;
}

interface Card {                 // (cards) — flashcards
  id: string;
  goalId: string;
  front: string;
  back: string;
  sourceResourceId?: string;     // if created from a resource note
  ease: number;                  // start 2.5
  intervalDays: number;
  dueDate: string;
  reps: number;
  createdAt: string;
}

interface ReviewLog {            // (cardReviews)
  id: string;
  cardId: string;
  date: string;
  grade: 0 | 1 | 2 | 3;          // Forgot / Hard / Good / Easy
}

interface Photo {                // (photos)
  id: string;
  goalId: string | null;         // null = not used in v1 (daily photos live in the phone gallery by design, see §9)
  date: string;
  blob: Blob;                    // compressed, max 1280px long edge, JPEG q≈0.8
  caption?: string;
}

interface Settings {             // (settings) — single row
  dailyQuestion: string;         // default "How was your day?"
  newCardsPerDay: number;        // default 10
  dueCardsPerDay: number;        // default 30
  lastBackupAt?: string;         // drives monthly backup reminder
}
```

## 4. Core rules (business logic — implement exactly)

1. **Priority & graying:** Goals in the current block (focus + secondary) are "prioritized". All other active goals render grayed out and sorted below them. `paused` goals sit at the bottom; `archived` goals only appear under More → Archive. Nothing is ever hard-deleted except by explicit archive → delete with confirmation.
2. **Block change:** When a new block starts (or goals are swapped), for every goal that loses priority the app asks once: "Pause the routines linked to this goal?" — otherwise dead routines poison the process quota.
3. **Goal progress %:** `done milestones / total milestones` — shown ONLY if the goal has milestones. No milestones → no percentage, just metric trend charts. Never ask the user to configure progress weights. Time progress is always visible separately via the block bar.
4. **Process quota (weekly):** `completed routine instances / scheduled routine instances` for the ISO week, counting only routines linked to prioritized goals + global routines. Due flashcards count as one schedulable item per day when cards are due (checked = review session completed).
5. **Backfill:** Every check, metric entry, rating and card review can be added/edited for past days (date picker defaults to today). Strength scores recompute accordingly.
6. **Day boundary:** local midnight. No timezone gymnastics.

## 5. The module kit

Creating a goal = 3-step wizard: (1) pick area → (2) name, description, cover image → (3) toggle modules. The goal detail screen renders ONLY enabled modules as sections/tabs:

- **Metrics** — numeric tracking + charts. Creation uses templates that preset unit/aggregation/direction: Distance (km, sum), Load/weight (kg, max), Reps (reps, max), Time (min, sum), Body weight (kg, avg, decrease-neutral), Percentage gap (%, last, decrease), Rating (/10, avg), Custom.
- **Milestones** — ordered progression checklist. Checking one triggers a short (≤300 ms) celebration animation. This is the app's "trophy" system — there is deliberately no XP, no badges, no levels.
- **Routines** — recurring units feeding the Today checklist.
- **Resources** — links + own notes (the "inform" phase of learning). Claude conversations are saved as share links here.
- **Cards** — flashcards with spaced repetition (the "repeat" phase). A resource note can be turned into cards via "Create card from note" (prefills front/back for manual editing). CSV export (`front;back`).
- **Photos** — per-goal progress photos (e.g. posture from front/side), compressed. Monthly reminder logic only, see §9.
- **Notes** — free-form notes on the goal (the "learned" phase; source for cards).

A knowledge goal is simply a goal with resources + cards + notes enabled. A sport goal is typically metrics + milestones + routines. No special-cased screens per domain.

## 6. Habit-strength score (the "battery")

Per routine, an exponentially weighted moving average updated only on **scheduled** days:

```
strength_today = strength_yesterday + α × (done − strength_yesterday)   // α = 0.05, done ∈ {0,1}
```

- New routines start at 0.
- Missing one day after long consistency costs ~5%, not everything (forgiving by design).
- **Overall score** = average strength of active routines linked to prioritized goals, displayed 0–100%.

UI: battery-style badge, top right, on every screen. Tap → breakdown sheet: overall score, this week's process quota, per-routine strength bars, and a one-line explanation of the formula. Full transparency, no black box. Show "consistency" language, never "streak" — a small "current streak" number may appear inside the breakdown, but it is secondary and never on the main screens.

## 7. Spaced repetition (SM-2, fixed parameters)

Grades: **Forgot / Hard / Good / Easy** (4 buttons).

- Ease start **2.5**, minimum **1.3**.
- **Forgot (0):** reps = 0, interval = 0 (due today again), ease −0.20.
- **Hard (1):** interval = max(1, round(interval × 1.2)), ease −0.15.
- **Good (2):** reps += 1; interval sequence 1 → 3 → round(interval × ease).
- **Easy (3):** like Good, then interval × **1.3** (easy bonus), ease +0.15.
- dueDate = today + interval. New cards are due immediately. Daily queue caps from Settings (default 30 due + 10 new). Add ±5% random fuzz to intervals ≥ 3 days to avoid card clustering.

## 8. Screens

Mobile-first (360 px up; desktop just gets a centered max-width column). Bottom tabs: **Today · Goals · Stats · More**. English UI throughout — sentence case, plain verbs, buttons say exactly what happens, empty states invite action, errors say what went wrong and how to fix it.

### 8.1 Today (the 90%-of-the-time screen)
- **Block bar** (signature element, see §10): current block as a filled horizontal track with a "you are here" marker, focus goal label, days remaining, and this week's focus line.
- **Checklist:** today's routines (one tap to check; if the routine has quickMetricIds, an optional quick-entry sheet slides up: number pad, one tap to save, skippable). If flashcards are due: one "Review N cards" item → review screen (front → reveal → 4 grade buttons).
- **Daily check-in:** the configurable question (default "How was your day?") + 1–10 rating chips + optional one-line note. The rating is stored as a global metric (visible in Stats). Exactly one question — never more.
- **Tomorrow preview** (bottom): tomorrow's scheduled routines + editable focus line. 30 seconds of evening planning, optional.
- **Sunday:** a "Do your weekly review" item appears until done → review flow: auto-computed process quota → latest values of block-relevant metrics (focus-goal metrics + one leading metric per secondary goal, quick-entry inline) → reflection note → plan next week (adjust routine schedules ad hoc + next week's focus line).

### 8.2 Goals
- Grouped by area (image header + color accent). Order: focus goal (marked), secondary goals, other active (grayed), paused (gray, bottom).
- Goal card: cover image, name, progress % (only with milestones), sparkline of first dashboard metric.
- FAB "+" → the 3-step wizard (§5). Areas are editable inline (create/rename/recolor/reimage) — seed areas are just defaults, nothing is hardcoded.
- Goal detail: header (image, area, status, priority), then enabled modules as sections: metric charts (weekly aggregation per metric setting; toggle raw/weekly), milestone chain, entry list (editable), resources, notes, cards (list/add/edit/export), photos.

### 8.3 Stats
- **Dashboard:** all metrics with `showOnDashboard = true` as charts, filterable by area and time range. Includes global metrics (body weight, daily rating).
- **Consistency heatmap:** GitHub-style tile grid over all routine checks (last 6 months).
- **Photos:** timeline of per-goal photos with a before/after compare slider.

### 8.4 More
- **Cycles:** current block (edit), block history, and the **block-end flow**: when endDate is reached (or user closes early) → summary of every block metric start vs. end, milestone deltas, average process quota, reflection text field → "Start next block" wizard (pick focus + max 3 secondary; triggers the pause prompt from §4.2).
- **Weekly reviews:** list of past reviews.
- **Archive:** archived goals (restore or delete permanently with confirmation).
- **Settings:** JSON export (full DB dump incl. photos as base64) / import (replace-all with confirmation), daily question text, card caps, app version. Show "Last backup: X" prominently.

## 9. Photos & storage policy

- In-app photos exist ONLY as per-goal progress photos. Compress client-side before storing: max 1280 px long edge, JPEG quality ~0.8.
- **Daily body photos are deliberately NOT stored in the app** (user decision, storage reasons): they live in the phone's gallery. The app's role: an optional routine ("Progress photo") can remind monthly. Document this in the UI copy of the photos module ("For daily photos, use your gallery — track monthly here.").
- Request persistent storage on first launch: `navigator.storage.persist()`.
- **Monthly backup reminder:** if `lastBackupAt` > 30 days ago, show a dismissible banner on Today linking to Settings → Export. This matters: browsers can evict IndexedDB.

## 10. Design direction

A precise training instrument for an athlete — not a generic dashboard, not a pastel habit app.

- **Avoid default AI looks**: no warm-cream + serif + terracotta, no near-black + acid-green, no faux-newspaper hairlines.
- Tokens (adjust deliberately, don't drift to defaults): background `#F4F5F3` (cool paper), surface `#FFFFFF`, ink `#16181A`, accent `#1F4FE0` (cobalt, primary actions/focus), success `#1E9E6A`, warning `#D97E1E`. Area colors appear only as thin accents, never full backgrounds.
- Typography: condensed athletic display face for numbers/headings (Archivo or Barlow Condensed) — big confident numerals; quiet body face (Inter). Numbers are the heroes.
- **Signature element = the block timeline bar** on Today (and in Cycles). This is the one visually bold element; everything else stays quiet and disciplined.
- Micro-interactions: routine check-off and milestone completion get short satisfying animations (≤300 ms). Respect `prefers-reduced-motion`. Visible keyboard focus. Contrast ≥ 4.5:1.
- PWA manifest shortcuts (long-press app icon): "Log entry", "Review cards".

## 11. Seed data (first launch, all editable)

- Areas: **Sport** (red-orange), **University** (blue), **Skills & Knowledge** (green).
- Goals (Sport):
  1. "Handstand push-up" — metrics: Wall HSPU reps (reps, max). Milestones: Pike push-ups 3×8 → Feet-elevated pike push-ups 3×8 → Wall HSPU eccentrics 5×3 (5 s) → Wall HSPU 3×5 → Freestanding HSPU.
  2. "L-sit to handstand" — metric: L-sit hold (s, max). Milestones: L-sit 20 s → Compression drills 3×10 → Tuck press attempts → L-sit to handstand on parallettes.
  3. "Strength & muscle" — metrics: Squat top set (kg, max), Left/right press gap (%, last, decrease). No milestones (→ no %, trend only — intentional example of rule §4.3).
  4. "Posture & left arm" — metric: Left/right row gap (%, last, decrease). Milestones: Pain-free support holds 60 s → Row gap < 15% → Row gap < 5%.
  5. "Endurance / marathon" — metrics: Weekly km (km, sum), Long run (km, max).
- Global metrics: Body weight (kg, avg, dashboard on), Daily rating (/10, avg, dashboard on — fed by the daily check-in).
- Routines: "Posture routine (10–15 min)" daily; "Zone 2 run" Tue/Thu; "Long run" Sat; "Strength — legs + arm rehab" Mon/Fri; "Upper body maintenance" Wed; "Progress photo" monthly-style (schedule: first Sunday — implement as a note in the routine name if monthly scheduling is out of scope; weekly schedule is sufficient for v1).
- Block: "Block 1 — Base + Arm Rehab", 2026-07-07 → 2026-09-13, focus: Endurance/marathon; secondary: Posture & left arm, Strength & muscle. (Handstand goals exist but are unprioritized → they demonstrate graying.)
- One example knowledge goal "Example: learning a topic" (Skills area) with one sample resource, one note, two sample cards — all clearly marked as examples.

## 12. Testing (Playwright, against `vite preview`)

1. App loads; Today shows seed routines, block bar, daily check-in.
2. Check a routine → quota/score update → survives reload (IndexedDB).
3. Create a goal via wizard with a metric template, log an entry, chart renders.
4. Milestone check → progress % updates on the goal card.
5. Add a card, review with "Good" → no longer due today; queue respects caps.
6. Daily rating 1–10 → appears as global metric in Stats.
7. Export JSON → wipe DB → import → data restored (incl. a photo).
8. Block-end flow: close block → summary shows metric start/end → new block created → deprioritized goal is grayed and pause prompt appeared.

## 13. Build order (commit after each phase; run tests at the end)

1. Scaffold: Vite + TS + Tailwind + Dexie schema + routing + tab bar + seed data.
2. Today: routines, check-offs, quick entry, daily check-in, tomorrow preview, score badge + breakdown (strength engine).
3. Goals: areas, wizard, goal cards, goal detail with metrics/milestones/entries + charts.
4. Blocks & reviews: block bar, Sunday review flow, Cycles screen, block-end flow, priority/graying/pause logic.
5. Knowledge modules: resources, notes, cards, SM-2 review flow, CSV export.
6. Stats: dashboard, heatmap, global metrics.
7. Photos (per-goal, compression) + photo compare slider. — deliberately last
8. More/Settings: export/import, backup reminder, persist(), manifest shortcuts, PWA polish, GitHub Actions deploy.
9. Playwright tests + fix findings.

## 14. Roadmap (v2 — do NOT build now)

- **Strava sync** (Garmin watch → Strava auto-sync → Strava API; OAuth token exchange via a tiny Cloudflare Worker) to auto-fill running metrics.
- **Hevy CSV import** (user exports from Hevy settings; parser maps exercises → metrics). No Hevy API (Pro-only, costs money).
- **"Generate cards from note" via Anthropic API** with a user-supplied API key stored locally (architecture: keep card creation behind a small interface so an AI generator can plug in).
- Monthly schedules for routines; German/English toggle; reminders/notifications.
