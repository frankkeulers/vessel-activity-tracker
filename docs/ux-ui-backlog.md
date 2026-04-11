# UX / UI Backlog

Remaining issues from the design audit (2026-04-11). High-severity issues have been resolved. Items below are medium and low priority.

---

## Medium

### M1 — Sidebar section hierarchy collapses after data load
**File:** `src/App.tsx:183`
Once data is fetched, the `DataStatusBar` count breakdown appears below the date picker with no visual anchor. All three sidebar sections (`Vessel`, `Date Range`, counts) use identical `SidebarSection` label weight.
**Fix:** Give the data status area a distinct background tint (`bg-primary/5 rounded-lg p-2`) and a stronger typographic separator, or promote counts into a badge on the Fetch button.

---

### M2 — Events sidepanel fixed at 320px with no resize handle
**File:** `src/components/EventsTimelineSidepanel.tsx:409`
`w-80` (320px) is hardcoded. On 1280px screens the map becomes cramped. `react-resizable-panels` is already installed.
**Fix:** Make the sidepanel a resizable panel (min 240px, max 400px, default 288px).

---

### M3 — Silent auto-fetch on vessel selection gives no feedback
**File:** `src/components/VesselSearch.tsx:26`
Selecting a vessel immediately fires a fetch for the current date range with no visual indication on the Fetch button. If the user has already changed the date range, the fetch fires for the wrong range.
**Fix:** Remove the auto-trigger, or flash "Fetching…" on the Fetch button and ensure the latest date range is used.

---

### M4 — AIS gap markers too small for touch (12px diameter)
**File:** `src/components/MapView.tsx:316`
`CircleMarker` default `radius={6}` produces a 12px hit target — well below the 44px WCAG recommendation for touch devices.
**Fix:** Increase default radius to 10 (20px diameter); on mobile breakpoints use larger icon-based markers.

---

### M5 — Clear (×) button has no tap target padding
**File:** `src/components/VesselSearch.tsx:121`
The clear button renders at exactly 16×16px with no padding.
**Fix:** Add `p-1` to bring the target to ~24px, or `p-2` for 32px.

---

### M6 — Diagonal stripe highlight makes Gantt bar labels unreadable
**File:** `src/components/GanttTimeline.tsx:481`
The `repeating-linear-gradient` highlight pattern places white stripes over white text, making labels invisible.
**Fix:** Replace the stripe with a solid highlight: keep the bar colour, add a `2px solid white` outline/box-shadow, and scale the bar 2–3px taller. This keeps labels legible while clearly showing the selected state.

---

### M7 — Zone colour is outside the PSG design system palette
**File:** `src/config/constants.ts:20`
`zone: "#1E40AF"` is raw Tailwind `blue-700`. It is the only colour in the file not derived from PSG tokens, and sits poorly on the dark teal map background.
**Fix:** Replace with a PSG-adjacent colour, e.g. `#1D6B72` (between psg-green-400 and psg-green-600), or introduce a PSG violet/indigo token for zones.

---

### M8 — Gantt tick labels can overlap on narrow canvases
**File:** `src/components/GanttTimeline.tsx:319`
At narrow widths (e.g. 600px) with a 90-day range, date labels like `2026-01-15` (≈60px wide) can collide.
**Fix:** Use shorter label formats: `"15 Jan"` when `step < 7 days`, `"Jan 2026"` when `step ≥ 30 days`. Also add `overflow: hidden` to the tick header container.

---

### M9 — Gantt pre-fetch and filtered-empty states look identical
**File:** `src/components/GanttTimeline.tsx:283`
Both show a small `CalendarOffIcon` with a short message. A user who has fetched data but filtered everything out gets the same UI as a user who hasn't fetched at all.
**Fix:** Pre-fetch: larger icon (48px), copy "Select a vessel and fetch data". Post-fetch/filtered-empty: `FilterX` icon, "No events match the active filters" + a "Reset filters" button.

---

### M10 — No error state when vessel characteristics fetch fails
**File:** `src/components/VesselCard.tsx:72`
The `isLoading` skeleton is shown but there is no `error` branch. A failed characteristics fetch silently omits that section.
**Fix:** Destructure `error` from `useVesselCharacteristics` and render `<p className="text-xs text-destructive">Could not load details</p>` when set.

---

### M11 — Unicode `▶` used as collapse indicator (no ARIA semantics)
**File:** `src/components/EventsTimelineSidepanel.tsx:269`
The `▶` character has no screen-reader meaning. At `text-[10px]` the rotation transition also causes subpixel jitter.
**Fix:** Replace with Lucide `<ChevronRight className="size-3" />`. Add `aria-controls` pointing to the collapsible region's ID.

---

### M12 — Raw API error messages displayed verbatim and duplicated as toast
**File:** `src/App.tsx:128`
Errors like "Request failed with status code 401" appear in the sidebar verbatim and are also shown as a toast — two channels for the same message.
**Fix:** Map error types to user-friendly strings (401 → "Invalid API key", 429 → "Too many requests", 5xx → "Server error, try again"). Show the friendly message in one place only (sidebar or toast, not both).

---

### M13 — ErrorBoundary fallback has no recovery action
**File:** `src/App.tsx:204`
An unhandled React error in `MapView` or `GanttTimeline` shows a static label string with no retry button.
**Fix:** Render a full-panel recovery UI with the error label, a "Reload" button (`resetErrorBoundary()` or `window.location.reload()`), and a secondary support link.

---

## Low

### L1 — Collapsed sidepanel tab uses 9px vertical text
**File:** `src/components/EventsTimelineSidepanel.tsx:396`
9px is below WCAG minimum legibility. The `writingMode: "vertical-rl"` label "Timeline" adds little value at that size.
**Fix:** Remove the text label; rely on the `PanelRightOpenIcon` alone, or widen the tab to `w-14` and raise font to 11px.

---

### L2 — Highlighted Gantt sidebar row uses a muddy tint overlay
**File:** `src/components/GanttTimeline.tsx:356`
`${colour}30` alpha tint stacks on the existing `${colour}12` base and produces an unclean wash.
**Fix:** For highlighted rows, remove the background tint entirely. Use a wider left border (4px) plus a subtle left-to-right gradient fade: `background: linear-gradient(to right, ${colour}25, transparent)`.

---

### L3 — Display font (Unbounded) used for a single 14px string
**File:** `src/App.tsx:169`
The Unbounded variable font adds ~100KB to the bundle but is applied only to the app title at 14px — too small to leverage its distinctive character.
**Fix:** Either increase the title to 16px and add the selected vessel name in display font, or replace with a bold Inter treatment and remove the font import.

---

### L4 — Event card has inconsistent font-size rhythm
**File:** `src/components/EventsTimelineSidepanel.tsx:196`
Badge, timestamp, duration, and coordinates all use `text-[10px]` while the label uses `text-xs` (12px), creating a 10/12/10/10 rhythm that feels jittery.
**Fix:** Two-level hierarchy: header cluster at 11px, label at 12px medium, metadata cluster at 10.5–11px.

---

### L5 — Full-height skeleton obscures the previous map during reload
**File:** `src/components/MapView.tsx:571`
On re-fetch, the full-area `Skeleton` + 70% backdrop hides the still-valid previous map state.
**Fix:** Replace with a slim `h-1` progress bar at the top edge of the map container (NProgress-style), keeping map tiles visible.

---

### L6 — MapStyleToggle buttons lack `aria-pressed`
**File:** `src/components/MapView.tsx:502`
The street/satellite toggle conveys active state only via className. Screen readers cannot determine which style is selected.
**Fix:** Add `aria-pressed={style === "street"}` / `aria-pressed={style === "satellite"}` and wrap in `role="group" aria-label="Map style"`.

---

### L7 — Ad-hoc z-index values (`z-1000`, `z-9999`, `z-500`)
**Files:** `src/components/MapView.tsx:449`, `src/components/MapView.tsx:499`, `src/components/GanttTimeline.tsx:456`
These are arbitrary integers outside Tailwind's default scale. They work via Tailwind v4 arbitrary value generation but are invisible to theme overrides.
**Fix:** Define named z-index layers in the Tailwind config (e.g. `z-map-overlay: 500`, `z-tooltip: 9999`) or use CSS variables.

---

### L8 — `datetime-local` input uses browser-native chrome
**File:** `src/components/DateRangePicker.tsx:77`
Native date-time inputs render differently across browsers and OS. The UTC requirement is also not communicated inline.
**Fix:** Replace with a custom Popover + Calendar pattern (shadcn), or a separate date + time input pair. Add a `UTC` label suffix so users know the timezone.

---

### L9 — Gantt sidebar label truncation uses native `title`, not Radix Tooltip
**File:** `src/components/GanttTimeline.tsx:338`
Row labels use `title={row.label}` which shows a browser-native tooltip — inconsistent with the Radix tooltip system used everywhere else.
**Fix:** Wrap the label in a Radix `<Tooltip>` to match the bar tooltip style.

---

### L10 — Category filter chips show no event counts
**File:** `src/components/EventsTimelineSidepanel.tsx:307`
Users have no way to know how many events of each category exist before toggling a filter.
**Fix:** Append counts to chip labels: `Port (12)`, or use a small badge overlay derived from `events.filter(e => e.category === cat).length`.

---

### L11 — AIS direction arrows rendered at all zoom levels
**File:** `src/components/MapView.tsx:222`
12×12px direction arrows cluster into noise at low zoom (≤6) and add unnecessary draw calls at world-view scale.
**Fix:** Conditionally render arrows only above zoom level 9 using a `zoomend` listener on the map instance.

---

### L12 — No onboarding or cross-view wayfinding
**File:** `src/App.tsx` (general)
The cross-highlight relationship between Map, Gantt, and Events Timeline is only discoverable by accident. New users have no mental model of how the three views connect.
**Fix:** A first-load tooltip sequence (3 steps via Radix Popover `defaultOpen`) or a persistent `?` help button that re-triggers the sequence.
