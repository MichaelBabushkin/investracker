# Technical Indicators — Implementation Plan

Add industry-standard technical indicators to the single-stock pages
(`/stock/[ticker]` for world, `/stock/il/[symbol]` for TA) so entry/exit
decisions get technical context: chart overlays, oscillator sub-panels, and a
plain-language signal summary.

## Scope & principles

- **Data source**: `stock_price_history` daily closes (already cached, ILS for
  israeli / USD for world). Phase 1 uses closes only — no new fetching.
- **Computation**: backend, pure Python over the cached series. One endpoint
  returns the full indicator pack for a ticker; frontend only renders.
- **Interpretation included**: every indicator ships with its state
  (bullish / bearish / neutral) so the UI can show a signal strip, not just
  raw lines.
- Indicators are timing refinements, not oracles — UI copy should reflect
  "3 of 5 lean bullish", never "BUY NOW".

## Indicator set (Phase 1 — daily closes)

| Indicator | Params | Signal logic |
|---|---|---|
| SMA | 20 / 50 / **150** / 200 | price vs MA; 50↑200 golden cross, 50↓200 death cross; 150 as swing-trader trend line |
| EMA | 9 / 21 | faster trend for shorter-horizon context |
| RSI | 14 | >70 overbought · <30 oversold · 50 midline direction |
| MACD | 12 / 26 / 9 | MACD×signal crossovers; histogram momentum fading/building |
| Bollinger Bands | 20, 2σ | price vs bands; bandwidth squeeze detection |
| 52-week levels | high / low | distance from 52w high/low; near-high breakout / near-low context |

Phase 2 (needs OHLCV columns): ATR(14) for stop/position sizing, volume + OBV
for move confirmation.

---

## Checklist

### 1. Backend — indicator engine
- [x] `backend/app/services/technical_indicators.py`
  - [x] `sma(series, n)` for n = 20, 50, 150, 200
  - [x] `ema(series, n)` for n = 9, 21 (+ internal use by MACD)
  - [x] `rsi(series, 14)` (Wilder smoothing)
  - [x] `macd(series, 12, 26, 9)` → macd line, signal line, histogram
  - [x] `bollinger(series, 20, 2)` → upper / mid / lower, bandwidth
  - [x] 52-week high/low from the series
  - [x] Per-indicator **state classifier** → `bullish | bearish | neutral` + short human text (e.g. "RSI 28 — oversold")
  - [x] Composite summary: counts of bullish/bearish/neutral signals
- [x] Endpoint `GET /portfolio/stock-indicators?symbol&market&period=1y`
  - [x] Resolve yfinance ticker (israeli: `israeli_stocks.yfinance_ticker` / symbol+`.TA`)
  - [x] `ensure_coverage` for the ticker (need ≥200 trading days of history + selected display window)
  - [x] Response: `{ series: [{date, close, sma20, sma50, sma150, sma200, bb_upper, bb_lower, rsi, macd, macd_signal, macd_hist}], levels: {high_52w, low_52w}, signals: [{id, label, state, detail}], summary }`
  - [x] Nulls for warm-up rows (first N days of each window) — frontend skips
- [x] Verify numbers against a known source (spot-check IBM RSI/SMA vs TradingView)

### 2. Frontend — API + types
- [x] `api.ts`: `portfolioAPI.getStockIndicators(symbol, market, period)` + `StockIndicators` types

### 3. Frontend — chart components
- [x] `components/indicators/PriceWithOverlays.tsx`
  - [x] Price line + SMA 20/50/150/200 overlays (toggleable, distinct colors)
  - [x] Bollinger band area (translucent fill between upper/lower)
  - [x] 52w high/low reference lines
  - [x] Overlay toggle chips (each MA + BB on/off)
- [x] `components/indicators/RsiPanel.tsx` — RSI line, 30/70 guide bands, shaded OB/OS zones
- [x] `components/indicators/MacdPanel.tsx` — histogram bars (green/red) + MACD/signal lines
- [x] Shared x-axis alignment across the three charts (same dates, same margins)

### 4. Frontend — signal summary strip
- [x] `components/indicators/SignalStrip.tsx`
  - [x] One chip per indicator: colored dot (green/red/gray) + short text ("SMA150 — price above, uptrend")
  - [x] Header line: "4 of 6 indicators lean bullish"
  - [x] Tooltip per chip with the detail explanation

### 5. Wire into stock pages
- [x] `/stock/[ticker]` (world): indicators section under the existing chart
- [x] `/stock/il/[symbol]` (israeli): same, using ILS closes
- [x] Period selector for the indicator window (6M / 1Y / 2Y)

### 6. Holdings table badges (quick win)
- [x] RSI mini-badge next to each holding in World/Israeli holdings tables
      (green <30, red >70, gray otherwise) — data from a lightweight batch
      endpoint or included in holdings response
- [x] ~~Deferred~~ — shipped together with Phase 2

### 7. Phase 2 — OHLCV (separate effort, do not start in Phase 1)
- [x] Migration: add `open, high, low, volume` columns to `stock_price_history`
- [x] Update `price_history_service._download/_store` to persist OHLCV
- [x] Backfill existing rows (one bulk refetch)
- [x] ATR(14) + stop-loss suggestion ("2×ATR below price")
- [x] Volume bars under price + OBV, volume-confirmation state in signal strip

---

## Design notes

- Overlay colors: SMA20 `#38BDF8`, SMA50 `#F59E0B`, SMA150 `#A78BFA`,
  SMA200 `#F43F5E`, Bollinger fill `rgba(56,189,248,0.06)`.
- Warm-up: SMA200 needs 200 trading days before the first visible point —
  always fetch `display window + 300 calendar days` of closes.
- Israeli stocks trade Sun–Thu; do not assume Mon–Fri when aligning dates.
- RSI uses Wilder's smoothing (α = 1/14), not simple average — matches
  TradingView/brokers so numbers are comparable.
- The signal strip is the product: charts are for confirmation, the strip is
  the at-a-glance answer.
