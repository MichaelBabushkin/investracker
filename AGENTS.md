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

_Last updated: 2026-04-04_

**Claude** — completed:
- USD/ILS exchange rate fetching via yfinance (ILS=X), stored in `exchange_rates` table
- Admin panel "Stock Prices" section now has an Exchange Rates card with manual refresh
- Dashboard total portfolio now converts ILS tax to USD using live rate and deducts it from total
- Fixed false-positive capital gains tax detection: removed broad `'מס'`/`'סמ'` keywords that matched unrelated security מגן מס on account 9993983

**Gemini** — (not yet assigned)

---

## Handoff Notes

_Use this section when passing work between agents._

_(empty — add notes here when handing off a task)_

---

## Recent Changes Log

| Date | Agent | What | Files |
|------|-------|------|-------|
| 2026-04-04 | Claude | Exchange rate fetch + admin UI | `stock_price_service.py`, `admin.py`, `StockPriceManagement.tsx`, `api.ts` |
| 2026-04-04 | Claude | Dashboard unified USD total with ILS tax conversion | `world_stocks.py`, `Dashboard.tsx` |
| 2026-04-04 | Claude | Fix false-positive capital gains tax (מגן מס) | `israeli_stock_service.py` |
| 2026-04-04 | Claude | Sort pending transactions by date asc | `israeli_stocks.py`, `world_stocks.py` |
| 2026-04-04 | Claude | TopTradesPanel component (best=positive only, worst=negative only) | `TopTradesPanel.tsx`, `WorldStockTransactions.tsx`, `IsraeliStockTransactions.tsx` |
| 2026-04-04 | Claude | Remove max-w-7xl padding from all pages | Multiple layout files |
| 2026-04-04 | Claude | Restore Reports page to nav | `Sidebar.tsx`, `AppLayout.tsx` |
| 2026-04-04 | Claude | FX conversion: detect USD→ILS direction | `israeli_stock_service.py` |
