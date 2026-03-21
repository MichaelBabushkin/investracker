"""
Excellence/Meitav Broker Parser
Handles PDF parsing for Excellence and Meitav investment reports
"""

import re
import logging
from typing import List, Dict, Optional
from datetime import datetime
import pandas as pd

from .base_broker import BaseBrokerParser

# Set up logger
logger = logging.getLogger(__name__)


class ExcellenceBrokerParser(BaseBrokerParser):
    """Parser for Excellence/Meitav broker PDFs"""
    
    # Default column indices for transaction parsing (Excellence 13-column format)
    # These are used as fallback if dynamic detection fails
    COL_BALANCE = 0          # Remaining balance after transaction
    COL_DATE = 1             # Transaction date (DD/MM/YY)
    COL_AMOUNT = 2           # Transaction amount (ILS)
    COL_TAX = 3              # Tax amount (ILS)
    COL_COMMISSION = 4       # Commission/fees (ILS)
    COL_TOTAL = 5            # Net total (ILS)
    COL_PRICE = 6            # Price per share (in agorot)
    COL_QUANTITY = 7         # Number of shares
    COL_TYPE = 8             # Transaction type (Hebrew)
    COL_DESCRIPTION = 9      # Transaction description
    COL_SECURITY_ID = 10     # Security/Stock ID
    COL_EXECUTION_DATE = 12  # Execution date (rightmost column)
    
    # Hebrew column header patterns for dynamic detection
    # Each key maps to the semantic column name, values are possible Hebrew headers
    # IMPORTANT: Patterns must be specific enough to avoid partial matches
    # e.g., 'סמ' (tax) must not match 'רפסמ\nריינ' (security number)
    HEBREW_COLUMN_PATTERNS = {
        'security_id': ['רפסמ\nריינ', 'רפסמ ריינ'],
        'description': ['ריינ םש', 'םש ריינ'],
        'type': ['גוס\nהעונת', 'גוס העונת'],
        'quantity': ['תומכ'],
        'price': ['עוציב רעש\nהקסע', 'עוציב רעש', 'רעש עוציב'],
        'total': ['םוכס\nיוכיז/בויחל', 'םוכס יוכיז/בויחל', 'יוכיז/בויחל'],
        'commission': ['הלמע'],
        'tax': ['סמ'],
        'balance': ['תיפסכ הרתי'],
        'execution_date': ['ךיראת\nעוציב', 'ךיראת עוציב'],
        'value_date': ['םוי\nךרע', 'םוי ךרע'],
        'time': ['העש'],
        'qty_balance': ['תומכ תרתי'],
    }
    
    def detect_column_indices(self, df: pd.DataFrame) -> Dict[str, int]:
        """Dynamically detect column indices from Hebrew headers.
        
        Returns a mapping from semantic name to column index.
        This handles different PDF formats (12-col vs 13-col) automatically.
        """
        columns = list(df.columns)
        col_map = {}
        
        # Process in order from most-specific (longest patterns) to least-specific
        # This prevents short patterns like 'סמ' from stealing columns meant for 'רפסמ\nריינ'
        # Sort semantic names by the length of their longest pattern (descending)
        sorted_names = sorted(
            self.HEBREW_COLUMN_PATTERNS.keys(),
            key=lambda name: max(len(p) for p in self.HEBREW_COLUMN_PATTERNS[name]),
            reverse=True
        )
        
        claimed_cols = set()  # Track which columns have been claimed
        
        for semantic_name in sorted_names:
            patterns = self.HEBREW_COLUMN_PATTERNS[semantic_name]
            for i, col_header in enumerate(columns):
                if i in claimed_cols:
                    continue  # Skip already-claimed columns
                col_str = str(col_header).strip()
                for pattern in patterns:
                    # Exact match or pattern is a substring of the column header
                    if col_str == pattern or pattern in col_str:
                        col_map[semantic_name] = i
                        claimed_cols.add(i)
                        break
                if semantic_name in col_map:
                    break
        
        # Log detected mapping
        num_cols = len(columns)
        print(f"DEBUG: Dynamic column detection ({num_cols} columns): {col_map}")
        
        return col_map
    
    def get_hebrew_headings(self) -> Dict[str, str]:
        """Hebrew heading patterns for Excellence broker"""
        return {
            'transactions': 'תועונת טוריפ'  # Transactions details
        }
    
    def extract_deposits_withdrawals(self, df: pd.DataFrame, pdf_name: str, holding_date: Optional[datetime] = None) -> List[Dict]:
        """Extract deposits and withdrawals (security_no = 900) from Excellence format"""
        results = []
        
        # Use dynamic column detection
        col_map = self.detect_column_indices(df)
        security_id_col = col_map.get('security_id', self.COL_SECURITY_ID)
        
        # Look for rows with security ID 900
        for idx, row in df.iterrows():
            row_values = [str(val).strip() if pd.notna(val) else '' for val in row.values]
            
            if len(row_values) > security_id_col:
                security_id = str(row_values[security_id_col]).strip()
                
                if security_id == '900':
                    # Verify it's actually a deposit/withdrawal by checking for Hebrew keywords
                    row_str = ' '.join(row_values).lower()
                    
                    # Check for keywords in both directions (Hebrew text can be reversed in CSV)
                    keywords = [
                        'הפקדה', 'העברה', 'משיכה',  # Forward
                        'הדקפה', 'הרבעה', 'הכישמ',  # Reversed (common in CSV extraction)
                        'deposit', 'withdrawal'
                    ]
                    
                    if any(keyword in row_str for keyword in keywords):
                        # Parse the transaction using the standard parser (with month filtering)
                        transaction = self.parse_transaction_row(row, '900', 'CASH', 'Cash Transaction', pdf_name, holding_date, col_map=col_map)
                        if transaction:
                            results.append(transaction)
        
        if results:
            logger.info(f"Excellence extracted {len(results)} deposit/withdrawal transaction(s)")
        
        return results
    
    def determine_table_type(self, df: pd.DataFrame, csv_file: str) -> str:
        """Determine if a CSV contains transactions or holdings data for Excellence"""
        import os
        
        # Analyze content
        columns_str = ' '.join([str(col).lower() for col in df.columns])
        sample_data = ' '.join([str(val).lower() for val in df.iloc[:10].values.flatten() if pd.notna(val)])
        all_content = columns_str + ' ' + sample_data
        
        # Holdings table indicators (specific column structure)
        # Holdings tables have columns like: 'רפסמ ריינ', 'םש ריינ', 'תומכ', 'רעש יחכונ', 'תולע השיכרה', 'יווש ריינ', 'זוחא קיתהמ'
        holdings_indicators = [
            'יחכונ רעש',  # Current price
            'השיכרה תולע',  # Purchase cost
            'קיתהמ זוחא',  # Portfolio percentage
            'ריינ יווש',  # Security value
        ]
        
        holdings_score = sum(1 for indicator in holdings_indicators if indicator in all_content)
        
        # If we have 2 or more holdings indicators, it's definitely a holdings table
        if holdings_score >= 2:
            result = "holdings"
            print(f"DEBUG: {os.path.basename(csv_file)} - Holdings score: {holdings_score}, Result: holdings")
            return result
        
        # Transaction indicators (specific to transaction tables)
        transaction_indicators = [
            'גוס העונת',  # Transaction type column (key indicator!)
            'גוס\nהעונת',  # Transaction type with newline
            'ךיראת\nעוציב',  # Execution date
            'םוי\nךרע',  # Value date
            'יוכיז/בויחל',  # Credit/Debit
            'הלמע',  # Commission
            'עוציב רעש',  # Execution price
        ]
        
        # Count matches
        score = sum(1 for indicator in transaction_indicators if indicator in all_content)
        
        # Look for date patterns in dd/mm/yy format (strong transaction indicator)
        date_patterns = [r'\d{2}/\d{2}/\d{2}', r'\d{1,2}/\d{1,2}/\d{2,4}']
        for pattern in date_patterns:
            if re.search(pattern, sample_data):
                score += 1
        
        # If score is high enough, it's transactions
        result = "transactions" if score >= 2 else "unknown"
        print(f"DEBUG: {os.path.basename(csv_file)} - Transaction score: {score}, Result: {result}")
        return result
    
    def parse_holding_row(self, row: pd.Series, security_no: str, symbol: str,
                         name: str, pdf_name: str, holding_date: Optional[datetime]) -> Optional[Dict]:
        """Holdings are not extracted for Israeli stocks - all data comes from transactions"""
        return None
    
    def parse_transaction_row(self, row: pd.Series, security_no: str, symbol: str,
                            name: str, pdf_name: str, holding_date: Optional[datetime] = None,
                            col_map: Optional[Dict[str, int]] = None) -> Optional[Dict]:
        """Parse Excellence transaction row format with Hebrew mappings.
        
        Args:
            holding_date: Report date - transactions will be filtered to match this month only.
                         This prevents duplicates when uploading multiple monthly reports.
            col_map: Optional pre-computed column mapping. If None, will use default indices.
        """
        row_values = [str(val).strip() if pd.notna(val) else '' for val in row.values]
        row_values_no_commas = [s.replace(',', '') for s in row_values]
        
        # Use dynamic column indices if col_map provided, otherwise fall back to defaults
        if col_map:
            idx_security_id = col_map.get('security_id', self.COL_SECURITY_ID)
            idx_description = col_map.get('description', self.COL_DESCRIPTION)
            idx_type = col_map.get('type', self.COL_TYPE)
            idx_quantity = col_map.get('quantity', self.COL_QUANTITY)
            idx_price = col_map.get('price', self.COL_PRICE)
            idx_total = col_map.get('total', self.COL_TOTAL)
            idx_commission = col_map.get('commission', self.COL_COMMISSION)
            idx_tax = col_map.get('tax', self.COL_TAX)
            idx_balance = col_map.get('balance', self.COL_BALANCE)
            idx_execution_date = col_map.get('execution_date', self.COL_EXECUTION_DATE)
            idx_value_date = col_map.get('value_date', len(row_values) - 1)
        else:
            idx_security_id = self.COL_SECURITY_ID
            idx_description = self.COL_DESCRIPTION
            idx_type = self.COL_TYPE
            idx_quantity = self.COL_QUANTITY
            idx_price = self.COL_PRICE
            idx_total = self.COL_TOTAL
            idx_commission = self.COL_COMMISSION
            idx_tax = self.COL_TAX
            idx_balance = self.COL_BALANCE
            idx_execution_date = self.COL_EXECUTION_DATE
            idx_value_date = len(row_values) - 1
        
        # Detect if this is an international stock
        is_world_stock = self._is_world_stock(name, symbol)
        currency = 'USD' if is_world_stock else 'ILS'
        
        transaction = {
            'security_no': security_no,
            'symbol': symbol,
            'name': name,
            'source_pdf': pdf_name,
            'currency': currency,
            'is_world_stock': is_world_stock
        }
        
        # Excellence Hebrew to English transaction type mapping
        hebrew_mappings = {
            # Dividends
            'דנדביד': 'DIVIDEND',
            'דיבידנד': 'DIVIDEND',
            'ביד/פה': 'DIVIDEND',  # World stocks: Full dividend before tax
            'ביד/': 'DIVIDEND',
            'הפ/דיב': 'DIVIDEND',
            'דיב': 'DIVIDEND',
            'div/': 'DIVIDEND',
            'dividend': 'DIVIDEND',
            
            # Buy transactions
            'ל"וח/ק': 'BUY',  # World stocks: Buy foreign stock
            'ףיצר/ק': 'BUY',
            'ךיצר': 'BUY',
            'קנייה': 'BUY',
            'הינק': 'BUY',  # Buy variant
            'ק/חו"ל': 'BUY',
            'ק/חול': 'BUY',
            'buy': 'BUY',
            
            # Sell transactions
            'ל"וח/מ': 'SELL',  # World stocks: Sell foreign stock
            'מכירה': 'SELL',
            'הריכמ': 'SELL',  # Sell variant
            'ףיצר/מ': 'SELL',
            'מיכור': 'SELL',
            'מכ/שמטל': 'SELL',
            'מ/חו"ל': 'SELL',
            'מ/חול': 'SELL',
            'sell': 'SELL',
            
            # Commission and tax (these should be tracked but not as main transaction types)
            'למע/שמ': 'COMMISSION',  # World stocks: Commission withdrawal
            'חסמ/שמ': 'COMMISSION',  # Commission variant
            'מש/עמל': 'COMMISSION',
            'עמל': 'COMMISSION',
            'סמ/שמ': 'TAX',  # World stocks: Tax withdrawal
            'מש/מסח': 'TAX',
            'מסח': 'TAX',
            
            # Deposits/Withdrawals
            'העברה': 'DEPOSIT',
            'הרבעה': 'DEPOSIT',  # Deposit variant
            'הפקדה': 'DEPOSIT',
            'הדקפה': 'DEPOSIT',  # Deposit variant
            'deposit': 'DEPOSIT',
            'משיכה': 'WITHDRAWAL',
            'הכישמ': 'WITHDRAWAL',  # Withdrawal variant
            'ביר/שמ': 'WITHDRAWAL',  # Withdrawal variant
            'withdrawal': 'WITHDRAWAL'
        }
        
        # Check for security ID 900 (deposits) or description containing העברה
        is_deposit = False
        transaction_type = None
        if len(row_values) > idx_security_id:
            security_id = str(row_values[idx_security_id]).strip()
            description = str(row_values[idx_description]).strip() if len(row_values) > idx_description else ''
            if security_id == '900' or 'העברה' in description.lower() or 'הפקדה' in description.lower():
                is_deposit = True
                transaction_type = 'DEPOSIT'
        
        # Detect transaction type (if not already identified as deposit)
        raw_hebrew_type = None  # Store original Hebrew type for later disambiguation
        if not is_deposit:
            for value in row_values:
                value_str = str(value).strip().lower()
                for hebrew_key, english_type in hebrew_mappings.items():
                    if hebrew_key.lower() in value_str:
                        transaction_type = english_type
                        raw_hebrew_type = hebrew_key  # Store the matched Hebrew key
                        break
                if transaction_type:
                    break
        
        # Extract date and time using column positions
        transaction_date = None
        transaction_time = None
        
        # Priority 1: Value date (rightmost date column) - this is the actual transaction date
        if len(row_values) > idx_value_date:
            val_date = str(row_values[idx_value_date]).strip()
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', val_date)
            if date_match:
                transaction_date = date_match.group(1)
                print(f"DEBUG: Using value date from Col {idx_value_date}: {transaction_date}")
        
        # Priority 2: Execution date column
        if not transaction_date and len(row_values) > idx_execution_date:
            exec_date = str(row_values[idx_execution_date]).strip()
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', exec_date)
            if date_match:
                transaction_date = date_match.group(1)
                print(f"DEBUG: Using execution date from Col {idx_execution_date}: {transaction_date}")
        
        # Priority 2: Settlement date (Col 1) - only if execution date not found
        if not transaction_date and len(row_values) > self.COL_DATE:
            date_candidate = str(row_values[self.COL_DATE]).strip()
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', date_candidate)
            if date_match:
                transaction_date = date_match.group(1)
                print(f"DEBUG: Using settlement date from Col 1: {transaction_date}")
        
        # Fallback: scan all columns for date
        if not transaction_date:
            for value in row_values:
                value_str = str(value).strip()
                date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', value_str)
                if date_match:
                    transaction_date = date_match.group(1)
                    print(f"DEBUG: Using fallback date: {transaction_date}")
                    break
        
        # Extract numeric values
        numeric_values = self.extract_numeric_values(row_values_no_commas)
        
        try:
            transaction['transaction_type'] = transaction_type or 'BUY'
            transaction['raw_hebrew_type'] = raw_hebrew_type  # Store for disambiguation
            
            if transaction_date:
                transaction['transaction_date'] = transaction_date
            if transaction_time:
                transaction['transaction_time'] = transaction_time
            
            # Parse based on transaction type
            if numeric_values:
                if transaction_type == 'DIVIDEND':
                    transaction = self._parse_excellence_dividend(transaction, row_values, numeric_values, col_map)
                elif transaction_type in ('DEPOSIT', 'WITHDRAWAL'):
                    transaction = self._parse_excellence_deposit_withdrawal(transaction, row_values, numeric_values, col_map)
                else:  # BUY or SELL
                    transaction = self._parse_excellence_buy_sell(transaction, row_values, row_values_no_commas, numeric_values, symbol, col_map)
            
            # Only return if we have essential data
            if transaction_type or transaction_date:
                # Filter by report month to prevent duplicates (broker shows 6 months of history)
                if holding_date and transaction_date:
                    try:
                        # Parse transaction date
                        trans_date = self.parse_date_string(transaction_date)
                        if trans_date:
                            # Only include transactions from the same month and year as the report
                            if trans_date.year != holding_date.year or trans_date.month != holding_date.month:
                                print(f"DEBUG: Skipping {symbol} transaction from {transaction_date} (not in report month {holding_date.month}/{holding_date.year})")
                                return None
                    except Exception as e:
                        print(f"DEBUG: Could not parse transaction date {transaction_date} for filtering: {e}")
                        # If we can't parse the date, include it anyway (safer than excluding valid data)
                
                print(f"DEBUG: Excellence transaction - {symbol}: {transaction_type} on {transaction_date}, value: {transaction.get('total_value', 'N/A')}")
                return transaction
            
            return None
                
        except Exception as e:
            print(f"DEBUG: Error parsing Excellence transaction for {symbol}: {e}")
            return None
    
    def _parse_excellence_dividend(self, transaction: Dict, row_values: List[str], 
                                   numeric_values: List[float], col_map: Optional[Dict[str, int]] = None) -> Dict:
        """Parse dividend-specific fields for Excellence format"""
        # Use dynamic indices if available
        idx_total = col_map.get('total', self.COL_TOTAL) if col_map else self.COL_TOTAL
        idx_tax = col_map.get('tax', self.COL_TAX) if col_map else self.COL_TAX
        idx_quantity = col_map.get('quantity', self.COL_QUANTITY) if col_map else self.COL_QUANTITY
        idx_balance = col_map.get('balance', self.COL_BALANCE) if col_map else self.COL_BALANCE
        
        try:
            net_amount = 0
            tax_amount = 0
            
            # Excellence format: total column = net amount, tax column = tax
            if len(row_values) > idx_total and row_values[idx_total]:
                net_amount = float(str(row_values[idx_total]).replace('₪', '').replace(',', '').strip())
            
            if len(row_values) > idx_tax and row_values[idx_tax]:
                tax_amount = float(str(row_values[idx_tax]).replace('₪', '').replace(',', '').strip())
                transaction['tax'] = abs(tax_amount)
            
            # Calculate gross amount
            if net_amount > 0 and tax_amount > 0:
                gross_amount = abs(net_amount) + abs(tax_amount)
                transaction['total_value'] = gross_amount
                print(f"DEBUG: Excellence dividend - Net: {abs(net_amount)}, Tax: {abs(tax_amount)}, Gross: {gross_amount}")
            elif net_amount > 0:
                transaction['total_value'] = abs(net_amount)
            
            # Quantity column: Dividend amount (for world stocks) or Balance column (for Israeli stocks)
            # Try quantity column first (dividend amount in movement column)
            if len(row_values) > idx_quantity and row_values[idx_quantity]:
                dividend_amt = self.clean_numeric_value(row_values[idx_quantity])
                if dividend_amt is not None and dividend_amt != 0:
                    transaction['quantity'] = abs(dividend_amt)
            # Fallback to balance column for Israeli stocks
            elif len(row_values) > idx_balance and row_values[idx_balance]:
                qty = float(str(row_values[idx_balance]).replace('₪', '').replace(',', '').strip())
                if qty > 0:
                    transaction['quantity'] = abs(qty)
                    
        except (ValueError, IndexError):
            # Fallback
            if len(numeric_values) >= 1:
                transaction['total_value'] = abs(numeric_values[0])
            if len(numeric_values) >= 2:
                transaction['tax'] = abs(numeric_values[1]) if numeric_values[1] > 0 else 0
        
        return transaction
    
    def _parse_excellence_buy_sell(self, transaction: Dict, row_values: List[str],
                                   row_values_no_commas: List[str], numeric_values: List[float],
                                   symbol: str, col_map: Optional[Dict[str, int]] = None) -> Dict:
        """Parse buy/sell transaction fields for Excellence format"""
        def to_float(val: str) -> Optional[float]:
            return self.clean_numeric_value(val)
        
        # Use dynamic indices if available
        idx_quantity = col_map.get('quantity', self.COL_QUANTITY) if col_map else self.COL_QUANTITY
        idx_price = col_map.get('price', self.COL_PRICE) if col_map else self.COL_PRICE
        idx_commission = col_map.get('commission', self.COL_COMMISSION) if col_map else self.COL_COMMISSION
        idx_tax = col_map.get('tax', self.COL_TAX) if col_map else self.COL_TAX
        idx_total = col_map.get('total', self.COL_TOTAL) if col_map else self.COL_TOTAL
        
        # Excellence format has 12+ columns with specific positions
        if len(row_values) >= 12:
            print(f"DEBUG: Excellence row with {len(row_values)} columns for {symbol}")
            qty = to_float(row_values[idx_quantity])  # quantity
            price_raw = to_float(row_values[idx_price])  # price (in agorot)
            commission = to_float(row_values[idx_commission]) or 0.0
            tax = to_float(row_values[idx_tax]) or 0.0
            total = to_float(row_values[idx_total])  # net/total
            
            print(f"DEBUG: Excellence extracted - qty={qty}, price={price_raw}, commission={commission}, tax={tax}, total={total}")
            
            if qty is not None:
                transaction['quantity'] = abs(qty)
            if price_raw is not None:
                # Convert agorot to shekels
                transaction['price'] = abs(price_raw / 100.0)
            if commission is not None:
                transaction['commission'] = abs(commission)
            if tax is not None:
                transaction['tax'] = abs(tax)
            if total is not None and total != 0.0:
                transaction['total_value'] = abs(total)
            else:
                # Calculate total when not provided or zero
                if transaction.get('quantity') and transaction.get('price'):
                    base = float(transaction['quantity']) * float(transaction['price'])
                    if transaction['transaction_type'] == 'SELL':
                        transaction['total_value'] = abs(base - commission - tax)
                    else:
                        transaction['total_value'] = abs(base + commission + tax)
        else:
            # Fallback heuristic
            if len(numeric_values) >= 1:
                transaction['total_value'] = abs(numeric_values[0])
            if len(numeric_values) >= 2:
                transaction['quantity'] = abs(numeric_values[1])
            if len(numeric_values) >= 3:
                price_candidate = abs(numeric_values[2])
                transaction['price'] = price_candidate / 100.0 if price_candidate >= 1000 else price_candidate
            if len(numeric_values) >= 4:
                transaction['commission'] = abs(numeric_values[3]) if numeric_values[3] > 0 else 0
            if len(numeric_values) >= 5:
                transaction['tax'] = abs(numeric_values[4]) if numeric_values[4] > 0 else 0
        
        return transaction
    
    def _parse_excellence_deposit_withdrawal(self, transaction: Dict, row_values: List[str],
                                            numeric_values: List[float], col_map: Optional[Dict[str, int]] = None) -> Dict:
        """Parse deposit/withdrawal transaction fields for Excellence format"""
        # Use dynamic indices if available
        idx_total = col_map.get('total', self.COL_TOTAL) if col_map else self.COL_TOTAL
        idx_balance = col_map.get('balance', self.COL_BALANCE) if col_map else self.COL_BALANCE
        idx_description = col_map.get('description', self.COL_DESCRIPTION) if col_map else self.COL_DESCRIPTION
        
        try:
            # Total column: Transaction amount (the actual deposit/withdrawal amount)
            if len(row_values) > idx_total:
                amount = self.clean_numeric_value(row_values[idx_total])
                if amount is not None:
                    transaction['total_value'] = abs(amount)
            
            # Balance column: Balance after transaction
            if len(row_values) > idx_balance:
                balance = self.clean_numeric_value(row_values[idx_balance])
                if balance is not None:
                    # Store as quantity for consistency (represents cash balance)
                    transaction['quantity'] = abs(balance)
            
            # Description column (optional)
            if len(row_values) > idx_description:
                description = str(row_values[idx_description]).strip()
                if description:
                    transaction['description'] = description
            
            print(f"DEBUG: Excellence deposit/withdrawal - Amount: {transaction.get('total_value', 'N/A')}, Balance: {transaction.get('quantity', 'N/A')}")
            
        except (ValueError, IndexError) as e:
            print(f"DEBUG: Error parsing deposit/withdrawal: {e}")
            # Fallback to numeric values
            if len(numeric_values) >= 1:
                transaction['total_value'] = abs(numeric_values[0])
        
        return transaction
    
    def _is_world_stock(self, name: str, symbol: str) -> bool:
        """Detect if a stock is international (world) vs Israeli.
        
        International stocks typically have patterns like:
        - Stock name ends with country code: "NIKE US", "APPLE US", "BP GB"
        - Exchange indicators in parentheses: "CHEVRON (CVX)", "MICROSOFT (MSFT)"
        
        Israeli stocks typically have:
        - Hebrew names or Hebrew company names in English
        - Numeric security IDs
        - No country/exchange suffixes
        """
        if not name:
            return False
        
        name_upper = name.upper().strip()
        
        # Skip cash transactions
        if 'CASH' in name_upper or symbol == '900':
            return False
        
        # Check for country/exchange suffixes - MOST RELIABLE INDICATOR
        world_suffixes = [
            ' US', ' GB', ' FR', ' DE', ' JP', ' CA', ' AU',  # Country codes
            '(US)', '(GB)', '(NYSE)', '(NASDAQ)', '(LSE)',     # Exchange codes
        ]
        
        for suffix in world_suffixes:
            if name_upper.endswith(suffix) or suffix in name_upper:
                return True
        
        # Check for common US stock name patterns with ticker symbols
        # Example: "NIKE (NKE)", "APPLE INC (AAPL)", "CATERPILLAR(CAT" (truncated)
        if re.search(r'\([A-Z]{1,5}\)', name):  # Ticker in parentheses - complete
            return True
        if re.search(r'\([A-Z]{1,5}$', name):  # Ticker in parentheses - truncated (missing closing paren)
            return True
        
        # If none of the above patterns match, it's likely Israeli
        return False
    
    def extract_date_from_pdf_text(self, text: str) -> Optional[datetime]:
        """Extract holding date from Excellence PDF header"""
        lines = text.split('\n')[:10]  # Check first 10 lines
        for line in lines:
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})', line)
            if date_match:
                date_str = date_match.group(1)
                return self.parse_date_string(date_str)
        return None
