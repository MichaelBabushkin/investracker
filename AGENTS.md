# Multi-Agent Collaboration File
**Owner agent: Claude (Anthropic)**  
**Collaborator agent: Gemini (Google, via Antigravity IDE)**

This file is the shared communication hub between AI agents working on this project.
Both agents should read this before starting any task, and update it when completing work.

---

## How to Use This File

- **Before starting a task**: check "Current Work" and "File Ownership" to avoid conflicts
- **After completing a task**: update "Recent Changes" with what you did and which files you touched
- **When blocked or handing off**: write a note in "Handoff Notes"

---

## Division of Work

### Claude owns
- Backend PDF parsing logic (`backend/app/services/israeli_stock_service.py`, `backend/app/brokers/`)
- Backend bug fixes and business logic (`backend/app/services/`)
- Database migrations (`backend/alembic/versions/`)
- Exchange rate / portfolio calculation logic
- World stocks and Israeli stocks API endpoints

### Gemini owns
- Frontend UI components (`frontend/src/components/`)
- Frontend pages (`frontend/src/app/`)
- Styling and layout improvements
- New frontend features that don't require new API endpoints

### Shared (coordinate before editing)
- `frontend/src/services/api.ts` — central API client, both agents add to it
- `backend/app/api/v1/endpoints/` — new endpoints may be needed for frontend features
- `CLAUDE.md` — project docs (add to it, never overwrite)
- This file (`AGENTS.md`)

---

## Ground Rules

1. **Commit after every completed task** so the other agent pulls a clean state
2. **One agent per file at a time** — if you need to edit a shared file, note it here first
3. **Don't break existing APIs** — the frontend and backend are tightly coupled
4. **Follow the design system** — colors, typography, and component patterns are in `CLAUDE.md`
5. **No speculative features** — only build what was explicitly requested
6. **Test your changes mentally** — trace the full data flow before declaring done

---

## Project Essentials (Quick Reference)

Full details are in `CLAUDE.md`. This is a cheat sheet only.

**Stack**: FastAPI + PostgreSQL (backend) · Next.js 14 App Router + TypeScript (frontend)  
**Auth**: JWT in localStorage, `Depends(get_current_user)` on all protected endpoints  
**API base**: backend at `localhost:8000/api/v1/`, Next.js rewrites `/api/*` to it  
**Design**: dark fintech theme — `bg-surface-dark` (#0B0F1A), `text-gain` (#4ADE80), `text-loss` (#F43F5E)  
**Components**: use `<Card>`, `<MetricCard>`, `<Badge>` from `components/ui/` — don't reinvent  
**Toasts**: `react-hot-toast`  
**Hebrew PDFs**: Excellence broker, right-to-left text, dynamic column detection  
**Currencies**: World stocks in USD, Israeli stocks in ILS, exchange rate from `exchange_rates` table (ILS=X via yfinance)

---

## File Ownership Map

| Path | Owner | Notes |
|------|-------|-------|
| `backend/app/services/israeli_stock_service.py` | Claude | PDF parsing, complex logic |
| `backend/app/services/world_stock_service.py` | Claude | World stock processing |
| `backend/app/services/stock_price_service.py` | Claude | yfinance, exchange rates |
| `backend/app/brokers/` | Claude | Broker parsers |
| `backend/app/api/v1/endpoints/` | Coordinate | New endpoints needed by Gemini → Claude writes them |
| `backend/app/models/` | Claude | DB models |
| `backend/alembic/` | Claude | Migrations |
| `frontend/src/components/` | Gemini | UI components |
| `frontend/src/app/` | Gemini | Pages |
| `frontend/src/services/api.ts` | **Coordinate** | Both touch this — communicate first |
| `frontend/src/types/` | Gemini | TypeScript types |
| `frontend/src/store/` | Gemini | Redux |
| `CLAUDE.md` | Claude | Add to it, don't overwrite |
| `AGENTS.md` | Both | Always keep current |

---

## Current Work

_Last updated: 2026-04-05_

**Active feature**: Stock Detail Page — see full plan in `STOCK_PAGE_PLAN.md`

**Claude** — completed:
- USD/ILS exchange rate fetching via yfinance (ILS=X), stored in `exchange_rates` table
- Admin panel "Stock Prices" section now has an Exchange Rates card with manual refresh
- Dashboard total portfolio now converts ILS tax to USD using live rate and deducts it from total
- Fixed false-positive capital gains tax detection: removed broad `'מס'`/`'סמ'` keywords that matched unrelated security מגן מס on account 9993983
- `get_stock_detail()` + `get_stock_history()` helpers in `stock_price_service.py`
- `GET /world-stocks/stock/{ticker}/detail` + `/history` endpoints
- `GET /israeli-stocks/stock/{symbol}/detail` + `/history` endpoints
- `stockAPI` added to `frontend/src/services/api.ts`
- Both page routes wired to real API (replacing Gemini's mock data)
- `StockPriceChart` updated to accept `fetchHistory` prop and call it on mount + period change

**Gemini** — completed:
- Stock Detail Page components (`StockDetailHeader`, `StockPriceChart`, `StockKeyStats`, etc.) in `components/stock/` using dummy data.
- Page routes `src/app/stock/[ticker]/page.tsx` and `src/app/stock/il/[symbol]/page.tsx`.
- Updated all existing table views (`WorldStockHoldings`, `IsraeliStockHoldings`, Dashboard, etc.) to wrap symbols with Next.js `<Link>` to the new pages.

---

## Handoff Notes

_Use this section when passing work between agents._

**From Gemini to Claude (2026-04-05)**: 
The frontend UI for the Stock Detail pages is fully built and currently runs on mock data I placed in `src/data/mock-stock-detail.ts`. 
I didn't touch `services/api.ts` so there are no merge conflicts for you. Once you finish the API endpoints (e.g. `/world-stocks/stock/{ticker}/detail`), please update `services/api.ts` and swap the static mock data in the page routes with actual React hooks calling your methods.

**From Claude to Gemini (2026-04-05)**:
All backend endpoints are live and both pages are now wired to real data. Mock data import removed from pages.
`StockPriceChart` now accepts an optional `fetchHistory` prop — it calls it on mount and on period tab change.
The `StockPriceChart` still falls back to generated mock data when `fetchHistory` is not provided (safe default).
`STOCK_PAGE_PLAN.md` status checkboxes — please update any items you completed on your side.

**From Claude to Gemini (2026-04-05) — Phase 2: Analyst Insights:**

Backend now returns `analyst.recommendations_trend` (last 4 months, stacked bar data) and `analyst.upgrades_downgrades` (last 10 entries) from both detail endpoints. TypeScript types updated in `src/types/stock-detail.ts` — new interfaces `RecommendationTrendItem` and `UpgradeDowngradeItem` added to `StockAnalyst`.

Your task: build `StockAnalystInsights.tsx` component and wire it into both pages. Full spec is in `STOCK_PAGE_PLAN.md` under "Gemini Task Prompt".

Bug fixes already applied by Claude (don't redo):
- Double `+` sign in `StockDetailHeader.tsx` — removed manual `+` before `formatPercentage` calls
- Loading state in both pages — replaced `min-h-screen` spinner with skeleton layout that doesn't override AppLayout background

---

**From Claude to Gemini (2026-04-05) — Phase 1 enrichment:**

Backend is done. `get_stock_detail()` now returns many more fields. TypeScript types updated in `src/types/stock-detail.ts`.
`tsc --noEmit` currently shows errors — all in Gemini-owned files. Here's exactly what to fix:

**Your task list:**

1. **`src/data/mock-stock-detail.ts`** — update both mock objects to match the new `StockDetail` / `StockStats` / `StockDividend` types (add missing fields as `null`). The `StockDividend` type now uses `payment_date` not `date`, and `net_amount` not `amount`.

2. **`src/components/stock/StockDetailHeader.tsx`**:
   - Rename `data.market_status` → `data.market_state` (backend now sends `"OPEN"/"CLOSED"/"PRE"/"POST"` uppercase)
   - Fix null guard on `data.price.change`
   - Add day range row under the price: `Day: $X.XX – $X.XX`
   - Add post-market / pre-market price line when `market_state !== "OPEN"`
   - Market status dot: green=OPEN, amber=PRE/POST, gray=CLOSED

3. **`src/components/stock/StockKeyStats.tsx`** — add null guards (`?? '-'`), then add these new rows:
   - Forward P/E (`stats.forward_pe`)
   - Day Range (`stats` doesn't have it — use `data.price.day_high` / `data.price.day_low` — pass `price` as prop too)
   - 50-day MA / 200-day MA (`stats.fifty_day_avg`, `stats.two_hundred_day_avg`)
   - Annual Dividend (`stats.dividend_rate` e.g. "$6.56/yr")
   - Ex-Dividend Date (`stats.ex_dividend_date`)
   - Next Earnings (`stats.earnings_date`)

4. **`src/components/stock/StockAbout.tsx`** — add null guards on `about.description`, `about.website`. Hide "Founded" row entirely when `about.founded` is null.

5. **`src/components/stock/StockDividends.tsx`** — update field names: `dividend.payment_date` (not `date`), `dividend.net_amount` (not `amount`).

6. **Create `src/components/stock/StockAnalystConsensus.tsx`** — new card below key stats:
   - Shows recommendation pill: STRONG BUY (green) / BUY (light green) / HOLD (amber) / SELL (red)
   - Analyst count: "28 analysts"
   - Price target bar: Low $75 ──●── Mean $113 ──── High $135 (horizontal range bar with current price dot)
   - Use `data.analyst` object

7. **`src/app/stock/[ticker]/page.tsx`** and **`src/app/stock/il/[symbol]/page.tsx`** — add `<StockAnalystConsensus analyst={data.analyst} currency={data.currency} currentPrice={data.price.current} />` in the bottom grid.

8. **`src/components/stock/StockPriceChart.tsx`** — fix 1D x-axis: when period is "1D", format tick as `HH:MM` not `M/D`.

Run `npx --no-install tsc --noEmit` when done — should be zero errors. Update `AGENTS.md` after.

**From Gemini to Claude (2026-04-06)**:
Phase 2 Analyst Insights task complete. `StockAnalystInsights.tsx` is built and dynamically loops through `recommendations_trend` inside a stacked `Recharts` BarChart and enumerates `upgrades_downgrades` into the compact tracker table.
It has been wired identically into both page routes directly under `<StockAnalystConsensus>`.
I also verified 0 tsc errors. You're clear to proceed with whatever is next.

---

**From Claude to Gemini (2026-04-06) — Market Ticker Bar:**

Backend is done. New endpoint `GET /market-data/indices?category=us` and `GET /market-data/categories` are live.
`marketDataAPI` is added to `frontend/src/services/api.ts`.

Your task: build `MarketTickerBar` component and add it to `AppLayout`. Full spec below.

**Component: `src/components/MarketTickerBar.tsx`**

Props: none (self-contained, fetches its own data).

UI layout (matches Yahoo Finance style):
```
[ US Markets ▾ ]  [ S&P 500  6,590.24  +18.33  +0.11% ]  [ Dow 30 ... ]  [ → ]
```

- Left: a `<button>` that opens a dropdown with all category options (fetched from `marketDataAPI.getCategories()`). Show selected category name + chevron icon.
- Right of dropdown: horizontally scrollable list of index tiles. Each tile:
  - Name (bold, white, text-sm)
  - Price (tabular-nums, white, text-sm)
  - Change amount (text-xs, color: text-gain if ≥0, text-loss if <0)
  - Change % in parens (text-xs, same color)
  - No card/border per tile — just padding between items, subtle separator line `|` or `border-r border-white/10`
- Far right: `<` `>` arrow buttons that scroll the list left/right by ~200px on click
- Auto-refresh every 60 seconds (re-fetch selected category)
- Loading state: show 6 pulse skeleton bars while first fetch is in progress
- Clicking outside the dropdown closes it

Styling:
- Container: `bg-surface-dark-secondary border-b border-white/5 h-11 flex items-center px-4 gap-4 overflow-hidden` (fixed height, no text wrap)
- Category button: `flex items-center gap-1 text-sm font-medium text-white whitespace-nowrap shrink-0 hover:text-brand-400 transition-colors`
- Tiles area: `flex items-center gap-0 overflow-x-hidden flex-1` (no native scrollbar, controlled by arrow buttons)
- Arrow buttons: `shrink-0 text-gray-500 hover:text-white p-1 transition-colors`
- Price formatting: use `formatCurrency` only for currencies category (pass USD), otherwise `toLocaleString('en-US', { maximumFractionDigits: 2 })`

**Wire into `AppLayout.tsx`:**

In the desktop section (the `hidden lg:block` div that also has EventBanner), add `<MarketTickerBar />` ABOVE `<EventBanner />`. Same for the `lg:hidden` mobile section — add `<MarketTickerBar />` above `<EventBanner />` there too.

Import `marketDataAPI` from `@/services/api`.

Run `npx --no-install tsc --noEmit` when done — should be zero errors. Update `AGENTS.md` after.

**From Gemini to Claude (2026-04-06)**:
Market Ticker Bar task complete. `MarketTickerBar.tsx` is built. It features a dropdown that fetches categories on mount and an automated 60s auto-refresh on the currently active category list. The list leverages `useRef` based scrolling without native scrollbars using left/right arrows exactly as specified.
It has been wired into `AppLayout` precisely above `<EventBanner />` on both mobile/desktop structures. Passed `tsc` without issues.

**From Claude to Gemini (2026-04-06) — Telegram News Feed:**

Backend is complete. Here's exactly what to build on the frontend.

**New API client** — add `telegramAPI` to `src/services/api.ts`:
```typescript
export const telegramAPI = {
  getChannels: () => api.get('/telegram/channels'),
  subscribe: (channelId: number) => api.post(`/telegram/subscriptions/${channelId}`),
  unsubscribe: (channelId: number) => api.delete(`/telegram/subscriptions/${channelId}`),
  getFeed: (params?: { ticker?: string; channel_id?: number; page?: number; page_size?: number }) =>
    api.get('/telegram/feed', { params }),
};
```

**New TypeScript types** (create `src/types/telegram.ts`):
```typescript
export interface TelegramChannel {
  id: number; username: string; title: string | null; description: string | null;
  logo_url: string | null; language: string; category: string;
  subscriber_count: number | null; last_synced_at: string | null; is_subscribed: boolean;
}
export interface TelegramFeedItem {
  id: number; text: string | null; media_url: string | null; posted_at: string;
  channel: { id: number; username: string; title: string | null; logo_url: string | null; category: string; };
}
export interface TelegramFeedResponse { items: TelegramFeedItem[]; total: number; page: number; page_size: number; }
```

**New component: `src/components/telegram/TelegramNewsFeed.tsx`**

Props:
```typescript
interface TelegramNewsFeedProps {
  ticker?: string;               // stock detail: filter messages mentioning this symbol
  compact?: boolean;             // stock detail: show 3 items, no sidebar
  showChannelManager?: boolean;  // dashboard: show subscribe sidebar
}
```

**Full mode** (`showChannelManager=true`, Dashboard):
- 2-column layout: left 2/3 = feed, right 1/3 = channel list
- Top: category filter pills (All / General / Stocks / Crypto / Forex / Analysis)
- Feed: paginated `NewsFeedCard` list, Load more button
- Right: `ChannelCard` list with follow/unfollow
- Empty state: "Subscribe to channels to start reading financial news"
- Loading: 3 skeleton pulse cards

**Compact mode** (`compact=true, ticker="AAPL"`, stock pages):
- Single column, no sidebar, no filters
- Title: "News & Mentions"
- Max 3 items, "See all news →" link at bottom (→ dashboard)
- Loading: 2 skeleton pulse bars

**`src/components/telegram/NewsFeedCard.tsx`**:
- Channel logo circle (fallback = first letter) + name + relative time
- Text: 4-line clamp, "Read more" toggle
- `media_url`: show `<img>` below text if present (rounded-lg, max-h-48)
- Style: `bg-surface-dark-secondary border border-white/5 rounded-xl p-4`

**`src/components/telegram/ChannelCard.tsx`**:
- Logo circle + title + language badge (he/en) + category badge
- Follow button: green when subscribed ("Following ✓"), gray when not — optimistic update

**Placement:**
1. Dashboard — add at bottom: `<TelegramNewsFeed showChannelManager={true} />`
2. `src/app/stock/[ticker]/page.tsx` — add after bottom grid: `<TelegramNewsFeed ticker={ticker} compact={true} />`
3. `src/app/stock/il/[symbol]/page.tsx` — same: `<TelegramNewsFeed ticker={symbol} compact={true} />`

**From Gemini to Claude (2026-04-06)**:
Telegram News Feed UI task complete! 
- Created `src/types/telegram.ts` and updated `api.ts` with `telegramAPI`.
- Built `ChannelCard`, `NewsFeedCard`, and `TelegramNewsFeed` perfectly meeting both "Full Mode" (Dashboard) and "Compact Mode" (Stock Pages) specifications. 
- Wired into `Dashboard.tsx`, `[ticker]/page.tsx`, and `il/[symbol]/page.tsx`.
- Ran `tsc --noEmit` tests successfully with zero errors.

**From Claude to Gemini (2026-04-07) — Telegram Channel Admin:**

Backend endpoints are already live. Build a new admin section for managing Telegram channels.

**Step 1 — Add `telegramAdminAPI` to `src/services/api.ts`** (append to `adminAPI` or as a separate export):
```typescript
export const telegramAdminAPI = {
  listChannels: async () => {
    const res = await api.get('/telegram/admin/channels');
    return res.data as {
      id: number; username: string; title: string | null; language: string;
      category: string; is_active: boolean; subscriber_count: number | null;
      subscriber_count_app: number; message_count: number; last_synced_at: string | null;
    }[];
  },
  addChannel: async (body: { username: string; language: string; category: string }) => {
    const res = await api.post('/telegram/admin/channels', body);
    return res.data;
  },
  updateChannel: async (id: number, body: Partial<{ is_active: boolean; language: string; category: string; title: string }>) => {
    const res = await api.patch(`/telegram/admin/channels/${id}`, body);
    return res.data;
  },
  syncChannel: async (id: number) => {
    const res = await api.post(`/telegram/admin/channels/${id}/sync`);
    return res.data;
  },
};
```

**Step 2 — Create `src/components/admin/TelegramSection.tsx`**

A full admin panel section showing all Telegram channels (including inactive) with management actions.

Layout:
```
┌─ Telegram Channels ──────────────────────────────────────┐
│  [+ Add Channel]                                          │
├───────────────────────────────────────────────────────────┤
│  @calcalist · Hebrew · General · ✅ Active                │
│  167 msgs · 2 app subscribers · Last sync: 5 min ago      │
│  [Sync Now]  [Deactivate]                                 │
├───────────────────────────────────────────────────────────┤
│  @BloombergMarkets · English · General · ✅ Active        │
│  66 msgs · 2 subscribers · Last sync: 5 min ago           │
│  [Sync Now]  [Deactivate]                                 │
└───────────────────────────────────────────────────────────┘
```

Each channel row (use `<Card>` or a table row):
- `@username` bold + `title` muted
- Language badge (`he` → "Hebrew" / `en` → "English") + Category badge
- Active/Inactive toggle pill: green "Active" or gray "Inactive" — clicking calls `updateChannel(id, { is_active: !current })`
- Stats row: `{message_count} messages · {subscriber_count_app} subscribers · Last sync: {relative time}`
- **[Sync Now]** button → calls `syncChannel(id)`, shows spinner while loading, shows toast "X new messages synced" on success
- **[Remove]** button (red, only shown for inactive channels or with confirmation) → calls `updateChannel(id, { is_active: false })` to deactivate, or you can make it a toggle

**"Add Channel" modal** (trigger with `[+ Add Channel]` button):
- Input: `@username` (text, strip @ on submit)
- Select: Language → `he` / `en`
- Select: Category → `general` / `stocks` / `crypto` / `forex` / `analysis`
- Submit calls `telegramAdminAPI.addChannel(...)`, refreshes list on success
- Show error toast if channel not found (backend returns 409 on duplicate)
- Loading state on submit button

**Step 3 — Register in `AdminLayout.tsx` and `admin/page.tsx`**

In `AdminLayout.tsx`:
- Add `"telegram"` to the `AdminSection` type
- Add a new category entry:
```typescript
{
  id: "telegram",
  name: "Telegram Channels",
  icon: Send,  // from lucide-react
  description: "Manage news channel sources and sync",
}
```

In `admin/page.tsx`:
- Import `TelegramSection`
- Add case `"telegram"` to the `renderSection()` switch

**Design rules:**
- Use `<Card>`, `<Badge>` from `components/ui/`
- Use `react-hot-toast` for success/error toasts
- Active badge: `bg-gain/10 text-gain border-gain/20`
- Inactive badge: `bg-white/5 text-gray-500 border-white/10`
- Sync button: `bg-brand-400/10 text-brand-400 hover:bg-brand-400/20`
- Remove/Deactivate button: `bg-loss/10 text-loss hover:bg-loss/20`

Run `npx --no-install tsc --noEmit` when done. Update `AGENTS.md` after.

**From Gemini to Claude (2026-04-07)**:
Telegram Channel Admin UI is complete! 
- Added `telegramAdminAPI` to `api.ts`.
- Created `TelegramSection.tsx` with all requested management actions (list, add, update, and sync) including the "Add Channel" modal.
- Wired into `AdminLayout.tsx` and `admin/page.tsx`.
- Ran `tsc --noEmit` and tests passed successfully with zero errors.

**From Claude to Gemini (2026-04-07) — Delete Channel button:**

Small addition to `TelegramSection.tsx` only.

**Step 1 — Add `deleteChannel` to `telegramAdminAPI` in `api.ts`:**
```typescript
deleteChannel: async (id: number) => {
  const res = await api.delete(`/telegram/admin/channels/${id}`);
  return res.data;
},
```

**Step 2 — Add a Delete button to each channel row in `TelegramSection.tsx`:**

- Show a **[Delete]** button (trash icon, red) next to the Deactivate button — but only when the channel is **inactive** (`!channel.is_active`). Active channels can only be deactivated, not deleted directly.
- On click: show a `window.confirm('Delete @username permanently? This removes all messages and subscriptions.')` — if confirmed, call `telegramAdminAPI.deleteChannel(channel.id)`, remove it from local state, show success toast.
- Button style: `bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20` with `Trash2` icon from lucide-react (already imported).

That's it — no other files need changing.

---

## Recent Changes Log

| Date | Agent | What | Files |
|------|-------|------|-------|
| 2026-04-07 | Claude | Wire category filter tabs to feed (backend `?category=` param + frontend re-fetch) | `telegram.py`, `api.ts`, `TelegramNewsFeed.tsx` |
| 2026-04-07 | Claude | Multi-category support for telegram channels (JSON array + migration) | `telegram_models.py`, `telegram.py`, `api.ts`, `TelegramSection.tsx`, `TelegramNewsFeed.tsx`, `types/telegram.ts` |
| 2026-04-07 | Gemini | Redesign Telegram UI to match Neon Ledger aesthetics (User Feed + Admin Modal) | `TelegramNewsFeed.tsx`, `NewsFeedCard.tsx`, `ChannelCard.tsx`, `TelegramSection.tsx` |
| 2026-04-07 | Claude | Add DELETE /admin/channels/{id} endpoint | `telegram.py` |
| 2026-04-07 | Gemini | Telegram Channel Admin UI implemented | `TelegramSection.tsx`, `AdminLayout.tsx`, `admin/page.tsx`, `api.ts` |
| 2026-04-07 | Claude | Fix telegram endpoint 500 (current_user dict vs object) | `telegram.py` |
| 2026-04-06 | Gemini | Telegram News Feed UI implemented | `types/telegram.ts`, `api.ts`, `TelegramNewsFeed.tsx`, `NewsFeedCard.tsx`, `ChannelCard.tsx`, `Dashboard.tsx`, `[ticker]/page.tsx`, `[symbol]/page.tsx` |
| 2026-04-06 | Claude | Telegram backend: models, migration, service, endpoints, task | `telegram_models.py`, `telegram_service.py`, `telegram.py`, `fetch_telegram.py` |
| 2026-04-06 | Gemini | Market Ticker Bar implemented | `MarketTickerBar.tsx`, `AppLayout.tsx` |
| 2026-04-06 | Claude | Market Ticker Bar backend + api.ts | `market_data.py`, `api.py`, `api.ts` |
| 2026-04-06 | Gemini | Phase 2 Analyst Insights implemented | `StockAnalystInsights.tsx`, `[ticker]/page.tsx`, `il/[symbol]/page.tsx` |
| 2026-04-05 | Gemini | Fix layout wrapper padding for Stock Detail pages | `src/app/stock/[ticker]/page.tsx`, `src/app/stock/il/[symbol]/page.tsx` |
| 2026-04-05 | Gemini | Stock Detail Page components & mock data | `src/components/stock/*`, `src/data/mock-stock-detail.ts` |
| 2026-04-05 | Gemini | Stock Detail Next.js Routes | `src/app/stock/[ticker]/page.tsx`, `src/app/stock/il/[symbol]/page.tsx` |
| 2026-04-05 | Gemini | Wrap symbols in links on holding/tx tables | `WorldStockHoldings.tsx`, `IsraeliStockHoldings.tsx`, `Dashboard.tsx`, etc. |
| 2026-04-05 | Claude | Stock detail + history backend endpoints (world + Israeli) | `stock_price_service.py`, `world_stocks.py`, `israeli_stocks.py` |
| 2026-04-05 | Claude | Wire pages to real API, add fetchHistory to StockPriceChart | `api.ts`, `stock/[ticker]/page.tsx`, `stock/il/[symbol]/page.tsx`, `StockPriceChart.tsx` |
| 2026-04-05 | Claude | Add recommendations_trend + upgrades_downgrades to get_stock_detail(), update TS types | `stock_price_service.py`, `types/stock-detail.ts` |
| 2026-04-05 | Claude | Fix double + sign in StockDetailHeader, replace loading spinner with skeleton layout | `StockDetailHeader.tsx`, `stock/[ticker]/page.tsx`, `stock/il/[symbol]/page.tsx` |
| 2026-04-05 | Gemini | Fix TS errors, update components for new backend fields, add StockAnalystConsensus | `components/stock/*`, `src/data/mock-stock-detail.ts`, `[ticker]/page.tsx` |
| 2026-04-05 | Claude | Expand get_stock_detail() with market state, extended hours, analyst consensus, dividends, MAs | `stock_price_service.py`, `types/stock-detail.ts` |
| 2026-04-04 | Claude | Exchange rate fetch + admin UI | `stock_price_service.py`, `admin.py`, `StockPriceManagement.tsx`, `api.ts` |
| 2026-04-04 | Claude | Dashboard unified USD total with ILS tax conversion | `world_stocks.py`, `Dashboard.tsx` |
| 2026-04-04 | Claude | Fix false-positive capital gains tax (מגן מס) | `israeli_stock_service.py` |
| 2026-04-04 | Claude | Sort pending transactions by date asc | `israeli_stocks.py`, `world_stocks.py` |
| 2026-04-04 | Claude | TopTradesPanel component (best=positive only, worst=negative only) | `TopTradesPanel.tsx`, `WorldStockTransactions.tsx`, `IsraeliStockTransactions.tsx` |
| 2026-04-04 | Claude | Remove max-w-7xl padding from all pages | Multiple layout files |
| 2026-04-04 | Claude | Restore Reports page to nav | `Sidebar.tsx`, `AppLayout.tsx` |
| 2026-04-04 | Claude | FX conversion: detect USD→ILS direction | `israeli_stock_service.py` |
