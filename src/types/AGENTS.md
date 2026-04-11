<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# types

## Purpose
All shared TypeScript interfaces and type aliases for the application. Defines both the raw API response shapes (one interface per Pole Star endpoint) and the normalised internal `ActivityEvent` model that all three views (map, Gantt, sidepanel) consume.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Full type catalogue: `EventCategory`, `ActivityEvent`, vessel search/characteristics, AIS positions, port calls, zone events, AIS gaps, STS pairings, positional discrepancies, PSC inspections, and `FilterState` |

## For AI Agents

### Working In This Directory
- `ActivityEvent` is the normalised internal model — all raw API types get transformed into this shape by `DataOrchestrator.tsx`
- `EventCategory` is the union `"port" | "zone" | "ais_gap" | "sts" | "discrepancy" | "psc"` — adding a new category requires changes here, in `FilterState`, `EVENT_COLOURS`, and `DataOrchestrator`
- Raw API types (`PortCallEvent`, `ZoneEvent`, etc.) mirror the shapes in `sample_data/` and `docs/Pole Star Global - Insights APIs Copy.postman_collection.json` — keep them in sync
- `ActivityEvent.raw` is typed as `unknown` intentionally — individual components cast it to the specific raw type when rendering metadata

### Common Patterns
- `ActivityEvent.endTime === null` means a point event (single timestamp); a non-null `endTime` means a duration span
- `ActivityEvent.sourceIds` links a paired Gantt span back to the individual raw event IDs it was created from — used for cross-highlighting

<!-- MANUAL: -->
