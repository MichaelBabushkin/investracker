# World Stocks Implementation Plan

## Overview
Extend the current Israeli stock processing system to also extract and manage world stocks (primarily US stocks) from the same Excellence broker PDF reports. The same PDF contains both Israeli and world stock holdings, so we'll optimize to scan and parse the PDF once for both markets.

---

## 1. Database Schema

### New Tables

#### `WorldStock` (Reference Data)
```sql
CREATE TABLE "WorldStock" (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "NKE", "AAPL", "TSLA"
    exchange VARCHAR(10) NOT NULL,        -- e.g., "US", "NASDAQ", "NYSE"
    company_name VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    country VARCHAR(100) DEFAULT 'US',
    currency VARCHAR(10) DEFAULT 'USD',
    logo_url TEXT,
    logo_svg TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_world_stock_ticker ON "WorldStock"(ticker);
CREATE INDEX idx_world_stock_exchange ON "WorldStock"(exchange);
```

#### `WorldStockHolding`
```sql
CREATE TABLE "WorldStockHolding" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,           -- e.g., "NKE US"
    symbol VARCHAR(50) NOT NULL,            -- Display name: "NKE US"
    company_name VARCHAR(255),
    quantity DECIMAL(18, 6),
    last_price DECIMAL(18, 4),             -- Price in USD
    purchase_cost DECIMAL(18, 2),          -- Total cost in ILS or USD
    current_value DECIMAL(18, 2),          -- Current value in ILS
    portfolio_percentage DECIMAL(5, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10, 4),          -- USD to ILS rate at holding date
    holding_date DATE,
    source_pdf VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_world_holding_user ON "WorldStockHolding"(user_id);
CREATE INDEX idx_world_holding_ticker ON "WorldStockHolding"(ticker);
CREATE INDEX idx_world_holding_date ON "WorldStockHolding"(holding_date);
CREATE UNIQUE INDEX idx_world_holding_unique ON "WorldStockHolding"(user_id, ticker, source_pdf);
```

#### `WorldStockTransaction`
```sql
CREATE TABLE "WorldStockTransaction" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    transaction_type VARCHAR(20) NOT NULL, -- BUY, SELL, DIVIDEND
    transaction_date DATE NOT NULL,
    transaction_time VARCHAR(10),
    quantity DECIMAL(18, 6),
    price DECIMAL(18, 4),                  -- Price in USD
    total_value DECIMAL(18, 2),            -- Total in ILS
    commission DECIMAL(18, 2),
    tax DECIMAL(18, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10, 4),
    source_pdf VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_world_transaction_user ON "WorldStockTransaction"(user_id);
CREATE INDEX idx_world_transaction_ticker ON "WorldStockTransaction"(ticker);
CREATE INDEX idx_world_transaction_date ON "WorldStockTransaction"(transaction_date);
CREATE INDEX idx_world_transaction_type ON "WorldStockTransaction"(transaction_type);
```

#### `WorldDividend`
```sql
CREATE TABLE "WorldDividend" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    payment_date DATE NOT NULL,
    amount DECIMAL(18, 2),                 -- Dividend amount in ILS
    tax DECIMAL(18, 2),
    net_amount DECIMAL(18, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10, 4),
    source_pdf VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_world_dividend_user ON "WorldDividend"(user_id);
CREATE INDEX idx_world_dividend_ticker ON "WorldDividend"(ticker);
CREATE INDEX idx_world_dividend_date ON "WorldDividend"(payment_date);
```

#### `PendingWorldTransaction`
```sql
CREATE TABLE "PendingWorldTransaction" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_batch_id VARCHAR(255) NOT NULL,
    pdf_filename VARCHAR(255),
    ticker VARCHAR(20) NOT NULL,
    stock_name VARCHAR(255),
    transaction_type VARCHAR(20) NOT NULL,
    transaction_date VARCHAR(50),
    transaction_time VARCHAR(10),
    quantity DECIMAL(18, 6),
    price DECIMAL(18, 4),
    amount DECIMAL(18, 2),
    commission DECIMAL(18, 2),
    tax DECIMAL(18, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10, 4),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pending_world_user ON "PendingWorldTransaction"(user_id);
CREATE INDEX idx_pending_world_batch ON "PendingWorldTransaction"(upload_batch_id);
CREATE INDEX idx_pending_world_status ON "PendingWorldTransaction"(status);
```

---

## 2. Processing Flow

### Unified PDF Processing Strategy

```
┌─────────────────────────────────────────┐
│  User Uploads PDF (Excellence Report)  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   1. Extract Report Date & Tables       │
│   - Single PDF scan (pdfplumber)        │
│   - Extract all tables once             │
│   - Identify report date from header    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   2. Save Tables to CSV (Once)          │
│   - Convert all tables to CSV files     │
│   - One-time conversion                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   3. Determine Table Types              │
│   - Holdings (פירוט יתרות)              │
│   - Transactions (פירוט תנועות)         │
│   - Content-based detection             │
└─────────────────┬───────────────────────┘
                  │
                  ├──────────────┬──────────────┐
                  ▼              ▼              ▼
          ┌──────────────┐ ┌──────────┐ ┌──────────────┐
          │Israeli Stocks│ │World Stks│ │Deposits/Cash │
          │  Extractor   │ │ Extractor│ │  Extractor   │
          └──────┬───────┘ └─────┬────┘ └──────┬───────┘
                 │               │              │
                 └───────┬───────┴──────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ 4. Save to Pending Tables    │
          │ - PendingIsraeliTransaction  │
          │ - PendingWorldTransaction    │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ 5. User Reviews & Approves   │
          │ - Combined review interface  │
          │ - Edit/Approve/Reject        │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ 6. Process Approved Items    │
          │ - Save to final tables       │
          │ - Update holdings            │
          └──────────────────────────────┘
```

---

## 3. Stock Identification Logic

### Israeli Stocks Detection
- **Primary Key**: `security_no` (6-digit Israeli stock exchange number)
- **Example**: "691212" (DISCOUNT), "662577" (POALIM)
- **Lookup**: Match against `IsraeliStocks.csv` database

### World Stocks Detection
- **Primary Key**: `ticker + exchange` (e.g., "NKE US", "AAPL US")
- **Pattern**: `[A-Z]{1,5} US` in the symbol column
- **Alternative patterns**:
  - Just ticker: "NKE", "AAPL"
  - With exchange suffix: "US:", "NASDAQ:"
- **Validation**:
  - Check against world stock reference database
  - If not found, create new entry or flag for manual review

### Detection Priority in CSV Row
```python
def identify_stock_type(row_values: List[str]) -> str:
    """
    Determine if row contains Israeli stock, world stock, or cash
    
    Priority:
    1. Check for 6-digit security_no → Israeli stock
    2. Check for US ticker pattern → World stock
    3. Check for security_no = 900 → Cash/Deposit
    4. Unknown → Skip or log
    """
    for value in row_values:
        # Israeli stock (6 digits)
        if re.match(r'^\d{6}$', value):
            return 'israeli'
        
        # World stock (ticker + exchange)
        if re.match(r'^[A-Z]{1,5}\s+(US|NASDAQ|NYSE)$', value):
            return 'world'
        
        # Cash transaction
        if value == '900':
            return 'cash'
    
    return 'unknown'
```

---

## 4. Code Architecture

### File Structure
```
backend/app/
├── models/
│   ├── israeli_stock_models.py       # Existing
│   ├── world_stock_models.py         # NEW - World stock SQLAlchemy models
│   └── pending_transaction.py        # Update to include world transactions
│
├── services/
│   ├── israeli_stock_service.py      # Existing
│   ├── world_stock_service.py        # NEW - World stock processing
│   ├── unified_pdf_processor.py      # NEW - Orchestrates both markets
│   └── stock_identifier.py           # NEW - Determines Israeli vs World
│
├── brokers/
│   ├── excellence_broker.py          # Update for world stocks
│   └── base_broker.py                # Update interface
│
├── api/v1/endpoints/
│   ├── israeli_stocks.py             # Existing
│   └── world_stocks.py               # NEW - World stock endpoints
│
└── schemas/
    ├── israeli_stock_schemas.py      # Existing
    └── world_stock_schemas.py        # NEW - Pydantic schemas
```

### Key Service Methods

#### `unified_pdf_processor.py` (NEW)
```python
class UnifiedPDFProcessor:
    def __init__(self):
        self.israeli_service = IsraeliStockService()
        self.world_service = WorldStockService()
        self.stock_identifier = StockIdentifier()
    
    def process_pdf(self, pdf_path: str, user_id: str, broker: str) -> Dict:
        """
        Single-pass PDF processing for both Israeli and world stocks
        """
        # 1. Extract date and tables (once)
        holding_date = self.extract_date_from_pdf(pdf_path)
        tables = self.extract_tables_from_pdf(pdf_path)
        csv_files = self.save_tables_to_csv(tables)
        
        # 2. Identify stock types in each CSV
        israeli_holdings = []
        world_holdings = []
        transactions_israeli = []
        transactions_world = []
        
        for csv_file in csv_files:
            df = pd.read_csv(csv_file)
            table_type = self.determine_table_type(df)
            
            if table_type == "holdings":
                # Scan each row and classify
                for idx, row in df.iterrows():
                    stock_type = self.stock_identifier.identify(row)
                    
                    if stock_type == 'israeli':
                        holding = self.israeli_service.parse_holding_row(...)
                        israeli_holdings.append(holding)
                    
                    elif stock_type == 'world':
                        holding = self.world_service.parse_holding_row(...)
                        world_holdings.append(holding)
            
            elif table_type == "transactions":
                # Similar logic for transactions
                pass
        
        # 3. Save to pending tables
        israeli_batch_id = self.israeli_service.save_to_pending(israeli_holdings, ...)
        world_batch_id = self.world_service.save_to_pending(world_holdings, ...)
        
        return {
            'israeli': {'batch_id': israeli_batch_id, 'count': len(israeli_holdings)},
            'world': {'batch_id': world_batch_id, 'count': len(world_holdings)}
        }
```

#### `stock_identifier.py` (NEW)
```python
class StockIdentifier:
    def __init__(self):
        self.israeli_stocks = self.load_israeli_stocks()
        self.world_stocks = self.load_world_stocks()
    
    def identify(self, row: pd.Series) -> str:
        """Returns: 'israeli', 'world', 'cash', or 'unknown'"""
        pass
    
    def extract_ticker(self, row: pd.Series) -> Optional[Tuple[str, str]]:
        """Returns: (ticker, exchange) or None"""
        pass
```

---

## 5. API Endpoints

### World Stocks Endpoints (`/api/v1/world-stocks/`)

```python
# Upload & Processing
POST   /upload                          # Process PDF for world stocks
GET    /pending-transactions            # List pending world transactions
POST   /pending-transactions/{id}/approve
POST   /pending-transactions/batch/{batch_id}/approve-all
PUT    /pending-transactions/{id}
DELETE /pending-transactions/{id}

# Data Retrieval
GET    /holdings                        # Get world stock holdings
GET    /transactions                    # Get world stock transactions
GET    /dividends                       # Get world stock dividends
GET    /summary                         # Portfolio summary

# Stock Reference
GET    /stocks                          # List world stocks
GET    /stocks/{ticker}                 # Get stock details
POST   /stocks                          # Add new stock (admin)
```

---

## 6. Frontend Components

### New Components
```
frontend/src/components/
├── WorldStocks/
│   ├── WorldStocksDashboard.tsx       # Main dashboard
│   ├── WorldStockHoldings.tsx         # Holdings table
│   ├── WorldStockTransactions.tsx     # Transactions list
│   ├── WorldStockDividends.tsx        # Dividends list
│   └── PendingWorldTransactions.tsx   # Review UI
│
└── Unified/
    └── UnifiedPortfolioDashboard.tsx  # Combined Israeli + World view
```

### Combined Review Interface
- Show both Israeli and World pending transactions together
- Color-coded by market (Israeli = blue, World = green)
- Separate "Approve All Israeli" and "Approve All World" buttons
- Global "Approve Everything" button

---

## 7. Data Population

### World Stock Reference Data

#### Option 1: Static CSV File
- Create `data/WorldStocks.csv` with common US stocks
- Columns: ticker, exchange, company_name, sector, industry
- Pre-populate ~500 most common stocks

#### Option 2: API Integration
- Use Alpha Vantage / Yahoo Finance / Polygon.io API
- Auto-fetch stock details when new ticker encountered
- Cache results in database

#### Option 3: Hybrid Approach (Recommended)
- Start with static CSV for common stocks
- Auto-fetch unknown stocks via API
- Allow manual entry/edit in admin panel

---

## 8. Excellence Broker Parser Updates

### Current Structure (Israeli Only)
```python
class ExcellenceBrokerParser:
    def parse_holding_row(self, row, security_no, symbol, name, ...)
    def parse_transaction_row(self, row, security_no, symbol, name, ...)
```

### Updated Structure (Dual Market)
```python
class ExcellenceBrokerParser:
    # Keep existing methods
    def parse_israeli_holding(self, row, security_no, symbol, name, ...)
    def parse_israeli_transaction(self, row, security_no, symbol, name, ...)
    
    # Add new methods
    def parse_world_holding(self, row, ticker, symbol, name, ...)
    def parse_world_transaction(self, row, ticker, symbol, name, ...)
    
    # Unified entry points
    def parse_holding_row_unified(self, row, stock_type, identifier, ...):
        if stock_type == 'israeli':
            return self.parse_israeli_holding(...)
        elif stock_type == 'world':
            return self.parse_world_holding(...)
```

---

## 9. Exchange Rate Handling

### Requirements
- World stocks are priced in USD
- Need to convert to ILS for portfolio calculations
- Store exchange rate at time of transaction/holding

### Implementation
1. **Extract from PDF**: Excellence reports show exchange rates
2. **API Fallback**: Use Bank of Israel API for historical rates
3. **Cache**: Store rates in database for reuse

```sql
CREATE TABLE "ExchangeRate" (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    rate DECIMAL(10, 4) NOT NULL,
    date DATE NOT NULL,
    source VARCHAR(50),  -- 'pdf', 'api', 'manual'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, date)
);
```

---

## 10. Implementation Phases

### Phase 1: Database & Models (Week 1)
- [ ] Create database migration for world stock tables
- [ ] Implement SQLAlchemy models
- [ ] Create Pydantic schemas
- [ ] Set up world stock reference CSV

### Phase 2: Backend Services (Week 2)
- [ ] Implement `WorldStockService`
- [ ] Create `UnifiedPDFProcessor`
- [ ] Update `ExcellenceBrokerParser` for world stocks
- [ ] Add world stock API endpoints
- [ ] Implement exchange rate handling

### Phase 3: Frontend Components (Week 3)
- [ ] Create world stock dashboard
- [ ] Implement holdings/transactions/dividends views
- [ ] Build combined review interface
- [ ] Add world stock charts and visualizations

### Phase 4: Integration & Testing (Week 4)
- [ ] Test with real PDF reports
- [ ] Verify Israeli + World stock separation
- [ ] Test month-based filtering for both markets
- [ ] Performance optimization
- [ ] Bug fixes and refinements

---

## 11. Key Considerations

### Data Consistency
- **Issue**: Same PDF contains both markets in same table
- **Solution**: Row-level classification before processing
- **Validation**: Verify totals match PDF summary section

### Performance
- **Challenge**: Processing more data per PDF
- **Optimization**: 
  - Parallel processing of Israeli vs World stocks
  - Batch database inserts
  - CSV caching

### User Experience
- **Unified View**: Users see combined portfolio (Israeli + World)
- **Market Filters**: Toggle between "All", "Israeli", "World"
- **Currency Display**: Show in ILS, USD, or both

### Edge Cases
- Stocks traded on multiple exchanges (e.g., "TEVA US" vs "TEVA TA")
- Corporate actions (splits, mergers)
- Delisted stocks
- Currency conversion accuracy

---

## 12. Testing Checklist

### Unit Tests
- [ ] World stock ticker extraction
- [ ] Stock type identification (Israeli vs World)
- [ ] Exchange rate conversion
- [ ] Holdings calculation
- [ ] Transaction parsing

### Integration Tests
- [ ] End-to-end PDF processing (both markets)
- [ ] Pending transaction approval flow
- [ ] API endpoint responses
- [ ] Database constraints and indexes

### Manual Testing
- [ ] Upload PDF with mixed Israeli + World stocks
- [ ] Verify correct separation of markets
- [ ] Check holdings accuracy
- [ ] Test month-based filtering
- [ ] Validate portfolio totals

---

## 13. Success Metrics

### Functionality
- ✅ Correctly identify 100% of Israeli stocks
- ✅ Correctly identify 95%+ of world stocks
- ✅ Single PDF scan for both markets
- ✅ Accurate exchange rate conversion

### Performance
- ⏱️ Process PDF in <5 seconds
- ⏱️ Database queries <100ms
- ⏱️ Support 1000+ holdings per user

### User Experience
- 😊 Clear separation of Israeli vs World stocks
- 😊 Easy review and approval process
- 😊 Accurate portfolio calculations
- 😊 No duplicate transactions

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create database migration** (Phase 1)
3. **Implement core services** (Phase 2)
4. **Build frontend** (Phase 3)
5. **Test and iterate** (Phase 4)

---

**Document Version**: 1.0  
**Date**: January 23, 2026  
**Author**: GitHub Copilot  
**Status**: Planning → Ready for Implementation
