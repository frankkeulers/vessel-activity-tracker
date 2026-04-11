<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# config

## Purpose
Application-wide constants that are referenced across multiple components. Centralises values that would otherwise be duplicated — particularly the event category colour palette, which is shared between the map markers, Gantt bars, and the events sidepanel.

## Key Files

| File | Description |
|------|-------------|
| `constants.ts` | `EVENT_COLOURS` record (one hex per `EventCategory`), sidebar layout constants, and keyboard shortcut keys |

## For AI Agents

### Working In This Directory
- `EVENT_COLOURS` is the single source of truth for category colours — import it rather than defining colours inline in components
- `GanttTimeline.tsx` and `MapView.tsx` currently define their own local `CATEGORY_COLOURS` objects that duplicate these values; if you refactor them, replace those local objects with the shared constant
- Do not add runtime configuration (env vars, feature flags) here — this file is for static compile-time constants only

### Common Patterns
```ts
import { EVENT_COLOURS } from "@/config/constants"
const colour = EVENT_COLOURS[event.category]  // "#2B969C" for "port"
```

<!-- MANUAL: -->
