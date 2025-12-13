# Transaction Review Flow - Implementation Summary

## Overview
Implemented a staging/review system for Israeli stock transactions extracted from PDFs. Users can now review, modify, approve, or reject transactions before they're committed to the database.

## Architecture

### 1. Database Layer
**New Table**: `PendingIsraeliTransaction`
- Stores extracted transactions in pending state
- Fields:
  - `upload_batch_id`: Groups transactions from same PDF
  - Transaction details: date, stock, type, quantity, price, amount
  - Status tracking: pending, approved, rejected, modified
  - Review metadata: notes, reviewed_at, reviewed_by
  - `raw_data`: JSON field with original extracted data

**Migration**: `2025_12_06_1800-add_pending_transactions_table.py`

### 2. Model Layer
**File**: `backend/app/models/pending_transaction.py`
- SQLAlchemy model for `PendingIsraeliTransaction`
- Includes indexes for performance (user_id, batch_id, status)

### 3. API Layer
**New Endpoints** in `backend/app/api/v1/endpoints/israeli_stocks.py`:

```python
GET    /israeli-stocks/pending-transactions           # List pending transactions
       ?batch_id=xxx                                  # Filter by upload batch
       ?status=pending|approved|rejected              # Filter by status

POST   /israeli-stocks/pending-transactions/{id}/approve    # Approve single transaction
POST   /israeli-stocks/pending-transactions/batch/{batch_id}/approve-all  # Approve all in batch
PUT    /israeli-stocks/pending-transactions/{id}            # Update transaction details
DELETE /israeli-stocks/pending-transactions/{id}            # Reject/delete transaction
```

### 4. Transaction Types
- **BUY**: Purchase of stocks
- **SELL**: Sale of stocks
- **DIVIDEND**: Dividend payment
- **DEPOSIT**: (Future) Cash deposit
- **WITHDRAWAL**: (Future) Cash withdrawal

## Workflow

### Current Flow (Direct to DB):
```
PDF Upload → Extract → Save to Holdings/Transactions → Done
```

### New Flow (Withreviewing):
```
PDF Upload → Extract → Save to Pending → User Reviews → Approve → Process to final tables
                                       ↓
                                    Reject → Delete
                                       ↓
                                    Modify → Update → Approve
```

## Next Steps (TODO)

### 1. Modify PDF Processing Service
**File**: `backend/app/services/israeli_stock_service.py`
- Change `process_pdf_report()` to save to `PendingIsraeliTransaction` instead of final tables
- Generate UUID for `upload_batch_id`
- Store original extracted data in `raw_data` JSON field

### 2. Implement Approval Processing
- Create method to process approved transactions into final tables:
  - **BUY/SELL** → `IsraeliStockTransaction` + update `IsraeliStockHolding`
  - **DIVIDEND** → `IsraeliDividend`
- Handle transaction validation
- Calculate holdings based on transactions

### 3. Frontend Review UI
**Location**: `frontend/src/components/PendingTransactionsReview.tsx`

**Features**:
- Display transactions in a table grouped by upload batch
- Show transaction details: date, stock, type, quantity, price, amount
- Actions per transaction:
  - ✅ Approve
  - ✏️ Edit (inline or modal)
  - ❌ Reject
- Batch actions:
  - "Approve All" button
  - "Reject All" button
- Status indicators with colors:
  - 🟡 Pending (yellow)
  - ✅ Approved (green)
  - ❌ Rejected (red)
  - ✏️ Modified (blue)

### 4. API Service Methods
**File**: `frontend/src/services/api.ts`

```typescript
israeliStocksAPI: {
  getPendingTransactions: (batchId?, status?) => Promise<Transaction[]>
  approvePendingTransaction: (id) => Promise<void>
  approveAllInBatch: (batchId) => Promise<void>
  updatePendingTransaction: (id, data) => Promise<void>
  rejectPendingTransaction: (id) => Promise<void>
}
```

### 5. Enhanced Upload Flow
After PDF upload:
1. Show success message with count of extracted transactions
2. Redirect to review page with the `batch_id`
3. Display all pending transactions for review
4. Allow user to approve/modify/reject
5. Only process approved transactions

## Benefits

✅ **Data Accuracy**: Review before committing prevents bad data
✅ **User Control**: Users can correct extraction errors
✅ **Audit Trail**: Track who approved what and when
✅ **Flexibility**: Easy to add new transaction types (deposits/withdrawals)
✅ **Rollback**: Can reject entire batch if needed
✅ **Development**: Test PDF extraction without polluting production data

## Database Migration

Run migration to create the table:
```bash
cd backend
alembic upgrade head
```

Or use the admin panel endpoint:
```
POST /api/v1/admin/run-migrations
```

## Testing the Flow

1. Upload PDF → Creates pending transactions
2. Check pending transactions:
   ```
   GET /api/v1/israeli-stocks/pending-transactions
   ```
3. Review and approve:
   ```
   POST /api/v1/israeli-stocks/pending-transactions/batch/{batch_id}/approve-all
   ```
4. Transactions processed to final tables

## Notes

- Pending transactions are user-specific (filtered by `user_id`)
- Each PDF upload gets a unique `batch_id` (UUID)
- Original extraction data preserved in `raw_data` field
- Modified transactions keep modification history
- Rejected transactions are deleted (can be soft-delete if needed)
