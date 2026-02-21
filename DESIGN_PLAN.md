# Investracker Design Overhaul Plan

## Vision

Transform Investracker from a half-baked prototype into a **premium fintech app** that feels like a blend of **Robinhood's clarity**, **Wealthfront's sophistication**, and **Bloomberg's data density** — without the generic "AI made this" look.

The key differentiators:
- **Dark-first design** with an optional light mode (fintech users prefer dark)
- **Intentional color** — not "gradient everything", but strategic use of accent colors
- **Data-forward** — numbers are the hero, not decorative cards
- **Micro-interactions** — subtle Lottie animations, skeleton loaders, real transitions
- **Hebrew/RTL-ready** — the app serves Israeli investors, so RTL support matters

---

## 1. Design System Foundation

### 1.1 Color Palette

**Primary Background (Dark Mode)**
```
bg-900:  #0B0F1A   (app background — near-black with blue undertone)
bg-800:  #111827   (card/surface background)
bg-700:  #1F2937   (elevated surfaces, modals)
bg-600:  #374151   (borders, dividers)
```

**Primary Background (Light Mode)**
```
bg-50:   #F8FAFC   (app background)
bg-100:  #FFFFFF   (card surfaces)
bg-200:  #F1F5F9   (elevated surfaces)
bg-300:  #E2E8F0   (borders, dividers)
```

**Brand Green (keep — it's in the logo)**
```
green-400: #4ADE80   (primary accent — gains, CTAs)
green-500: #22C55E   (hover states)
green-600: #16A34A   (active states)
green-900: #052E16   (dark mode green tint backgrounds)
```

**Semantic Colors**
```
gain:    #4ADE80 (green — portfolio up)
loss:    #F43F5E (rose — portfolio down, not pure red)
warn:    #F59E0B (amber — pending, caution)
info:    #3B82F6 (blue — neutral info, links)
```

**Text Hierarchy (Dark Mode)**
```
text-primary:    #F9FAFB  (headings, key numbers)
text-secondary:  #9CA3AF  (labels, descriptions)
text-muted:      #6B7280  (timestamps, metadata)
```

### 1.2 Typography

Replace Inter with **a two-font system**:
- **Headings & Numbers**: `"DM Sans"` — geometric, clean, great for financial data
- **Body text**: `"Inter"` — keep for readability at small sizes
- **Monospace numbers**: Use `font-variant-numeric: tabular-nums` on all financial figures so columns align

```css
/* Financial figures should always use tabular numbers */
.financial-figure {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

### 1.3 Spacing & Layout Grid

```
Base unit: 4px
xs: 4px  | sm: 8px  | md: 16px  | lg: 24px  | xl: 32px  | 2xl: 48px

Content max-width: 1440px (desktop), full-bleed sidebar
Card border-radius: 12px (not 8px — slightly softer)
```

### 1.4 Elevation System (Dark Mode)

No box-shadows in dark mode. Use **border + background shift** instead:
```
Level 0: bg-900 (page background)
Level 1: bg-800 + border border-white/5 (cards)
Level 2: bg-700 + border border-white/10 (modals, dropdowns)
Level 3: bg-600 + ring-1 ring-white/10 (popovers, tooltips)
```

Light mode uses subtle shadows:
```
Level 1: shadow-sm + border border-gray-100
Level 2: shadow-md
Level 3: shadow-lg
```

### 1.5 Component Library Plan

| Component | Notes |
|-----------|-------|
| `Card` | Consistent surface with padding, border, radius |
| `MetricCard` | Number + label + sparkline + change indicator |
| `DataTable` | Sortable, compact, with sticky headers |
| `Badge` | Status pills (gain/loss/pending/neutral) |
| `Button` | Primary (green), Secondary (ghost), Danger (rose) |
| `Input` | Clean border style, floating labels |
| `Tabs` | Underline style (not pill style) for page navigation |
| `Skeleton` | Shimmer loading state for every data component |
| `EmptyState` | Lottie animation + message + CTA |
| `Modal` | Slide-up on mobile, centered on desktop |
| `Chart` | Consistent Recharts theming — green/rose, no gridlines |

---

## 2. Layout Architecture

### 2.1 Desktop (≥1280px)

```
┌────────────────────────────────────────────────────────────┐
│ [Sidebar 72px collapsed / 256px expanded]  [Main Content] │
│                                                            │
│  ┌──────┐  ┌───────────────────────────────────────────┐   │
│  │ Logo │  │  Top Bar (breadcrumb + search + avatar)   │   │
│  │      │  ├───────────────────────────────────────────┤   │
│  │ Nav  │  │                                           │   │
│  │ ━━━  │  │         Page Content                      │   │
│  │ ━━━  │  │         (max-width: 1200px, centered)     │   │
│  │ ━━━  │  │                                           │   │
│  │      │  │                                           │   │
│  │      │  └───────────────────────────────────────────┘   │
│  └──────┘                                                  │
└────────────────────────────────────────────────────────────┘
```

- Sidebar: **icon-only by default** (72px), expands to 256px on hover or pin
- Main area: fluid, max-width 1200px centered content
- Top bar: subtle, not heavy — breadcrumb trail, global search, user avatar

### 2.2 Tablet (768px–1279px)

```
┌──────────────────────────────────────────┐
│  Top Bar (hamburger + logo + avatar)     │
├──────────────────────────────────────────┤
│                                          │
│         Page Content                     │
│         (full width, 24px padding)       │
│                                          │
└──────────────────────────────────────────┘
  
  [Slide-over sidebar from left on hamburger tap]
```

- Sidebar hidden, accessible via hamburger
- Content takes full width
- Grid layouts drop from 3-col to 2-col

### 2.3 Mobile (< 768px)

```
┌───────────────────────┐
│ Top Bar (compact)     │
├───────────────────────┤
│                       │
│  Page Content         │
│  (full width, 16px)   │
│                       │
├───────────────────────┤
│ Bottom Tab Bar        │
│ [🏠] [📊] [🌍] [📚] [⚙]│
└───────────────────────┘
```

- **Bottom tab bar** replaces sidebar entirely (5 key destinations)
- Top bar: compact with logo + notifications bell
- Cards stack vertically, single column
- Tables become card-list view
- Charts are full-width, taller aspect ratio

---

## 3. Page-by-Page Design Specifications

### 3.1 Landing Page (Public — `/`)

**Current:** Generic marketing page with blob animations.
**New:** Premium fintech landing with real personality.

**Hero Section:**
- Full-viewport height, dark background `#0B0F1A`
- **Left side**: Bold headline ("Track Every Shekel. Own Every Move."), subtitle, two CTAs (Get Started = green, See Demo = ghost/outline)
- **Right side**: Keep `Hero.lottie` animation but overlay it on a subtle grid/dot pattern background
- Floating glass-morphism card showing a mini portfolio preview (animated numbers counting up)
- No decorative blobs — replace with a subtle **noise texture** overlay

**Features Section:**
- White/light background for contrast shift
- 3-column grid of feature cards with **line-art icons** (not emoji, not filled icons)
- Each card has a very subtle hover: lift 2px + border glow in green
- Section heading left-aligned, not centered

**Social Proof / Stats:**
- Dark strip with 3 key stats: "₪2.5M+ Tracked", "500+ Investors", "12 Brokers Supported"
- Use `track.lottie` here as a background element (subtle, parallax)

**CTA Section:**
- Keep `join-us.lottie` centered
- Simple CTA with green button on dark background
- No gradient backgrounds — solid dark with green accent

**Footer:**
- Minimal: logo, 3 link columns, copyright 2026
- Dark, matching hero

**Responsive:**
- Tablet: Hero stacks vertically (text top, lottie below). Features go 2-col
- Mobile: Everything single column. CTAs full-width. Stats stack. Lottie animations reduce in size

---

### 3.2 Auth Pages (`/auth/login`, `/auth/register`)

**Current:** ✅ **Implemented** — Dark premium fintech design
**Design:** Split-screen auth with dark theme

**Desktop Layout:**
```
┌──────────────────┬──────────────────┐
│                  │                  │
│  Brand Panel     │   Auth Form      │
│  (dark bg)       │   (dark bg)      │
│                  │                  │
│  Logo            │   Title          │
│  Tagline         │   Inputs         │
│  Dot grid        │   Button         │
│  Subtle glow     │                  │
│                  │                  │
└──────────────────┴──────────────────┘
```

**Key Design Features:**
- **Background**: `bg-surface-dark` (#0B0F1A) — dark, professional fintech look
- **Left panel (50%)**: `bg-surface-dark-secondary` (#111827)
  - Dot grid pattern overlay (opacity-40)
  - Subtle green glow blob (bg-brand-400/5 blur-3xl)
  - Centered logo + heading + tagline
- **Right panel (50%)**:
  - Direct on dark background (no card wrapper)
  - Clean inputs: `bg-surface-dark-secondary` with border-white/10
  - Focus state: ring-2 ring-brand-400/40
  - Solid green button: `bg-brand-400` hover:bg-brand-500
  - Labels in gray-300, text in gray-100

**Colors:**
- Background: surface-dark (#0B0F1A)
- Panel: surface-dark-secondary (#111827)
- Button: brand-400 (green)
- Text: gray-100 (primary), gray-400 (secondary)
- Inputs: white/10 borders, gray-100 text

**Responsive:**
- **Tablet:** Same split layout
- **Mobile:** Left panel hidden, logo shown above form, form takes full width

**Note:** A light/vivid variant was tested (gradients, glass-morphism, light backgrounds) but the **dark version was preferred**. The light version code is preserved in git history for future A/B testing.

---

### 3.3 Dashboard (`/` authenticated)

**Current:** Overcrowded grid with mock data, inconsistent colors.
**New:** Clean data-forward dashboard.

**Top Section — Portfolio Summary:**
```
┌───────────────────────────────────────────────────────────┐
│  Good morning, Michael               [Date: Feb 14, 2026]│
│                                                           │
│  ₪ 1,247,832.50                     ▲ +2.4% today        │
│  Total Portfolio Value                +₪29,148.00          │
│                                                           │
│  [=====  sparkline chart (90 days, subtle) =====]         │
└───────────────────────────────────────────────────────────┘
```

- The **big number is the hero** — 48px, DM Sans, tabular-nums
- Sparkline below it (no axes, no labels — just the shape)
- Change indicator: green pill with arrow for gain, rose for loss

**Metric Strip (4 cards in a row):**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Invested │ │ Gains    │ │ Holdings │ │ Dividends│
│ ₪980,000 │ │ +₪267K   │ │ 23       │ │ ₪12,450  │
│          │ │ +27.3%   │ │ 5 IL/18W │ │ this yr  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- Cards: `bg-800` (dark) or white (light), border subtle, NO gradients
- Each card has an **icon** (thin line style) + **label** (muted) + **value** (primary, large) + **sub-text** (secondary)

**Main Content — Two Column:**

**Left (60%) — Performance Chart:**
- Full-width area chart (green fill with gradient to transparent)
- Period selectors: 1D | 1W | 1M | 3M | 1Y | All (pill buttons)
- Hover tooltip showing value at point
- Recharts with custom theme: no grid lines, subtle axis, green line

**Right (40%) — Allocation Donut:**
- Clean donut chart with center text showing total
- Legend below with colored dots + stock name + percentage
- Top 5 holdings, rest grouped as "Other"

**Bottom Section — Two Column:**

**Left — Top Movers (Today):**
- Compact list: stock logo + name + price + change%
- Green/rose badges for gain/loss
- "View all" link

**Right — Recent Activity:**
- Timeline-style list: icon + description + amount + timestamp
- Buy (green), Sell (rose), Dividend (amber) icons

**Responsive:**
- Tablet: Metric strip becomes 2x2 grid. Main content stacks (chart on top, donut below). Bottom section stacks.
- Mobile: Metric strip horizontal scroll (swipeable). Everything single column. Chart full-width, taller.

---

### 3.4 Portfolio Page (`/portfolio`)

**Current:** Tab switcher with summary/upload/review tabs.
**New:** Clean portfolio hub.

**Header:**
- Page title "Portfolio" + subtitle with total value
- Right side: "Upload Report" button (green outline) + "Review Pending" button (amber badge with count)

**Market Toggle:**
```
[ 🇮🇱 Israeli Market ] [ 🌍 World Markets ] [ All ]
```
- Segmented control (not separate cards)

**Holdings Table:**
- **THE core of this page** — must be excellent
- Sticky header, sortable columns
- Columns: Logo + Name | Shares | Avg Price | Current Price | Value | Gain/Loss | Gain% | Weight
- Each row: stock logo (rounded square, 32px), name + ticker in small text
- Gain/loss cells use green/rose text color (no background)
- Row hover: subtle `bg-white/5` highlight
- Column sorting: click header, show ▲/▼ indicator
- Mobile: Table becomes a **card list** — each holding is a card showing key info
- Empty state: Lottie animation + "Upload your first report to see holdings"

**Responsive:**
- Tablet: Table with horizontal scroll, fewer columns visible by default
- Mobile: Card list view (no table). Each card shows: logo + name, value, gain/loss%. Tap to expand details

---

### 3.5 Israeli Stocks Page (`/israeli-stocks`)

**Current:** Tab dashboard with holdings/transactions/dividends.
**New:** Same structure, refined UI.

**Tabs:**
- Underline-style tabs: `Holdings | Transactions | Dividends`
- Active tab: green underline (2px) + green text
- Inactive: muted text

**Holdings Tab:**
- Same table design as portfolio but filtered to Israeli stocks
- Add a mini market summary bar at top: "TASE TA-125: 2,145 ▲+0.8%"

**Transactions Tab:**
- Clean table: Date | Type (Buy/Sell badge) | Stock | Shares | Price | Total | Commission
- Buy = green badge, Sell = rose badge
- Filterable by date range and type
- Mobile: Card list with swipe actions

**Dividends Tab:**
- Table: Date | Stock | Amount (₪) | Tax Withheld | Net Amount
- Summary card at top: "Total Dividends: ₪12,450 | Tax Paid: ₪3,112 | Net: ₪9,338"
- Mobile: Card list

---

### 3.6 World Stocks Page (`/world-stocks`)

Same structure as Israeli Stocks but:
- Currency in USD ($)
- Account selector dropdown in header (for multi-broker support)
- Market summary: "S&P 500: 5,890 ▲+0.3%"

---

### 3.7 Calendar Page (`/calendar`)

**Current:** react-calendar widget + event list, functional but basic.
**New:** Financial calendar with personality.

**Desktop Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Financial Calendar                  [Filter ▾] [⊞ / ≡] │
├────────────────────────────────┬─────────────────────────┤
│                                │                         │
│      Monthly Calendar          │  Events for Feb 14      │
│      (custom-styled grid)      │  ┌───────────────────┐  │
│                                │  │ 🔴 NYSE Closed     │  │
│  Days with events get a        │  │    Presidents' Day  │  │
│  colored dot below the number  │  └───────────────────┘  │
│                                │  ┌───────────────────┐  │
│                                │  │ 🟢 AAPL Earnings   │  │
│                                │  │    After Hours      │  │
│                                │  └───────────────────┘  │
│                                │                         │
└────────────────────────────────┴─────────────────────────┘
```

- Calendar grid: custom-built (not react-calendar) or heavily restyled
- Event dots: small colored circles under date numbers (max 3 dots per day)
- Event type colors: Market closed (rose), Early close (amber), Earnings (blue), Economic (purple), Holiday (green)
- Selected date panel: scrollable event cards with colored left border
- List view toggle: chronological event list (for users who prefer it)

**Responsive:**
- Tablet: Calendar shrinks, event panel slides over on date tap
- Mobile: Calendar in compact week-strip view at top, events below. Full month view available via expansion

---

### 3.8 Education Center (`/education`)

**Current:** Purple/indigo themed, disconnected from app design.
**New:** Integrated, same dark theme, but with warmth.

**Home View:**
- Progress banner: replace gradient with a clean card showing progress bar + "X/Y lessons completed" + "Continue" button
- Category grid: 3 columns of category cards with **subtle icon** (not emoji), title, lesson count, progress ring
- Category card hover: border glow (green)
- Fun fact: amber-tinted card with lightbulb icon

**Lesson View:**
- Left sidebar: lesson list (collapsible on mobile)
- Main content: clean reading layout, max-width 720px, generous line-height
- Quiz section: interactive cards with green (correct) / rose (incorrect) feedback
- Progress: thin green progress bar at top of page

**Glossary:**
- Alphabetical letter nav (sticky)
- Clean definition cards with term + explanation
- Search/filter bar at top

**Responsive:**
- Tablet: Category grid 2-col. Lesson sidebar collapses to top dropdown
- Mobile: Everything single column. Categories as horizontal scrollable cards. Lesson nav = bottom sheet

---

### 3.9 Settings Page (`/settings`)

**Current:** Broken layout (sidebar stacks vertically), blue theme.
**New:** Clean settings with proper side nav.

**Desktop Layout:**
```
┌────────────────────────────────────────────┐
│  Settings                                  │
├──────────┬─────────────────────────────────┤
│          │                                 │
│ Sidebar  │  Setting Section Content        │
│ --------│                                 │
│ Profile  │  Each section in a clean card   │
│ Display  │  with proper form controls      │
│ Alerts   │                                 │
│ Security │                                 │
│ Regional │                                 │
│          │                                 │
└──────────┴─────────────────────────────────┘
```

- **Side nav (200px)**: Vertical list of setting categories, active = green text + green left border
- **Content area**: Each section as a card with title + description + controls
- Toggle switches: green when active
- Segmented controls for theme (Light / Dark / System)
- Color accent picker: circular swatches

**Responsive:**
- Tablet: Same layout but side nav is narrower (160px)
- Mobile: Side nav becomes a horizontal scrollable pill bar at top. Content below

---

### 3.10 Admin Dashboard (`/admin`)

**Current:** Functional admin panel.
**New:** Keep it functional, just align with design system.

- Same dark theme
- Stats cards at top (users, holdings, uploads)
- Action buttons in a clean grid
- Job status with colored indicators
- Log viewer with monospace font

---

### 3.11 Analytics Page (`/analytics`)

**Current:** Mostly placeholder with mock data.
**New:** Real data, rich visualizations.

**Top:** Period selector pills (7D | 30D | 90D | 1Y | All)

**Metric Cards (3 across):**
- Total Value + sparkline
- Return Rate + comparison to benchmark
- Risk Score (if available)

**Charts Section (2 column):**
- Left: Performance over time (area chart, green)
- Right: Allocation treemap or donut

**Bottom:**
- Sector breakdown (horizontal bar chart)
- Top performers table (compact)

---

## 4. Shared UI Patterns

### 4.1 Loading States
- **Every component** gets a skeleton loader (shimmer animation)
- No spinners except on buttons during submission
- Page-level: skeleton that mirrors the actual layout

### 4.2 Empty States
- Use Lottie animations (existing `track.lottie` or new ones)
- Clear message + primary CTA
- Example: "No transactions yet" + Lottie of empty chart + "Upload Report" button

### 4.3 Error States
- Inline error banners (rose background, rose border)
- Toast notifications for transient errors (top-right)
- Full-page error: friendly illustration + "Retry" button

### 4.4 Event Banner
- Keep marquee concept but restyle: thinner (40px), semi-transparent background
- Left: colored dot + event name (scrolling)
- Right: dismiss X button only (no prev/next — show all as list)
- Sticky below top bar

### 4.5 Charts Theming (Recharts)
```js
const chartTheme = {
  colors: {
    primary: '#4ADE80',     // green for main line/area
    secondary: '#3B82F6',   // blue for comparison
    negative: '#F43F5E',    // rose for losses
    grid: 'transparent',    // no grid lines
    axis: '#6B7280',        // muted axis text
    tooltip: {
      bg: '#1F2937',
      border: '#374151',
      text: '#F9FAFB'
    }
  },
  area: {
    fill: 'url(#greenGradient)', // green to transparent
    stroke: '#4ADE80',
    strokeWidth: 2
  }
}
```

---

## 5. Assets to Keep / Replace / Create

### Keep ✅
- **Logo SVGs**: `investracker_logo.svg`, `investracker_logo-dark.svg`, `small_logo.svg`
- **Lottie files**: `Hero.lottie`, `track.lottie`, `join-us.lottie`
- **Broker logos**: All 10 broker images in `/brokers/`
- **Favicon**: Keep the existing SVG favicon

### Replace 🔄
- **Font**: Add DM Sans alongside Inter
- **Icons**: Standardize on `lucide-react` (already installed) — remove any stray heroicons usage, pick one library
- **Color palette**: Replace the green `primary-*` + teal `accent-*` with the new system
- **Landing page blobs**: Replace with noise texture or subtle grid pattern

### Create 🆕
- **Stock placeholder logo**: Generic icon for stocks without logos (initials in colored circle)
- **Empty state illustrations**: Either Lottie or simple SVG illustrations
- **Skeleton components**: Shimmer-based skeleton for each major component
- **Dark mode variants**: For all logo/image assets
- **OG image**: For social sharing metadata

---

## 6. Technical Implementation Plan

### Phase 1: Foundation (do first)
1. Update `tailwind.config.js` with new color system, dark mode (`class` strategy), fonts
2. Add DM Sans font to `layout.tsx`
3. Create shared component library: `Card`, `Button`, `Badge`, `MetricCard`, `Skeleton`
4. Restyle `globals.css` — remove old utility classes, add new ones
5. Fix `AppLayout` + `Sidebar` — responsive layout with mobile bottom bar + drawer

### Phase 2: Core Pages
6. Landing Page — full redesign
7. Auth Pages — split-screen layout
8. Dashboard — data-forward redesign
9. Portfolio Page — table excellence

### Phase 3: Feature Pages
10. Israeli / World Stocks — refined tab dashboards
11. Calendar — custom styled calendar
12. Education — integrate with design system
13. Settings — fix layout, proper form controls
14. Analytics — real chart implementation

### Phase 4: Polish
15. Loading skeletons for all pages
16. Empty states with Lottie
17. Dark/light mode toggle working end-to-end
18. Mobile testing and refinement
19. Accessibility pass (focus rings, ARIA, keyboard nav)
20. Performance: lazy load charts, optimize images

---

## 7. Design Principles (Non-Negotiable)

1. **Numbers are the UI** — Financial figures should be the largest, most prominent elements. Not icons, not illustrations.
2. **Restrained color** — Green = good, Rose = bad, everything else is neutral grayscale. No blue/purple/orange cards.
3. **Density over decoration** — Users want to see data, not whitespace art. But density ≠ clutter — use hierarchy.
4. **Consistency** — Every card, every table, every button follows the same pattern. No "this page has its own style."
5. **Motion with purpose** — Animations exist to show state changes (loading → loaded, collapsed → expanded), not to decorate.
6. **Mobile is real** — This isn't a "desktop app with a mobile view." Mobile gets its own layout, not just stacked desktop.

---

## 8. Generating Visual Mockups with Gemini

Use **Gemini 2.0 Flash** (or Gemini Pro Vision) to generate high-fidelity mockup images for each page. Here are the prompts to use:

### Dashboard Mockup
```
Create a high-fidelity UI mockup of a fintech portfolio dashboard. Dark mode (#0B0F1A background).
Top: greeting text + large portfolio value "₪1,247,832" in white DM Sans font. Below it a subtle green sparkline.
4 metric cards in a row: Invested, Gains (+green), Holdings count, Dividends.
Main area: left side has a green area chart showing portfolio performance. Right side has a clean donut chart.
Bottom: top movers list with stock logos and green/rose change indicators.
Style: minimal, no gradients on cards, thin borders, professional fintech look. Not generic AI art.
Desktop viewport 1440x900.
```

### Mobile Dashboard
```
Create a mobile UI mockup (390x844, iPhone 15 size) of a fintech portfolio dashboard.
Dark mode (#0B0F1A). Top bar with small logo and notification bell.
Large portfolio value "₪1,247,832" centered, with green change badge "+2.4%".
Horizontal scrollable metric cards below.
Full-width green area chart.
List of holdings as cards (logo + name + value + gain%).
Bottom tab bar with 5 icons: Home, Portfolio, Markets, Learn, Settings.
Clean, modern fintech style. Not cluttered.
```

### Landing Page Mockup
```
Create a landing page mockup for "Investracker" — an Israeli investment portfolio tracker.
Dark hero section (#0B0F1A) with bold white headline "Track Every Shekel. Own Every Move."
Green CTA button, ghost outline secondary button.
Right side: floating glass-morphism card showing mini portfolio preview.
Below: light section with 3 feature cards using thin line-art icons.
Dark stats strip with key numbers.
Professional fintech SaaS landing page. Desktop 1440x900.
```

### Auth Page Mockup
```
Create a split-screen login page mockup. Left half: dark panel (#0B0F1A) with white logo, tagline, and subtle financial chart illustration. Right half: white clean form with email input, password input, green "Sign In" button, and link to register. Centered vertically. Modern fintech style. Desktop 1440x900.
```

---

*Design plan created February 14, 2026. Ready for implementation on `feature/design` branch.*
