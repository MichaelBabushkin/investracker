# Investracker — Claude Context

## What This Is
A personal investment portfolio tracker for an Israeli investor. Parses Excellence broker PDF statements to track Israeli stocks (TA exchange) and World stocks (US/global) in one place.

## Running the Project
```bash
# Backend (from repo root) — uses shebang #!/opt/homebrew/bin/python3.11, no venv activation needed
cd backend && python run.py

# Frontend (from repo root)
cd frontend && npm run dev   # → http://localhost:3000
```
Backend API: `http://localhost:8000` · Docs: `http://localhost:8000/docs`
Frontend: `http://localhost:3000`

## Architecture

### Backend — `backend/app/`
```
api/v1/endpoints/   auth, admin, calendar, education, israeli_stocks, user_settings, world_stocks
brokers/            BaseBrokerParser (abstract) + ExcellenceProcessor (dynamic column detection)
core/               auth.py (JWT), config.py, database.py (ensure_tables_exist on startup), deps.py
models/             SQLAlchemy models (see DB Schema below)
schemas/            Pydantic request/response models
services/           Business logic — world_stock_service, israeli_stock_service, stock_price_service,
                    returns_calculator, cash_balance_service, transaction_validator, logo crawlers
tasks/              fetch_stock_prices.py (yfinance background jobs)
```

All routes are mounted at `/api/v1/` prefix.

### Frontend — `frontend/src/`
```
app/               Next.js 14 App Router — 11 pages:
                   / (dashboard), /israeli-stocks, /world-stocks, /analytics,
                   /calendar, /education, /portfolio, /reports, /settings,
                   /admin, /auth/login, /auth/register
components/        40+ React components
  ui/              Card, MetricCard, Button, Badge, Skeleton, Tabs
  education/       EducationCenter, LessonViewer, CategoryCard, QuizSection
  admin/           StockPriceManagement, user management
  BrokerUploader, Dashboard, PendingTransactionsReview, WorldPendingTransactionsReview
  IsraeliStockHoldings/Transactions, WorldStockHoldings/Transactions/Dividends
services/api.ts    Central axios client — authAPI, israeliStocksAPI, worldStocksAPI, adminAPI, etc.
store/             Redux (auth slice only)
types/             israeli-stocks.ts, world-stocks.ts
utils/             formatters.ts, errorHandling.ts
```

Next.js rewrites: `/api/*` → `http://localhost:8000/api/v1/*` (configured in `next.config.js`)

## Database Schema (PostgreSQL)

### World Stocks
| Table | Purpose |
|---|---|
| `world_stocks` | Ticker catalog (prices updated by yfinance, logo_url/logo_svg) |
| `world_stock_holdings` | Per-user positions (quantity, cost in ILS, USD price, exchange_rate) |
| `world_stock_transactions` | Buy/sell history (type: BUY/SELL/DIVIDEND) |
| `world_dividends` | Dividend payments |
| `pending_world_transactions` | Staging table — upload_batch_id, status: pending/approved/rejected |
| `exchange_rates` | USD↔ILS rates extracted from PDF per transaction date |

### Israeli Stocks
| Table | Purpose |
|---|---|
| `israeli_stocks` | TA exchange catalog (yfinance_ticker = symbol + ".TA") |
| `israeli_stock_holdings` | Per-user positions |
| `israeli_stock_transactions` | Buy/sell/dividend history, includes realized_pl column |
| `israeli_stock_dividends` | Dividend records |
| `pending_israeli_transactions` | Staging table |
| `israeli_reports` | Uploaded PDF file records |

### Other
| Table | Purpose |
|---|---|
| `users` | JWT auth (id is string UUID) |
| `education_progress` | Lesson completion per user |
| `calendar_events` | Earnings, dividends, splits calendar |
| `user_event_notification_preferences` | Notification settings |

## PDF Processing Flow
```
PDF upload → pdfplumber extraction → BaseBrokerParser → dynamic column detection
→ ExcellenceProcessor → split into Israeli + World transactions
→ PendingIsraeliTransaction / PendingWorldTransaction (status: pending)
→ User reviews in UI → approve/reject per transaction or batch
→ Approved → final holding/transaction/dividend tables
```

## Key Design Patterns

### Currency
- World stocks: prices in USD, stored values often in ILS (exchange_rate per transaction)
- Israeli stocks: ILS throughout
- Dashboard metric "Total Portfolio" = holdings (USD) + cash (USD)
- Capital gains tax: tracked in ILS as `tax_withheld_ils` / account `9992983`

### Pending Transaction Review
Both markets have a staging flow. Frontend components:
- `PendingTransactionsReview.tsx` (Israeli)
- `WorldPendingTransactionsReview.tsx` (World)

API endpoints follow pattern: `POST /pending-transactions/{id}/approve`, `DELETE /pending-transactions/{id}`

### Stock Prices
- World: yfinance ticker = `ticker` (e.g. AAPL)
- Israeli: yfinance ticker = `symbol + ".TA"` (e.g. TEVA.TA)
- Admin panel: `/admin/prices/stats/detailed`, `/admin/prices/refresh/{market}`
- Freshness tiers: active holdings (15min), catalog (24h)

## Design System (Tailwind)

### Colors
```
bg-surface-dark          #0B0F1A  (page background)
bg-surface-dark-secondary #111827  (cards)
bg-surface-dark-tertiary  #1F2937  (inputs, hover states)
text-gain                #4ADE80  (profits, green)
text-loss                #F43F5E  (losses, rose)
text-brand-400           #4ADE80  (primary accent)
text-info                #3B82F6  (info, world stocks accent)
text-warn                #F59E0B  (warnings, amber)
```

### Typography
- `font-heading` → DM Sans
- `font-body` → Inter
- `financial-value` → tabular-nums class for aligned numbers

### Component Patterns
- Cards: `<Card>` + `<CardHeader>` + `<CardTitle>` from `components/ui/Card`
- Metrics: `<MetricCard label value subValue trend icon />`
- Loading: animate-pulse skeleton divs
- Toasts: `react-hot-toast`

## Auth
- JWT in `localStorage` key `"token"`, refresh in `"refreshToken"`, user in `"user"`
- Auto-refresh on 401/403 via axios interceptor in `services/api.ts`
- `<ProtectedRoute>` wraps authenticated pages
- Backend: `Depends(get_current_user)` on protected endpoints

## Environment
```
# Backend (.env)
DATABASE_URL=postgresql://michaelbabushkin@localhost/investracker
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Alembic Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```
Migration files: `backend/alembic/versions/` (named `YYYY_MM_DD_HHMM-description.py`)

## Current Branch: `feature/portfolio-calculations`
Recent work: fixing portfolio math — capital gains tax (ILS), 202% gain bug, cash + holdings total.
The `tax_withheld_ils` field tracks capital gains tax paid (account מס ששולם / 9992983).

## Plan Files (reference when relevant)
- `DESIGN_PLAN.md` — full UI/UX spec, page-by-page design
- `STOCK_PRICE_PLAN.md` / `STOCK_PRICE_FEATURE.md` — admin price management
- `PDF_PROCESSING_ANALYSIS.md` / `PDF_PROCESSING_IMPROVEMENTS.md` — broker parsing
- `TRANSACTION_REVIEW_FLOW.md` — pending transaction staging system
- `WORLD_STOCKS_IMPLEMENTATION_PLAN.md` — world stock feature design
- `EDUCATION_PLAN.md` — education center curriculum
- `DEPLOYMENT_PLAN.md` / `VERCEL_DEPLOY.md` — Railway + Vercel deployment
