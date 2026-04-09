# Vessel Activity Tracker — Design & Style Specification

Extracted verbatim from the `meridia-port-berth-analytics-design` reference project. All values below must be reproduced exactly in this app.

---

## 1. Colour Palette

### PSG Green (primary brand scale)

| Token | Hex |
|-------|-----|
| `psg-green-50` | `#EAFAF9` |
| `psg-green-100` | `#BAF2F0` |
| `psg-green-200` | `#81E4E3` |
| `psg-green-300` | `#4ED0D0` |
| `psg-green-400` | `#2B969C` |
| `psg-green-500` | `#18767C` |
| `psg-green-600` | `#0F545A` |
| `psg-green-700` | `#0A3438` |
| `psg-green-800` | `#0B292C` |
| `psg-green-900` | `#0B2225` |
| `psg-green-950` | `#041417` |

### PSG Orange (accent scale)

| Token | Hex |
|-------|-----|
| `psg-orange-50` | `#FFFDFA` |
| `psg-orange-100` | `#FFF9F2` |
| `psg-orange-200` | `#FFF2E4` |
| `psg-orange-300` | `#FFE6CC` |
| `psg-orange-400` | `#FEDCC1` |
| `psg-orange-500` | `#FEC59E` |
| `psg-orange-600` | `#FAAF89` |
| `psg-orange-700` | `#F88E63` |
| `psg-orange-800` | `#EC6436` |
| `psg-orange-900` | `#D54A1A` |
| `psg-orange-950` | `#72210A` |

---

## 2. Semantic Colour Tokens

### Light Mode (`:root`)

| Token | Resolves to |
|-------|-------------|
| `--background` | `oklch(0.963 0.002 197.1)` — very light teal-grey |
| `--foreground` | `oklch(0.148 0.004 228.8)` — near-black |
| `--card` | `oklch(1 0 0)` — white |
| `--card-foreground` | `oklch(0.148 0.004 228.8)` |
| `--popover` | `oklch(1 0 0)` |
| `--popover-foreground` | `oklch(0.148 0.004 228.8)` |
| `--primary` | `psg-green-700` (`#0A3438`) |
| `--primary-foreground` | `#ffffff` |
| `--primary-hover` | `psg-green-500` (`#18767C`) |
| `--primary-active` | `psg-green-600` (`#0F545A`) |
| `--secondary` | `oklch(0.967 0.001 286.375)` |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` |
| `--muted` | `oklch(0.963 0.002 197.1)` |
| `--muted-foreground` | `oklch(0.56 0.021 213.5)` |
| `--accent` | `oklch(0.963 0.002 197.1)` |
| `--accent-foreground` | `oklch(0.218 0.008 223.9)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` |
| `--border` | `oklch(0.925 0.005 214.3)` |
| `--input` | `oklch(0.925 0.005 214.3)` |
| `--ring` | `psg-green-400` (`#2B969C`) |
| `--radius` | `0.625rem` |
| **Sidebar** | |
| `--sidebar` | `psg-green-800` (`#0B292C`) |
| `--sidebar-foreground` | `#ffffff` |
| `--sidebar-primary` | `psg-green-300` (`#4ED0D0`) |
| `--sidebar-primary-foreground` | `psg-green-950` (`#041417`) |
| `--sidebar-accent` | `psg-green-700` (`#0A3438`) |
| `--sidebar-accent-foreground` | `#ffffff` |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `psg-green-300` (`#4ED0D0`) |
| **Charts** | |
| `--chart-1` → `--chart-5` | `psg-green-200` through `psg-green-600` |
| `--color-chart-accent` | `psg-green-500` |
| `--color-chart-accent-mid` | `psg-green-400` |
| `--color-chart-accent-dim` | `psg-green-700` |

### Dark Mode (`.dark`)

| Token | Resolves to |
|-------|-------------|
| `--background` | `psg-green-900` (`#0B2225`) |
| `--foreground` | `#ffffff` |
| `--card` | `psg-green-800` (`#0B292C`) |
| `--card-foreground` | `#ffffff` |
| `--popover` | `psg-green-800` |
| `--popover-foreground` | `#ffffff` |
| `--primary` | `psg-green-300` (`#4ED0D0`) |
| `--primary-foreground` | `psg-green-950` (`#041417`) |
| `--primary-hover` | `psg-green-200` (`#81E4E3`) |
| `--primary-active` | `psg-green-400` (`#2B969C`) |
| `--secondary` | `psg-green-700` |
| `--secondary-foreground` | `#ffffff` |
| `--muted` | `psg-green-700` |
| `--muted-foreground` | `oklch(0.65 0.006 220)` |
| `--accent` | `psg-green-700` |
| `--accent-foreground` | `#ffffff` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring` | `psg-green-400` |

### Orange Accent Override (`:root.accent-orange`)

Applied by adding `accent-orange` class to `<html>`. Only overrides primary/ring tokens — backgrounds stay PSG green.

| Token | Light | Dark |
|-------|-------|------|
| `--primary` | `psg-orange-800` (`#EC6436`) | `psg-orange-800` |
| `--primary-hover` | `psg-orange-700` (`#F88E63`) | `psg-orange-700` |
| `--primary-active` | `psg-orange-900` (`#D54A1A`) | `psg-orange-900` |
| `--ring` | `psg-orange-700` | `psg-orange-700` |
| `--sidebar-primary` | `psg-orange-700` | `psg-orange-600` (`#FAAF89`) |
| `--chart-accent` | `psg-orange-800` | `psg-orange-600` |

---

## 3. Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Body / UI | `Inter Variable` | 400 (normal) | `@fontsource-variable/inter` |
| Display / headings | `Unbounded Variable` | varies | `@fontsource-variable/unbounded` — use sparingly for page titles / logo |
| Base size | `text-sm` (14px) | — | Default for all UI text |
| Card title | `text-base` (16px) | 500 (medium) | Reduces to `text-sm` on `size=sm` cards |
| Sidebar labels | `text-xs` (12px) | 500 | Group labels at 70% opacity |
| Muted text | `text-muted-foreground` | 400 | Secondary descriptions |

---

## 4. Spacing & Radius

| Token | Value |
|-------|-------|
| `--radius` (base) | `0.625rem` (10px) |
| `--radius-sm` | `calc(0.625rem * 0.6)` = 6px |
| `--radius-md` | `calc(0.625rem * 0.8)` = 8px |
| `--radius-lg` | `0.625rem` = 10px |
| `--radius-xl` | `calc(0.625rem * 1.4)` = ~8.75px |
| `--radius-2xl` | `calc(0.625rem * 1.8)` = ~11.25px |
| `--radius-3xl` | `calc(0.625rem * 2.2)` = ~13.75px |
| `--radius-4xl` | `calc(0.625rem * 2.6)` = ~16.25px |

**Usage rules:**
- Inputs, buttons: `rounded-lg` (`radius-lg`)
- Cards: `rounded-xl` (`radius-xl`)
- Badges: `rounded-4xl` (pill shape)
- Sidebar inner: `rounded-lg` for floating variant
- Buttons xs/sm: `rounded-[min(var(--radius-md),10px)]` (capped)

---

## 5. Component Specifications

### 5.1 Button

- Base: `h-8 px-2.5 rounded-lg text-sm font-normal`
- Default variant: `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active`
- Outline: `border-border bg-card hover:bg-muted dark:bg-input/30`
- Ghost: `hover:bg-muted dark:hover:bg-muted/50`
- Destructive: `bg-destructive/10 text-destructive hover:bg-destructive/20`
- Sizes: `xs` (h-6), `sm` (h-7), `default` (h-8), `lg` (h-9), icon variants (size-6/7/8/9)
- Loading state: `isLoading` prop shows `<Loader2 className="animate-spin" />` and disables the button
- Focus ring: `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring`

### 5.2 Input

- `h-8 rounded-lg border border-input bg-card px-2.5 text-sm`
- Dark: `bg-input/30`
- Focus: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- Disabled: `bg-input/50 opacity-50`
- Invalid: `border-destructive ring-destructive/20`

### 5.3 Card

- `rounded-xl bg-card ring-1 ring-foreground/10 py-4 gap-4 text-sm`
- Header padding: `px-4` (reduces to `px-3` on `size=sm`)
- Footer: `border-t bg-muted/50 rounded-b-xl`
- Title: `text-base font-medium leading-snug`

### 5.4 Badge

- `h-5 rounded-4xl px-2 text-xs font-medium`
- Default: `bg-primary text-primary-foreground`
- Outline: `border-border text-foreground`
- Destructive: `bg-destructive/10 text-destructive`

### 5.5 Sidebar

- Background: `bg-sidebar` (`psg-green-800` in both light and dark)
- Text: `text-sidebar-foreground` (white)
- Width: `16rem` desktop, `18rem` mobile, `3rem` icon-only collapsed
- Collapsible: `offcanvas` mode (slides off-screen)
- Active menu item: `bg-sidebar-accent text-sidebar-accent-foreground font-medium`
- Hover: `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`
- Group labels: `text-xs font-medium text-sidebar-foreground/70`
- Keyboard shortcut: `⌘B` to toggle

### 5.6 Tabs (line variant — used in main content)

- List: `variant="line"` → `bg-transparent gap-0 rounded-none`
- Trigger height: `h-11`
- Active: `text-primary` with `after:` pseudo-element underline in `bg-primary`, `h-0.5`
- Inactive: `text-foreground/60 hover:text-foreground`
- Dark active: `text-foreground` (not primary colour)

### 5.7 Tooltip

- Used for collapsed sidebar icons (side="right")
- Standard shadcn tooltip wrapping

### 5.8 Skeleton

- Used for loading states in sidebar menus and data panels
- `animate-pulse` via Tailwind

---

## 6. Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar (PSG green-800, 16rem wide, collapsible to 3rem icon)   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ App logo / title (Unbounded font)                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Nav items (icon + label)                                 │   │
│  │  • active: bg-sidebar-accent (green-700)                 │   │
│  │  • hover:  bg-sidebar-accent                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Footer (settings, user profile)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Main content (bg-background)                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Sticky top bar (h-12, border-b, bg-white / dark:bg-card) │   │
│  │  [Sidebar trigger] [App name] ... [API key input]        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Left control panel (sidebar-style panel)                 │   │
│  │  • Vessel search autocomplete                            │   │
│  │  • Selected vessel card                                  │   │
│  │  • Date range picker                                     │   │
│  │  • Fetch button                                          │   │
│  │  • Filter chips                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Map panel (Leaflet, upper half)                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Gantt timeline panel (lower half)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key layout classes from meridia pattern:**
- Full-height app shell: `flex h-svh flex-col`
- Sticky header: `sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-white dark:bg-card px-4`
- Scrollable content area: `flex-1 overflow-auto`
- `SidebarProvider` → `SidebarInset` wrapping pattern

---

## 7. Theme System

### Provider
Use `ThemeProvider` from meridia verbatim. Manages:
- `theme`: `"light" | "dark" | "system"` — stored in `localStorage` key `"theme"`
- `accent`: `"green" | "orange"` — stored in `localStorage` key `"psg-accent"`
- Applies `.dark` class and `.accent-orange` class to `<html>`

### Keyboard shortcuts (built into provider)
- `⌘D` — toggle dark/light mode
- `⌘K` — toggle green/orange accent

### Default
Start with **dark** mode, **green** accent (the maritime/PSG brand look).

---

## 8. Event Category Colours (for map markers & Gantt bars)

Proposed colour assignments for the 6 event categories, staying within the PSG palette:

| Category | Colour | Hex | Tailwind class |
|----------|--------|-----|----------------|
| Port Events | PSG Teal | `#2B969C` | `psg-green-400` |
| Zone Events | PSG Dark Teal | `#18767C` | `psg-green-500` |
| AIS Gaps | Amber | `#F88E63` | `psg-orange-700` |
| STS Pairings | PSG Green light | `#4ED0D0` | `psg-green-300` |
| Positional Discrepancies | PSG Orange | `#EC6436` | `psg-orange-800` |
| Port State Control | PSG Muted | `#0F545A` | `psg-green-600` |

**Gantt bar opacity:** parent/outer spans at 80% opacity, child spans at 100%.

---

## 9. Map Style

- **Tile provider**: OpenStreetMap (no API key)
- **Dark mode map tiles**: use CartoDB Dark Matter tiles in dark mode: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **Light mode tiles**: standard OSM: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **AIS track polyline**: 2px width, colour-coded by navigational status:
  - Underway: `psg-green-400` (`#2B969C`)
  - Moored/At anchor: `psg-orange-600` (`#FAAF89`)
  - Other: `psg-green-200` (`#81E4E3`)
- **Vessel position markers**: circle marker, 8px radius, filled with current nav-status colour
- **Event markers**: SVG pin icons, colour per category table above

---

## 10. Files to Copy Verbatim from Meridia

| Source path | Destination path |
|-------------|-----------------|
| `src/index.css` | `src/index.css` |
| `components.json` | `components.json` |
| `src/lib/utils.ts` | `src/lib/utils.ts` |
| `src/components/theme-provider.tsx` | `src/components/theme-provider.tsx` |
| `src/components/ui/accordion.tsx` | `src/components/ui/accordion.tsx` |
| `src/components/ui/avatar.tsx` | `src/components/ui/avatar.tsx` |
| `src/components/ui/badge.tsx` | `src/components/ui/badge.tsx` |
| `src/components/ui/breadcrumb.tsx` | `src/components/ui/breadcrumb.tsx` |
| `src/components/ui/button.tsx` | `src/components/ui/button.tsx` |
| `src/components/ui/card.tsx` | `src/components/ui/card.tsx` |
| `src/components/ui/checkbox.tsx` | `src/components/ui/checkbox.tsx` |
| `src/components/ui/collapsible.tsx` | `src/components/ui/collapsible.tsx` |
| `src/components/ui/dropdown-menu.tsx` | `src/components/ui/dropdown-menu.tsx` |
| `src/components/ui/input.tsx` | `src/components/ui/input.tsx` |
| `src/components/ui/label.tsx` | `src/components/ui/label.tsx` |
| `src/components/ui/select.tsx` | `src/components/ui/select.tsx` |
| `src/components/ui/separator.tsx` | `src/components/ui/separator.tsx` |
| `src/components/ui/sheet.tsx` | `src/components/ui/sheet.tsx` |
| `src/components/ui/sidebar.tsx` | `src/components/ui/sidebar.tsx` |
| `src/components/ui/skeleton.tsx` | `src/components/ui/skeleton.tsx` |
| `src/components/ui/switch.tsx` | `src/components/ui/switch.tsx` |
| `src/components/ui/tabs.tsx` | `src/components/ui/tabs.tsx` |
| `src/components/ui/textarea.tsx` | `src/components/ui/textarea.tsx` |
| `src/components/ui/tooltip.tsx` | `src/components/ui/tooltip.tsx` |
| `src/hooks/use-mobile.tsx` | `src/hooks/use-mobile.tsx` |
| `src/config/constants.ts` | `src/config/constants.ts` |

---

## 11. Key Dependencies (exact versions from meridia)

```json
{
  "@fontsource-variable/inter": "^5.2.8",
  "@fontsource-variable/unbounded": "^5.2.8",
  "@tailwindcss/vite": "^4.1.17",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.577.0",
  "radix-ui": "^1.4.3",
  "tailwind-merge": "^3.5.0",
  "tailwindcss": "^4.1.17",
  "tw-animate-css": "^1.4.0"
}
```

---

## 12. Vite Configuration Pattern

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

Note: Tailwind v4 is loaded as a Vite plugin — **no** `tailwind.config.ts` file is used. All theme configuration lives in `src/index.css` under `@theme inline { }`.
