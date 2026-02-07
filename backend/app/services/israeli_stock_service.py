"""
Israeli Stock Analysis Service
Handles PDF processing, CSV extraction, and Israeli stock analysis for investment reports
"""

import os
import sys
import json
import glob
import uuid
import re
import logging
import pandas as pd
import pdfplumber
import psycopg2
from datetime import datetime
from decimal import Decimal, InvalidOperation
from dotenv import load_dotenv
from typing import List, Dict, Tuple, Optional

# Set up logger
logger = logging.getLogger(__name__)

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import broker parsers
from app.brokers import get_broker_parser
from app.brokers.base_broker import BaseBrokerParser

# Import SQLAlchemy models for type hints and future ORM usage
try:
    from app.models.israeli_stock_models import (
        IsraeliStock,
        IsraeliStockHolding,
        IsraeliStockTransaction,
        IsraeliDividend,
        IsraeliStockSummary
    )
    from app.models.pending_transaction import PendingIsraeliTransaction
    from app.schemas.israeli_stock_schemas import (
        IsraeliStockHoldingResponse,
        IsraeliStockTransactionResponse,
        IsraeliDividendResponse
    )
    MODELS_AVAILABLE = True
except ImportError:
    # Fallback for direct execution without full app context
    MODELS_AVAILABLE = False

class IsraeliStockService:
    """Service for processing Israeli stock data from PDF reports"""
    
    def __init__(self, broker: str = 'excellence'):
        load_dotenv()
        # Prefer DATABASE_URL if provided; otherwise use discrete env vars with defaults
        self.db_url = os.getenv('DATABASE_URL')
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5433'),
            'database': os.getenv('DB_NAME', 'investracker_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        
        # Get broker-specific parser
        self.broker_name = broker
        self.broker_parser: BaseBrokerParser = get_broker_parser(broker)
        
    def create_database_connection(self):
        """Create and return a database connection"""
        try:
            if self.db_url:
                return psycopg2.connect(self.db_url)
            return psycopg2.connect(**self.db_config)
        except Exception as e:
            # As a fallback, attempt to build DSN from env if available
            dsn = os.getenv('DATABASE_URL')
            if dsn:
                return psycopg2.connect(dsn)
            raise e
    
    def load_israeli_stocks(self) -> Dict[str, Tuple[str, str, str]]:
        """Load Israeli stocks from database"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT security_no, symbol, name, index_name FROM "IsraeliStocks"')
            stocks = cursor.fetchall()
            
            # Convert to dictionary: security_no -> (symbol, name, index)
            israeli_dict = {}
            for security_no, symbol, name, index_name in stocks:
                israeli_dict[security_no] = (symbol, name, index_name)
            
            cursor.close()
            conn.close()
            
            return israeli_dict
            
        except Exception as e:
            print(f"Error loading Israeli stocks from database: {e}")
            return {}
    
    def extract_tables_from_pdf(self, pdf_path: str) -> List[Dict]:
        """Extract all tables from PDF with Hebrew heading context"""
        all_tables = []
        
        # Get broker-specific Hebrew headings
        hebrew_headings = self.broker_parser.get_hebrew_headings()
        holdings_heading = hebrew_headings.get('holdings', '')
        transactions_heading = hebrew_headings.get('transactions', '')
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    # Extract text to find Hebrew headings
                    page_text = page.extract_text() or ""
                    
                    # Determine page-level heading hints
                    has_holdings_heading = holdings_heading in page_text if holdings_heading else False
                    has_transactions_heading = transactions_heading in page_text if transactions_heading else False
                    
                    # Extract tables from this page
                    tables = page.extract_tables()
                    
                    if tables:
                        for table_num, table in enumerate(tables):
                            if table and len(table) > 0:
                                cleaned_table = []
                                for row in table:
                                    cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                                    cleaned_table.append(cleaned_row)
                                
                                # Decide table type based on headings
                                inferred_table_type = None
                                if has_holdings_heading and not has_transactions_heading:
                                    inferred_table_type = "holdings"
                                elif has_transactions_heading and not has_holdings_heading:
                                    inferred_table_type = "transactions"

                                table_info = {
                                    'page': page_num + 1,
                                    'table_number': table_num + 1,
                                    'data': cleaned_table,
                                    'hebrew_heading_type': inferred_table_type
                                }
                                all_tables.append(table_info)
                                hint_dbg = inferred_table_type if inferred_table_type else "ambiguous/none"
                                print(f"DEBUG: [{self.broker_name}] Page {page_num + 1}, Table {table_num + 1} - Hebrew heading hint: {hint_dbg}")
            
            return all_tables
            
        except Exception as e:
            raise Exception(f"Error extracting tables from PDF: {e}")
    
    def save_tables_to_csv(self, tables: List[Dict], output_dir: str) -> List[str]:
        """Save extracted tables to CSV files"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        csv_files = []
        
        for table_info in tables:
            page_num = table_info['page']
            table_num = table_info['table_number']
            data = table_info['data']
            
            filename = f"page_{page_num}_table_{table_num}.csv"
            filepath = os.path.join(output_dir, filename)
            
            try:
                import csv
                with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerows(data)
                
                csv_files.append(filepath)
                
            except Exception as e:
                print(f"Error saving table to CSV: {e}")
        
        return csv_files
    
    def extract_date_from_pdf(self, pdf_path: str) -> Optional[datetime]:
        """Extract the holding date from the PDF header using broker-specific logic"""
        if not os.path.exists(pdf_path):
            return None
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                if len(pdf.pages) > 0:
                    first_page = pdf.pages[0]
                    text = first_page.extract_text()
                    
                    if text:
                        # Use broker-specific date extraction
                        return self.broker_parser.extract_date_from_pdf_text(text)
        except Exception:
            pass
        
        return None
    
    def parse_date_string(self, date_str: str) -> Optional[datetime]:
        """Parse a date string into a date object (delegates to broker parser)"""
        return self.broker_parser.parse_date_string(date_str)
    
    def process_pdf_report(self, pdf_path: str, user_id: str, broker: str = 'excellence') -> Dict:
        """Main function to process a PDF investment report and save to pending transactions"""
        try:
            # Generate unique batch ID for this upload
            batch_id = str(uuid.uuid4())
            
            # Extract PDF name and date
            pdf_name = os.path.basename(pdf_path)
            holding_date = self.extract_date_from_pdf(pdf_path)
            
            # Read PDF file content for storage
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
            file_size = len(pdf_content)
            
            # Save PDF to database (check for duplicates)
            save_result = self.save_pdf_to_database(
                user_id=user_id,
                filename=pdf_name,
                file_data=pdf_content,
                file_size=file_size,
                broker=broker,
                batch_id=batch_id
            )
            
            # Check if duplicate was detected
            if 'error' in save_result:
                return save_result  # Return error to caller
            
            # Extract tables from PDF
            tables = self.extract_tables_from_pdf(pdf_path)
            if not tables:
                return {'error': 'No tables found in PDF'}
            
            # Save to temporary CSV files
            temp_dir = f"temp_csv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            csv_files = self.save_tables_to_csv(tables, temp_dir)
            
            try:
                # Analyze CSV files
                holdings, transactions = self.analyze_csv_files_with_headings(csv_files, tables, pdf_name, holding_date)
                
                # Extract world stocks from transactions table
                world_stocks_from_transactions = self.extract_world_stocks_from_transactions(csv_files, pdf_name, holding_date)
                
                # Combine world transactions from both sources
                # Merge world_stocks_from_transactions with existing transactions
                all_transactions = transactions + world_stocks_from_transactions
                
                # Separate dividends from transactions
                dividends = [t for t in all_transactions if t.get('transaction_type') == 'DIVIDEND']
                regular_transactions = [t for t in all_transactions if t.get('transaction_type') != 'DIVIDEND']
                
                # Separate Israeli and World stocks
                israeli_holdings = [h for h in holdings if not h.get('is_world_stock', False)]
                world_holdings = [h for h in holdings if h.get('is_world_stock', False)]
                
                israeli_transactions = [t for t in regular_transactions if not t.get('is_world_stock', False)]
                world_transactions = [t for t in regular_transactions if t.get('is_world_stock', False)]
                
                israeli_dividends = [d for d in dividends if not d.get('is_world_stock', False)]
                world_dividends = [d for d in dividends if d.get('is_world_stock', False)]
                
                print(f"DEBUG: Israeli - {len(israeli_holdings)} holdings, {len(israeli_transactions)} transactions, {len(israeli_dividends)} dividends")
                print(f"DEBUG: World - {len(world_holdings)} holdings, {len(world_transactions)} transactions, {len(world_dividends)} dividends")
                
                # Debug: Check what's being passed for world dividends
                if world_dividends:
                    print(f"DEBUG: Sample world dividends being passed to save:")
                    for d in world_dividends[:3]:
                        print(f"  - {d.get('stock_name')} ({d.get('ticker')}): amount={d.get('amount')}, commission={d.get('commission')}, tax={d.get('tax')}")
                
                # Save Israeli stocks to pending Israeli transactions table
                israeli_result = self.save_to_pending_transactions(
                    holdings=israeli_holdings,
                    transactions=israeli_transactions,
                    dividends=israeli_dividends,
                    user_id=user_id,
                    batch_id=batch_id,
                    pdf_filename=pdf_name
                )
                
                # Save World stocks to pending World transactions table
                world_result = {'saved_count': 0, 'valid_count': 0, 'invalid_count': 0, 'warnings': [], 'errors': []}
                if world_holdings or world_transactions or world_dividends:
                    from app.services.world_stock_service import WorldStockService
                    world_service = WorldStockService()
                    world_result = world_service.save_to_pending_transactions(
                        holdings=world_holdings,
                        transactions=world_transactions,
                        dividends=world_dividends,
                        user_id=user_id,
                        batch_id=batch_id,
                        pdf_filename=pdf_name
                    )
                
                # Combine results
                save_result = {
                    'saved_count': israeli_result['saved_count'] + world_result['saved_count'],
                    'valid_count': israeli_result['valid_count'] + world_result['valid_count'],
                    'invalid_count': israeli_result['invalid_count'] + world_result['invalid_count'],
                    'warnings': israeli_result['warnings'] + world_result['warnings'],
                    'errors': israeli_result['errors'] + world_result['errors']
                }
                
                # Clean up temporary files
                import shutil
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                
                return {
                    'success': True,
                    'batch_id': batch_id,
                    'pdf_name': pdf_name,
                    'holding_date': holding_date.isoformat() if holding_date else None,
                    'total_extracted': len(holdings) + len(regular_transactions) + len(dividends),
                    'holdings_found': len(holdings),
                    'transactions_found': len(regular_transactions),
                    'dividends_found': len(dividends),
                    'pending_count': save_result['saved_count'],
                    'valid_count': save_result['valid_count'],
                    'invalid_count': save_result['invalid_count'],
                    'validation_warnings': save_result['warnings'],
                    'validation_errors': save_result['errors'],
                    'message': f"Extracted {save_result['saved_count']} transactions. " +
                              (f"{save_result['invalid_count']} have validation issues. " if save_result['invalid_count'] > 0 else "") +
                              "Please review and approve them."
                }
                
            except Exception as e:
                # Clean up on error
                import shutil
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise e
                
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_csv_files(self, csv_files: List[str], pdf_name: str, holding_date: Optional[datetime]) -> Tuple[List[Dict], List[Dict]]:
        """Analyze CSV files and extract Israeli stock data"""
        israeli_stocks = self.load_israeli_stocks()
        if not israeli_stocks:
            raise Exception("No Israeli stocks data available")
        
        all_holdings = []
        all_transactions = []
        
        # We need to get the table info with Hebrew headings
        # Let's re-extract tables to get the heading information
        pdf_path = None  # We need to pass this somehow
        
        for csv_file in csv_files:
            try:
                df = pd.read_csv(csv_file)
                csv_type = self.determine_csv_type_by_heading(csv_file)
                
                if csv_type == "holdings":
                    holdings = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "holdings", pdf_name, holding_date)
                    all_holdings.extend(holdings)
                elif csv_type == "transactions":
                    transactions = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "transactions", pdf_name, holding_date)
                    all_transactions.extend(transactions)
                    
            except Exception as e:
                print(f"Error processing {csv_file}: {e}")
                continue
        
        return all_holdings, all_transactions
    
    def analyze_csv_files_with_headings(self, csv_files: List[str], tables: List[Dict], pdf_name: str, holding_date: Optional[datetime]) -> Tuple[List[Dict], List[Dict]]:
        """Analyze CSV files using Hebrew heading information to determine table types"""
        israeli_stocks = self.load_israeli_stocks()
        if not israeli_stocks:
            raise Exception("No Israeli stocks data available")
        
        all_holdings = []
        all_transactions = []
        
        # Create a mapping from CSV file to table info
        table_info_map = {}
        for table_info in tables:
            page_num = table_info['page']
            table_num = table_info['table_number']
            filename = f"page_{page_num}_table_{table_num}.csv"
            table_info_map[filename] = table_info
        
        for csv_file in csv_files:
            try:
                df = pd.read_csv(csv_file)
                filename = os.path.basename(csv_file)
                
                # Always use content-based detection first (more reliable than page-level hints)
                # Multiple table types can appear on the same page
                csv_type = None
                try:
                    csv_type = self.determine_csv_type(df, csv_file)
                    print(f"DEBUG: {filename} - Content-based type: {csv_type}")
                except Exception as e:
                    print(f"DEBUG: {filename} - Content detection failed: {e}, checking heading hint")
                    # Fall back to heading hint only if content detection fails
                    if filename in table_info_map:
                        heading_type = table_info_map[filename].get('hebrew_heading_type')
                        if heading_type in ("holdings", "transactions"):
                            csv_type = heading_type
                            print(f"DEBUG: {filename} - Using Hebrew heading hint: {csv_type}")
                    
                    # Last resort default
                    if csv_type is None:
                        csv_type = "holdings"
                        print(f"DEBUG: {filename} - Using default: holdings")
                
                if csv_type == "holdings":
                    results = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "holdings", pdf_name, holding_date)
                    # Separate dividends from actual holdings
                    # Dividends can appear in holdings tables but should be treated as transactions
                    for item in results:
                        if item.get('transaction_type') == 'DIVIDEND':
                            all_transactions.append(item)
                        else:
                            all_holdings.append(item)
                    print(f"DEBUG: {filename} - Found {len([i for i in results if i.get('transaction_type') != 'DIVIDEND'])} holdings, {len([i for i in results if i.get('transaction_type') == 'DIVIDEND'])} dividends")
                elif csv_type == "transactions":
                    transactions = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "transactions", pdf_name, holding_date)
                    all_transactions.extend(transactions)
                    print(f"DEBUG: {filename} - Found {len(transactions)} transactions")
                    
            except Exception as e:
                print(f"Error processing {csv_file}: {e}")
                continue
        
        return all_holdings, all_transactions
    
    def extract_world_stocks_from_transactions(self, csv_files: List[str], pdf_name: str, holding_date: Optional[datetime]) -> List[Dict]:
        """Extract world stock transactions from CSV files
        
        Returns:
            List of world stock transaction dictionaries
        """
        all_world_transactions = []
        
        # Hebrew transaction type prefixes that might be merged into stock name
        hebrew_prefixes = [
            'ביד/פה', 'סמ/שמ', 'למע/שמ', 'חסמ/שמ', 'ל"וח/ק', 'ל"וח/מ',
            'הפ/דיב', 'מש/מסח', 'מש/עמל', 'ק/חו"ל', 'מ/חו"ל',
            'ביד/', 'חסמ/', 'ח"טמ.ע', 'סמ/', 'הפ/', 'מש/',
            'הינק', 'הריכמ', 'ףיצר/ק', 'ףיצר/מ',
        ]
        
        for csv_file in csv_files:
            try:
                df = pd.read_csv(csv_file, encoding='utf-8')
                filename = os.path.basename(csv_file)
                
                # Check if this is the transactions table
                csv_type = self.determine_csv_type(df, csv_file)
                
                if csv_type != 'transactions':
                    continue
                
                print(f"DEBUG: {filename} - Scanning for world stocks...")
                
                # Two-pass approach: first collect all transactions, then process commissions
                all_rows = []
                
                # First pass: collect all world stock rows
                for idx, row in df.iterrows():
                    try:
                        # Extract security number and name from specific columns
                        security_no_raw = row.iloc[10] if len(row) > 10 else None
                        name_raw = row.iloc[9] if len(row) > 9 else None
                        
                        if pd.isna(security_no_raw) or pd.isna(name_raw):
                            continue
                        
                        security_no = str(security_no_raw).replace('.0', '').strip()
                        name = str(name_raw).strip()
                        
                        # Clean the name by removing Hebrew transaction type prefixes
                        for prefix in hebrew_prefixes:
                            if name.startswith(prefix):
                                name = name[len(prefix):].strip()
                                break
                        
                        # Skip if security_no is 0 or empty, or name is too short
                        if not security_no or security_no == '0' or len(name) < 2:
                            continue
                        
                        # Check if it's a world stock
                        is_world = self.broker_parser._is_world_stock(name, security_no)
                        
                        if is_world:
                            all_rows.append({
                                'row': row,
                                'security_no': security_no,
                                'name': name,
                                'pdf_name': pdf_name,
                                'holding_date': holding_date
                            })
                    except Exception as e:
                        continue
                
                # Second pass: process transactions and build lookup dictionary
                transactions_by_stock = {}
                commission_rows = []
                tax_rows = []
                
                for row_data in all_rows:
                    try:
                        transaction = self.broker_parser.parse_transaction_row(
                            row_data['row'], row_data['security_no'], 
                            row_data['security_no'], row_data['name'], 
                            row_data['pdf_name'], row_data['holding_date']
                        )
                        
                        if not transaction or not transaction.get('is_world_stock'):
                            continue
                        
                        txn_type = transaction.get('transaction_type', 'UNKNOWN')
                        
                        # Store commission rows for later processing
                        if txn_type == 'COMMISSION':
                            commission_rows.append({
                                'transaction': transaction,
                                'name': row_data['name']
                            })
                            continue
                        
                        # Store TAX rows for later processing
                        if txn_type == 'TAX':
                            tax_rows.append({
                                'transaction': transaction,
                                'name': row_data['name']
                            })
                            continue
                        
                        # Fix amounts for BUY/SELL transactions
                        if txn_type in ('BUY', 'SELL'):
                            quantity = transaction.get('quantity', 0)
                            price = transaction.get('price', 0)
                            if quantity and price:
                                transaction['amount'] = abs(quantity * price)
                        
                        # Fix amounts for BUY/SELL transactions
                        if txn_type in ('BUY', 'SELL'):
                            quantity = transaction.get('quantity', 0)
                            price = transaction.get('price', 0)
                            if quantity and price:
                                transaction['amount'] = abs(quantity * price)
                        
                        # Fix dividend amounts - quantity field contains the dividend amount
                        elif txn_type == 'DIVIDEND':
                            dividend_amount = transaction.get('quantity', 0)
                            if dividend_amount:
                                transaction['amount'] = float(dividend_amount)
                                transaction['total_value'] = float(dividend_amount)
                                # Clear quantity for dividends
                                transaction['quantity'] = None
                        
                        # Normalize field names for database compatibility
                        if 'symbol' in transaction and 'ticker' not in transaction:
                            transaction['ticker'] = transaction['symbol']
                        if 'name' in transaction and 'stock_name' not in transaction:
                            transaction['stock_name'] = transaction['name']
                        
                        # Store transaction by name for commission matching
                        # If there are multiple transactions with same name, use a list
                        stock_name = row_data['name']
                        if stock_name not in transactions_by_stock:
                            transactions_by_stock[stock_name] = []
                        transactions_by_stock[stock_name].append(transaction)
                        all_world_transactions.append(transaction)
                    
                    except Exception as e:
                        continue
                
                # Third pass: process commission rows and match to transactions
                # Key insight: Different Hebrew types mean different things:
                # - 'חסמ/שמ' = dividend withholding tax (should go to DIVIDEND.tax)
                # - 'מש/עמל' or 'למע/שמ' = trading commission (should go to BUY/SELL.commission)
                import re
                for comm_row in commission_rows:
                    comm_transaction = comm_row['transaction']
                    comm_name = comm_row['name']
                    comm_amt = abs(comm_transaction.get('quantity', 0.0) or 0.0)
                    raw_hebrew_type = comm_transaction.get('raw_hebrew_type', '')
                    
                    # Determine if this is a dividend withholding tax or trading commission
                    is_dividend_tax = raw_hebrew_type in ('חסמ/שמ',)  # These are withholding tax for dividends
                    is_trading_commission = raw_hebrew_type in ('מש/עמל', 'למע/שמ', 'עמל')  # These are trading fees
                    
                    if comm_amt > 0:
                        matched = False
                        target_txn = None
                        
                        # Try exact match first
                        if comm_name in transactions_by_stock:
                            txn_list = transactions_by_stock[comm_name]
                            # Match based on Hebrew type:
                            # - Dividend tax (חסמ/שמ) should match DIVIDEND
                            # - Trading commission (מש/עמל, למע/שמ) should match BUY/SELL
                            if is_dividend_tax:
                                # Look for DIVIDEND transactions
                                for txn in txn_list:
                                    if txn.get('transaction_type') == 'DIVIDEND':
                                        target_txn = txn
                                        break
                            else:
                                # Look for BUY/SELL transactions (trading commission)
                                for txn in txn_list:
                                    if txn.get('transaction_type') in ('BUY', 'SELL'):
                                        target_txn = txn
                                        break
                        
                        # If no match found, try partial matching
                        if not target_txn:
                            # Try partial matching - check if stock ticker appears in either name
                            for stored_name, stored_txn_list in transactions_by_stock.items():
                                # Extract ticker symbols:
                                # - Words with 2-5 uppercase letters (e.g., "SNOW", "BBY")
                                # - Single uppercase letters in parentheses (e.g., "(F)")
                                # - Exclude geographic suffixes: US, UK, JP
                                stored_tickers = re.findall(r'\b([A-Z]{2,5})\b|\(([A-Z]+)\)', stored_name)
                                stored_tickers = [t[0] or t[1] for t in stored_tickers if (t[0] or t[1]) not in ('US', 'UK', 'JP')]
                                
                                # For commission names like "F US", extract the non-US part
                                # Check if it's a single letter followed by " US"
                                comm_parts = comm_name.split()
                                if len(comm_parts) == 2 and comm_parts[1] in ('US', 'UK', 'JP') and len(comm_parts[0]) == 1:
                                    # Single letter ticker like "F"
                                    current_tickers = [comm_parts[0]]
                                else:
                                    current_tickers = re.findall(r'\b([A-Z]{2,5})\b|\(([A-Z]+)\)', comm_name)
                                    current_tickers = [t[0] or t[1] for t in current_tickers if (t[0] or t[1]) not in ('US', 'UK', 'JP')]
                                
                                
                                # Check if any ticker matches
                                if stored_tickers and current_tickers:
                                    if any(t in current_tickers for t in stored_tickers):
                                        # Match based on Hebrew type
                                        if is_dividend_tax:
                                            # Dividend tax should match DIVIDEND
                                            for txn in stored_txn_list:
                                                if txn.get('transaction_type') == 'DIVIDEND':
                                                    target_txn = txn
                                                    break
                                        else:
                                            # Trading commission should match BUY/SELL
                                            for txn in stored_txn_list:
                                                if txn.get('transaction_type') in ('BUY', 'SELL'):
                                                    target_txn = txn
                                                    break
                                        if target_txn:
                                            break
                        
                        # If still no match, fallback to exact match with any transaction
                        if not target_txn and comm_name in transactions_by_stock:
                            txn_list = transactions_by_stock[comm_name]
                            # If dividend tax, prefer DIVIDEND; otherwise prefer BUY/SELL
                            if is_dividend_tax:
                                for txn in txn_list:
                                    if txn.get('transaction_type') == 'DIVIDEND':
                                        target_txn = txn
                                        break
                            if not target_txn:
                                target_txn = txn_list[0]  # Fallback to first
                        
                        # Apply to the correct field based on Hebrew type:
                        # - חסמ/שמ (dividend withholding tax) → DIVIDEND.tax
                        # - מש/עמל, למע/שמ (trading commission) → BUY/SELL.commission
                        if target_txn:
                            if is_dividend_tax:
                                # This is withholding tax for dividends
                                current_tax = target_txn.get('tax', 0.0) or 0.0
                                target_txn['tax'] = current_tax + comm_amt
                            else:
                                # This is trading commission for BUY/SELL
                                current_comm = target_txn.get('commission', 0.0) or 0.0
                                target_txn['commission'] = current_comm + comm_amt
                            matched = True
                
                # Fourth pass: process tax rows and match to dividends
                for tax_row in tax_rows:
                    tax_transaction = tax_row['transaction']
                    tax_name = tax_row['name']
                    tax_amt = abs(tax_transaction.get('quantity', 0.0) or 0.0)
                    
                    if tax_amt > 0:
                        # Try exact match first
                        matched = False
                        if tax_name in transactions_by_stock:
                            txn_list = transactions_by_stock[tax_name]
                            # Only add tax to DIVIDEND transactions
                            for target_txn in txn_list:
                                if target_txn.get('transaction_type') == 'DIVIDEND':
                                    current_tax = target_txn.get('tax', 0.0) or 0.0
                                    target_txn['tax'] = current_tax + tax_amt
                                    matched = True
                                    break
                        else:
                            # Try partial matching for dividends only
                            for stored_name, stored_txn_list in transactions_by_stock.items():
                                # Extract ticker symbols
                                stored_tickers = re.findall(r'\b([A-Z]{2,5})\b|\(([A-Z]+)\)', stored_name)
                                stored_tickers = [t[0] or t[1] for t in stored_tickers if (t[0] or t[1]) not in ('US', 'UK', 'JP')]
                                
                                # Handle single-letter tickers
                                tax_parts = tax_name.split()
                                if len(tax_parts) == 2 and tax_parts[1] in ('US', 'UK', 'JP') and len(tax_parts[0]) == 1:
                                    current_tickers = [tax_parts[0]]
                                else:
                                    current_tickers = re.findall(r'\b([A-Z]{2,5})\b|\(([A-Z]+)\)', tax_name)
                                    current_tickers = [t[0] or t[1] for t in current_tickers if (t[0] or t[1]) not in ('US', 'UK', 'JP')]
                                
                                # Check if any ticker matches
                                if stored_tickers and current_tickers:
                                    if any(t in current_tickers for t in stored_tickers):
                                        # Only add to dividends
                                        for target_txn in stored_txn_list:
                                            if target_txn.get('transaction_type') == 'DIVIDEND':
                                                current_tax = target_txn.get('tax', 0.0) or 0.0
                                                target_txn['tax'] = current_tax + tax_amt
                                                matched = True
                                                break
                                        if matched:
                                            break
                
                # Update total_value for transactions with commissions
                for transaction in all_world_transactions:
                    commission = transaction.get('commission', 0) or 0
                    amount = transaction.get('amount', 0) or 0
                    txn_type = transaction.get('transaction_type')
                    
                    if commission and amount and txn_type in ('BUY', 'SELL'):
                        if txn_type == 'BUY':
                            transaction['total_value'] = amount + commission
                        else:  # SELL
                            transaction['total_value'] = amount - commission
                        # Skip rows that can't be parsed
                        continue
                
                if all_world_transactions:
                    print(f"DEBUG: {filename} - Extracted {len(all_world_transactions)} world stock transactions")
                    
            except Exception as e:
                print(f"Error scanning {csv_file} for world stocks: {e}")
                continue
        
        return all_world_transactions
    
    def determine_csv_type(self, df: pd.DataFrame, csv_file: str) -> str:
        """Determine if a CSV contains holdings or transactions data (delegates to broker parser)"""
        return self.broker_parser.determine_table_type(df, csv_file)
    
    def find_israeli_stocks_in_csv(self, df: pd.DataFrame, israeli_stocks: Dict, csv_file: str, 
                                 csv_type: str, pdf_name: str, holding_date: Optional[datetime]) -> List[Dict]:
        """Find Israeli stocks in a CSV DataFrame"""
        results = []
        
        # First, check for deposits/withdrawals using broker-specific logic
        if csv_type == "transactions" and hasattr(self.broker_parser, 'extract_deposits_withdrawals'):
            deposits = self.broker_parser.extract_deposits_withdrawals(df, pdf_name, holding_date)
            results.extend(deposits)
        
        # Then search for regular stocks
        for security_no, (symbol, name, index_name) in israeli_stocks.items():
            mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
            if not mask.any():
                continue
            relevant_rows = df[mask]
            if csv_type == "holdings":
                # Holdings tables show historical data from previous months - skip dividends entirely
                for idx, row in relevant_rows.iterrows():
                    row_str = ' '.join(str(val) for val in row.values).lower()
                    
                    # Skip any rows that look like dividends; dividends are parsed only from transactions tables
                    if any(dividend_kw in row_str for dividend_kw in ['דנדביד', 'דיבידנד', 'dividend', 'div/', 'ביד/']):
                        print(f"DEBUG: Skipping dividend row in holdings table for {symbol} (historical data)")
                        continue
                    
                    holding_data = self.parse_holding_row(row, security_no, symbol, name, pdf_name, holding_date)
                    if holding_data:
                        results.append(holding_data)
            else:
                # Transaction tables - extract all transaction types including dividends
                transaction_data = self.extract_transaction_from_csv(df, security_no, symbol, name, pdf_name, holding_date)
                if transaction_data:
                    results.extend(transaction_data)
        
        return results
    
    def extract_holding_from_csv(self, df: pd.DataFrame, security_no: str, symbol: str, 
                               name: str, pdf_name: str, holding_date: Optional[datetime]) -> List[Dict]:
        """Extract holding details for a specific stock from CSV"""
        holdings = []
        mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
        relevant_rows = df[mask]
        
        for idx, row in relevant_rows.iterrows():
            holding = self.parse_holding_row(row, security_no, symbol, name, pdf_name, holding_date)
            if holding:
                holdings.append(holding)
        
        return holdings
    
    def parse_holding_row(self, row, security_no: str, symbol: str, name: str, 
                         pdf_name: str, holding_date: Optional[datetime]) -> Optional[Dict]:
        """Parse a single row into holding data (delegates to broker parser)"""
        return self.broker_parser.parse_holding_row(row, security_no, symbol, name, pdf_name, holding_date)
    
    
    
    def extract_transaction_from_csv(self, df: pd.DataFrame, security_no: str, symbol: str, 
                                   name: str, pdf_name: str, holding_date: Optional[datetime] = None) -> List[Dict]:
        """Extract transaction details for a specific stock from CSV"""
        transactions = []
        mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
        relevant_rows = df[mask]
        
        for idx, row in relevant_rows.iterrows():
            transaction = self.parse_transaction_row(row, security_no, symbol, name, pdf_name, holding_date)
            if transaction:
                transactions.append(transaction)
        
        return transactions
    
    def parse_transaction_row(self, row, security_no: str, symbol: str, name: str, pdf_name: str, holding_date: Optional[datetime] = None) -> Optional[Dict]:
        """Parse a single row into transaction data (delegates to broker parser)"""
        return self.broker_parser.parse_transaction_row(row, security_no, symbol, name, pdf_name, holding_date)
    
    def save_holdings_to_database(self, holdings: List[Dict], user_id: str) -> int:
        """Save holdings to database using bulk insert"""
        if not holdings:
            return 0
        
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # No need to ensure table exists - tables are created by SQLAlchemy models
            
            # Prepare bulk data
            bulk_data = []
            for holding in holdings:
                if holding.get('quantity') is None:
                    continue
                
                holding_date = holding.get('holding_date')
                if isinstance(holding_date, str):
                    holding_date = self.parse_date_string(holding_date)
                
                bulk_data.append((
                    user_id,
                    holding['security_no'],
                    holding['symbol'],
                    holding['name'],
                    holding.get('quantity'),
                    holding.get('last_price'),
                    holding.get('purchase_cost'),
                    holding.get('current_value'),
                    holding.get('portfolio_percentage'),
                    holding.get('currency', 'ILS'),
                    holding_date,
                    holding['source_pdf']
                ))
            
            if bulk_data:
                insert_sql = """
                INSERT INTO "IsraeliStockHolding" (
                    user_id, security_no, symbol, company_name, quantity, 
                    last_price, purchase_cost, current_value, portfolio_percentage,
                    currency, holding_date, source_pdf
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, security_no, source_pdf) DO NOTHING
                """
                
                cursor.executemany(insert_sql, bulk_data)
                conn.commit()
                saved_count = len(bulk_data)
            else:
                saved_count = 0
            
            cursor.close()
            conn.close()
            return saved_count
            
        except Exception as e:
            print(f"Error saving holdings: {e}")
            return 0
    
    def save_transactions_to_database(self, transactions: List[Dict], user_id: str) -> int:
        """Save transactions to database using bulk insert"""
        if not transactions:
            return 0
        
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # No need to ensure table exists - tables are created by SQLAlchemy models
            
            # Prepare bulk data
            bulk_data = []
            for transaction in transactions:
                transaction_date = transaction.get('transaction_date')
                if isinstance(transaction_date, str):
                    transaction_date = self.parse_date_string(transaction_date)
                
                transaction_time = transaction.get('transaction_time')
                if transaction_time and isinstance(transaction_time, str):
                    try:
                        transaction_time = datetime.strptime(transaction_time, '%H:%M').time()
                    except ValueError:
                        transaction_time = None
                
                bulk_data.append((
                    user_id,
                    transaction['security_no'],
                    transaction['symbol'],
                    transaction['name'],
                    transaction.get('transaction_type', 'BUY'),
                    transaction_date,
                    transaction_time,
                    transaction.get('quantity'),
                    transaction.get('price'),
                    transaction.get('total_value'),
                    transaction.get('commission'),
                    transaction.get('tax'),
                    transaction.get('currency', 'ILS'),
                    transaction['source_pdf']
                ))
            
            if bulk_data:
                insert_sql = """
                INSERT INTO "IsraeliStockTransaction" (
                    user_id, security_no, symbol, company_name, transaction_type,
                    transaction_date, transaction_time, quantity, price, total_value,
                    commission, tax, currency, source_pdf
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, security_no, transaction_date, transaction_type, source_pdf) DO NOTHING
                """
                
                cursor.executemany(insert_sql, bulk_data)
                conn.commit()
                saved_count = len(bulk_data)
            else:
                saved_count = 0
            
            cursor.close()
            conn.close()
            return saved_count
            
        except Exception as e:
            print(f"Error saving transactions: {e}")
            return 0
    
    def save_dividends_to_database(self, dividends: List[Dict], user_id: str) -> int:
        """Save dividends to database using bulk insert"""
        if not dividends:
            return 0
        
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # Prepare bulk data for dividends
            bulk_data = []
            for dividend in dividends:
                payment_date = dividend.get('transaction_date')  # Dividend date comes from transaction_date
                if isinstance(payment_date, str):
                    payment_date = self.parse_date_string(payment_date)
                
                bulk_data.append((
                    user_id,
                    dividend['security_no'],
                    dividend['symbol'],
                    dividend['name'],
                    payment_date,
                    dividend.get('total_value', 0),  # Dividend amount
                    dividend.get('tax', 0),
                    dividend.get('currency', 'ILS'),
                    dividend['source_pdf']
                ))
            
            if bulk_data:
                insert_sql = """
                INSERT INTO "IsraeliDividend" (
                    user_id, security_no, symbol, company_name, payment_date,
                    amount, tax, currency, source_pdf
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, security_no, payment_date, source_pdf) DO NOTHING
                """
                
                cursor.executemany(insert_sql, bulk_data)
                conn.commit()
                saved_count = len(bulk_data)
                print(f"DEBUG: Saved {saved_count} dividends to database")
            else:
                saved_count = 0
            
            cursor.close()
            conn.close()
            return saved_count
            
        except Exception as e:
            print(f"Error saving dividends: {e}")
            return 0
    
    def _serialize_for_json(self, obj):
        """Helper to serialize objects for JSON, converting dates to strings"""
        from datetime import date
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._serialize_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_for_json(item) for item in obj]
        elif isinstance(obj, Decimal):
            return float(obj)
        return obj

    def save_pdf_to_database(
        self,
        user_id: str,
        filename: str,
        file_data: bytes,
        file_size: int,
        broker: str,
        batch_id: str
    ) -> dict:
        """
        Save uploaded PDF file to database
        Returns: dict with either {'report_id': int} or {'error': str, 'message': str}
        """
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # Check if this PDF was already uploaded by this user
            check_sql = """
            SELECT id, upload_date 
            FROM "IsraeliReportUpload" 
            WHERE user_id = %s AND filename = %s
            LIMIT 1
            """
            
            cursor.execute(check_sql, (user_id, filename))
            existing = cursor.fetchone()
            
            if existing:
                cursor.close()
                conn.close()
                print(f"DEBUG: Duplicate PDF detected - Filename: {filename}, Existing ID: {existing[0]}")
                return {
                    'error': 'duplicate',
                    'message': f'This PDF file "{filename}" has already been uploaded on {existing[1].strftime("%Y-%m-%d %H:%M") if existing[1] else "unknown date"}'
                }
            
            # No duplicate, proceed with insert
            insert_sql = """
            INSERT INTO "IsraeliReportUpload" (
                user_id, filename, file_data, file_size, broker, upload_batch_id
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """
            
            cursor.execute(insert_sql, (
                user_id,
                filename,
                psycopg2.Binary(file_data),
                file_size,
                broker,
                batch_id
            ))
            
            report_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"DEBUG: Saved PDF to database - ID: {report_id}, Filename: {filename}, Size: {file_size} bytes")
            return {'report_id': report_id}
            
        except Exception as e:
            print(f"ERROR: Failed to save PDF to database: {e}")
            raise

    def save_to_pending_transactions(
        self, 
        holdings: List[Dict], 
        transactions: List[Dict], 
        dividends: List[Dict],
        user_id: str,
        batch_id: str,
        pdf_filename: str
    ) -> Dict:
        """
        Save all extracted data to pending transactions table for review
        
        Returns: {
            'saved_count': int,
            'valid_count': int,
            'invalid_count': int,
            'warnings': List[str],
            'errors': List[str]
        }
        """
        try:
            from app.services.transaction_validator import TransactionValidator
            
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            pending_records = []
            validation_warnings = []
            validation_errors = []
            validator = TransactionValidator()
            
            print(f"DEBUG: Saving to pending - Holdings: {len(holdings)}, Transactions: {len(transactions)}, Dividends: {len(dividends)}")
            
            # Convert holdings to pending transactions (type: BUY)
            for holding in holdings:
                if holding.get('quantity') is None:
                    continue
                
                transaction_date = holding.get('holding_date')
                if isinstance(transaction_date, str):
                    transaction_date = self.parse_date_string(transaction_date)
                
                # Create transaction dict for validation
                trans_for_validation = {
                    'transaction_type': 'BUY',
                    'transaction_date': transaction_date,
                    'security_no': holding.get('security_no'),
                    'name': holding.get('name'),
                    'quantity': holding.get('quantity'),
                    'price': holding.get('last_price'),
                    'total_value': holding.get('current_value'),
                    'currency': holding.get('currency', 'ILS')
                }
                
                # Validate transaction
                is_valid, errors, warnings = validator.validate_transaction(trans_for_validation)
                
                if warnings:
                    validation_warnings.extend([f"Holding {holding.get('name', 'Unknown')}: {w}" for w in warnings])
                
                if not is_valid:
                    # Log errors but still save with 'pending' status for user review
                    validation_errors.extend([f"Holding {holding.get('name', 'Unknown')}: {e}" for e in errors])
                    print(f"WARNING: Invalid holding {holding.get('name')}: {errors}")
                
                # Serialize holding data properly for JSON
                serialized_holding = self._serialize_for_json(holding)
                raw_data = {
                    'original_type': 'holding',
                    'holding': serialized_holding,
                    'validation_errors': errors if not is_valid else [],
                    'validation_warnings': warnings
                }
                
                pending_records.append((
                    user_id,
                    batch_id,
                    pdf_filename,
                    transaction_date.isoformat() if transaction_date else None,
                    None,  # transaction_time - holdings don't have time
                    holding['security_no'],
                    holding['name'],
                    'BUY',  # Holdings are treated as BUY transactions
                    holding.get('quantity'),
                    holding.get('last_price'),
                    holding.get('current_value'),
                    None,  # commission - not available for holdings
                    None,  # tax - not available for holdings
                    holding.get('currency', 'ILS'),
                    'pending',
                    json.dumps(raw_data)
                ))
            
            # Convert regular transactions to pending transactions
            for transaction in transactions:
                transaction_date = transaction.get('transaction_date')
                if isinstance(transaction_date, str):
                    transaction_date = self.parse_date_string(transaction_date)
                
                # Create transaction dict for validation
                trans_for_validation = {
                    **transaction,
                    'transaction_date': transaction_date
                }
                
                # Validate transaction
                is_valid, errors, warnings = validator.validate_transaction(trans_for_validation)
                
                if warnings:
                    validation_warnings.extend([f"Transaction {transaction.get('name', 'Unknown')}: {w}" for w in warnings])
                
                if not is_valid:
                    validation_errors.extend([f"Transaction {transaction.get('name', 'Unknown')}: {e}" for e in errors])
                    print(f"WARNING: Invalid transaction {transaction.get('name')}: {errors}")
                
                # Serialize transaction data properly for JSON
                serialized_transaction = self._serialize_for_json(transaction)
                raw_data = {
                    'original_type': 'transaction',
                    'transaction': serialized_transaction,
                    'validation_errors': errors if not is_valid else [],
                    'validation_warnings': warnings
                }
                
                pending_records.append((
                    user_id,
                    batch_id,
                    pdf_filename,
                    transaction_date.isoformat() if transaction_date else None,
                    transaction.get('transaction_time'),  # Include transaction time
                    transaction['security_no'],
                    transaction['name'],
                    transaction.get('transaction_type', 'BUY'),
                    transaction.get('quantity'),
                    transaction.get('price'),
                    transaction.get('total_value'),
                    transaction.get('commission'),  # Include commission
                    transaction.get('tax'),  # Include tax
                    transaction.get('currency', 'ILS'),
                    'pending',
                    json.dumps(raw_data)
                ))
            
            # Convert dividends to pending transactions
            for dividend in dividends:
                payment_date = dividend.get('transaction_date')
                if isinstance(payment_date, str):
                    payment_date = self.parse_date_string(payment_date)
                
                # Create transaction dict for validation
                div_for_validation = {
                    'transaction_type': 'DIVIDEND',
                    'transaction_date': payment_date,
                    'security_no': dividend.get('security_no'),
                    'name': dividend.get('name'),
                    'total_value': dividend.get('total_value', 0),
                    'tax': dividend.get('tax'),
                    'currency': dividend.get('currency', 'ILS')
                }
                
                # Validate dividend
                is_valid, errors, warnings = validator.validate_transaction(div_for_validation)
                
                if warnings:
                    validation_warnings.extend([f"Dividend {dividend.get('name', 'Unknown')}: {w}" for w in warnings])
                
                if not is_valid:
                    validation_errors.extend([f"Dividend {dividend.get('name', 'Unknown')}: {e}" for e in errors])
                    print(f"WARNING: Invalid dividend {dividend.get('name')}: {errors}")
                
                # Serialize dividend data properly for JSON
                serialized_dividend = self._serialize_for_json(dividend)
                raw_data = {
                    'original_type': 'dividend',
                    'dividend': serialized_dividend,
                    'validation_errors': errors if not is_valid else [],
                    'validation_warnings': warnings
                }
                
                pending_records.append((
                    user_id,
                    batch_id,
                    pdf_filename,
                    payment_date.isoformat() if payment_date else None,
                    dividend.get('transaction_time'),  # Include transaction time if available
                    dividend['security_no'],
                    dividend['name'],
                    'DIVIDEND',
                    None,  # No quantity for dividends
                    None,  # No price for dividends
                    dividend.get('total_value', 0),
                    None,  # commission - typically not relevant for dividends
                    dividend.get('tax'),  # Include tax if available
                    dividend.get('currency', 'ILS'),
                    'pending',
                    json.dumps(raw_data)
                ))
            
            if pending_records:
                insert_sql = """
                INSERT INTO "PendingIsraeliTransaction" (
                    user_id, upload_batch_id, pdf_filename, transaction_date,
                    transaction_time, security_no, stock_name, transaction_type, quantity, price,
                    amount, commission, tax, currency, status, raw_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                cursor.executemany(insert_sql, pending_records)
                conn.commit()
                saved_count = len(pending_records)
                print(f"DEBUG: Saved {saved_count} records to pending transactions")
                
                if validation_errors:
                    print(f"VALIDATION ERRORS ({len(validation_errors)}): {validation_errors}")
                if validation_warnings:
                    print(f"VALIDATION WARNINGS ({len(validation_warnings)}): {validation_warnings}")
            else:
                saved_count = 0
            
            cursor.close()
            conn.close()
            
            return {
                'saved_count': saved_count,
                'valid_count': saved_count - len([e for e in validation_errors if e]),
                'invalid_count': len([e for e in validation_errors if e]),
                'warnings': validation_warnings,
                'errors': validation_errors
            }
            
        except Exception as e:
            print(f"Error saving to pending transactions: {e}")
            raise e
    
    def _update_holding_for_transaction(self, cursor, user_id: str, security_no: str, 
                                       symbol: str, company_name: str, transaction_type: str,
                                       quantity: float, price: float, currency: str, 
                                       holding_date) -> None:
        """Update or create holding based on a transaction with weighted average calculation"""
        # Check if holding already exists (one holding per user per stock)
        cursor.execute(
            '''SELECT id, quantity, purchase_cost, last_price 
               FROM "IsraeliStockHolding" 
               WHERE user_id = %s AND security_no = %s''',
            (user_id, security_no)
        )
        existing_holding = cursor.fetchone()
        
        if transaction_type == 'BUY':
            if existing_holding:
                # Calculate weighted average
                holding_id, old_quantity, old_purchase_cost, old_last_price = existing_holding
                old_quantity = float(old_quantity) if old_quantity else 0
                old_purchase_cost = float(old_purchase_cost) if old_purchase_cost else 0
                old_last_price = float(old_last_price) if old_last_price else price
                
                # Calculate old total cost and new total cost
                old_total_cost = old_quantity * (old_purchase_cost / old_quantity if old_quantity > 0 else 0)
                new_purchase_amount = quantity * price
                
                # New totals
                new_quantity = old_quantity + quantity
                new_total_cost = old_total_cost + new_purchase_amount
                new_avg_purchase_price = new_total_cost / new_quantity if new_quantity > 0 else 0
                
                # Use the latest price (from this transaction)
                new_last_price = price
                new_current_value = new_quantity * new_last_price
                
                cursor.execute(
                    '''UPDATE "IsraeliStockHolding" 
                       SET quantity = %s, 
                           purchase_cost = %s,
                           last_price = %s,
                           current_value = %s,
                           holding_date = %s
                       WHERE id = %s''',
                    (new_quantity, new_total_cost, new_last_price, new_current_value, holding_date, holding_id)
                )
            else:
                # Create new holding
                total_cost = quantity * price
                current_value = quantity * price
                
                cursor.execute(
                    '''INSERT INTO "IsraeliStockHolding" 
                       (user_id, security_no, symbol, company_name, quantity,
                        last_price, purchase_cost, current_value, currency, holding_date, source_pdf)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                    (user_id, security_no, symbol, company_name, quantity,
                     price, total_cost, current_value, currency, holding_date, 'Multiple PDFs')
                )
        
        elif transaction_type == 'SELL':
            if existing_holding:
                holding_id, old_quantity, old_purchase_cost, old_last_price = existing_holding
                old_quantity = float(old_quantity) if old_quantity else 0
                old_purchase_cost = float(old_purchase_cost) if old_purchase_cost else 0
                old_last_price = float(old_last_price) if old_last_price else price
                
                # Subtract sold quantity
                new_quantity = old_quantity - quantity
                
                if new_quantity <= 0:
                    # Sold all or more - delete the holding
                    cursor.execute(
                        'DELETE FROM "IsraeliStockHolding" WHERE id = %s',
                        (holding_id,)
                    )
                else:
                    # Partial sale - keep the same avg purchase cost, reduce quantity
                    # Purchase cost stays same (we don't change avg price on sells)
                    avg_purchase_price = old_purchase_cost / old_quantity if old_quantity > 0 else 0
                    new_total_cost = new_quantity * avg_purchase_price
                    
                    # Use latest price from transaction
                    new_last_price = price
                    new_current_value = new_quantity * new_last_price
                    
                    cursor.execute(
                        '''UPDATE "IsraeliStockHolding" 
                           SET quantity = %s,
                               purchase_cost = %s,
                               last_price = %s,
                               current_value = %s,
                               holding_date = %s
                           WHERE id = %s''',
                        (new_quantity, new_total_cost, new_last_price, new_current_value, holding_date, holding_id)
                    )
    
    def process_approved_transaction(self, pending_transaction, user_id: str) -> Dict:
        """Process an approved pending transaction and save to final tables"""
        try:
            transaction_type = pending_transaction.transaction_type
            
            # Prepare data from pending transaction
            data = {
                'security_no': pending_transaction.security_no,
                'name': pending_transaction.stock_name,
                'symbol': pending_transaction.stock_name,  # Will be looked up from IsraeliStocks
                'source_pdf': pending_transaction.pdf_filename,
                'currency': pending_transaction.currency or 'ILS'
            }
            
            # Look up symbol from IsraeliStocks table
            conn = self.create_database_connection()
            cursor = conn.cursor()
            cursor.execute(
                'SELECT symbol, name FROM "IsraeliStocks" WHERE security_no = %s',
                (pending_transaction.security_no,)
            )
            stock_info = cursor.fetchone()
            if stock_info:
                data['symbol'] = stock_info[0]
                data['name'] = stock_info[1]
            
            if transaction_type == 'DIVIDEND':
                # Save to IsraeliDividend table
                payment_date = pending_transaction.transaction_date
                if isinstance(payment_date, str):
                    payment_date = self.parse_date_string(payment_date)
                
                insert_sql = """
                INSERT INTO "IsraeliDividend" (
                    user_id, security_no, symbol, company_name, payment_date,
                    amount, tax, currency, source_pdf
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, security_no, payment_date, source_pdf) DO NOTHING
                """
                
                cursor.execute(insert_sql, (
                    user_id,
                    data['security_no'],
                    data['symbol'],
                    data['name'],
                    payment_date,
                    float(pending_transaction.amount) if pending_transaction.amount else 0,
                    float(pending_transaction.tax) if pending_transaction.tax else 0,
                    data['currency'],
                    data['source_pdf']
                ))
                conn.commit()
                
                result = {
                    'type': 'dividend',
                    'message': f"Dividend processed for {data['name']}"
                }
                
            elif transaction_type in ('BUY', 'SELL'):
                # Save to IsraeliStockTransaction table
                transaction_date = pending_transaction.transaction_date
                if isinstance(transaction_date, str):
                    transaction_date = self.parse_date_string(transaction_date)
                
                # Get transaction time if available
                transaction_time = pending_transaction.transaction_time if hasattr(pending_transaction, 'transaction_time') else None
                
                insert_sql = """
                INSERT INTO "IsraeliStockTransaction" (
                    user_id, security_no, symbol, company_name, transaction_type,
                    transaction_date, transaction_time, quantity, price, total_value, 
                    commission, tax, currency, source_pdf, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id, security_no, transaction_date, transaction_type, source_pdf) DO NOTHING
                """
                
                cursor.execute(insert_sql, (
                    user_id,
                    data['security_no'],
                    data['symbol'],
                    data['name'],
                    transaction_type,
                    transaction_date,
                    transaction_time,
                    float(pending_transaction.quantity) if pending_transaction.quantity else 0,
                    float(pending_transaction.price) if pending_transaction.price else 0,
                    float(pending_transaction.amount) if pending_transaction.amount else 0,
                    float(pending_transaction.commission) if pending_transaction.commission else 0,
                    float(pending_transaction.tax) if pending_transaction.tax else 0,
                    data['currency'],
                    data['source_pdf']
                ))
                conn.commit()
                
                # Update holdings based on transaction type
                self._update_holding_for_transaction(
                    cursor=cursor,
                    user_id=user_id,
                    security_no=data['security_no'],
                    symbol=data['symbol'],
                    company_name=data['name'],
                    transaction_type=transaction_type,
                    quantity=float(pending_transaction.quantity) if pending_transaction.quantity else 0,
                    price=float(pending_transaction.price) if pending_transaction.price else 0,
                    currency=data['currency'],
                    holding_date=transaction_date
                )
                conn.commit()
                
                result = {
                    'type': 'transaction',
                    'transaction_type': transaction_type,
                    'message': f"{transaction_type} transaction processed for {data['name']}"
                }
            
            elif transaction_type in ('DEPOSIT', 'WITHDRAWAL'):
                # Save deposits/withdrawals to IsraeliStockTransaction table
                transaction_date = pending_transaction.transaction_date
                if isinstance(transaction_date, str):
                    transaction_date = self.parse_date_string(transaction_date)
                
                # Get transaction time if available
                transaction_time = pending_transaction.transaction_time if hasattr(pending_transaction, 'transaction_time') else None
                
                insert_sql = """
                INSERT INTO "IsraeliStockTransaction" (
                    user_id, security_no, symbol, company_name, transaction_type,
                    transaction_date, transaction_time, quantity, price, total_value, 
                    commission, tax, currency, source_pdf, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """
                
                cursor.execute(insert_sql, (
                    user_id,
                    pending_transaction.security_no,
                    'CASH',  # Symbol for cash transactions
                    'Cash Transaction',  # Company name
                    transaction_type,
                    transaction_date,
                    transaction_time,
                    float(pending_transaction.quantity) if pending_transaction.quantity else 0,  # Balance after
                    0,  # No price for deposits
                    float(pending_transaction.amount) if pending_transaction.amount else 0,  # Deposit/withdrawal amount
                    float(pending_transaction.commission) if pending_transaction.commission else 0,
                    float(pending_transaction.tax) if pending_transaction.tax else 0,
                    data['currency'],
                    data['source_pdf']
                ))
                conn.commit()
                
                result = {
                    'type': 'cash_transaction',
                    'transaction_type': transaction_type,
                    'message': f"{transaction_type} processed: {pending_transaction.amount} {data['currency']}"
                }
            
            else:
                result = {
                    'type': 'unknown',
                    'message': f"Unknown transaction type: {transaction_type}"
                }
            
            cursor.close()
            conn.close()
            return result
            
        except Exception as e:
            print(f"Error processing approved transaction: {e}")
            raise e
    
    # REMOVED: Dynamic table creation methods to prevent duplicate tables
    # Tables are now managed by SQLAlchemy models only
    
    def get_user_holdings(self, user_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Get user's current Israeli stock holdings"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # Get holdings with quantity > 0 (one per stock now)
            query = '''
                SELECT h.id, h.security_no, h.symbol, h.company_name, h.quantity, 
                       h.last_price, h.current_value, h.holding_date, 
                       h.currency, h.purchase_cost, s.logo_svg,
                       h.unrealized_gain, h.unrealized_gain_pct, h.twr, h.mwr
                FROM "IsraeliStockHolding" h
                LEFT JOIN "IsraeliStocks" s ON h.security_no = s.security_no
                WHERE h.user_id = %s AND h.quantity > 0
                ORDER BY h.symbol
            '''
            
            params = (user_id,)
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            holdings = []
            total_portfolio_value = 0
            
            # First pass: calculate total portfolio value
            for row in rows:
                current_value = float(row[6]) if row[6] else 0
                total_portfolio_value += current_value
            
            # Second pass: create holdings with calculated percentages
            for row in rows:
                quantity = float(row[4]) if row[4] else 0
                last_price = float(row[5]) if row[5] else 0
                current_value = quantity * last_price  # Recalculate to ensure accuracy
                purchase_cost = float(row[9]) if row[9] else 0
                
                # Calculate average purchase price per share
                avg_purchase_price = purchase_cost / quantity if quantity > 0 else 0
                
                portfolio_percentage = (current_value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
                
                holdings.append({
                    'id': row[0],
                    'security_no': row[1],
                    'symbol': row[2],
                    'company_name': row[3],
                    'quantity': quantity,
                    'last_price': last_price,
                    'avg_purchase_price': round(avg_purchase_price, 2),  # Add this for display
                    'current_value': current_value,
                    'purchase_cost': purchase_cost,
                    'portfolio_percentage': round(portfolio_percentage, 2),
                    'overall_portfolio_percentage': round(portfolio_percentage, 2),
                    'currency': row[8],
                    'holding_date': row[7].isoformat() if row[7] else None,
                    'logo_svg': row[10] if len(row) > 10 else None,
                    'unrealized_gain': float(row[11]) if row[11] else None,
                    'unrealized_gain_pct': float(row[12]) if row[12] else None,
                    'twr': float(row[13]) if row[13] else None,
                    'mwr': float(row[14]) if row[14] else None
                })
            
            cursor.close()
            conn.close()
            return holdings
            
        except Exception as e:
            print(f"Error retrieving holdings: {e}")
            return []
    
    def get_user_transactions(self, user_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Get user's Israeli stock transactions"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            query = '''
                SELECT t.id, t.security_no, t.symbol, t.company_name, t.transaction_type,
                       t.transaction_date, t.transaction_time, t.quantity, t.price, t.total_value,
                       t.commission, t.tax, t.currency, t.created_at, s.logo_svg
                FROM "IsraeliStockTransaction" t
                LEFT JOIN "IsraeliStocks" s ON t.security_no = s.security_no
                WHERE t.user_id = %s 
                ORDER BY t.transaction_date DESC, t.created_at DESC
            '''
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            
            transactions = []
            for row in rows:
                transactions.append({
                    'id': row[0],  # ID for editing
                    'security_no': row[1],
                    'symbol': row[2],
                    'company_name': row[3],
                    'transaction_type': row[4],
                    'transaction_date': row[5].isoformat() if row[5] else None,
                    'transaction_time': str(row[6]) if row[6] else None,
                    'quantity': float(row[7]) if row[7] else 0,
                    'price': float(row[8]) if row[8] else 0,
                    'total_value': float(row[9]) if row[9] else 0,
                    'commission': float(row[10]) if row[10] else 0,
                    'tax': float(row[11]) if row[11] else 0,
                    'currency': row[12],
                    'created_at': row[13].isoformat() if row[13] else None,
                    'logo_svg': row[14] if len(row) > 14 else None
                })
            
            cursor.close()
            conn.close()
            return transactions
            
        except Exception as e:
            print(f"Error retrieving transactions: {e}")
            return []
    
    def get_user_dividends(self, user_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Get user's Israeli stock dividends"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            query = '''
                SELECT d.id, d.security_no, d.symbol, d.company_name, d.payment_date,
                       d.amount, d.tax, d.currency, d.source_pdf, d.created_at, s.logo_svg
                FROM "IsraeliDividend" d
                LEFT JOIN "IsraeliStocks" s ON d.security_no = s.security_no
                WHERE d.user_id = %s 
                ORDER BY d.payment_date DESC, d.created_at DESC
            '''
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            
            dividends = []
            for row in rows:
                dividends.append({
                    'id': row[0],
                    'security_no': row[1],
                    'symbol': row[2],
                    'company_name': row[3],
                    'payment_date': row[4].isoformat() if row[4] else None,
                    'amount': float(row[5]) if row[5] else 0,
                    'tax': float(row[6]) if row[6] else 0,
                    'currency': row[7],
                    'source_pdf': row[8],
                    'created_at': row[9].isoformat() if row[9] else None,
                    'logo_svg': row[10] if len(row) > 10 else None
                })
            
            cursor.close()
            conn.close()
            return dividends
            
        except Exception as e:
            print(f"Error retrieving dividends: {e}")
            return []
    
    def get_israeli_stocks(self, index_name: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get list of Israeli stocks"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            query = 'SELECT security_no, symbol, name, index_name FROM "IsraeliStocks"'
            params = []
            
            if index_name:
                query += ' WHERE index_name = %s'
                params.append(index_name)
            
            query += ' ORDER BY symbol'
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            stocks = []
            for row in rows:
                stocks.append({
                    'security_no': row[0],
                    'symbol': row[1],
                    'name': row[2],
                    'index_name': row[3]
                })
            
            cursor.close()
            conn.close()
            return stocks
            
        except Exception as e:
            print(f"Error retrieving stocks: {e}")
            return []
    
    def delete_holding(self, holding_id: int, user_id: str) -> bool:
        """Delete a specific holding"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                'DELETE FROM "IsraeliStockHolding" WHERE id = %s AND user_id = %s',
                (holding_id, user_id)
            )
            
            success = cursor.rowcount > 0
            conn.commit()
            cursor.close()
            conn.close()
            
            return success
            
        except Exception as e:
            print(f"Error deleting holding: {e}")
            return False
    
    def create_transaction(self, transaction_data: dict) -> int:
        """Create a new transaction manually"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            insert_sql = """
            INSERT INTO "IsraeliStockTransaction" (
                user_id, security_no, symbol, company_name, transaction_type,
                transaction_date, transaction_time, quantity, price, total_value,
                commission, tax, currency, source_pdf
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """
            
            cursor.execute(insert_sql, (
                transaction_data['user_id'],
                transaction_data.get('security_no', ''),
                transaction_data.get('symbol', ''),
                transaction_data.get('company_name', ''),
                transaction_data.get('transaction_type', 'BUY'),
                transaction_data.get('transaction_date'),
                transaction_data.get('transaction_time'),
                transaction_data.get('quantity', 0),
                transaction_data.get('price', 0),
                transaction_data.get('total_value', 0),
                transaction_data.get('commission', 0),
                transaction_data.get('tax', 0),
                transaction_data.get('currency', 'ILS'),
                'Manual Entry'
            ))
            
            transaction_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            return transaction_id
            
        except Exception as e:
            print(f"Error creating transaction: {e}")
            raise e

    def update_transaction(self, transaction_id: int, transaction_data: dict, user_id: str) -> bool:
        """Update an existing transaction"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            update_sql = """
            UPDATE "IsraeliStockTransaction" 
            SET security_no = %s, symbol = %s, company_name = %s, transaction_type = %s,
                transaction_date = %s, transaction_time = %s, quantity = %s, price = %s, 
                total_value = %s, commission = %s, tax = %s, currency = %s
            WHERE id = %s AND user_id = %s
            """
            
            cursor.execute(update_sql, (
                transaction_data.get('security_no', ''),
                transaction_data.get('symbol', ''),
                transaction_data.get('company_name', ''),
                transaction_data.get('transaction_type', 'BUY'),
                transaction_data.get('transaction_date'),
                transaction_data.get('transaction_time'),
                transaction_data.get('quantity', 0),
                transaction_data.get('price', 0),
                transaction_data.get('total_value', 0),
                transaction_data.get('commission', 0),
                transaction_data.get('tax', 0),
                transaction_data.get('currency', 'ILS'),
                transaction_id,
                user_id
            ))
            
            success = cursor.rowcount > 0
            conn.commit()
            cursor.close()
            conn.close()
            
            return success
            
        except Exception as e:
            print(f"Error updating transaction: {e}")
            return False

    def delete_transaction(self, transaction_id: int, user_id: str) -> bool:
        """Delete a specific transaction"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                'DELETE FROM "IsraeliStockTransaction" WHERE id = %s AND user_id = %s',
                (transaction_id, user_id)
            )
            
            success = cursor.rowcount > 0
            conn.commit()
            cursor.close()
            conn.close()
            
            return success
            
        except Exception as e:
            print(f"Error deleting transaction: {e}")
            return False
    
    def analyze_csv_for_israeli_stocks(self, csv_files: List[str], user_id: str) -> Dict:
        """Analyze CSV files for Israeli stocks and save to database"""
        try:
            israeli_stocks = self.load_israeli_stocks()
            holdings = []
            transactions = []
            
            for csv_file in csv_files:
                try:
                    import pandas as pd
                    df = pd.read_csv(csv_file, dtype=str)
                    
                    # Find Israeli stocks in this CSV
                    csv_holdings, csv_transactions = self.find_israeli_stocks_in_csv(
                        df, israeli_stocks, csv_file, 
                        pdf_name=os.path.basename(csv_file),
                        holding_date=datetime.now()
                    )
                    
                    holdings.extend(csv_holdings)
                    transactions.extend(csv_transactions)
                    
                except Exception as e:
                    print(f"Error processing CSV file {csv_file}: {e}")
                    continue
            
            # Save to database
            holdings_saved = self.save_holdings_to_database(holdings, user_id) if holdings else 0
            transactions_saved = self.save_transactions_to_database(transactions, user_id) if transactions else 0
            
            return {
                'success': True,
                'holdings_found': len(holdings),
                'transactions_found': len(transactions),
                'holdings_saved': holdings_saved,
                'transactions_saved': transactions_saved,
                'holdings': holdings,
                'transactions': transactions,
                'dividends': [t for t in transactions if t.get('transaction_type') == 'DIVIDEND']
            }
            
        except Exception as e:
            return {'error': str(e)}
        
    def analyze_pdf_for_israeli_stocks(self, pdf_path: str, user_id: str) -> Dict:
        """Analyze PDF for Israeli stocks and save to database"""
        return self.process_pdf_report(pdf_path, user_id)
