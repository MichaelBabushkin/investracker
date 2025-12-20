# Brokers Directory

This directory contains broker-specific implementations for parsing PDF investment reports.

## Architecture

### Base Broker Parser (`base_broker.py`)
Abstract base class that defines the interface all broker parsers must implement:
- `get_hebrew_headings()` - Returns broker-specific Hebrew heading patterns
- `determine_table_type()` - Identifies if a table contains holdings or transactions
- `parse_holding_row()` - Parses a holding row from broker's format
- `parse_transaction_row()` - Parses a transaction row from broker's format  
- `extract_date_from_pdf_text()` - Extracts holding date from PDF header

Common helper methods are also provided in the base class.

### Broker Implementations

#### Excellence Broker (`excellence_broker.py`)
Handles PDF reports from Excellence and Meitav brokers (same format).

**Features:**
- Hebrew heading detection: "תורתי טוריפ" (holdings), "תועונת טוריפ" (transactions)
- Column-based parsing with 12+ column format
- Agorot to Shekel conversion for prices
- Special handling for:
  - Dividends (columns 3, 5 for tax and net amount)
  - Buy/Sell transactions (quantity at col 7, price at col 6)
  - Commission and tax extraction

**Transaction Type Mappings:**
- Hebrew: דנדביד, ביד/, div/ → DIVIDEND
- Hebrew: ףיצר/ק, קנייה, חסמ/ → BUY
- Hebrew: ףיצר/מ, מכירה → SELL

## Adding a New Broker

1. Create a new file: `{broker_name}_broker.py`
2. Implement `BaseBrokerParser` abstract class
3. Add to `BROKER_PARSERS` registry in `__init__.py`

Example:
```python
from .base_broker import BaseBrokerParser

class MyBrokerParser(BaseBrokerParser):
    def get_hebrew_headings(self) -> Dict[str, str]:
        return {
            'holdings': 'your_holdings_heading',
            'transactions': 'your_transactions_heading'
        }
    
    # Implement other required methods...
```

Then register it:
```python
# In __init__.py
from .my_broker_parser import MyBrokerParser

BROKER_PARSERS = {
    'excellence': ExcellenceBrokerParser,
    'mybroker': MyBrokerParser,  # Add your broker here
}
```

## Usage

The `IsraeliStockService` automatically uses the correct broker parser:

```python
service = IsraeliStockService(broker='excellence')
# Parser is automatically initialized based on broker name
```

## Testing

Each broker parser should be tested with:
- Sample PDF files from that broker
- Known good data to verify parsing accuracy
- Edge cases (missing fields, unusual formats)
