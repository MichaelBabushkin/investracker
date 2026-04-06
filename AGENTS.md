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

---

## Recent Changes Log

| Date | Agent | What | Files |
|------|-------|------|-------|
| 2026-04-05 | Gemini | Fix layout wrapper padding for Stock Detail pages | `src/app/stock/[ticker]/page.tsx`, `src/app/stock/il/[symbol]/page.tsx` |
| 2026-04-05 | Gemini | Stock Detail Page components & mock data | `src/components/stock/*`, `src/data/mock-stock-detail.ts` |
| 2026-04-05 | Gemini | Stock Detail Next.js Routes | `src/app/stock/[ticker]/page.tsx`, `src/app/stock/il/[symbol]/page.tsx` |
| 2026-04-05 | Gemini | Wrap symbols in links on holding/tx tables | `WorldStockHoldings.tsx`, `IsraeliStockHoldings.tsx`, `Dashboard.tsx`, etc. |
| 2026-04-05 | Claude | Stock detail + history backend endpoints (world + Israeli) | `stock_price_service.py`, `world_stocks.py`, `israeli_stocks.py` |
| 2026-04-05 | Claude | Wire pages to real API, add fetchHistory to StockPriceChart | `api.ts`, `stock/[ticker]/page.tsx`, `stock/il/[symbol]/page.tsx`, `StockPriceChart.tsx` |
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
