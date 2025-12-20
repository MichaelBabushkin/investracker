"""
Excellence/Meitav Broker Parser
Handles PDF parsing for Excellence and Meitav investment reports
"""

import re
from typing import List, Dict, Optional
from datetime import datetime
import pandas as pd

from .base_broker import BaseBrokerParser


class ExcellenceBrokerParser(BaseBrokerParser):
    """Parser for Excellence/Meitav broker PDFs"""
    
    def get_hebrew_headings(self) -> Dict[str, str]:
        """Hebrew heading patterns for Excellence broker"""
        return {
            'holdings': 'תורתי טוריפ',  # Holdings details
            'transactions': 'תועונת טוריפ'  # Transactions details
        }
    
    def determine_table_type(self, df: pd.DataFrame, csv_file: str) -> str:
        """Determine if a CSV contains holdings or transactions data for Excellence"""
        import os
        filename_lower = os.path.basename(csv_file).lower()
        
        # Analyze content
        columns_str = ' '.join([str(col).lower() for col in df.columns])
        sample_data = ' '.join([str(val).lower() for val in df.iloc[:10].values.flatten() if pd.notna(val)])
        all_content = columns_str + ' ' + sample_data
        
        holdings_indicators = [
            'current', 'holding', 'position', 'portfolio', 'balance',
            'market value', 'זוחא', 'יווש', 'יחכונ רעש', 'השיכרה תולע', 'קיתהמ',
            'תומכ', 'ריינ םש', 'ריינ רפסמ'
        ]
        
        transaction_indicators = [
            'buy', 'sell', 'transaction', 'trade', 'date', 'activity',
            'קנייה', 'מכירה', 'עסקה', 'ךיראת', 'דנדביד', 'ףיצר', 'גוס הקסע',
            'divid', 'div/', 'ביד/', 'חסמ/', '/05/', '/04/', '/03/', '/02/', '/01/',
            'הקסע', 'תועונת', 'םוי ךרע', 'גוס\nהעונת', 'ךיראת\nעוציב', 'םוי\nךרע'
        ]
        
        holdings_score = sum(1 for indicator in holdings_indicators if indicator in all_content)
        transaction_score = sum(1 for indicator in transaction_indicators if indicator in all_content)
        
        # Look for date patterns (strong transaction indicator)
        date_patterns = [r'\d{2}/\d{2}/\d{2}', r'\d{1,2}/\d{1,2}/\d{2,4}']
        for pattern in date_patterns:
            if re.search(pattern, sample_data):
                transaction_score += 2
        
        # Multi-line headers (common in transaction tables)
        if any('\\n' in str(col) for col in df.columns):
            transaction_score += 2
        
        # Transaction type columns in Hebrew
        transaction_type_keywords = ['גוס העונת', 'גוס\nהעונת', 'ביד/', 'חסמ/', 'הדקפה', 'הכישמ']
        if any(keyword in all_content for keyword in transaction_type_keywords):
            transaction_score += 3
        
        # Special case: Page 1 Table 1 with strong holdings indicators
        if 'page_1_table_1' in filename_lower and holdings_score >= 4:
            print(f"DEBUG: {os.path.basename(csv_file)} - Forced to HOLDINGS (Page 1 Table 1 with strong indicators)")
            return "holdings"
        
        result = "transactions" if transaction_score > holdings_score else "holdings"
        print(f"DEBUG: {os.path.basename(csv_file)} - Excellence analysis: Holdings={holdings_score}, Transactions={transaction_score}, Result={result}")
        return result
    
    def parse_holding_row(self, row: pd.Series, security_no: str, symbol: str,
                         name: str, pdf_name: str, holding_date: Optional[datetime]) -> Optional[Dict]:
        """Parse Excellence holding row format"""
        row_values = [str(val).replace(',', '') if pd.notna(val) else '' for val in row.values]
        
        holding = {
            'security_no': security_no,
            'symbol': symbol,
            'name': name,
            'source_pdf': pdf_name,
            'holding_date': holding_date,
            'currency': 'ILS'
        }
        
        try:
            # Excellence format: portfolio_percentage, current_value, purchase_cost, last_price, quantity
            if len(row_values) > 0 and row_values[0]:
                holding['portfolio_percentage'] = float(row_values[0])
            if len(row_values) > 1 and row_values[1]:
                holding['current_value'] = float(row_values[1])
            if len(row_values) > 2 and row_values[2]:
                holding['purchase_cost'] = float(row_values[2])
            if len(row_values) > 3 and row_values[3]:
                holding['last_price'] = float(row_values[3])
            if len(row_values) > 4 and row_values[4]:
                holding['quantity'] = float(row_values[4])
        except (ValueError, TypeError):
            pass
        
        return holding
    
    def parse_transaction_row(self, row: pd.Series, security_no: str, symbol: str,
                            name: str, pdf_name: str) -> Optional[Dict]:
        """Parse Excellence transaction row format with Hebrew mappings"""
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
            'מכירה': 'SELL',
            'ףיצר/מ': 'SELL',
            'מיכור': 'SELL',
            'חסמ/': 'BUY',
            'buy': 'BUY',
            'sell': 'SELL',
            'הפקדה': 'DEPOSIT',
            'deposit': 'DEPOSIT',
            'משיכה': 'WITHDRAWAL',
            'withdrawal': 'WITHDRAWAL'
        }
        
        # Detect transaction type
        transaction_type = None
        for value in row_values:
            value_str = str(value).strip().lower()
            for hebrew_key, english_type in hebrew_mappings.items():
                if hebrew_key.lower() in value_str:
                    transaction_type = english_type
                    break
            if transaction_type:
                break
        
        # Extract date and time
        transaction_date = None
        transaction_time = None
        
        # Try column-based extraction first (Excellence format has 12+ columns)
        if len(row_values) >= 12:
            date_candidate = row_values[1]
            time_candidate = row_values[11]
            m = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', date_candidate or '')
            if m:
                transaction_date = m.group(1)
            tm = re.search(r'\b(\d{1,2}:\d{2})\b', time_candidate or '')
            if tm:
                transaction_time = tm.group(1)
        
        # Fallback: scan entire row
        if not transaction_date:
            for value in row_values:
                value_str = str(value).strip()
                date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', value_str)
                if date_match:
                    transaction_date = date_match.group(1)
                    break
        
        if not transaction_time:
            for value in row_values:
                value_str = str(value).strip()
                time_match = re.search(r'\b(\d{1,2}:\d{2})\b', value_str)
                if time_match:
                    transaction_time = time_match.group(1)
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
                else:
                    transaction = self._parse_excellence_buy_sell(transaction, row_values, row_values_no_commas, numeric_values, symbol)
            
            # Only return if we have essential data
            if transaction_type or transaction_date:
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
    
    def extract_date_from_pdf_text(self, text: str) -> Optional[datetime]:
        """Extract holding date from Excellence PDF header"""
        lines = text.split('\n')[:10]  # Check first 10 lines
        for line in lines:
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})', line)
            if date_match:
                date_str = date_match.group(1)
                return self.parse_date_string(date_str)
        return None
