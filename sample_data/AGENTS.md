<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# sample_data

## Purpose
Static JSON fixtures that mirror real Pole Star API responses. Used for offline development and testing without a live API key, and as reference examples of the exact response shapes returned by each endpoint.

## Key Files

| File | Description |
|------|-------------|
| `positions.json` | AIS position history — matches `/unified-position/v1/positions` POST response |
| `vessel_port_calls.json` | Port call events — matches `/voyage-insights/v1/vessel-port-calls/{imo}` |
| `vessel_zone_and_port_events.json` | Zone entry/exit events — matches `/voyage-insights/v1/vessel-zone-and-port-events/{imo}` |
| `ais_gaps.json` | AIS reporting gap events — matches `/voyage-insights/v1/vessel-ais-reporting-gaps/{imo}` |
| `sts_pairings.json` | Ship-to-ship transfer pairings — matches `/voyage-insights/v1/vessel-sts-pairings/{imo}` |
| `positional_discrepancies.json` | Positional discrepancy events — matches `/voyage-insights/v1/vessel-positional-discrepancy/{imo}` |
| `port_state_control.json` | Port State Control inspection records — matches `/voyage-insights/v1/vessel-port-state-control/{imo}` |

## For AI Agents

### Working In This Directory
- These files define the authoritative shape of API responses — cross-reference with `src/types/index.ts` when updating type definitions
- Do not modify these files; they are ground-truth fixtures
- To use sample data during development, serve it via a mock server or temporarily patch `src/lib/api.ts` to return local JSON

<!-- MANUAL: -->
