<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# src

## Purpose
The entire React application source. Entry point is `main.tsx`, which mounts the `App` component inside a `QueryClientProvider` (TanStack Query) and `ThemeProvider`. `App.tsx` defines the top-level shell layout: a fixed header, a left sidebar for vessel/date controls, a centre pane with the map and Gantt timeline stacked vertically, and a right-side events timeline panel.

## Key Files

| File | Description |
|------|-------------|
| `main.tsx` | React entry point — creates root, wraps app in `QueryClientProvider` and `ThemeProvider` |
| `App.tsx` | Top-level shell layout; `ApiKeyInput`, `VesselSearch`, `DateRangePicker`, `MapView`, `GanttTimeline`, `EventsTimelineSidepanel` |
| `index.css` | Global CSS — Tailwind base/components/utilities imports, CSS variable theme tokens, font declarations |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | All React UI components (see `components/AGENTS.md`) |
| `config/` | Application-wide constants (see `config/AGENTS.md`) |
| `hooks/` | Custom React hooks not tied to a specific component (see `hooks/AGENTS.md`) |
| `lib/` | Data fetching (API client + TanStack Query hooks) and utilities (see `lib/AGENTS.md`) |
| `store/` | Zustand global state store (see `store/AGENTS.md`) |
| `types/` | Shared TypeScript type definitions for API responses and internal models (see `types/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Use the `@/` path alias for all imports within `src/` (e.g. `@/components/MapView`, `@/lib/api`)
- Never import from `../../` — always use the alias
- `App.tsx` is the composition root; add new top-level panels here, not in `main.tsx`

### Testing Requirements
- Run `npm run typecheck` from the project root after any change
- Start the dev server (`npm run dev`) to visually verify UI changes

### Common Patterns
- All pages/views are co-located in `components/` — there is no `pages/` directory
- Shared state flows through `useAppStore` (Zustand); avoid component-local state for anything that needs cross-component visibility
- Data fetching is done exclusively via TanStack Query hooks in `lib/hooks.ts`

## Dependencies

### Internal
- `src/config/constants.ts` — event colours, keyboard shortcuts
- `src/types/index.ts` — all shared types
- `src/store/useAppStore.ts` — global app state

### External
- React 19, Tailwind 4, Zustand 5, TanStack Query 5

<!-- MANUAL: -->
