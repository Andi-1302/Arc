# Arc

A personal, local-first goal & training tracker (PWA) built around **sports periodization applied to life goals**: life is organized into **12-week blocks**, each with exactly **one focus goal and up to three side goals**. Everything else is automatically de-prioritized — never deleted — until its turn comes back around. Each block ends with a short reflection before the next one starts.

No backend, no accounts, no server, no cost — everything lives in the browser.

![Screenshot](docs/screenshot.png)

## Concept

- **Blocks**: ~12-week cycles with one focus goal and max. 3 secondary goals; everything else is grayed out and skipped, not deleted.
- **Weekly rhythm**: a Sunday review (process quota, metrics, reflection, next week's plan) and a daily Today checklist for one-tap check-ins.
- **Module kit**: any goal is built from metrics, milestones, routines, workouts, resources, flashcards, photos and notes — so a new kind of goal (sport, study, a skill) needs no new code.
- **Motivation design**: a forgiving habit-strength score instead of fragile streaks, competence feedback instead of XP/levels/gamification.

## Key features

- **Today**: daily checklist (routines, timed plan entries, flashcard reviews), quick todo capture, daily check-in.
- **Week**: an hour-by-hour timetable across the current week, routines and one-off entries side by side.
- **Goals**: organized by life area, each with whichever modules it needs — progress metrics (incl. left/right and multi-field), milestone chains, recurring routines, workout templates & session logging, resources/notes, spaced-repetition flashcards, progress photos.
- **Stats**: a dashboard of pinned/auto-surfaced metric charts, a routine-consistency heatmap, workout stats, and a photo progress comparison view.
- **Flashcards**: SM-2 spaced repetition for anything worth remembering.
- **Backup**: one-click export/import of the entire database as a single JSON file — your data never leaves the device unless you choose to move it.
- **Installable PWA**: works offline, installs to the home screen.

## Tech stack

React 19 + TypeScript + Vite, Tailwind CSS, Dexie.js (IndexedDB), Recharts, vite-plugin-pwa, Playwright + Vitest for tests. No backend — deployed as a static site.

## Live app

**https://andi-1302.github.io/Arc/**

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Spec

See [`blocks-app-prompt.md`](blocks-app-prompt.md) for the full product spec.
