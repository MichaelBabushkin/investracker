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
    
    # Column indices for transaction parsing (Excellence format)
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
    
    def get_hebrew_headings(self) -> Dict[str, str]:
        """Hebrew heading patterns for Excellence broker"""
        return {
            'transactions': 'תועונת טוריפ'  # Transactions details
        }
    
    def extract_deposits_withdrawals(self, df: pd.DataFrame, pdf_name: str, holding_date: Optional[datetime] = None) -> List[Dict]:
        """Extract deposits and withdrawals (security_no = 900) from Excellence format"""
        results = []
        
        # Look for rows with security ID 900 in column 10
        for idx, row in df.iterrows():
            row_values = [str(val).strip() if pd.notna(val) else '' for val in row.values]
            
            # Check column 10 (COL_SECURITY_ID) for '900'
            if len(row_values) > self.COL_SECURITY_ID:
                security_id = str(row_values[self.COL_SECURITY_ID]).strip()
                
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
                        transaction = self.parse_transaction_row(row, '900', 'CASH', 'Cash Transaction', pdf_name, holding_date)
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
        """Holdings are no longer extracted - all data comes from transactions"""
        return None
    
    def parse_transaction_row(self, row: pd.Series, security_no: str, symbol: str,
                            name: str, pdf_name: str, holding_date: Optional[datetime] = None) -> Optional[Dict]:
        """Parse Excellence transaction row format with Hebrew mappings.
        
        Args:
            holding_date: Report date - transactions will be filtered to match this month only.
                         This prevents duplicates when uploading multiple monthly reports.
        """
        row_values = [str(val).strip() if pd.notna(val) else '' for val in row.values]
        row_values_no_commas = [s.replace(',', '') for s in row_values]
        
        transaction = {
            'security_no': security_no,
            'symbol': symbol,
            'name': name,
            'source_pdf': pdf_name,
            'currency': 'ILS'
        }
        
        # Excellence Hebrew to English transaction type mapping
        hebrew_mappings = {
            'דנדביד': 'DIVIDEND',
            'דיבידנד': 'DIVIDEND',
            'ביד/': 'DIVIDEND',
            'div/': 'DIVIDEND',
            'dividend': 'DIVIDEND',
            'ףיצר/ק': 'BUY',
            'ךיצר': 'BUY',
            'קנייה': 'BUY',
            'חסמ/': 'BUY',
            'buy': 'BUY',
            'מכירה': 'SELL',
            'ףיצר/מ': 'SELL',
            'מיכור': 'SELL',
            'מכ/שמטל': 'SELL',
            'sell': 'SELL',
            'העברה': 'DEPOSIT',
            'הפקדה': 'DEPOSIT',
            'deposit': 'DEPOSIT',
            'משיכה': 'WITHDRAWAL',
            'withdrawal': 'WITHDRAWAL'
        }
        
        # Check for security ID 900 (deposits) or description containing העברה
        is_deposit = False
        transaction_type = None
        if len(row_values) >= 11:
            security_id = str(row_values[self.COL_SECURITY_ID]).strip()
            description = str(row_values[self.COL_DESCRIPTION]).strip() if len(row_values) > 9 else ''
            if security_id == '900' or 'העברה' in description.lower() or 'הפקדה' in description.lower():
                is_deposit = True
                transaction_type = 'DEPOSIT'
        
        # Detect transaction type (if not already identified as deposit)
        if not is_deposit:
            for value in row_values:
                value_str = str(value).strip().lower()
                for hebrew_key, english_type in hebrew_mappings.items():
                    if hebrew_key.lower() in value_str:
                        transaction_type = english_type
                        break
                if transaction_type:
                    break
        
        # Extract date and time using column positions
        transaction_date = None
        transaction_time = None
        
        # For deposits, prefer the execution date (rightmost column) over transaction date
        if is_deposit and len(row_values) >= 12:
            exec_date = str(row_values[self.COL_EXECUTION_DATE]).strip()
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', exec_date)
            if date_match:
                transaction_date = date_match.group(1)
        
        # If no date found yet, check Column 1: Transaction date (DD/MM/YY format)
        if not transaction_date and len(row_values) > self.COL_DATE:
            date_candidate = str(row_values[self.COL_DATE]).strip()
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', date_candidate)
            if date_match:
                transaction_date = date_match.group(1)
        
        # Column 11 or rightmost: Execution date (also DD/MM/YY) - for non-deposits
        if not transaction_date and len(row_values) >= 12:
            exec_date = str(row_values[self.COL_EXECUTION_DATE]).strip()
            # Use execution date if no transaction date found
            if not transaction_date:
                date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', exec_date)
                if date_match:
                    transaction_date = date_match.group(1)
        
        # Fallback: scan all columns for date
        if not transaction_date:
            for value in row_values:
                value_str = str(value).strip()
                date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', value_str)
                if date_match:
                    transaction_date = date_match.group(1)
                    break
        
        # Extract numeric values
        numeric_values = self.extract_numeric_values(row_values_no_commas)
        
        try:
            transaction['transaction_type'] = transaction_type or 'BUY'
            
            if transaction_date:
                transaction['transaction_date'] = transaction_date
            if transaction_time:
                transaction['transaction_time'] = transaction_time
            
            # Parse based on transaction type
            if numeric_values:
                if transaction_type == 'DIVIDEND':
                    transaction = self._parse_excellence_dividend(transaction, row_values, numeric_values)
                elif transaction_type in ('DEPOSIT', 'WITHDRAWAL'):
                    transaction = self._parse_excellence_deposit_withdrawal(transaction, row_values, numeric_values)
                else:  # BUY or SELL
                    transaction = self._parse_excellence_buy_sell(transaction, row_values, row_values_no_commas, numeric_values, symbol)
            
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
                                   numeric_values: List[float]) -> Dict:
        """Parse dividend-specific fields for Excellence format"""
        try:
            net_amount = 0
            tax_amount = 0
            
            # Excellence format: Column 5 = net amount, Column 3 = tax
            if len(row_values) >= 6 and row_values[5]:
                net_amount = float(str(row_values[5]).replace('₪', '').replace(',', '').strip())
            
            if len(row_values) >= 4 and row_values[3]:
                tax_amount = float(str(row_values[3]).replace('₪', '').replace(',', '').strip())
                transaction['tax'] = abs(tax_amount)
            
            # Calculate gross amount
            if net_amount > 0 and tax_amount > 0:
                gross_amount = abs(net_amount) + abs(tax_amount)
                transaction['total_value'] = gross_amount
                print(f"DEBUG: Excellence dividend - Net: {abs(net_amount)}, Tax: {abs(tax_amount)}, Gross: {gross_amount}")
            elif net_amount > 0:
                transaction['total_value'] = abs(net_amount)
            
            # Column 0: Remaining quantity
            if len(row_values) >= 1 and row_values[0]:
                qty = float(str(row_values[0]).replace('₪', '').replace(',', '').strip())
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
                                   symbol: str) -> Dict:
        """Parse buy/sell transaction fields for Excellence format"""
        def to_float(val: str) -> Optional[float]:
            return self.clean_numeric_value(val)
        
        # Excellence format has 12+ columns with specific positions
        if len(row_values) >= 12:
            print(f"DEBUG: Excellence row with {len(row_values)} columns for {symbol}")
            qty = to_float(row_values[7])  # quantity
            price_raw = to_float(row_values[6])  # price (in agorot)
            commission = to_float(row_values[4]) or 0.0
            tax = to_float(row_values[3]) or 0.0
            total = to_float(row_values[5])  # net/total
            
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
            if total is not None:
                transaction['total_value'] = abs(total)
            else:
                # Calculate total
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
                                            numeric_values: List[float]) -> Dict:
        """Parse deposit/withdrawal transaction fields for Excellence format"""
        try:
            # Column 5: Transaction amount (the actual deposit/withdrawal amount)
            if len(row_values) > self.COL_TOTAL:
                amount = self.clean_numeric_value(row_values[self.COL_TOTAL])
                if amount is not None:
                    transaction['total_value'] = abs(amount)
            
            # Column 0: Balance after transaction
            if len(row_values) > self.COL_BALANCE:
                balance = self.clean_numeric_value(row_values[self.COL_BALANCE])
                if balance is not None:
                    # Store as quantity for consistency (represents cash balance)
                    transaction['quantity'] = abs(balance)
            
            # Column 9: Description (optional)
            if len(row_values) > self.COL_DESCRIPTION:
                description = str(row_values[self.COL_DESCRIPTION]).strip()
                if description:
                    transaction['description'] = description
            
            print(f"DEBUG: Excellence deposit/withdrawal - Amount: {transaction.get('total_value', 'N/A')}, Balance: {transaction.get('quantity', 'N/A')}")
            
        except (ValueError, IndexError) as e:
            print(f"DEBUG: Error parsing deposit/withdrawal: {e}")
            # Fallback to numeric values
            if len(numeric_values) >= 1:
                transaction['total_value'] = abs(numeric_values[0])
        
        return transaction
    
    def extract_date_from_pdf_text(self, text: str) -> Optional[datetime]:
        """Extract holding date from Excellence PDF header"""
        lines = text.split('\n')[:10]  # Check first 10 lines
        for line in lines:
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})', line)
            if date_match:
                date_str = date_match.group(1)
                return self.parse_date_string(date_str)
        return None
