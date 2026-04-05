# Stock Detail Page — Implementation Plan

## Overview

A unified stock detail page reachable via `/stock/[ticker]` (world stocks, e.g. `/stock/AAPL`)
and `/stock/il/[symbol]` (Israeli stocks, e.g. `/stock/il/TEVA`).

Every stock symbol appearing anywhere in the app becomes a clickable link to this page.
The page blends market data (from yfinance) with personal portfolio context (from our DB).

Reference designs: Yahoo Finance + Investing.com — but darker, more minimal, portfolio-first.

---

## Page Layout (Desktop: 3-column, Mobile: stacked)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo · Name · Ticker · Exchange · Sector badge · Market status │
│  Price · Change (+/-) · Change% · Currency                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐  ┌────────────────────────────────┐
│  PRICE CHART (recharts)          │  │  YOUR POSITION (if held)       │
│  1D / 1W / 1M / 3M / 1Y / ALL   │  │  Shares · Avg cost · P/L       │
│  Candlestick or area line        │  │  Current value · Return %      │
└──────────────────────────────────┘  └────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────────┐
│  KEY STATS  │  │  ABOUT      │  │  YOUR TRANSACTIONS (this stock)  │
│  Mkt cap    │  │  Description│  │  Date · Type · Qty · Price · P/L │
│  P/E ratio  │  │  CEO        │  │                                  │
│  Div yield  │  │  Employees  │  └──────────────────────────────────┘
│  52w hi/lo  │  │  Founded    │
│  Avg vol    │  │  Website    │  ┌──────────────────────────────────┐
│  Beta       │  └─────────────┘  │  DIVIDENDS RECEIVED              │
└─────────────┘                   │  Date · Amount · Per share       │
                                  └──────────────────────────────────┘
```

---

## Routes

| Route | Market | Example |
|-------|--------|---------|
| `/stock/[ticker]` | World (USD) | `/stock/AAPL` |
| `/stock/il/[symbol]` | Israeli (ILS) | `/stock/il/TEVA` |

Both map to the same page component with a `market` prop.

---

## Data Sources

### From yfinance (fetched fresh on page load via backend)
- Current price, day change, day change %
- 52-week high/low
- Market cap, P/E ratio, EPS, dividend yield, beta, average volume
- Company description, CEO, employees, founded year, website, industry
- Historical OHLCV for chart (1D/1W/1M/3M/1Y periods)

### From our DB (existing data)
- User's holdings: quantity, purchase_cost, average cost/share, current value, unrealized P/L
- All transactions for this stock (BUY/SELL/DIVIDEND)
- Dividends received
- Logo (logo_url / logo_svg from world_stocks or israeli_stocks table)

---

## Backend Work — Claude owns

### New endpoints to add to `world_stocks.py` and `israeli_stocks.py`

#### 1. `GET /world-stocks/stock/{ticker}/detail`
Returns everything in one call:
```json
{
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "exchange": "NASDAQ",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "logo_url": "...",
  "currency": "USD",
  "market_status": "open|closed|pre|after",
  "price": { "current": 255.92, "change": 0.29, "change_pct": 0.11, "previous_close": 255.63 },
  "stats": {
    "market_cap": 3900000000000,
    "pe_ratio": 32.1,
    "eps": 6.43,
    "dividend_yield": 0.52,
    "beta": 1.24,
    "week_52_high": 260.10,
    "week_52_low": 169.21,
    "avg_volume": 58000000
  },
  "about": {
    "description": "Apple Inc. designs...",
    "employees": 150000,
    "website": "https://apple.com",
    "ceo": "Tim Cook",
    "founded": 1976
  },
  "portfolio": {
    "held": true,
    "quantity": 11.0,
    "purchase_cost": 2372.14,
    "avg_cost_per_share": 215.65,
    "current_value": 2815.12,
    "unrealized_pl": 442.98,
    "unrealized_pl_pct": 18.67
  },
  "transactions": [
    { "id": 1, "date": "2024-02-05", "type": "BUY", "quantity": 11, "price": 185.85, "total": 2372.14, "realized_pl": null }
  ],
  "dividends": [
    { "id": 1, "date": "2024-02-15", "amount": 2.79, "per_share": 0.24 }
  ]
}
```

#### 2. `GET /world-stocks/stock/{ticker}/history?period=1M`
Returns OHLCV for chart rendering:
```json
{
  "ticker": "AAPL",
  "period": "1M",
  "data": [
    { "date": "2024-03-01", "open": 179.00, "high": 182.50, "low": 178.20, "close": 181.40, "volume": 55000000 }
  ]
}
```

**Periods**: `1D`, `1W`, `1M`, `3M`, `1Y`, `ALL`  
**yfinance mapping**: `1d/5m`, `5d/15m`, `1mo/1d`, `3mo/1d`, `1y/1d`, `5y/1wk`

#### 3. `GET /israeli-stocks/stock/{symbol}/detail`
Same structure as world, but:
- Currency: ILS
- Price in ILS (not agorot — already fixed)
- yfinance ticker: `symbol + ".TA"`

#### 4. `GET /israeli-stocks/stock/{symbol}/history?period=1M`
Same as world history endpoint.

### yfinance fields to extract (in a new `get_stock_detail()` helper in `stock_price_service.py`)
```python
t = yf.Ticker(ticker)
info = t.info  # full metadata
fast = t.fast_info  # lightweight, fast
hist = t.history(period="1mo", interval="1d")  # chart data
```

Key `info` fields: `longBusinessSummary`, `fullTimeEmployees`, `website`, `companyOfficers`,
`marketCap`, `trailingPE`, `trailingEps`, `dividendYield`, `beta`, `fiftyTwoWeekHigh`,
`fiftyTwoWeekLow`, `averageVolume`, `industry`, `sector`

---

## Frontend Work — Gemini owns

### New files to create

#### `frontend/src/app/stock/[ticker]/page.tsx`
World stock detail page (dynamic route).

#### `frontend/src/app/stock/il/[symbol]/page.tsx`
Israeli stock detail page.

#### `frontend/src/components/stock/StockDetailHeader.tsx`
Logo, name, ticker, exchange badge, sector badge, market status dot (green=open/yellow=pre/gray=closed), price, change.

#### `frontend/src/components/stock/StockPriceChart.tsx`
Recharts `ComposedChart` with area fill. Period selector tabs: 1D · 1W · 1M · 3M · 1Y · ALL.
Fetches `/stock/{ticker}/history?period=X` on tab change.
Show volume bars at bottom (smaller, muted).

#### `frontend/src/components/stock/StockKeyStats.tsx`
Grid of stats cards: Market Cap · P/E · EPS · Div Yield · Beta · 52W High · 52W Low · Avg Volume.
Format large numbers: `$3.9T`, `$58M`, etc.

#### `frontend/src/components/stock/StockAbout.tsx`
Company description (truncated, "Read more" toggle), website link, employees, founded.

#### `frontend/src/components/stock/StockYourPosition.tsx`
Only shown if `portfolio.held === true`.
Shows: Shares held · Avg cost · Current value · Unrealized P/L (color coded gain/loss).
Use `MetricCard` component from `components/ui/MetricCard`.

#### `frontend/src/components/stock/StockTransactionHistory.tsx`
Table of user's transactions for this stock. Columns: Date · Type badge · Shares · Price · Total · Realized P/L.
Type badges: BUY=green, SELL=red, DIVIDEND=blue.

#### `frontend/src/components/stock/StockDividends.tsx`
Table of dividends received. Columns: Ex-Date · Payment Date · Amount · Per Share.

### Modify existing files (Gemini)

Make all stock symbols clickable — wrap them in `<Link href="/stock/TICKER">` or `<Link href="/stock/il/SYMBOL">`:

- `frontend/src/components/WorldStockHoldings.tsx` — ticker column
- `frontend/src/components/WorldStockTransactions.tsx` — symbol column  
- `frontend/src/components/IsraeliStockHoldings.tsx` — symbol column
- `frontend/src/components/IsraeliStockTransactions.tsx` — symbol column
- `frontend/src/components/Dashboard.tsx` — holdings table symbol column

### Add API calls (Gemini edits `api.ts`)
```typescript
stockAPI: {
  getWorldDetail: (ticker: string) => api.get(`/world-stocks/stock/${ticker}/detail`),
  getWorldHistory: (ticker: string, period: string) => api.get(`/world-stocks/stock/${ticker}/history?period=${period}`),
  getIsraeliDetail: (symbol: string) => api.get(`/israeli-stocks/stock/${symbol}/detail`),
  getIsraeliHistory: (symbol: string, period: string) => api.get(`/israeli-stocks/stock/${symbol}/history?period=${period}`),
}
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
- Header skeleton: pulse bars for name and price
- Chart: `<Loader2 className="animate-spin" />` centered
- Stats/about: pulse grid

### Back navigation
Arrow button top-left: `← Back` goes to `-1` in router history (works from any entry point).

---

## Parallel Work Split

### Claude does first (backend, ~2 tasks):
1. `get_stock_detail()` helper in `stock_price_service.py` — calls yfinance, returns structured dict
2. `GET /world-stocks/stock/{ticker}/detail` + `/history` endpoints in `world_stocks.py`
3. `GET /israeli-stocks/stock/{symbol}/detail` + `/history` endpoints in `israeli_stocks.py`

### Gemini does in parallel (frontend, ~3 tasks):
1. Create page routes + skeleton layout (`app/stock/[ticker]/page.tsx`, `app/stock/il/[symbol]/page.tsx`)
2. Build `StockDetailHeader`, `StockKeyStats`, `StockAbout`, `StockYourPosition` components with mock/placeholder data
3. Build `StockPriceChart`, `StockTransactionHistory`, `StockDividends` components

### Then converge (both):
4. Claude: wire up `api.ts` additions (shared file — Claude does this pass to avoid conflict)
5. Gemini: replace placeholder data with real API calls
6. Gemini: add `<Link>` wrappers to all existing symbol columns

---

## File Ownership During This Feature

| File | Owner |
|------|-------|
| `stock_price_service.py` | Claude |
| `world_stocks.py` | Claude |
| `israeli_stocks.py` | Claude |
| `app/stock/[ticker]/page.tsx` | Gemini |
| `app/stock/il/[symbol]/page.tsx` | Gemini |
| `components/stock/*.tsx` (all new) | Gemini |
| `services/api.ts` | Claude (step 4) |
| Existing holdings/transactions components | Gemini (link-wrapping only) |

---

## Open Questions (decide before starting)

1. **Chart type**: Area line (simpler, like Yahoo Finance mobile) or candlestick (more pro)?
   → Recommend: area line for MVP, candlestick later
2. **1D data**: yfinance 1D with 5-min intervals is unreliable outside US market hours — show last-close flat line with a note?
3. **Israeli stocks**: some may have no yfinance data (delisted, small cap) — graceful fallback to just our DB data

---

## Status

- [ ] Backend: `get_stock_detail()` helper (Claude)
- [ ] Backend: world detail + history endpoints (Claude)
- [ ] Backend: Israeli detail + history endpoints (Claude)
- [ ] Frontend: page routes + layout skeleton (Gemini)
- [ ] Frontend: header + stats + about + position components (Gemini)
- [ ] Frontend: chart + transactions + dividends components (Gemini)
- [ ] Frontend: `api.ts` additions (Claude)
- [ ] Frontend: wire real data into components (Gemini)
- [ ] Frontend: add links to all symbol columns (Gemini)
