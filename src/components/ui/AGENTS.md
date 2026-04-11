<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# ui

## Purpose
Low-level, unstyled-to-styled Radix UI / Shadcn primitives. These components are installed via `npx shadcn add <component>` and then lightly customised for the app's design system. They should be treated as a component library — composed by feature components, not modified for feature-specific behaviour.

## Key Files

| File | Description |
|------|-------------|
| `badge.tsx` | Inline label with colour variants; used in event cards for category chips |
| `button.tsx` | Button with `variant` (default/outline/ghost/link) and `size` (sm/default/icon) props |
| `card.tsx` | `Card`, `CardHeader`, `CardContent`, `CardFooter` composable card layout |
| `dropdown-menu.tsx` | Radix `DropdownMenu` with styled items, separators, and checkboxes |
| `input.tsx` | Styled text input; used for API key entry and event search |
| `label.tsx` | Accessible `<label>` with consistent typography |
| `select.tsx` | Radix `Select` with styled trigger, content, and items |
| `separator.tsx` | Horizontal/vertical visual divider (`<hr>` wrapper) |
| `sheet.tsx` | Slide-in panel (Radix `Dialog` with side positioning); not currently used in the app but available |
| `skeleton.tsx` | Animated shimmer placeholder for loading states; used in `MapView` and `GanttTimeline` |
| `switch.tsx` | Toggle switch (Radix `Switch`) |
| `tooltip.tsx` | Radix `Tooltip` with `TooltipProvider`, `TooltipTrigger`, `TooltipContent`; used extensively in Gantt bars |

## For AI Agents

### Working In This Directory
- Do not add feature logic to these files — they are pure UI primitives
- To add a new Shadcn component, run `npx shadcn add <name>` from the project root; it will be placed here automatically
- All components use `cn()` from `src/lib/utils.ts` for class merging — maintain this pattern
- `TooltipProvider` must be present in the tree above any `Tooltip` usage; it is currently added in `main.tsx`

### Common Patterns
```tsx
// Tooltip usage (Gantt bars, event cards)
<Tooltip>
  <TooltipTrigger asChild><div>...</div></TooltipTrigger>
  <TooltipContent side="top">...</TooltipContent>
</Tooltip>

// Skeleton loading state
<Skeleton className="h-4 w-32" />

// Badge for event category
<Badge style={{ backgroundColor: colour, color: "#fff", border: "none" }}>
  {label}
</Badge>
```

## Dependencies

### External
- `radix-ui` — all Radix primitives
- `class-variance-authority` — variant prop API for `button.tsx`
- `tailwind-merge` + `clsx` — class merging via `cn()`

<!-- MANUAL: -->
