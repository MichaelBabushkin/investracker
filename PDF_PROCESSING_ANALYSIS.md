# PDF Processing Analysis - Current State & Refactoring Plan

## Current Issues

### 1. URL Mismatch
- **Frontend calls**: `/api/v1/israeli-stocks/upload`
- **Backend has**: `/upload-pdf` and `/upload-csv`
- **Result**: 404 Not Found error

### 2. Scalability Issues
- All logic is Excellence-specific
- No abstraction for different broker formats
- Hard to add new brokers (Meitav, IBI, Altshuler, etc.)

### 3. Manual Transaction Entry
- Endpoint exists but needs better schema validation
- No UI yet for manual entry
- Users can't add transactions between monthly reports

---

## Current Processing Flow

### Files Involved in PDF Processing

#### 1. **Frontend Entry Point**
- `frontend/src/components/BrokerUploader.tsx`
  - Handles file upload
  - Calls API: `POST /api/v1/israeli-stocks/upload`

#### 2. **Backend API Endpoint**
- `backend/app/api/v1/endpoints/israeli_stocks.py`
  - `@router.post("/upload-pdf")` - Receives PDF upload
  - Creates temp file
  - Calls IsraeliStockService

#### 3. **Core Processing Service**
- `backend/app/services/israeli_stock_service.py`
  - **Main method**: `process_pdf_report(pdf_path, user_id)`
  
  **Flow**:
  1. `extract_date_from_pdf()` - Get holding date
  2. `extract_tables_from_pdf()` - Extract all tables using pdfplumber
  3. `save_tables_to_csv()` - Convert tables to CSV
  4. `analyze_csv_files_with_headings()` - Parse CSV with Hebrew heading detection
  5. `find_israeli_stocks_in_csv()` - Match against stock database
  6. **Save to DB**:
     - `save_holdings_to_database()`
     - `save_transactions_to_database()`
     - `save_dividends_to_database()`

#### 4. **Database Models**
- `backend/app/models/israeli_stock_models.py`
  - `IsraeliStockHolding` - Current positions
  - `IsraeliStockTransaction` - Buy/sell transactions
  - `IsraeliDividend` - Dividend payments
  - `IsraeliStock` - Stock reference data

#### 5. **PDF Analysis Utilities**
- `backend/app/services/pdf_processor.py` - General PDF utilities
- Various scripts in `backend/` for analysis:
  - `full_pdf_analysis.py`
  - `comprehensive_dividend_analysis.py`
  - `analyze_headings.py`

---

## Excellence-Specific Logic (Needs Abstraction)

### Current Excellence PDF Structure
1. **Hebrew Headings**: Tables have Hebrew titles
2. **Table Types**:
   - Holdings table (נכסים/אחזקות)
   - Transactions table (תנועות)
   - Dividends (within transactions, type = DIVIDEND)
3. **Column Structure**: Specific to Excellence format
4. **Date Format**: Specific parsing logic

### What's Hardcoded for Excellence:
- Hebrew heading detection
- Column mapping
- Date extraction patterns
- Security number matching
- Transaction type identification

---

## Proposed Refactoring Architecture

### 1. Base Transaction Processor
```python
# backend/app/services/base_broker_processor.py
class BaseBrokerProcessor:
    """Abstract base class for all broker processors"""
    
    def process_report(self, file_path: str, user_id: str) -> ProcessingResult:
        """Template method - defines the processing flow"""
        pass
    
    def extract_holdings(self, data) -> List[Holding]:
        """Extract holdings - broker-specific"""
        raise NotImplementedError
    
    def extract_transactions(self, data) -> List[Transaction]:
        """Extract transactions - broker-specific"""
        raise NotImplementedError
    
    def extract_dividends(self, data) -> List[Dividend]:
        """Extract dividends - broker-specific"""
        raise NotImplementedError
```

### 2. Excellence Processor
```python
# backend/app/services/brokers/excellence_processor.py
class ExcellenceProcessor(BaseBrokerProcessor):
    """Excellence-specific PDF processing"""
    
    def extract_holdings(self, tables):
        # Current logic from israeli_stock_service
        pass
```

### 3. Future Processors
```python
# backend/app/services/brokers/meitav_processor.py
class MeitavProcessor(BaseBrokerProcessor):
    # Meitav-specific logic
    pass

# backend/app/services/brokers/ibi_processor.py
class IBIProcessor(BaseBrokerProcessor):
    # IBI-specific logic
    pass
```

### 4. Broker Factory
```python
# backend/app/services/broker_factory.py
class BrokerFactory:
    """Factory to get the right processor"""
    
    PROCESSORS = {
        'excellence': ExcellenceProcessor,
        'meitav': MeitavProcessor,
        'ibi': IBIProcessor,
        # ...
    }
    
    @staticmethod
    def get_processor(broker_id: str) -> BaseBrokerProcessor:
        processor_class = BrokerFactory.PROCESSORS.get(broker_id)
        if not processor_class:
            raise ValueError(f"Unsupported broker: {broker_id}")
        return processor_class()
```

### 5. Unified Upload Endpoint
```python
# backend/app/api/v1/endpoints/israeli_stocks.py
@router.post("/upload")
async def upload_report(
    broker_id: str,  # 'excellence', 'meitav', etc.
    files: List[UploadFile],
    user: User = Depends(get_current_user)
):
    """Unified upload endpoint for all brokers"""
    
    # Get the right processor
    processor = BrokerFactory.get_processor(broker_id)
    
    # Process files
    results = []
    for file in files:
        result = processor.process_report(file, user.id)
        results.append(result)
    
    return results
```

---

## Manual Transaction Entry

### Current Endpoint
```python
@router.post("/transactions")
async def create_transaction(transaction_data: dict, user: User)
```

### Needed Improvements
1. **Schema Validation**:
   ```python
   class TransactionCreate(BaseModel):
       stock_id: str
       transaction_type: str  # 'BUY', 'SELL'
       quantity: Decimal
       price: Decimal
       date: datetime
       notes: Optional[str]
   ```

2. **Frontend UI**:
   - Add "Manual Entry" button
   - Form with stock selection, date, quantity, price
   - Validation and error handling

---

## Migration Plan

### Phase 1: Fix Immediate Issues
1. ✅ Add `/upload` endpoint that routes to `/upload-pdf`
2. ✅ Add `broker_id` parameter (default to 'excellence')
3. Test current flow works

### Phase 2: Create Base Architecture
1. Create `BaseBrokerProcessor` class
2. Create `ExcellenceProcessor` with current logic
3. Create `BrokerFactory`
4. Update endpoint to use factory

### Phase 3: Add Manual Entry
1. Create proper schema for manual transactions
2. Add validation
3. Build frontend UI

### Phase 4: Add New Brokers
1. Analyze Meitav PDF format
2. Create `MeitavProcessor`
3. Register in factory
4. Test and deploy

---

## Quick Wins

### Fix the 404 Error Now:
```python
# In israeli_stocks.py
@router.post("/upload")
async def upload_reports(
    files: List[UploadFile] = File(...),
    broker_id: str = "excellence",  # Default to Excellence
    current_user: User = Depends(get_current_user)
):
    """Unified upload endpoint - routes to appropriate processor"""
    
    if broker_id != "excellence":
        raise HTTPException(
            status_code=400, 
            detail=f"{broker_id} not yet supported. Only Excellence is currently available."
        )
    
    # For now, just call the existing upload-pdf logic
    results = []
    for file in files:
        result = await upload_and_analyze_pdf(file, None, current_user)
        results.append(result)
    
    return results
```

### Update Frontend:
```typescript
// BrokerUploader.tsx
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/v1/israeli-stocks/upload?broker_id=${brokerId}`,
  {
    method: "POST",
    body: formData,
    credentials: "include",
  }
);
```
