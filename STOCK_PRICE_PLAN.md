# Stock Price Optimization - Implementation Plan

## Current State
- Stock price service exists with yfinance integration
- Admin endpoints available for manual price updates
- Tiered update strategy (Active/Catalog)
- Basic stats endpoint

## Goals
1. Add comprehensive stock price management UI to admin panel
2. Optimize price fetching with better error handling
3. Add real-time status monitoring
4. Support both Israeli and World stocks
5. Add job queue for background processing

## Implementation Steps

### Phase 1: Enhanced Admin API
- [ ] Add endpoint for price update job status
- [ ] Add endpoint for market-specific updates (Israeli/World separately)
- [ ] Add endpoint for single stock price refresh
- [ ] Add endpoint for bulk ticker updates
- [ ] Enhanced stats with per-market breakdown

### Phase 2: Admin UI Components
- [ ] Create StockPriceManagement section
- [ ] Real-time stats dashboard
- [ ] Manual refresh controls
- [ ] Job status monitoring
- [ ] Price staleness visualization

### Phase 3: Optimization
- [ ] Add retry logic with exponential backoff
- [ ] Implement rate limiting protection
- [ ] Add caching layer for frequent requests
- [ ] Optimize batch size based on API limits

### Phase 4: Background Jobs
- [ ] Setup scheduled jobs for active stocks (15 min)
- [ ] Setup nightly catalog refresh
- [ ] Add job monitoring and alerting
