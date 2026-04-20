# Dark Mode Specification — Fiscal Insight AI

> **Purpose:** Authoritative reference for implementing and maintaining dark mode across the projection-app frontend. The goal is a polished, finance-grade dark theme that feels premium — not just an inverted light mode.

---

## 1. Current State

| Item | Status |
|---|---|
| CSS variable system (HSL tokens) | ✅ Complete — `src/index.css` |
| `.dark` selector with token overrides | ✅ Complete |
| `next-themes` package installed | ✅ v0.4.6 |
| `ThemeProvider` wired in `App.tsx` | ❌ Missing |
| Persistent theme toggle UI | ❌ Missing |
| `dark:` class usage consistent across pages | ⚠️ Partial (UI kit done, pages incomplete) |
| Auth panel (`auth-panel.tsx`) tokens | ❌ Hardcoded hex values — not theme-aware |

---

## 2. Design Principles

1. **Never use raw black.** Darkest surface is `hsl(210 65% 10%)` — a deep navy, not #000000.
2. **Depth through elevation.** Cards and modals sit lighter than the page background, not darker.
3. **Teal stays teal.** The `#39B5A6` / `#156082` brand identity must be recognisable in both modes.
4. **Borders are whispers.** Dark mode borders use ~15–20% lightness — visible but never harsh.
5. **Chart lines must pop.** All 5 chart tokens get brighter/higher chroma variants in dark mode.
6. **No pure white text.** Maximum foreground is `hsl(210 20% 98%)` — a warm off-white.

---

## 3. Token Reference

### 3.1 Core Surfaces

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` | `210 20% 98%` (`#F8FBFD`) | `210 65% 10%` (`#0A1929`) | Page base |
| `--foreground` | `210 65% 15%` (`#0E2841`) | `210 20% 98%` (`#F8FBFD`) | Body text |
| `--border` | `210 20% 90%` | `210 65% 20%` | Dividers, outlines |
| `--input` | `210 20% 86%` | `210 65% 25%` | Input field backgrounds |
| `--ring` | `198 72% 30%` | `198 72% 40%` | Focus rings |

### 3.2 Cards & Popovers

| Token | Light | Dark |
|---|---|---|
| `--card` | `0 0% 100%` | `210 65% 13%` (`#0D1E2C`) |
| `--card-foreground` | `210 65% 15%` | `210 20% 98%` |
| `--card-border` | `210 20% 90%` | `210 65% 20%` |
| `--popover` | `0 0% 100%` | `210 65% 13%` |
| `--popover-foreground` | `210 65% 15%` | `210 20% 98%` |

### 3.3 Brand Actions

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--primary` | `198 72% 30%` (`#156082`) | `198 72% 40%` | Teal — bumped +10% lightness |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Always white |
| `--secondary` | `210 65% 15%` (navy) | `210 20% 90%` | Inverted |
| `--secondary-foreground` | `0 0% 100%` | `210 65% 10%` | |
| `--muted` | `210 20% 96%` | `210 65% 20%` | Subtle fills |
| `--muted-foreground` | `210 20% 40%` | `210 20% 70%` | Dimmed text |
| `--accent` | `210 20% 92%` | `210 65% 25%` | Hover highlights |
| `--accent-foreground` | `210 65% 15%` | `210 20% 98%` | |
| `--destructive` | `0 84% 60%` | `0 60% 50%` | Error red |

### 3.4 Sidebar

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `0 0% 100%` | `210 65% 13%` |
| `--sidebar-foreground` | `210 65% 15%` | `210 20% 98%` |
| `--sidebar-border` | `210 20% 90%` | `210 65% 20%` |
| `--sidebar-primary` | `198 72% 30%` | `198 72% 40%` |
| `--sidebar-primary-foreground` | `0 0% 100%` | `0 0% 100%` |
| `--sidebar-accent` | `210 20% 96%` | `210 65% 20%` |
| `--sidebar-accent-foreground` | `210 65% 15%` | `210 20% 98%` |

### 3.5 Chart Colors

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--chart-1` | `198 72% 30%` | `198 72% 40%` | Teal (primary metric) |
| `--chart-2` | `210 65% 15%` | `210 20% 90%` | Navy → off-white |
| `--chart-3` | `160 60% 40%` | `160 60% 50%` | Green (positive) |
| `--chart-4` | `40 80% 50%` | `40 80% 60%` | Gold (warning) |
| `--chart-5` | `0 60% 50%` | `0 60% 60%` | Red (negative) |

### 3.6 Elevation / Shadow Overlays

| Token | Light value | Dark value |
|---|---|---|
| `--elevate-1` | `rgba(0,0,0,0.03)` | `rgba(255,255,255,0.04)` |
| `--elevate-2` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.09)` |
| `--button-outline` | `rgba(0,0,0,0.10)` | `rgba(255,255,255,0.10)` |
| `--badge-outline` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` |
| `--opaque-button-border-intensity` | `-8` (darken) | `9` (lighten) |

---

## 4. Implementation Tasks

### 4.1 Wire ThemeProvider (Required First)

**File:** `src/main.tsx` or `src/App.tsx`

```tsx
import { ThemeProvider } from "next-themes";

// Wrap the entire app:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <App />
</ThemeProvider>
```

- `attribute="class"` adds/removes the `.dark` class on `<html>` — matches the existing CSS selector.
- `defaultTheme="system"` respects OS preference on first visit.
- Store preference in `localStorage` automatically (next-themes default).

### 4.2 Theme Toggle Component

Create `src/components/ui/theme-toggle.tsx`:

```tsx
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Cycle: system → light → dark → system
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button onClick={() => setTheme(next)} aria-label="Toggle theme">
      <Icon size={16} />
    </button>
  );
}
```

Place in the top-right of the sidebar or topbar. Use `bg-muted hover:bg-accent` for the button container.

### 4.3 Fix auth-panel.tsx Hardcoded Colors

`auth-panel.tsx` uses raw hex constants (`DARK = "#0E2841"`, `MID = "#156082"`, `ACCENT = "#39B5A6"`) that are not theme-aware. In dark mode the decorative left panel intentionally stays dark (it is always a rich navy background), so the constants are **acceptable for that component only**. No changes needed to `auth-panel.tsx`.

### 4.4 Status Badge Dark Mode (pages)

Several pages (`dashboard.tsx`, `projection.tsx`) use inline Tailwind dark variants for status badges. Ensure the pattern is consistent:

| Status | Light classes | Dark classes |
|---|---|---|
| Active / Success | `bg-green-100 text-green-800` | `dark:bg-green-900/40 dark:text-green-300` |
| Warning / Pending | `bg-yellow-100 text-yellow-800` | `dark:bg-yellow-900/40 dark:text-yellow-300` |
| Error / Rejected | `bg-red-100 text-red-800` | `dark:bg-red-900/40 dark:text-red-300` |
| Info / In Progress | `bg-blue-100 text-blue-800` | `dark:bg-blue-900/40 dark:text-blue-300` |
| Neutral | `bg-gray-100 text-gray-700` | `dark:bg-white/10 dark:text-gray-300` |

Do **not** use `bg-green-900` (full opacity) — use `dark:bg-green-900/40` so the badge reads as tinted rather than solid.

---

## 5. Component-by-Component Notes

### Sidebar (`layout.tsx`)
- Background: `bg-sidebar` — already token-driven, works automatically.
- Active item: `bg-sidebar-primary text-sidebar-primary-foreground` — teal stays teal.
- Hover: `hover:bg-sidebar-accent` — verified correct in dark.

### Cards (general)
- Use `bg-card text-card-foreground border-card-border` consistently.
- Avoid `bg-white` — it breaks dark mode.
- Prefer `shadow-sm` over hard-coded box-shadow strings in new components.

### Data Tables
- Header row: `bg-muted text-muted-foreground` (light gray tint in light / dark navy in dark).
- Row hover: `hover:bg-accent/50`.
- Borders: `divide-border` or `border-border`.

### Charts (Recharts / chart.tsx)
- The chart component already handles theme via `THEMES = { light: "", dark: ".dark" }`.
- Always use `--chart-N` tokens for series colors — never hardcode hex in chart configs.
- Tooltip background: `bg-card border-card-border` — no override needed.

### Modals / Dialogs
- `bg-popover text-popover-foreground` — token-driven, no override needed.
- Overlay backdrop: `bg-black/60` — acceptable in both modes.

### Auth Panel (left decorative pane)
- Intentionally always dark — the navy gradient, particle canvas, and chart card are dark-mode locked.
- The right pane (form area) currently uses light-only styling — if a dark mode sign-in is ever required, extract its inline styles to token-based classes.

---

## 6. Page-Specific Checklist

| Page | Dark mode status | Action required |
|---|---|---|
| Login / Auth | Left panel: dark-locked ✅ Right panel: light-locked ⚠️ | Low priority — auth panel is intentionally brand-locked |
| Dashboard | Status badges partially covered | Apply badge pattern from §4.4 |
| Projection | Chart line uses `dark:text-blue-400` inline | Replace with `text-chart-1` |
| Employees | Unknown — review inline colours | Audit for `bg-white`, `text-gray-*` without dark: prefix |
| Quotations | Unknown | Audit for `bg-white`, hardcoded borders |
| Settings | Unknown | Verify form inputs use `bg-input` not `bg-white` |

---

## 7. QA Checklist

Before marking dark mode complete, verify each item in both themes:

- [ ] Page background is deep navy — no white flash on load
- [ ] All text is readable (minimum 4.5:1 contrast ratio — WCAG AA)
- [ ] Sidebar active state: teal background, white text — visible in both modes
- [ ] Cards: distinctly lighter than page background in dark mode
- [ ] Inputs: placeholder text visible, focus ring teal
- [ ] All status badges: tinted (not solid) in dark mode
- [ ] Chart lines: all 5 series visible against dark background
- [ ] Chart tooltips: dark card background, not white
- [ ] Toasts (Sonner): follows theme — already wired via `useTheme()`
- [ ] Theme persists across page refresh (localStorage — next-themes handles this)
- [ ] System preference change (OS dark ↔ light) reflects immediately when `defaultTheme="system"`
- [ ] No `bg-white` or `text-black` raw classes remaining in page components
- [ ] Print mode: unaffected (index.css `@media print` forces light)

---

## 8. File Locations

| File | Role |
|---|---|
| `src/index.css` | Single source of truth — all CSS variables, light + dark |
| `src/main.tsx` | Where `ThemeProvider` must be added |
| `src/components/ui/theme-toggle.tsx` | Toggle button (to be created) |
| `src/components/ui/sonner.tsx` | Already uses `useTheme()` |
| `src/components/ui/chart.tsx` | Already theme-aware |
| `src/components/layout.tsx` | Sidebar — already uses semantic tokens |
| `src/components/auth-panel.tsx` | Hardcoded — intentionally dark-locked, no changes needed |
| `src/pages/dashboard.tsx` | Badges need dark: variants |
| `src/pages/projection.tsx` | Chart color inline needs replacement |
