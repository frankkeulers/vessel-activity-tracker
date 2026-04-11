<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# hooks

## Purpose
Custom React hooks that are generic enough to be reused across components but don't belong to the data-fetching layer in `lib/`. Currently contains a single mobile-breakpoint detection hook.

## Key Files

| File | Description |
|------|-------------|
| `use-mobile.ts` | `useIsMobile()` — returns `true` when viewport width is below the mobile breakpoint (768 px by default). Uses a `MediaQueryList` listener to stay reactive. |

## For AI Agents

### Working In This Directory
- Add new utility hooks here only if they are genuinely reusable and not specific to a single component
- Data-fetching hooks (TanStack Query wrappers) belong in `src/lib/hooks.ts`, not here
- Component-specific state logic belongs inside the component file itself

<!-- MANUAL: -->
