# Vessel Activity Tracker — User Guide

## Overview

The Vessel Activity Tracker lets maritime analysts search for vessels and explore their movements and events on a synchronized map, Gantt timeline, and events list.

---

## First-Time Setup

On first launch you will be prompted for a **Pole Star Global API key**. Enter your key and click **Save** — it is stored in your browser's local storage and sent securely via the backend proxy. You can update it at any time from the settings icon in the top bar.

---

## Basic Workflow

### 1. Search for a vessel

Use the search bar at the top to find a vessel by **name**, **IMO**, **MMSI**, or **callsign**. Select a result to load the vessel card showing type, flag, tonnage, and dimensions.

### 2. Set a date range

Click the **date range picker** to choose a UTC start and end datetime. The default window is the last 30 days. Narrow the range to speed up data loading.

### 3. Explore the three views

All three views stay in sync — interacting with one updates the others.

| View | What it shows |
|---|---|
| **Map** | AIS track polyline colored by navigational status; event markers at key locations |
| **Gantt Timeline** | Collapsible lanes per event category; zoom and pan the time axis |
| **Events Sidepanel** | Chronological event list grouped by date with duration gaps |

Click any **event marker** on the map or a **Gantt bar** to highlight the same event across all views.

---

## Event Categories

| Category | Description |
|---|---|
| Port Calls | Arrivals and departures at named ports |
| Zone Entries | Entry/exit of regulated maritime zones |
| AIS Gaps | Periods where the AIS signal was absent |
| Ship-to-Ship | Vessel-to-vessel transfer pairings |
| Discrepancies | Positional or identity anomalies |
| PSC Inspections | Port State Control inspection records |

Toggle any category on or off using the **filter controls** — changes apply across the map, Gantt, and sidepanel simultaneously.

---

## Replay Mode

Click **Replay** to scrub through the selected date range and watch the vessel track and events reveal progressively over time.

| Control | Action |
|---|---|
| Play / Pause | `Space` |
| Step backward | `←` |
| Step forward | `→` |
| Speed | Use the speed selector (1×, 2×, 5×, 10×) |
| Exit replay | `Esc` or click **Exit Replay** |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘D` | Toggle dark / light mode |
| `⌘K` | Toggle green / orange accent |
| `Space` | Play / pause replay |
| `←` / `→` | Step through replay |
| `Esc` | Exit replay mode |

---

## Tips

- **Zoom the Gantt** by scrolling horizontally over the timeline to inspect dense event clusters.
- **Resize panels** by dragging the dividers between the map, Gantt, and sidepanel.
- **Date range affects performance** — shorter ranges load faster and reduce API quota usage.
- The map track color encodes navigational status (e.g. underway, at anchor, moored) — check the map legend for the key.
