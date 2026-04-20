# Fiscal Insight AI — Mobile & Adaptive Design Spec

> **Scope:** Every page and shell component from 375 px portrait to 1440 px+ desktop.  
> **Stack:** TailwindCSS v4, React 19, Shadcn/ui (Radix primitives), Framer Motion, Recharts.  
> **Status:** Phase 1 complete ✓ · Phase 2 complete ✓ · Phase 3 complete ✓ (see §17 for completion tracking)

## Implementation Progress

| Priority | Area | Status |
|---|---|---|
| 1 | Shell + BottomNav | ✅ Complete — `bottom-nav.tsx` created, `layout.tsx` updated with `pb-16 md:pb-0`, footer `hidden sm:block` |
| 2 | Dashboard (grid + chart heights) | ✅ Complete — `grid-cols-2`, responsive chart heights `h-[200px] sm:h-[220px] md:h-[240px] lg:h-[260px]` |
| 3 | Projection KPI strip + Tweaks Bar | ✅ Complete — KPI strip `grid grid-cols-3` on xs, tweaks bar `grid grid-cols-2 sm:flex-wrap` on mobile, section nav Select on `lg:hidden` |
| 4 | Projection tables → card-stack | ✅ Complete — Team, Overheads, Sales Support, Setup Fees, Infrastructure all have `md:hidden` card-stack + `hidden md:block` table; Cost Structure & Selling Prices have `sm:hidden` dl view |
| 5 | Quotations + Invoices list tables | ✅ Complete — column visibility classes added, button stacking applied |
| 6 | Invoice Calendar carousel | ⏳ Pending |
| 7 | Admin tables | ✅ Complete — tabs `overflow-x-auto`, Users email `hidden sm:table-cell`, scrollable tabs |
| 8 | Auth panel minor polish | ✅ Complete — responsive logo height, form card padding |

---

## 1. Breakpoint System

| Token | Range | Target device |
|-------|-------|---------------|
| *(default)* | 0 – 639 px | Mobile portrait (375–639 px) |
| `sm:` | 640 – 767 px | Mobile landscape / large phone |
| `md:` | 768 – 1023 px | Tablet (portrait & landscape) |
| `lg:` | 1024 px + | Desktop — current primary target |
| `xl:` | 1280 px + | Wide desktop (minor tweaks only) |

**Rule:** Design mobile-first. Default classes (no prefix) target 0–639 px. Scale up with `sm:`, `md:`, `lg:`.

---

## 2. Shell & Layout (`src/components/layout.tsx`)

### 2.1 Navigation — three-tier strategy

| Breakpoint | Navigation pattern |
|---|---|
| default / sm | **Bottom navigation bar** (5 items, icon + label) replaces Sheet drawer for primary nav |
| md | **Sheet drawer** (existing Shadcn `Sheet` triggered from top-bar hamburger) |
| lg+ | **Persistent sidebar** — current implementation, no changes |

**Bottom nav items (xs/sm):**
1. Dashboard (`/dashboard`)
2. Projections (`/projection`)
3. Quotations (`/quotations`)
4. Invoices (`/invoices`)
5. Admin (`/admin`) — only visible when `user.role === "admin"`

**Implementation notes:**
- Create `src/components/layout/bottom-nav.tsx` — render only on `useIsMobile()` (< 768 px).
- Use `fixed bottom-0 inset-x-0 z-50 h-16 border-t bg-background` for the bar.
- Active item: teal underline (`border-t-2 border-primary`) + filled icon.
- Safe-area padding: `pb-[env(safe-area-inset-bottom)]` for iOS notch.
- Main content area: add `pb-16 lg:pb-0` so the bar doesn't overlap content.

### 2.2 Top bar

| Breakpoint | Changes |
|---|---|
| default | Show: hamburger (md only), page title only (truncated), user avatar |
| sm | Same as default |
| md | Show hamburger to open Sheet drawer; hide bottom nav |
| lg+ | Show sidebar trigger (`SidebarTrigger`), full breadcrumb, search, user menu |

```
// Pseudocode class changes on top bar title
<h1 className="truncate max-w-[160px] sm:max-w-xs lg:max-w-none text-base lg:text-xl font-semibold">
```

### 2.3 Footer

- Add `hidden sm:block` — hide completely on xs to maximise viewport height.

---

## 3. Auth Panel (`src/components/auth-panel.tsx`)

### Current state ✓ (already correct)
- `hidden lg:block` on decorative left panel — works correctly.
- Particle canvas, ticker strip, animated chart all inside the hidden block.

### Remaining gaps

| Element | Fix |
|---|---|
| Form container padding | Change `p-6 sm:p-8` → `p-4 sm:p-6 md:p-8` |
| Logo on mobile | `h-8 sm:h-10` (currently fixed `h-10`) |
| Form max-width | Already `max-w-md w-full` — no change needed |
| Footer `py-3` | Add `hidden sm:block` if it overlaps form on very short screens (optional) |

---

## 4. Dashboard (`src/pages/dashboard.tsx`)

### 4.1 KPI Cards grid

```
// Current
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4

// New — show 2 columns on mobile (numbers are glanceable)
grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4
```

Apply to both KPI grid rows.

### 4.2 Charts

**Container heights:**

| Breakpoint | Height |
|---|---|
| default | `h-[200px]` |
| sm | `h-[220px]` |
| md | `h-[240px]` |
| lg+ | `h-[260px]` (current) |

```jsx
<div className="h-[200px] sm:h-[220px] md:h-[240px] lg:h-[260px] w-full">
  <ResponsiveContainer width="100%" height="100%">
```

**Bar chart labels (angled text):**
- xs: `angle={-45}` → `angle={-60}`, `fontSize={10}`
- lg+: `angle={-25}`, `fontSize={12}` (current)
- Use Recharts `<XAxis tick={{ fontSize: ... }}>` with responsive values via `useWindowSize` hook or Recharts' built-in width callback.

**Legends:**
- xs/sm: `verticalAlign="bottom"` (already default in some charts — verify all)
- lg+: `verticalAlign="middle" layout="vertical"` (inline)

**Pie/Donut charts (Headcount, Cost by Basis):**
- xs: `innerRadius={45} outerRadius={75}` (reduce from 60/100)
- lg+: current 60/100

**Chart stacking order on mobile (flex-col, top to bottom):**
1. Cost vs Revenue (most important)
2. Margin Trend
3. Monthly Cost Breakdown
4. Per-Client Waterfall
5. Headcount by Country
6. Payroll by Country
7. Revenue Engagement
8. Cost by Basis

### 4.3 Page header

```
// Current
flex items-center justify-between

// New
flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between
```

Buttons (`flex-wrap gap-2` already applied — verify).

---

## 5. Projections List (`src/pages/projections-list.tsx`)

```
// Current
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3

// New — start at 1, bump earlier
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

Create dialog: currently a `<Dialog>` — no changes needed (full-screen on xs automatically).

---

## 6. Projection Detail (`src/pages/projection.tsx`) — Most Complex

### 6.1 KPI Header Strip

```
// Current — horizontal scroll strip
flex divide-x divide-border/60 overflow-x-auto

// New — grid on xs, scroll on sm+
grid grid-cols-3 gap-px sm:flex sm:divide-x sm:overflow-x-auto
```

On xs (grid): show 6 KPIs in a 3×2 grid, each KPI without dividers. Remove `divide-x` class for xs; re-apply at `sm:`.

Each KPI cell on xs:
```jsx
<div className="flex flex-col items-center py-2 px-1 text-center">
  <p className="text-[10px] text-muted-foreground truncate">label</p>
  <p className="text-sm font-semibold tabular-nums">value</p>
</div>
```

### 6.2 Tweaks Bar

```
// Current — always visible flex-wrap
flex flex-wrap items-end gap-4 px-4 py-3 border-b bg-muted/30

// New — collapsible on xs/sm, inline on md+
```

**Implementation:**
- Wrap with Shadcn `<Collapsible>` on `md:contents` (use CSS `contents` to unwrap the collapsible wrapper on desktop).
- Trigger: `"⚙ Adjust parameters"` chevron button, `w-full` on xs.
- Open state persists in `localStorage` (key: `fi_tweaks_open`).

```jsx
// xs/sm: show collapsible trigger
<div className="md:hidden border-b px-4 py-2">
  <Collapsible open={tweaksOpen} onOpenChange={setTweaksOpen}>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="w-full justify-between text-sm">
        Adjust parameters <ChevronDown className={cn("h-4 w-4 transition-transform", tweaksOpen && "rotate-180")} />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="flex flex-wrap items-end gap-3 py-3">
        {/* all tweak inputs */}
      </div>
    </CollapsibleContent>
  </Collapsible>
</div>

// md+: always visible (existing markup)
<div className="hidden md:flex flex-wrap items-end gap-4 px-4 py-3 border-b bg-muted/30">
  {/* all tweak inputs */}
</div>
```

### 6.3 Left Section Navigation Sidebar

```
// Current
w-52 hidden lg:flex flex-col sticky top-[76px]

// No change to desktop — xs/sm/md: add a replacement nav
```

**Replacement for xs/sm/md:** A sticky `<Select>` at top of content area:

```jsx
// Visible only below lg
<div className="sticky top-[56px] z-20 lg:hidden bg-background border-b px-4 py-2">
  <Select value={activeSection} onValueChange={scrollToSection}>
    <SelectTrigger className="w-full h-8 text-sm">
      <SelectValue placeholder="Jump to section..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="cost-structure">§ Cost Structure</SelectItem>
      <SelectItem value="team">§ 1.1 Team</SelectItem>
      <SelectItem value="subscriptions">§ 1.2 Subscriptions</SelectItem>
      <SelectItem value="sales-support">§ 1.3 Sales Support</SelectItem>
      <SelectItem value="setup-fees">§ 1.4 Setup Fees</SelectItem>
      <SelectItem value="infrastructure">§ 1.5 Infrastructure</SelectItem>
      <SelectItem value="selling-prices">§ Selling Prices</SelectItem>
      <SelectItem value="invoices">§ 2.2 Invoice Schedule</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### 6.4 Data Tables — Three render modes

All tables (Team §1.1, Subscriptions §1.2, Sales Support §1.3, Setup Fees §1.4, Infrastructure §1.5) follow this pattern:

| Breakpoint | Mode |
|---|---|
| default / sm | **Card stack** — each row = a card |
| md | **Compact table** — reduced columns (hide "Basis"; merge into card tooltip) |
| lg+ | **Full table** — current implementation, no changes |

**Card stack anatomy (xs/sm) — Team example:**

```jsx
// Each employee row becomes:
<div className="rounded-lg border bg-card p-3 space-y-2">
  {/* Header row */}
  <div className="flex items-start justify-between">
    <div>
      <p className="font-medium text-sm">{name}</p>
      <p className="text-xs text-muted-foreground">{title} · {country}</p>
    </div>
    <DropdownMenu>{/* actions */}</DropdownMenu>
  </div>
  {/* Key metrics */}
  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
    <span className="text-muted-foreground">Salary</span>
    <span className="tabular-nums text-right">{salary_sar}</span>
    <span className="text-muted-foreground">Months</span>
    <span className="tabular-nums text-right">{months}</span>
    <span className="text-muted-foreground">Allocation</span>
    <span className="tabular-nums text-right">{alloc}%</span>
    <span className="text-muted-foreground">CTC / yr</span>
    <span className="tabular-nums font-semibold text-right">{ctc}</span>
  </div>
  {/* Edit tap target */}
  <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => openEditSheet(employee)}>
    Edit details
  </Button>
</div>
```

**Edit bottom sheet (xs/sm):** Use `<Sheet side="bottom">` with all editable fields in a scrollable form. "Save" commits changes.

**Compact table columns (md):**

| Table | Columns removed vs lg+ |
|---|---|
| Team §1.1 | Drop "Basis" column (show in hover tooltip on Name) |
| Subscriptions §1.2 | Drop "Currency" column (normalise display to SAR) |
| Sales Support §1.3 | Drop "Basis" column |
| Setup Fees §1.4 | No change (already 5 columns) |
| Infrastructure §1.5 | No change |

### 6.5 Cost Structure & Selling Prices Summary Bands

```
// Current — 4-column table header + rows
<table> with columns: Category | Monthly SAR | Annual SAR | Notes

// xs/sm — replace with definition-list style
<dl className="divide-y">
  <div className="flex justify-between py-2 text-sm">
    <dt className="text-muted-foreground">Team Cost</dt>
    <dd className="font-medium tabular-nums">SAR 120,000</dd>
  </div>
  ...
</dl>

// md+ — current 4-column table
```

Use a `useMediaQuery("(max-width: 767px)")` hook (or Tailwind responsive rendering with `block sm:hidden` / `hidden sm:block`) to switch between the two renders.

---

## 7. Quotations List (`src/pages/quotations/index.tsx`)

### 7.1 Table column visibility

| Column | xs/sm | md | lg+ |
|---|---|---|---|
| Number | ✓ | ✓ | ✓ |
| Company | ✓ | ✓ | ✓ |
| Client | ✗ | ✓ | ✓ |
| Date | ✗ | ✓ | ✓ |
| Status | ✓ | ✓ | ✓ |
| Terms preview | ✗ | ✗ | ✓ |
| Actions | ✓ | ✓ | ✓ |

```jsx
<TableHead className="hidden md:table-cell">Client</TableHead>
<TableHead className="hidden md:table-cell">Date</TableHead>
<TableHead className="hidden lg:table-cell">Terms</TableHead>
```

Row tap (xs/sm): navigate to `/quotations/:id` (edit view) directly — no sheet needed.

### 7.2 Page header buttons

```
// xs
<div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
  <Button className="w-full sm:w-auto">New Quotation</Button>
  <Button variant="outline" className="w-full sm:w-auto">From Projection</Button>
</div>
```

---

## 8. Quotation Form (`src/pages/quotations/form.tsx`)

### 8.1 Top metadata grid

```
// Current
grid grid-cols-2 gap-4

// New
grid grid-cols-1 sm:grid-cols-2 gap-4
```

### 8.2 Line items table → accordion on xs/sm

Each line item becomes a `<Collapsible>` card:
```
[Item name ··· SAR total] [▸]
  ↳ Description, Qty, Unit price, VAT toggle
```

On md+: keep current table layout.

---

## 9. Invoices List (`src/pages/invoices/index.tsx`)

### 9.1 Metrics row

```
// Current
flex gap-4 flex-wrap

// New — always 3 columns (metrics are short)
grid grid-cols-3 gap-3
```

Each MetricCard: reduce label to 2 lines max, use `text-xs sm:text-sm`.

### 9.2 Table column visibility

| Column | xs/sm | md | lg+ |
|---|---|---|---|
| Invoice # | ✓ | ✓ | ✓ |
| Client | ✓ | ✓ | ✓ |
| Month | ✗ | ✓ | ✓ |
| Issued | ✗ | ✗ | ✓ |
| Due | ✗ | ✓ | ✓ |
| Status | ✓ | ✓ | ✓ |
| Total | ✓ | ✓ | ✓ |
| Actions | ✓ | ✓ | ✓ |

### 9.3 Generate panel

```
// Current
flex flex-wrap items-end gap-3

// New
flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3
```

Each input: `w-full sm:w-auto`.

---

## 10. Invoice Detail (`src/pages/invoices/detail.tsx`)

```
// Current
grid gap-4 md:grid-cols-2

// New — single column on xs/sm (metadata → line items → totals)
grid gap-4 md:grid-cols-2
```

This is already correct — `md:grid-cols-2` means single column below 768 px. Verify the column order: metadata fields should come first, totals last.

**Print styles:** Unchanged (`print:grid-cols-2`).

---

## 11. Invoice Calendar (`src/pages/invoices/calendar.tsx`)

### Current: 12-month grid (implied fixed layout)

### New: Three render modes

| Breakpoint | Layout |
|---|---|
| default / sm | **Single-month carousel** — one month card at a time, prev/next arrows + month label |
| md | **4×3 grid** (4 columns, 3 rows) — current approximation |
| lg+ | **6×2 grid** or **4×3 grid** depending on content — keep current |

**Carousel implementation (xs/sm):**
```jsx
const [activeMonth, setActiveMonth] = useState(currentMonthIndex); // 0–11

// Render only the active month's card at full width
<div className="md:hidden">
  <div className="flex items-center justify-between mb-3">
    <Button variant="ghost" onClick={() => setActiveMonth(m => Math.max(0, m - 1))} disabled={activeMonth === 0}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <h3 className="font-semibold">{MONTHS[activeMonth]} {year}</h3>
    <Button variant="ghost" onClick={() => setActiveMonth(m => Math.min(11, m + 1))} disabled={activeMonth === 11}>
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  <MonthCard month={months[activeMonth]} />
</div>

// md+: existing grid
<div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-3">
  {months.map(m => <MonthCard key={m.label} month={m} />)}
</div>
```

---

## 12. Admin (`src/pages/admin.tsx`)

### 12.1 Tabs

```
// Current
<TabsList className="justify-start border-b ...">

// New — horizontal scroll on xs
<div className="overflow-x-auto -mx-4 px-4">
  <TabsList className="justify-start border-b w-max min-w-full">
```

### 12.2 Users table column visibility

| Column | xs/sm | md+ |
|---|---|---|
| Name | ✓ | ✓ |
| Email | ✗ | ✓ |
| Role | ✓ | ✓ |
| Created | ✗ | ✓ |
| Actions | ✓ | ✓ |

Row tap (xs/sm): open a `<Sheet side="bottom">` with full user details + role change + reset password + delete.

### 12.3 CTC Rules table

| Column | xs/sm | md+ |
|---|---|---|
| Country | ✓ | ✓ |
| Employer NI % | ✗ | ✓ |
| Employee NI % | ✗ | ✓ |
| Income Tax % | ✗ | ✓ |
| Actions | ✓ | ✓ |

Row tap (xs/sm): open bottom sheet with all editable fields.

### 12.4 Currencies table

| Column | xs/sm | md+ |
|---|---|---|
| Code | ✓ | ✓ |
| Name | ✗ | ✓ |
| Rate to SAR | ✓ | ✓ |
| Base | ✓ | ✓ |
| Actions | ✓ | ✓ |

---

## 13. Touch & Interaction Standards

| Standard | Spec |
|---|---|
| Min touch target | **44 × 44 px** — all buttons, links, icon buttons. Use `min-h-[44px] min-w-[44px]` or `p-3` on icon buttons |
| Tap feedback | `active:scale-[0.97] transition-transform` on cards and primary buttons |
| Focus rings | Tailwind `focus-visible:ring-2 focus-visible:ring-primary` — never remove |
| Hover-only interactions | Convert to info `(i)` icon buttons that open a popover on tap (xs/sm) |
| Bottom sheets | Use `<Sheet side="bottom">` for edit forms and row detail on xs/sm |
| Swipe actions | Optional: swipe left on table rows to reveal "Delete" action (use `@use-gesture/react` if added) |
| Input font-size | Min `16px` (`text-base`) on all `<Input>` — prevents iOS auto-zoom |
| Spacing between tappable items | Min `8px` gap |

---

## 14. Typography Scale

| Use | xs/sm | md | lg+ |
|---|---|---|---|
| Page title (h1) | `text-xl` (20 px) | `text-2xl` (24 px) | `text-3xl` (30 px) |
| Section heading (h2) | `text-base` | `text-lg` | `text-xl` |
| Table header | `text-xs` | `text-xs` | `text-sm` |
| Table cell | `text-xs` (13 px) | `text-sm` (14 px) | `text-sm` |
| KPI value | `text-lg` | `text-xl` | `text-2xl` |
| KPI label | `text-[10px]` | `text-xs` | `text-xs` |
| Body / descriptions | `text-sm` | `text-sm` | `text-sm` |
| SAR amounts | `tabular-nums` at all sizes — **never change** |
| Input text | `text-base` (16 px min) at all sizes — prevents iOS zoom |

---

## 15. Component Tailwind Class Cheat-Sheet

| Component / location | Current classes | Replace with |
|---|---|---|
| Dashboard KPI grid | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` | `grid-cols-2 md:grid-cols-2 lg:grid-cols-4` |
| Dashboard chart height div | `h-[260px]` | `h-[200px] sm:h-[220px] md:h-[240px] lg:h-[260px]` |
| Dashboard page header | `flex items-center justify-between` | `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` |
| Projections list grid | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Projection KPI strip | `flex divide-x overflow-x-auto` | `grid grid-cols-3 gap-px sm:flex sm:divide-x sm:overflow-x-auto` |
| Projection left nav | `w-52 hidden lg:flex flex-col` | unchanged (add select dropdown for < lg separately) |
| Quotations header buttons | `flex gap-2` | `flex flex-col gap-2 w-full sm:flex-row sm:w-auto` |
| Quotations table — Client col | *(no class)* | `hidden md:table-cell` on `<TableHead>` and `<TableCell>` |
| Quotations table — Date col | *(no class)* | `hidden md:table-cell` |
| Quotations table — Terms col | *(no class)* | `hidden lg:table-cell` |
| Invoices metrics row | `flex gap-4 flex-wrap` | `grid grid-cols-3 gap-3` |
| Invoices table — Month col | `hidden sm:block` | `hidden md:table-cell` |
| Invoices table — Issued col | *(no class)* | `hidden lg:table-cell` |
| Invoices generate panel | `flex flex-wrap items-end gap-3` | `flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3` |
| Admin tabs list | `justify-start border-b` | wrap in `overflow-x-auto -mx-4 px-4`; add `w-max min-w-full` to `TabsList` |
| Auth form container | `p-6 sm:p-8` | `p-4 sm:p-6 md:p-8` |
| Layout main content | *(padding bottom 0)* | `pb-16 lg:pb-0` (room for bottom nav) |
| Footer | *(always visible)* | `hidden sm:block` |

---

## 16. New Components to Create

| Component | Path | Purpose |
|---|---|---|
| `BottomNav` | `src/components/layout/bottom-nav.tsx` | Fixed bottom bar, xs/sm only |
| `useMediaQuery` | `src/hooks/use-media-query.ts` | `(query: string) => boolean` hook for JS-side breakpoint checks |
| `MobileTableCard` | `src/components/ui/mobile-table-card.tsx` | Generic card-stack row for table → card conversion |
| `MonthCarousel` | `src/components/invoices/month-carousel.tsx` | Single-month calendar view with prev/next |

---

## 17. Implementation Order

| Priority | Area | Effort | Impact |
|---|---|---|---|
| 1 | **Shell + BottomNav** | Medium | Unblocks navigation on all pages |
| 2 | **Dashboard** (grid + chart heights) | Low | High visibility, mostly class changes |
| 3 | **Projection KPI strip + Tweaks Bar collapse** | Medium | Most-used page; big UX win |
| 4 | **Projection tables → card-stack** | High | Complex but critical for data entry |
| 5 | **Quotations + Invoices list tables** | Low-Medium | Column hide classes + button stacking |
| 6 | **Invoice Calendar carousel** | Medium | New MonthCarousel component |
| 7 | **Admin tables** | Low | Column hide + bottom sheet |
| 8 | **Auth panel minor polish** | Low | Padding + logo size |

---

## 18. Testing Checklist

- [ ] Chrome DevTools: test at 375 px, 414 px, 640 px, 768 px, 1024 px, 1440 px
- [ ] iOS Safari 16+: test safe-area insets (bottom nav doesn't overlap home indicator)
- [ ] Android Chrome: test tap targets are ≥ 44 px
- [ ] Projection page: all 6 tables render in card-stack at 375 px without horizontal overflow
- [ ] Dashboard: no chart overflows its container at any width
- [ ] Invoice calendar: carousel arrows work, month transitions smooth
- [ ] Admin tabs: scroll horizontally at 375 px without page overflow
- [ ] Bottom nav: active state updates on route change
- [ ] Sheet drawer (md): opens and closes correctly, doesn't conflict with bottom nav
- [ ] Print: invoice detail still prints correctly (`print:` classes unchanged)
- [ ] `font-size: 16px` on all inputs — verify iOS does not zoom on focus
