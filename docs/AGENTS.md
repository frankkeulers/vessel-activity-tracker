<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# docs

## Purpose
Project documentation directory containing the product requirements document, design specification, and the Pole Star Global Insights API Postman collection used as the authoritative reference for all API endpoints and their response shapes.

## Key Files

| File | Description |
|------|-------------|
| `PRD.md` | Product Requirements Document — feature scope, user stories, acceptance criteria |
| `DESIGN_SPEC.md` | UI/UX design specification — layout, colour palette, component behaviour |
| `Pole Star Global - Insights APIs Copy.postman_collection.json` | Postman collection documenting all Pole Star API endpoints consumed by the app |

## For AI Agents

### Working In This Directory
- Treat these files as the source of truth for intended behaviour when requirements are ambiguous
- The Postman collection is the definitive reference for API request/response shapes — consult it before modifying `src/types/index.ts` or `src/lib/hooks.ts`
- Do not auto-generate or overwrite PRD.md or DESIGN_SPEC.md without explicit user instruction

### Common Patterns
- API endpoints referenced in the Postman collection correspond to paths used in `src/lib/hooks.ts`
- The proxy in `proxy/index.js` forwards requests to `https://api.polestar-production.com`

<!-- MANUAL: -->
