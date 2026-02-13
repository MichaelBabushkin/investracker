# Stock Price Management Feature

## Overview
Comprehensive stock price management system added to the admin panel, providing real-time monitoring and manual control over price updates for both World and Israeli stocks.

## Feature Branch
`feature/stock-price-optimization`

## What's Included

### 🎯 Admin UI - Stock Price Management Section
New dedicated section in admin panel accessible at: **Admin Panel > Stock Prices**

#### Real-Time Dashboard
- **Auto-refresh**: Statistics update every 30 seconds
- **Per-market breakdown**: Separate cards for World and Israeli stocks
- **Key metrics**:
  - Total stocks in catalog
  - Stocks with current prices
  - Stocks in user holdings
  - Freshness percentage (24h)
  - Detailed freshness breakdown (15min, 1h, 24h)
  - Staleness indicators (>24h old prices)
  - Oldest/newest update timestamps (relative format: "5 mins ago")

#### Manual Refresh Controls

**1. Active Holdings** (Priority 1)
- Updates prices for stocks actively held by users
- Green card with "Refresh Active Prices" button
- Recalculates current values for all user holdings
- Shows count of updated prices and recalculated holdings

**2. Catalog Stocks** (Priority 2)
- Bulk update for stale prices (>24h old)
- Blue card with "Refresh Catalog (500)" button
- Processes up to 500 stocks per run
- Shows update success/failure counts

**3. Market-Specific Refresh**
- **World Stocks**: Refresh up to 100 world market stocks
- **Israeli Stocks**: Refresh up to 100 Israeli market stocks
- Buttons on each market stat card
- Force option available via API

**4. Single Stock Refresh**
- Input field for ticker symbol (e.g., AAPL, MSFT)
- Market selector (World/Israeli dropdown)
- Instant single stock price update
- Useful for testing or immediate updates

### 🔧 Backend API Endpoints

#### 1. GET `/admin/prices/stats/detailed`
Returns comprehensive per-market statistics:
```json
{
  "world": {
    "total_stocks": 5234,
    "stocks_with_price": 4891,
    "stocks_without_price": 343,
    "fresh_15_minutes": 234,
    "fresh_1_hour": 1245,
    "fresh_24_hours": 3456,
    "stale_24_hours": 1778,
    "in_holdings": 45,
    "oldest_update": "2025-01-20T10:30:00",
    "newest_update": "2025-01-23T14:45:00"
  },
  "israeli": { ... }
}
```

**SQL Queries**:
- Counts distinct tickers from WorldStocks/IsraeliStocks
- Joins with StockPrices on ticker and market
- Joins with holdings tables to identify actively held stocks
- Uses time intervals (15min, 1h, 24h) for freshness calculation

#### 2. POST `/admin/prices/refresh/{market}`
Parameters:
- `market`: "world" or "israeli"
- `limit`: Number of stocks to update (default: 100, max: 500)
- `force`: Force update even if recently refreshed (default: false)

Response:
```json
{
  "message": "Updated 95 world stock prices",
  "market": "world",
  "tickers_processed": 100,
  "updated": 95,
  "failed": 5,
  "holdings_recalculated": 12
}
```

#### 3. POST `/admin/prices/refresh-single/{ticker}`
Parameters:
- `ticker`: Stock ticker symbol (e.g., "AAPL")
- `market`: "world" or "israeli"

Response:
```json
{
  "message": "Successfully updated AAPL",
  "ticker": "AAPL",
  "market": "world",
  "success": true
}
```

### 📦 Frontend Components

#### StockPriceManagement.tsx
**Location**: `frontend/src/components/admin/StockPriceManagement.tsx`

**Key Features**:
- TypeScript React component with hooks (useState, useEffect)
- Real-time data fetching with 30s auto-refresh
- Loading states for all operations
- Toast notifications (react-hot-toast) for user feedback
- Color-coded freshness indicators:
  - Green: ≥80% fresh
  - Yellow: ≥50% fresh
  - Red: <50% fresh
- Relative timestamp formatting ("5 mins ago", "2 hours ago")
- Disabled button states during operations
- Responsive grid layouts

#### AdminLayout.tsx Updates
- Added "Stock Prices" section with CurrencyDollarIcon
- New AdminSection type: `"prices"`
- Subcategories:
  - Dashboard: View statistics
  - Manual Refresh: Trigger updates
  - Monitoring: Track history (placeholder)

#### API Service (api.ts)
Added 5 new methods to `adminAPI`:
- `getPriceStatsDetailed()`
- `refreshActivePrices()`
- `refreshCatalogPrices(limit)`
- `refreshMarketPrices(market, limit, force)`
- `refreshSinglePrice(ticker, market)`

### 🎨 UI/UX Details

**Color Scheme**:
- Active Holdings: Green gradient (green-50 to green-100)
- Catalog Stocks: Blue gradient (blue-50 to blue-100)
- Success states: Green (green-600)
- Warning states: Yellow (yellow-600)
- Error states: Red (red-600)

**Icons** (Heroicons v2):
- ArrowPathIcon: Refresh actions (with spin animation)
- ClockIcon: Time-based operations
- CheckCircleIcon: Success indicators
- ChartBarIcon: Statistics/monitoring
- CurrencyDollarIcon: Stock prices section

**Animations**:
- Spinning refresh icons during operations
- Smooth hover transitions (transition-colors)
- Loading states with disabled buttons

### 📊 Statistics Visualization

Each market card displays:
1. **Header**: Market name + Refresh button
2. **Metric Cards** (4 columns):
   - Total Stocks (gray)
   - With Prices (blue)
   - In Holdings (green)
   - Fresh 24h Percentage (color-coded)
3. **Detailed Breakdown** (list):
   - Fresh (15 min): X / Total
   - Fresh (1 hour): X / Total
   - Fresh (24 hours): X / Total
   - Stale (>24h): X (red text)
   - Oldest Update: "3 days ago"
   - Newest Update: "2 mins ago"

### 🚀 User Workflow

1. **Navigate**: Admin Panel → Stock Prices section
2. **Monitor**: View real-time stats for both markets
3. **Refresh**:
   - **Quick**: Click "Refresh Active Prices" for immediate holdings update
   - **Bulk**: Use "Refresh Catalog" for large-scale stale price updates
   - **Targeted**: Use market-specific buttons for World or Israeli stocks
   - **Precise**: Use single ticker input for specific stocks
4. **Feedback**: Toast notifications show success/failure with details
5. **Auto-update**: Stats refresh automatically every 30 seconds

### 🔄 Integration with Existing System

**Stock Price Service** (`backend/app/services/stock_price_service.py`):
- Uses yfinance API for price fetching
- Batch processing: 50 tickers per batch, 1.0s delay
- Rate limiting: 2000 requests/hour
- Tiered caching:
  - Active stocks: 15 minute cache
  - Catalog stocks: 24 hour cache
- Methods called by new endpoints:
  - `get_active_tickers()`
  - `get_stale_catalog_tickers(hours, limit, market)`
  - `update_world_stock_prices(tickers, market)`
  - `update_holdings_values(market)`

**Database Tables**:
- `StockPrices`: Stores current_price, updated_at, market field
- `WorldStocks`: World stock catalog (ticker, name, exchange)
- `IsraeliStocks`: Israeli stock catalog (symbol, name)
- `WorldStockHolding`: User holdings for world stocks
- `IsraeliStockHolding`: User holdings for Israeli stocks

### 📝 Implementation Details

**Phase 1** (✅ Complete): Enhanced Admin API
- 3 new comprehensive endpoints
- SQL queries for detailed statistics
- Market-specific filtering
- Holdings integration

**Phase 2** (✅ Complete): Admin UI Components
- StockPriceManagement component (409 lines)
- Real-time stats dashboard
- Manual refresh controls
- Job status feedback via toasts

**Phase 3** (🔜 Planned): Optimization
- Retry logic with exponential backoff
- Enhanced rate limiting protection
- Caching layer for API responses
- Dynamic batch size optimization

**Phase 4** (🔜 Planned): Background Jobs
- Scheduled active stock updates (15 min intervals)
- Nightly catalog refresh jobs
- Job monitoring and alerting system

### 🎯 Next Steps

To continue development:
1. Test the UI in development environment
2. Verify API endpoints with real data
3. Monitor yfinance API rate limits
4. Implement Phase 3 optimizations
5. Setup background job queue (APScheduler or Celery)
6. Add job history tracking and monitoring

### 💡 Usage Tips

- **Active Holdings** should be refreshed frequently (every 15 minutes recommended)
- **Market-specific refresh** is useful when one market has stale data
- **Catalog refresh** should run during off-hours to avoid rate limits
- **Single ticker refresh** is ideal for debugging or immediate updates after stock splits/events
- Monitor the freshness indicators - green (≥80%) is healthy, red (<50%) needs attention
- Use force parameter (API only) to bypass 24h cache for critical updates

### 🐛 Known Considerations

- yfinance rate limits: 2000 requests/hour (approximately 30 per minute)
- Batch size: 50 tickers per batch with 1.0s delay
- Some tickers may fail due to:
  - Delisted stocks
  - Invalid ticker symbols
  - API timeouts
  - Market closure
- Israeli stock prices may require TA.TA exchange suffix
- World stock prices default to US markets, may need exchange specification

### 📚 Related Files

**Backend**:
- `backend/app/api/v1/endpoints/admin.py` - Admin endpoints (lines 611-808)
- `backend/app/services/stock_price_service.py` - Price fetching logic
- `backend/app/models/stock_price.py` - StockPrices model

**Frontend**:
- `frontend/src/components/admin/StockPriceManagement.tsx` - Main UI component
- `frontend/src/components/admin/AdminLayout.tsx` - Admin navigation
- `frontend/src/app/admin/page.tsx` - Admin page routing
- `frontend/src/services/api.ts` - API client methods

**Documentation**:
- `STOCK_PRICE_PLAN.md` - Implementation roadmap
- `STOCK_PRICE_FEATURE.md` - This document

---

**Commit**: `2f75a98` - feat: Add Stock Price Management UI to admin panel
**Branch**: `feature/stock-price-optimization`
**Status**: Phase 1 & 2 Complete ✅
