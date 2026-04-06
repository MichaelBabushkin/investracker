# Stock Detail Page — Implementation Plan

## Overview

A unified stock detail page reachable via `/stock/[ticker]` (world stocks, e.g. `/stock/AAPL`)
and `/stock/il/[symbol]` (Israeli stocks, e.g. `/stock/il/TEVA`).

Every stock symbol appearing anywhere in the app becomes a clickable link to this page.
The page blends market data (from yfinance) with personal portfolio context (from our DB).

Reference designs: Yahoo Finance + Investing.com — but darker, more minimal, portfolio-first.

---

## ✅ Completed

### Backend (Claude)
- [x] `get_stock_detail()` helper in `stock_price_service.py` — yfinance metadata, market state, analyst, MAs, dividends, earnings, extended hours
- [x] `get_stock_history()` helper — OHLCV with period/interval mapping
- [x] `GET /world-stocks/stock/{ticker}/detail` + `/history` endpoints
- [x] `GET /israeli-stocks/stock/{symbol}/detail` + `/history` endpoints
- [x] `recommendations_trend` (last 4 months) added to analyst object
- [x] `upgrades_downgrades` (last 10) added to analyst object

### Frontend (Gemini + Claude)
- [x] Page routes `app/stock/[ticker]/page.tsx` + `app/stock/il/[symbol]/page.tsx`
- [x] `StockDetailHeader` — logo, name, ticker, exchange, sector, market state dot, price, change, day range, post-market
- [x] `StockPriceChart` — recharts area chart, 1D/1W/1M/3M/1Y/ALL periods, 1D x-axis as HH:MM
- [x] `StockKeyStats` — all stats with null guards, forward PE, MAs, annual dividend, ex-div date, earnings date
- [x] `StockAbout` — description with Read more toggle, CEO/employees/founded/website
- [x] `StockYourPosition` — shown only when `portfolio.held === true`
- [x] `StockTransactionHistory` — BUY/SELL/DIVIDEND badges, all columns
- [x] `StockDividends` — payment_date, net_amount, per_share
- [x] `StockAnalystConsensus` — recommendation pill, analyst count, price target range bar
- [x] All stock symbols wrapped in `<Link>` across holdings/transactions tables
- [x] `api.ts` wired to real endpoints (`stockAPI.getWorldDetail` etc.)
- [x] Mock data removed from pages (real API only)

### Bug fixes (Claude)
- [x] Double `+` sign on change_pct — `formatPercentage` already adds `+`, removed manual prefix
- [x] Loading state flashing sidebar — replaced `min-h-screen bg-surface-dark` spinner with skeleton layout

---

## 🔜 Remaining Work

### Claude — in progress / pending

None currently.

### Gemini — next tasks

See the exact prompt below to copy to Gemini.

---

## Gemini Task Prompt (copy-paste)

```
Hey Gemini. The stock detail page is live and working. Here's the next batch of frontend tasks for you.

### Context
- Backend already returns `analyst.recommendations_trend` (array of last 4 months) and `analyst.upgrades_downgrades` (last 10 entries) from the `/detail` endpoint.
- TypeScript types are already updated in `src/types/stock-detail.ts`:
  - `RecommendationTrendItem` — { period, strong_buy, buy, hold, sell, strong_sell }
  - `UpgradeDowngradeItem` — { date, firm, to_grade, from_grade, action }
  - `StockAnalyst` now includes `recommendations_trend: RecommendationTrendItem[]` and `upgrades_downgrades: UpgradeDowngradeItem[]`

### Task 1 — Create `src/components/stock/StockAnalystInsights.tsx`

A new card component placed BELOW the existing `StockAnalystConsensus` card (in the left column of the bottom grid, inside the `space-y-6` div).

Props:
```typescript
interface StockAnalystInsightsProps {
  analyst: StockAnalyst;
}
```

The card has 2 sections separated by a divider:

**Section A — Recommendation Trend (stacked bar chart)**
- Title: "Recommendation Trend"
- Use Recharts `BarChart` with stacked bars
- X-axis: period labels — map "0m" → "Current", "-1m" → "1M ago", "-2m" → "2M ago", "-3m" → "3M ago"
- 5 stacked bar series with these colors:
  - strong_buy: #4ADE80 (text-gain)
  - buy: #86EFAC (lighter green)
  - hold: #F59E0B (text-warn)
  - sell: #FB923C (orange)
  - strong_sell: #F43F5E (text-loss)
- Each bar segment tooltip shows the count
- Legend below chart: small colored squares + labels
- Chart height: 160px
- If `recommendations_trend` is empty, show a muted "No trend data available" text instead

**Section B — Upgrades & Downgrades**
- Title: "Recent Rating Changes"
- A compact table (no Card wrapper, just the inner content):
  - Columns: Date | Firm | Action | To Grade | From Grade
  - Action badge: "Upgrade" (green) / "Downgrade" (red) / "Initiated" (blue) / "Maintained" (gray) / "Reiterated" (gray)
  - Map `action` field: "up" → "Upgrade", "down" → "Downgrade", "init" → "Initiated", "main" → "Maintained", "reit" → "Reiterated"
  - Font size: text-xs for all cells
  - Max 8 rows shown
- If `upgrades_downgrades` is empty, show muted "No recent rating changes" text

Return null if both arrays are empty.

### Task 2 — Wire it into both pages

In `src/app/stock/[ticker]/page.tsx` and `src/app/stock/il/[symbol]/page.tsx`:
- Import `StockAnalystInsights`
- Add `<StockAnalystInsights analyst={data.analyst} />` below `<StockAnalystConsensus .../>` in the left-column `space-y-6` div

### Task 3 — Fix `src/data/mock-stock-detail.ts`

The mock file already has `recommendations_trend: []` and `upgrades_downgrades: []`. No change needed — it's already been updated.

### Design rules
- Use `<Card>` + `<CardHeader>` + `<CardTitle>` from `components/ui/Card`
- Dark fintech theme: `bg-surface-dark-secondary`, `border-white/10`
- Colors: `text-gain` (#4ADE80), `text-loss` (#F43F5E), `text-warn` (#F59E0B)
- recharts is already in the project (used by StockPriceChart)

Run `npx --no-install tsc --noEmit` when done — should be zero errors.
Update `AGENTS.md` after.
```

---

## Design Spec

Follow `CLAUDE.md` design system throughout.

### Color usage
- Price up: `text-gain` (#4ADE80)
- Price down: `text-loss` (#F43F5E)
- Market open dot: `bg-gain`
- Market closed dot: `bg-gray-500`
- Pre/after hours dot: `bg-warn` (#F59E0B)
- BUY badge: `bg-gain/10 text-gain border-gain/20`
- SELL badge: `bg-loss/10 text-loss border-loss/20`
- DIVIDEND badge: `bg-info/10 text-info border-info/20`
- Chart area fill: gradient from `#4ADE80` (top) to transparent (bottom)
- Chart line: `#4ADE80` (world) / `#3B82F6` (Israeli)

### Layout
- Desktop: header full-width, then `grid-cols-3` (chart spans 2, position spans 1), then `grid-cols-3` (stats · about · transactions+dividends)
- Mobile: everything stacked single column
- Card wrapper: `bg-surface-dark-secondary rounded-xl border border-white/10 p-6`

### Loading states
- Skeleton layout (no full-screen background override — AppLayout provides it)
- Pulse animation matching page structure
