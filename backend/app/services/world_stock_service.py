"""
World Stock Analysis Service
Handles PDF processing and world stock analysis for US broker reports
"""

import os
import sys
import re
import json
import pdfplumber
import psycopg2
from datetime import datetime
from decimal import Decimal, InvalidOperation
from dotenv import load_dotenv
from typing import List, Dict, Tuple, Optional

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import SQLAlchemy models
try:
    from app.models.world_stock import (
        WorldStockAccount,
        WorldStockHolding,
        WorldStockTransaction,
        WorldStockDividend,
        WorldStockPerformance
    )
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False


class WorldStockService:
    """Service for processing world stock data from PDF reports"""
    
    def __init__(self):
        load_dotenv()
        self.db_url = os.getenv('DATABASE_URL')
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5433'),
            'database': os.getenv('DB_NAME', 'investracker_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        
    def create_database_connection(self):
        """Create and return a database connection"""
        try:
            if self.db_url:
                return psycopg2.connect(self.db_url)
            return psycopg2.connect(**self.db_config)
        except Exception as e:
            dsn = os.getenv('DATABASE_URL')
            if dsn:
                return psycopg2.connect(dsn)
            raise e
    
    def extract_text_from_pdf(self, pdf_path: str, max_pages: int = 3) -> str:
        """Extract text from first few pages of PDF for account info"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for i, page in enumerate(pdf.pages):
                    if i >= max_pages:
                        break
                    text += page.extract_text() or ""
                    text += "\n\n"
                return text
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {e}")
    
    def extract_account_info(self, text: str) -> Dict:
        """Extract account information from PDF text"""
        account_info = {}
        
        # Extract account number (e.g., "Account: U12858314")
        account_match = re.search(r'Account:\s*([A-Z0-9]+)', text)
        if account_match:
            account_info['account_number'] = account_match.group(1)
        
        # Extract alias (e.g., "Alias: XNES627410")
        alias_match = re.search(r'Alias:\s*([A-Z0-9]+)', text)
        if alias_match:
            account_info['account_alias'] = alias_match.group(1)
        
        # Extract broker name
        broker_match = re.search(r'(Excellence.*?Ltd\.)', text, re.IGNORECASE)
        if broker_match:
            account_info['broker_name'] = broker_match.group(1)
        
        # Extract report date range
        date_pattern = r'(\d{1,2}/\d{1,2}/\d{4})'
        dates = re.findall(date_pattern, text[:2000])  # Look in first part of document
        if len(dates) >= 2:
            account_info['report_start_date'] = self.parse_date_string(dates[0])
            account_info['report_end_date'] = self.parse_date_string(dates[1])
        
        account_info['base_currency'] = 'USD'
        account_info['account_type'] = 'Individual'
        
        return account_info
    
    def parse_date_string(self, date_str: str) -> Optional[datetime]:
        """Parse a date string into a date object"""
        if not date_str:
            return None
        
        date_str = date_str.strip()
        date_formats = [
            '%m/%d/%Y', '%d/%m/%Y', '%m/%d/%y', '%d/%m/%y',
            '%Y/%m/%d', '%Y-%m-%d', '%d-%m-%Y', '%m-%d-%Y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None
    
    def parse_decimal(self, value_str: str) -> Optional[Decimal]:
        """Parse a string to Decimal, handling various formats"""
        if not value_str or value_str == '-' or value_str.strip() == '':
            return None
        
        try:
            # Remove commas and other formatting
            cleaned = value_str.replace(',', '').replace('$', '').replace('(', '-').replace(')', '').strip()
            return Decimal(cleaned)
        except (InvalidOperation, ValueError):
            return None
    
    def extract_holdings_from_text(self, text: str, pdf_name: str) -> List[Dict]:
        """Extract holdings/positions from PDF text"""
        holdings = []
        
        # Look for "Open Positions" section
        open_pos_match = re.search(r'Open Positions.*?(?=\n\n|\Z)', text, re.DOTALL)
        if not open_pos_match:
            return holdings
        
        section = open_pos_match.group(0)
        lines = section.split('\n')
        
        # Find table data lines (skip headers)
        data_started = False
        for line in lines:
            if 'Symbol' in line or 'Quantity' in line:
                data_started = True
                continue
            
            if not data_started:
                continue
            
            # Match line with stock data: Symbol Company Qty Price Value
            # Example: "AAPL Apple Inc. 100 150.00 15,000.00"
            parts = line.split()
            if len(parts) >= 5:
                try:
                    holding = {
                        'symbol': parts[0],
                        'company_name': ' '.join(parts[1:-4]),  # Company name
                        'quantity': self.parse_decimal(parts[-4]),
                        'current_price': self.parse_decimal(parts[-3]),
                        'current_value': self.parse_decimal(parts[-2]),
                        'unrealized_pl': self.parse_decimal(parts[-1]),
                        'source_pdf': pdf_name
                    }
                    
                    if holding['symbol'] and holding['quantity']:
                        holdings.append(holding)
                except Exception as e:
                    continue
        
        return holdings
    
    def extract_holdings_from_tables(self, pdf_path: str, pdf_name: str) -> List[Dict]:
        """Extract holdings from PDF tables"""
        holdings = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    
                    # Look for "Open Positions" or "Mark-to-Market" section
                    if 'Open Positions' not in text and 'Mark-to-Market' not in text:
                        continue
                    
                    tables = page.extract_tables()
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        # Find header row
                        header_row = None
                        data_start_idx = 0
                        for idx, row in enumerate(table):
                            row_str = ' '.join([str(cell) for cell in row if cell])
                            if 'Symbol' in row_str or 'Quantity' in row_str:
                                header_row = row
                                data_start_idx = idx + 1
                                break
                        
                        if header_row is None:
                            continue
                        
                        # Map columns
                        col_map = {}
                        for idx, header in enumerate(header_row):
                            if header:
                                header_lower = str(header).lower().strip()
                                if 'symbol' in header_lower:
                                    col_map['symbol'] = idx
                                elif 'company' in header_lower or 'name' in header_lower or 'description' in header_lower:
                                    col_map['company'] = idx
                                elif 'quantity' in header_lower or 'qty' in header_lower:
                                    col_map['quantity'] = idx
                                elif 'price' in header_lower and 'avg' not in header_lower:
                                    col_map['price'] = idx
                                elif 'avg' in header_lower and 'price' in header_lower:
                                    col_map['avg_price'] = idx
                                elif 'value' in header_lower or 'market' in header_lower:
                                    col_map['value'] = idx
                                elif 'p/l' in header_lower or 'p&l' in header_lower or 'gain' in header_lower:
                                    col_map['pl'] = idx
                                elif 'cost' in header_lower or 'basis' in header_lower:
                                    col_map['cost'] = idx
                        
                        # Extract data rows
                        for row in table[data_start_idx:]:
                            if not row or len(row) == 0:
                                continue
                            
                            # Check if it's a data row (has symbol)
                            if 'symbol' not in col_map:
                                continue
                            
                            symbol = row[col_map['symbol']]
                            if not symbol or len(str(symbol).strip()) == 0:
                                continue
                            
                            holding = {
                                'symbol': str(symbol).strip(),
                                'company_name': row[col_map.get('company')] if 'company' in col_map else None,
                                'quantity': self.parse_decimal(str(row[col_map['quantity']])) if 'quantity' in col_map else None,
                                'current_price': self.parse_decimal(str(row[col_map.get('price')])) if 'price' in col_map else None,
                                'avg_entry_price': self.parse_decimal(str(row[col_map.get('avg_price')])) if 'avg_price' in col_map else None,
                                'current_value': self.parse_decimal(str(row[col_map.get('value')])) if 'value' in col_map else None,
                                'purchase_cost': self.parse_decimal(str(row[col_map.get('cost')])) if 'cost' in col_map else None,
                                'unrealized_pl': self.parse_decimal(str(row[col_map.get('pl')])) if 'pl' in col_map else None,
                                'source_pdf': pdf_name
                            }
                            
                            # Calculate missing values
                            if holding['unrealized_pl'] and holding['current_value'] and holding['purchase_cost'] is None:
                                holding['purchase_cost'] = holding['current_value'] - holding['unrealized_pl']
                            
                            if holding['unrealized_pl'] and holding['purchase_cost'] and holding['purchase_cost'] != 0:
                                holding['unrealized_pl_percent'] = (holding['unrealized_pl'] / holding['purchase_cost']) * 100
                            
                            holdings.append(holding)
        
        except Exception as e:
            print(f"Error extracting holdings from tables: {e}")
        
        return holdings
    
    def extract_transactions_from_tables(self, pdf_path: str, pdf_name: str) -> List[Dict]:
        """Extract transactions from PDF tables"""
        transactions = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    
                    # Look for "Detailed Trade History" section
                    if 'Trade History' not in text and 'Transactions' not in text:
                        continue
                    
                    tables = page.extract_tables()
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        # Find header row
                        header_row = None
                        data_start_idx = 0
                        for idx, row in enumerate(table):
                            row_str = ' '.join([str(cell) for cell in row if cell])
                            if 'Symbol' in row_str or 'Date' in row_str or 'Trade' in row_str:
                                header_row = row
                                data_start_idx = idx + 1
                                break
                        
                        if header_row is None:
                            continue
                        
                        # Map columns
                        col_map = {}
                        for idx, header in enumerate(header_row):
                            if header:
                                header_lower = str(header).lower().strip()
                                if 'symbol' in header_lower:
                                    col_map['symbol'] = idx
                                elif 'date' in header_lower and 'time' not in header_lower:
                                    col_map['date'] = idx
                                elif 'time' in header_lower:
                                    col_map['time'] = idx
                                elif 'quantity' in header_lower or 'qty' in header_lower:
                                    col_map['quantity'] = idx
                                elif 'trade price' in header_lower or 'exec price' in header_lower:
                                    col_map['trade_price'] = idx
                                elif 'close price' in header_lower:
                                    col_map['close_price'] = idx
                                elif 'proceeds' in header_lower:
                                    col_map['proceeds'] = idx
                                elif 'commission' in header_lower:
                                    col_map['commission'] = idx
                                elif 'basis' in header_lower and 'cost' in header_lower:
                                    col_map['basis'] = idx
                                elif 'realized' in header_lower and 'p/l' in header_lower:
                                    col_map['realized_pl'] = idx
                                elif 'mtm' in header_lower or 'mark' in header_lower:
                                    col_map['mtm_pl'] = idx
                                elif 'code' in header_lower or 'type' in header_lower:
                                    col_map['trade_code'] = idx
                        
                        # Extract data rows
                        for row in table[data_start_idx:]:
                            if not row or len(row) == 0:
                                continue
                            
                            if 'symbol' not in col_map or 'date' not in col_map:
                                continue
                            
                            symbol = row[col_map['symbol']]
                            date_str = row[col_map['date']]
                            
                            if not symbol or not date_str:
                                continue
                            
                            transaction = {
                                'symbol': str(symbol).strip(),
                                'transaction_date': self.parse_date_string(str(date_str)),
                                'transaction_time': str(row[col_map['time']]).strip() if 'time' in col_map and row[col_map['time']] else None,
                                'quantity': self.parse_decimal(str(row[col_map['quantity']])) if 'quantity' in col_map else None,
                                'trade_price': self.parse_decimal(str(row[col_map.get('trade_price')])) if 'trade_price' in col_map else None,
                                'close_price': self.parse_decimal(str(row[col_map.get('close_price')])) if 'close_price' in col_map else None,
                                'proceeds': self.parse_decimal(str(row[col_map.get('proceeds')])) if 'proceeds' in col_map else None,
                                'commission': self.parse_decimal(str(row[col_map.get('commission')])) if 'commission' in col_map else None,
                                'basis': self.parse_decimal(str(row[col_map.get('basis')])) if 'basis' in col_map else None,
                                'realized_pl': self.parse_decimal(str(row[col_map.get('realized_pl')])) if 'realized_pl' in col_map else None,
                                'mtm_pl': self.parse_decimal(str(row[col_map.get('mtm_pl')])) if 'mtm_pl' in col_map else None,
                                'trade_code': str(row[col_map['trade_code']]).strip() if 'trade_code' in col_map and row[col_map['trade_code']] else None,
                                'source_pdf': pdf_name
                            }
                            
                            # Determine transaction type from trade code
                            if transaction['trade_code']:
                                code = transaction['trade_code'].upper()
                                if 'O' in code:
                                    transaction['transaction_type'] = 'OPEN'
                                elif 'C' in code:
                                    transaction['transaction_type'] = 'CLOSE'
                                elif 'P' in code:
                                    transaction['transaction_type'] = 'PARTIAL'
                                else:
                                    transaction['transaction_type'] = code
                            elif transaction['quantity'] and transaction['quantity'] > 0:
                                transaction['transaction_type'] = 'BUY'
                            elif transaction['quantity'] and transaction['quantity'] < 0:
                                transaction['transaction_type'] = 'SELL'
                            
                            transactions.append(transaction)
        
        except Exception as e:
            print(f"Error extracting transactions from tables: {e}")
        
        return transactions
    
    def extract_dividends_from_tables(self, pdf_path: str, pdf_name: str) -> List[Dict]:
        """Extract dividends from PDF tables - handles both 'Dividends' and 'Withholding Tax' tables"""
        dividends = []
        withholding_tax_map = {}  # Map to store withholding tax by date+symbol
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # First pass: collect all withholding tax data
                print("\n" + "="*80)
                print("FIRST PASS: Collecting withholding tax data...")
                print("="*80)
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    
                    # Skip pages without "Withholding Tax" heading
                    if 'Withholding Tax' not in text:
                        continue
                    
                    print(f"\nPage {page_num + 1}: Found 'Withholding Tax' in text")
                    
                    tables = page.extract_tables()
                    for table_idx, table in enumerate(tables):
                        if not table or len(table) < 2:
                            continue
                        
                        # Check if this is specifically a Withholding Tax table (not Dividends)
                        first_row_text = ' '.join([str(cell) for cell in table[0] if cell]).strip()
                        
                        # Only process if header says "Withholding Tax", NOT "Dividends"
                        if 'Withholding Tax' in first_row_text and 'Dividend' not in first_row_text:
                            print(f"  Table {table_idx + 1}: Processing Withholding Tax table")
                            print(f"    Header: {first_row_text}")
                            
                            # Expected columns: Date USD | Description | Amount | Code
                            for row_idx, row in enumerate(table):
                                if row_idx == 0:  # Skip header
                                    continue
                                
                                if not row or len(row) < 3:
                                    continue
                                
                                # Extract date, description, and amount
                                date_str = str(row[0]).strip() if row[0] else None
                                description = str(row[1]).strip() if len(row) > 1 and row[1] else None
                                amount_str = str(row[2]).strip() if len(row) > 2 and row[2] else None
                                
                                if not date_str or date_str in ['Date', 'USD', 'None', '', 'Total']:
                                    continue
                                
                                if not description or not amount_str:
                                    continue
                                
                                # Extract symbol from description (e.g., "LOW(US5486611073)" -> "LOW")
                                symbol = None
                                if '(' in description:
                                    symbol = description.split('(')[0].strip()
                                
                                if symbol:
                                    # Parse date and amount
                                    payment_date = self.parse_date_string(date_str)
                                    withholding_tax = self.parse_decimal(amount_str)
                                    
                                    if payment_date and withholding_tax:
                                        # Create key for mapping
                                        key = f"{payment_date}_{symbol}"
                                        tax_value = abs(withholding_tax)  # Store as positive value
                                        withholding_tax_map[key] = tax_value
                                        print(f"    ✓ {key}: ${tax_value}")
                
                print(f"\n{'='*80}")
                print(f"Collected {len(withholding_tax_map)} withholding tax entries")
                print(f"{'='*80}\n")
                
                # Second pass: collect all dividend data
                print("="*80)
                print("SECOND PASS: Collecting dividend data...")
                print("="*80)
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    
                    # Skip pages without dividend information
                    if 'Dividend' not in text:
                        continue
                    
                    print(f"\nPage {page_num + 1}: Found 'Dividend' in text")
                    
                    tables = page.extract_tables()
                    for table_idx, table in enumerate(tables):
                        if not table or len(table) < 2:
                            continue
                        
                        first_row_text = ' '.join([str(cell) for cell in table[0] if cell]).strip()
                        
                        # Only process if header says "Dividends", NOT "Withholding Tax"
                        if 'Dividends' in first_row_text and 'Withholding' not in first_row_text:
                            print(f"  Table {table_idx + 1}: Processing Dividends table")
                            print(f"    Header: {first_row_text}")
                            
                            # Expected columns: Date USD | Description | Amount
                            for row_idx, row in enumerate(table):
                                if row_idx == 0:  # Skip header
                                    continue
                                
                                if not row or len(row) < 3:
                                    continue
                                
                                # Extract date, description, and amount
                                date_str = str(row[0]).strip() if row[0] else None
                                description = str(row[1]).strip() if len(row) > 1 and row[1] else None
                                amount_str = str(row[2]).strip() if len(row) > 2 and row[2] else None
                                
                                if not date_str or date_str in ['Date', 'USD', 'None', '', 'Total']:
                                    continue
                                
                                if not description or not amount_str:
                                    continue
                                
                                # Extract symbol from description (e.g., "LOW(US5486611073)" -> "LOW")
                                symbol = None
                                if '(' in description:
                                    symbol = description.split('(')[0].strip()
                                
                                if not symbol:
                                    continue
                                
                                # Parse date and amount
                                payment_date = self.parse_date_string(date_str)
                                gross_amount = self.parse_decimal(amount_str)
                                
                                if not payment_date or not gross_amount:
                                    continue
                                
                                # Look up withholding tax
                                key = f"{payment_date}_{symbol}"
                                withholding_tax = withholding_tax_map.get(key, Decimal('0'))
                                
                                # Calculate net amount
                                # Method 1: Subtract withholding tax from gross
                                net_amount = gross_amount - withholding_tax
                                
                                # If no withholding tax found, assume 25% US tax (75% net)
                                if withholding_tax == 0:
                                    net_amount = gross_amount * Decimal('0.75')
                                    withholding_tax = gross_amount * Decimal('0.25')
                                
                                dividend = {
                                    'symbol': symbol,
                                    'payment_date': payment_date,
                                    'amount': gross_amount,
                                    'gross_amount': gross_amount,
                                    'withholding_tax': withholding_tax if withholding_tax > 0 else None,
                                    'net_amount': net_amount,
                                    'description': description,
                                    'dividend_type': 'Cash Dividend',
                                    'source_pdf': pdf_name
                                }
                                
                                dividends.append(dividend)
                                print(f"    ✓ {symbol} on {payment_date}: Gross=${gross_amount}, Tax=${withholding_tax}, Net=${net_amount}")
        
        except Exception as e:
            print(f"Error extracting dividends from tables: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n{'='*80}")
        print(f"Total dividends extracted: {len(dividends)}")
        print(f"{'='*80}\n")
        return dividends
    
    def process_pdf_report(self, pdf_path: str, user_id: str) -> Dict:
        """Main function to process a PDF world stock report"""
        try:
            pdf_name = os.path.basename(pdf_path)
            
            print(f"Step 1: Extracting account info...")
            # Extract text for account info (only first few pages)
            text = self.extract_text_from_pdf(pdf_path, max_pages=2)
            account_info = self.extract_account_info(text)
            
            print(f"Step 2: Extracting holdings...")
            # Extract data from tables
            holdings = self.extract_holdings_from_tables(pdf_path, pdf_name)
            
            print(f"Step 3: Extracting transactions...")
            transactions = self.extract_transactions_from_tables(pdf_path, pdf_name)
            
            print(f"Step 4: Extracting dividends...")
            dividends = self.extract_dividends_from_tables(pdf_path, pdf_name)
            
            print(f"DEBUG: Found {len(holdings)} holdings, {len(transactions)} transactions, {len(dividends)} dividends")
            
            print(f"Step 5: Saving to database...")
            # Save to database
            account_id = self.save_account_to_database(account_info, user_id)
            
            if account_id:
                holdings_saved = self.save_holdings_to_database(holdings, user_id, account_id) if holdings else 0
                transactions_saved = self.save_transactions_to_database(transactions, user_id, account_id) if transactions else 0
                dividends_saved = self.save_dividends_to_database(dividends, user_id, account_id) if dividends else 0
            else:
                holdings_saved = transactions_saved = dividends_saved = 0
            
            return {
                'success': True,
                'pdf_name': pdf_name,
                'account_number': account_info.get('account_number'),
                'account_id': account_id,
                'holdings_found': len(holdings),
                'transactions_found': len(transactions),
                'dividends_found': len(dividends),
                'holdings_saved': holdings_saved,
                'transactions_saved': transactions_saved,
                'dividends_saved': dividends_saved
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'error': str(e)}
    
    def save_account_to_database(self, account_info: Dict, user_id: str) -> Optional[int]:
        """Save account information to database"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # Check if account already exists
            cursor.execute(
                'SELECT id FROM "WorldStockAccount" WHERE account_number = %s AND user_id = %s',
                (account_info.get('account_number'), user_id)
            )
            result = cursor.fetchone()
            
            if result:
                account_id = result[0]
                # Update existing account
                cursor.execute('''
                    UPDATE "WorldStockAccount" 
                    SET account_alias = %s, broker_name = %s, base_currency = %s, 
                        account_type = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                ''', (
                    account_info.get('account_alias'),
                    account_info.get('broker_name'),
                    account_info.get('base_currency', 'USD'),
                    account_info.get('account_type'),
                    account_id
                ))
            else:
                # Insert new account
                cursor.execute('''
                    INSERT INTO "WorldStockAccount" 
                    (user_id, account_number, account_alias, account_type, base_currency, broker_name)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    user_id,
                    account_info.get('account_number'),
                    account_info.get('account_alias'),
                    account_info.get('account_type'),
                    account_info.get('base_currency', 'USD'),
                    account_info.get('broker_name')
                ))
                account_id = cursor.fetchone()[0]
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return account_id
            
        except Exception as e:
            print(f"Error saving account to database: {e}")
            return None
    
    def save_holdings_to_database(self, holdings: List[Dict], user_id: str, account_id: int) -> int:
        """Save holdings to database"""
        if not holdings:
            return 0
        
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # Clear existing holdings for this account
            cursor.execute('DELETE FROM "WorldStockHolding" WHERE user_id = %s AND account_id = %s', 
                         (user_id, account_id))
            
            saved_count = 0
            for holding in holdings:
                try:
                    cursor.execute('''
                        INSERT INTO "WorldStockHolding" 
                        (user_id, account_id, symbol, company_name, quantity, avg_entry_price,
                         current_price, current_value, purchase_cost, unrealized_pl, 
                         unrealized_pl_percent, currency, source_pdf)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (
                        user_id,
                        account_id,
                        holding.get('symbol'),
                        holding.get('company_name'),
                        holding.get('quantity'),
                        holding.get('avg_entry_price'),
                        holding.get('current_price'),
                        holding.get('current_value'),
                        holding.get('purchase_cost'),
                        holding.get('unrealized_pl'),
                        holding.get('unrealized_pl_percent'),
                        holding.get('currency', 'USD'),
                        holding.get('source_pdf')
                    ))
                    saved_count += 1
                except Exception as e:
                    print(f"Error saving holding {holding.get('symbol')}: {e}")
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return saved_count
            
        except Exception as e:
            print(f"Error saving holdings to database: {e}")
            return 0
    
    def save_transactions_to_database(self, transactions: List[Dict], user_id: str, account_id: int) -> int:
        """Save transactions to database"""
        if not transactions:
            return 0
        
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            saved_count = 0
            for transaction in transactions:
                try:
                    # Check if transaction already exists
                    cursor.execute('''
                        SELECT id FROM "WorldStockTransaction" 
                        WHERE user_id = %s AND account_id = %s AND symbol = %s 
                        AND transaction_date = %s AND quantity = %s
                    ''', (
                        user_id,
                        account_id,
                        transaction.get('symbol'),
                        transaction.get('transaction_date'),
                        transaction.get('quantity')
                    ))
                    
                    if cursor.fetchone():
                        continue  # Skip duplicates
                    
                    cursor.execute('''
                        INSERT INTO "WorldStockTransaction" 
                        (user_id, account_id, symbol, transaction_date, transaction_time,
                         transaction_type, quantity, trade_price, close_price, proceeds,
                         commission, basis, realized_pl, mtm_pl, trade_code, currency, source_pdf)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (
                        user_id,
                        account_id,
                        transaction.get('symbol'),
                        transaction.get('transaction_date'),
                        transaction.get('transaction_time'),
                        transaction.get('transaction_type'),
                        transaction.get('quantity'),
                        transaction.get('trade_price'),
                        transaction.get('close_price'),
                        transaction.get('proceeds'),
                        transaction.get('commission'),
                        transaction.get('basis'),
                        transaction.get('realized_pl'),
                        transaction.get('mtm_pl'),
                        transaction.get('trade_code'),
                        transaction.get('currency', 'USD'),
                        transaction.get('source_pdf')
                    ))
                    saved_count += 1
                except Exception as e:
                    print(f"Error saving transaction {transaction.get('symbol')}: {e}")
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return saved_count
            
        except Exception as e:
            print(f"Error saving transactions to database: {e}")
            return 0
    
    def save_dividends_to_database(self, dividends: List[Dict], user_id: str, account_id: int) -> int:
        """Save dividends to database"""
        if not dividends:
            return 0
        
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            saved_count = 0
            for dividend in dividends:
                try:
                    # Check if dividend already exists
                    cursor.execute('''
                        SELECT id FROM "WorldStockDividend" 
                        WHERE user_id = %s AND account_id = %s AND symbol = %s 
                        AND payment_date = %s AND amount = %s
                    ''', (
                        user_id,
                        account_id,
                        dividend.get('symbol'),
                        dividend.get('payment_date'),
                        dividend.get('amount')
                    ))
                    
                    if cursor.fetchone():
                        continue  # Skip duplicates
                    
                    cursor.execute('''
                        INSERT INTO "WorldStockDividend" 
                        (user_id, account_id, symbol, isin, payment_date, amount,
                         amount_per_share, withholding_tax, net_amount, dividend_type, 
                         currency, source_pdf)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (
                        user_id,
                        account_id,
                        dividend.get('symbol'),
                        dividend.get('isin'),
                        dividend.get('payment_date'),
                        dividend.get('amount'),
                        dividend.get('amount_per_share'),
                        dividend.get('withholding_tax'),
                        dividend.get('net_amount'),
                        dividend.get('dividend_type', 'Cash Dividend'),
                        dividend.get('currency', 'USD'),
                        dividend.get('source_pdf')
                    ))
                    saved_count += 1
                except Exception as e:
                    print(f"Error saving dividend {dividend.get('symbol')}: {e}")
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return saved_count
            
        except Exception as e:
            print(f"Error saving dividends to database: {e}")
            return 0


# For direct execution/testing
if __name__ == "__main__":
    service = WorldStockService()
    
    # Test with the provided PDF
    pdf_path = "pdf/world_stock_report.pdf"
    if os.path.exists(pdf_path):
        result = service.process_pdf_report(pdf_path, "test_user")
        print(json.dumps(result, indent=2, default=str))
    else:
        print(f"PDF file not found: {pdf_path}")
