"""
Israeli Stock Analysis Service
Handles PDF processing, CSV extraction, and Israeli stock analysis for investment reports
"""

import os
import sys
import json
import glob
import uuid
import pandas as pd
import pdfplumber
import psycopg2
from datetime import datetime
from decimal import Decimal, InvalidOperation
from dotenv import load_dotenv
from typing import List, Dict, Tuple, Optional

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

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
    
    def __init__(self):
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
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    # Extract text to find Hebrew headings
                    page_text = page.extract_text() or ""
                    
                    # Determine page-level heading hints (a page may contain both types!)
                    has_holdings_heading = "תורתי טוריפ" in page_text  # Holdings details
                    has_transactions_heading = "תועונת טוריפ" in page_text  # Transactions details
                    
                    # Extract tables from this page
                    tables = page.extract_tables()
                    
                    if tables:
                        for table_num, table in enumerate(tables):
                            if table and len(table) > 0:
                                cleaned_table = []
                                for row in table:
                                    cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                                    cleaned_table.append(cleaned_row)
                                
                                # Decide table type: if page has only one heading type, use it; if both/none, leave None (to be inferred later)
                                inferred_table_type = None
                                if has_holdings_heading and not has_transactions_heading:
                                    inferred_table_type = "holdings"
                                elif has_transactions_heading and not has_holdings_heading:
                                    inferred_table_type = "transactions"

                                table_info = {
                                    'page': page_num + 1,
                                    'table_number': table_num + 1,
                                    'data': cleaned_table,
                                    'hebrew_heading_type': inferred_table_type  # Page-level hint only
                                }
                                all_tables.append(table_info)
                                hint_dbg = inferred_table_type if inferred_table_type else "ambiguous/none"
                                print(f"DEBUG: Page {page_num + 1}, Table {table_num + 1} - Hebrew heading hint: {hint_dbg}")
            
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
        """Extract the holding date from the PDF header"""
        if not os.path.exists(pdf_path):
            return None
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                if len(pdf.pages) > 0:
                    first_page = pdf.pages[0]
                    text = first_page.extract_text()
                    
                    if text:
                        lines = text.split('\n')[:10]  # Check first 10 lines
                        
                        import re
                        for line in lines:
                            # Accept dates with '/', '-', or '.' as separators
                            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})', line)
                            if date_match:
                                date_str = date_match.group(1)
                                return self.parse_date_string(date_str)
        except Exception:
            pass
        
        return None
    
    def parse_date_string(self, date_str: str) -> Optional[datetime]:
        """Parse a date string into a date object"""
        if not date_str:
            return None
        
        date_str = date_str.strip()
        date_formats = [
            '%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y',
            '%d.%m.%Y', '%d.%m.%y', '%Y/%m/%d', '%Y-%m-%d',
            '%m/%d/%Y', '%m/%d/%y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None
    
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
            
            # Save PDF to database
            self.save_pdf_to_database(
                user_id=user_id,
                filename=pdf_name,
                file_data=pdf_content,
                file_size=file_size,
                broker=broker,
                batch_id=batch_id
            )
            
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
                
                # Separate dividends from transactions
                dividends = [t for t in transactions if t.get('transaction_type') == 'DIVIDEND']
                regular_transactions = [t for t in transactions if t.get('transaction_type') != 'DIVIDEND']
                
                print(f"DEBUG: Found {len(holdings)} holdings, {len(regular_transactions)} transactions, {len(dividends)} dividends")
                
                # Save to pending transactions table for review
                pending_count = self.save_to_pending_transactions(
                    holdings=holdings,
                    transactions=regular_transactions,
                    dividends=dividends,
                    user_id=user_id,
                    batch_id=batch_id,
                    pdf_filename=pdf_name
                )
                
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
                    'pending_count': pending_count,
                    'message': f'Extracted {pending_count} transactions. Please review and approve them.'
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
                
                # Determine table type: prefer unambiguous Hebrew heading; else fall back to content-based detection
                csv_type = None
                if filename in table_info_map:
                    heading_type = table_info_map[filename].get('hebrew_heading_type')
                    if heading_type in ("holdings", "transactions"):
                        csv_type = heading_type
                        print(f"DEBUG: {filename} - Using Hebrew heading hint: {csv_type}")
                    else:
                        print(f"DEBUG: {filename} - Ambiguous/none heading hint; using content-based detection")
                else:
                    print(f"DEBUG: {filename} - Not found in table info map; using content-based detection")

                if csv_type is None:
                    # Use content-based detection on the DataFrame itself
                    try:
                        csv_type = self.determine_csv_type(df, csv_file)
                    except Exception:
                        csv_type = "holdings"  # safe default
                    print(f"DEBUG: {filename} - Content-based type: {csv_type}")
                
                if csv_type == "holdings":
                    holdings = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "holdings", pdf_name, holding_date)
                    if holdings:
                        all_holdings.extend(holdings)
                    print(f"DEBUG: {filename} - Found {len(holdings)} holdings")
                elif csv_type == "transactions":
                    transactions = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "transactions", pdf_name, holding_date)
                    all_transactions.extend(transactions)
                    print(f"DEBUG: {filename} - Found {len(transactions)} transactions")
                    
            except Exception as e:
                print(f"Error processing {csv_file}: {e}")
                continue
        
        return all_holdings, all_transactions
    
    def determine_csv_type(self, df: pd.DataFrame, csv_file: str) -> str:
        """Determine if a CSV contains holdings or transactions data"""
        filename_lower = os.path.basename(csv_file).lower()
        
        # Analyze content first to make a smarter decision
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
        
        # Look for date patterns which are strong indicators of transactions
        import re
        date_patterns = [r'\d{2}/\d{2}/\d{2}', r'\d{1,2}/\d{1,2}/\d{2,4}']
        for pattern in date_patterns:
            if re.search(pattern, sample_data):
                transaction_score += 2
        
        # Check for multi-line headers which are common in transaction tables
        if any('\\n' in str(col) for col in df.columns):
            transaction_score += 2
        
        # Check for transaction type columns in Hebrew
        transaction_type_keywords = ['גוס העונת', 'גוס\nהעונת', 'ביד/', 'חסמ/', 'הדקפה', 'הכישמ']
        if any(keyword in all_content for keyword in transaction_type_keywords):
            transaction_score += 3
        
        # Special case: If it's page_1_table_1 and has very strong holdings indicators, force holdings
        if 'page_1_table_1' in filename_lower and holdings_score >= 4:
            print(f"DEBUG: {os.path.basename(csv_file)} - Forced to HOLDINGS (Page 1 Table 1 with strong indicators)")
            return "holdings"
        
        result = "transactions" if transaction_score > holdings_score else "holdings"
        print(f"DEBUG: {os.path.basename(csv_file)} - Content analysis: Holdings={holdings_score}, Transactions={transaction_score}, Result={result}")
        return result
    
    def find_israeli_stocks_in_csv(self, df: pd.DataFrame, israeli_stocks: Dict, csv_file: str, 
                                 csv_type: str, pdf_name: str, holding_date: Optional[datetime]) -> List[Dict]:
        """Find Israeli stocks in a CSV DataFrame"""
        results = []
        # Avoid relying on df.to_string() gate; directly search per security across columns
        for security_no, (symbol, name, index_name) in israeli_stocks.items():
            mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
            if not mask.any():
                continue
            relevant_rows = df[mask]
            if csv_type == "holdings":
                # For holdings tables, check if this row contains dividend data
                for idx, row in relevant_rows.iterrows():
                    row_str = ' '.join(str(val) for val in row.values).lower()
                    # Skip any rows that look like dividends; dividends are parsed only from transactions tables
                    if any(dividend_kw in row_str for dividend_kw in ['דנדביד', 'דיבידנד', 'dividend', 'div/']):
                        print(f"DEBUG: Skipping dividend-like row in holdings table for {symbol}")
                        continue
                    holding_data = self.parse_holding_row(row, security_no, symbol, name, pdf_name, holding_date)
                    if holding_data:
                        results.append(holding_data)
            else:
                # Transaction tables
                transaction_data = self.extract_transaction_from_csv(df, security_no, symbol, name, pdf_name)
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
        """Parse a single row into holding data"""
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
            # Based on CSV structure: portfolio_percentage, current_value, purchase_cost, last_price, quantity
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
    
    
    
    def extract_transaction_from_csv(self, df: pd.DataFrame, security_no: str, symbol: str, 
                                   name: str, pdf_name: str) -> List[Dict]:
        """Extract transaction details for a specific stock from CSV"""
        transactions = []
        mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
        relevant_rows = df[mask]
        
        for idx, row in relevant_rows.iterrows():
            transaction = self.parse_transaction_row(row, security_no, symbol, name, pdf_name)
            if transaction:
                transactions.append(transaction)
        
        return transactions
    
    def parse_transaction_row(self, row, security_no: str, symbol: str, name: str, pdf_name: str) -> Optional[Dict]:
        """Parse a single row into transaction data with Hebrew mappings"""
        # Normalize all cells to strings and strip thousand separators for numeric parsing
        row_values = [str(val).strip() if pd.notna(val) else '' for val in row.values]
        row_values_no_commas = [s.replace(',', '') for s in row_values]
        
        transaction = {
            'security_no': security_no,
            'symbol': symbol,
            'name': name,
            'source_pdf': pdf_name,
            'currency': 'ILS'
        }
        
        # Enhanced Hebrew to English transaction type mapping
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
            'חסמ/': 'BUY',  # Assuming this is a buy transaction type from the debug output
            'buy': 'BUY',
            'sell': 'SELL',
            'הפקדה': 'DEPOSIT',
            'deposit': 'DEPOSIT',
            'משיכה': 'WITHDRAWAL',
            'withdrawal': 'WITHDRAWAL'
        }
        
        # Look for transaction type indicators in all row values
        transaction_type = None
        for value in row_values:
            value_str = str(value).strip().lower()
            for hebrew_key, english_type in hebrew_mappings.items():
                if hebrew_key.lower() in value_str:
                    transaction_type = english_type
                    break
            if transaction_type:
                break
        
        # Look for date patterns (prefer a dedicated date column if present)
        transaction_date = None
        transaction_time = None
        import re
        # Try column-based date/time first if columns present
        if len(row_values) >= 12:
            # Common layouts show date at index 1 and time at index 11
            date_candidate = row_values[1]
            time_candidate = row_values[11]
            m = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', date_candidate or '')
            if m:
                transaction_date = m.group(1)
            tm = re.search(r'\b(\d{1,2}:\d{2})\b', time_candidate or '')
            if tm:
                transaction_time = tm.group(1)
        # Fallback: scan entire row for date/time
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
        
        # Try to extract numeric values (amounts, prices, quantities) for fallback logic
        numeric_values = []
        for value in row_values_no_commas:
            try:
                # Clean the value and try to convert to float
                clean_value = str(value).replace('₪', '').replace(' ', '').replace('+', '').strip()
                if clean_value and clean_value.replace('.', '').replace('-', '').isdigit():
                    numeric_values.append(float(clean_value))
            except (ValueError, AttributeError):
                continue
        
        try:
            # Set transaction type if found
            if transaction_type:
                transaction['transaction_type'] = transaction_type
            else:
                transaction['transaction_type'] = 'BUY'  # Default
            
            # Set transaction date/time if found
            if transaction_date:
                transaction['transaction_date'] = transaction_date
            if transaction_time:
                transaction['transaction_time'] = transaction_time
            
            # Assign numeric values to appropriate fields based on transaction type
            if numeric_values:
                if transaction_type == 'DIVIDEND':
                    # For dividends in transaction tables, the structure is:
                    # [remaining_qty, date, cash_balance, tax, commission, net_amount, price, quantity, type, name, security_no, hour, value_date]
                    # Column 5 = net_amount (25.35), Column 3 = tax (12.68)
                    # We need to calculate gross_amount = net_amount + tax
                    
                    # Try to extract from specific columns first
                    try:
                        net_amount = 0
                        tax_amount = 0
                        
                        # Column 5: Net dividend amount
                        if len(row_values) >= 6 and row_values[5]:
                            net_amount = float(str(row_values[5]).replace('₪', '').replace(',', '').strip())
                        
                        # Column 3: Tax withheld
                        if len(row_values) >= 4 and row_values[3]:
                            tax_amount = float(str(row_values[3]).replace('₪', '').replace(',', '').strip())
                            transaction['tax'] = abs(tax_amount)
                        
                        # Calculate gross amount (total before tax)
                        if net_amount > 0 and tax_amount > 0:
                            gross_amount = abs(net_amount) + abs(tax_amount)
                            transaction['total_value'] = gross_amount
                            print(f"DEBUG: Dividend calculation - Net: {abs(net_amount)}, Tax: {abs(tax_amount)}, Gross: {gross_amount}")
                        elif net_amount > 0:
                            transaction['total_value'] = abs(net_amount)
                        
                        # Column 0: Remaining quantity (might be relevant)
                        if len(row_values) >= 1 and row_values[0]:
                            qty = float(str(row_values[0]).replace('₪', '').replace(',', '').strip())
                            if qty > 0:
                                transaction['quantity'] = abs(qty)
                        
                    except (ValueError, IndexError):
                        # Fallback to old logic if specific column parsing fails
                        if len(numeric_values) >= 1:
                            transaction['total_value'] = abs(numeric_values[0])
                        if len(numeric_values) >= 2:
                            transaction['tax'] = abs(numeric_values[1]) if numeric_values[1] > 0 else 0
                else:
                    # For buy/sell transactions: prefer column-positioned parsing when available
                    def to_float(val: str) -> Optional[float]:
                        try:
                            s = (val or '').replace('₪', '').replace(',', '').replace(' ', '').strip()
                            if not s:
                                return None
                            return float(s)
                        except Exception:
                            return None

                    used_positional = False
                    if len(row_values) >= 12:
                        print(f"DEBUG: Row has {len(row_values)} columns for {symbol}")
                        qty = to_float(row_values[7])  # quantity
                        price_raw = to_float(row_values[6])  # price (often in agorot)
                        commission = to_float(row_values[4]) or 0.0
                        tax = to_float(row_values[3]) or 0.0
                        total = to_float(row_values[5])  # net/total
                        print(f"DEBUG: Extracted - qty={qty}, price={price_raw}, commission={commission}, tax={tax}, total={total}")

                        if qty is not None or price_raw is not None or total is not None:
                            if qty is not None:
                                transaction['quantity'] = abs(qty)
                            if price_raw is not None:
                                # Convert from agorot to shekels if looks like agorot (>= 1000)
                                price = price_raw / 100.0 
                                transaction['price'] = abs(price)
                            if commission is not None:
                                transaction['commission'] = abs(commission)
                            if tax is not None:
                                transaction['tax'] = abs(tax)
                            if total is not None:
                                transaction['total_value'] = abs(total)
                            else:
                                # Compute total if not provided
                                if transaction.get('quantity') is not None and transaction.get('price') is not None:
                                    base = float(transaction['quantity']) * float(transaction['price'])
                                    if transaction['transaction_type'] == 'SELL':
                                        transaction['total_value'] = abs(base - commission - tax)
                                    else:
                                        transaction['total_value'] = abs(base + commission + tax)
                            used_positional = True

                    if not used_positional:
                        # Fallback heuristic based on ordered numeric values
                        if len(numeric_values) >= 1:
                            transaction['total_value'] = abs(numeric_values[0])
                        if len(numeric_values) >= 2:
                            transaction['quantity'] = abs(numeric_values[1])
                        if len(numeric_values) >= 3:
                            price_candidate = abs(numeric_values[2])
                            # Convert if looks like agorot
                            transaction['price'] = price_candidate / 100.0 if price_candidate >= 1000 else price_candidate
                        if len(numeric_values) >= 4:
                            transaction['commission'] = abs(numeric_values[3]) if numeric_values[3] > 0 else 0
                        if len(numeric_values) >= 5:
                            transaction['tax'] = abs(numeric_values[4]) if numeric_values[4] > 0 else 0
            
            # Only return transaction if we found a transaction type or date
            if transaction_type or transaction_date:
                print(f"DEBUG: Found transaction - {symbol}: {transaction_type} on {transaction_date}, value: {transaction.get('total_value', 'N/A')}")
                print(f"DEBUG: Transaction details - time: {transaction.get('transaction_time')}, commission: {transaction.get('commission')}, tax: {transaction.get('tax')}")
                return transaction
            else:
                return None
                
        except Exception as e:
            print(f"DEBUG: Error parsing transaction row for {symbol}: {e}")
            return None
    
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
    ) -> int:
        """Save uploaded PDF file to database"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
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
            return report_id
            
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
    ) -> int:
        """Save all extracted data to pending transactions table for review"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            pending_records = []
            
            print(f"DEBUG: Saving to pending - Holdings: {len(holdings)}, Transactions: {len(transactions)}, Dividends: {len(dividends)}")
            
            # Convert holdings to pending transactions (type: BUY)
            for holding in holdings:
                if holding.get('quantity') is None:
                    continue
                
                transaction_date = holding.get('holding_date')
                if isinstance(transaction_date, str):
                    transaction_date = self.parse_date_string(transaction_date)
                
                # Serialize holding data properly for JSON
                serialized_holding = self._serialize_for_json(holding)
                raw_data = {
                    'original_type': 'holding',
                    'holding': serialized_holding
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
                
                # Serialize transaction data properly for JSON
                serialized_transaction = self._serialize_for_json(transaction)
                raw_data = {
                    'original_type': 'transaction',
                    'transaction': serialized_transaction
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
                
                # Serialize dividend data properly for JSON
                serialized_dividend = self._serialize_for_json(dividend)
                raw_data = {
                    'original_type': 'dividend',
                    'dividend': serialized_dividend
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
            else:
                saved_count = 0
            
            cursor.close()
            conn.close()
            return saved_count
            
        except Exception as e:
            print(f"Error saving to pending transactions: {e}")
            raise e
    
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
                    0,  # tax - not captured in pending transactions yet
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
                
                insert_sql = """
                INSERT INTO "IsraeliStockTransaction" (
                    user_id, security_no, symbol, company_name, transaction_type,
                    transaction_date, quantity, price, total_value, currency, source_pdf
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, security_no, transaction_date, transaction_type, source_pdf) DO NOTHING
                """
                
                cursor.execute(insert_sql, (
                    user_id,
                    data['security_no'],
                    data['symbol'],
                    data['name'],
                    transaction_type,
                    transaction_date,
                    float(pending_transaction.quantity) if pending_transaction.quantity else 0,
                    float(pending_transaction.price) if pending_transaction.price else 0,
                    float(pending_transaction.amount) if pending_transaction.amount else 0,
                    data['currency'],
                    data['source_pdf']
                ))
                conn.commit()
                
                # For BUY transactions, also update/create holding
                if transaction_type == 'BUY':
                    # Check if holding already exists
                    cursor.execute(
                        'SELECT quantity FROM "IsraeliStockHolding" WHERE user_id = %s AND security_no = %s AND source_pdf = %s',
                        (user_id, data['security_no'], data['source_pdf'])
                    )
                    existing_holding = cursor.fetchone()
                    
                    if existing_holding:
                        # Update existing holding
                        cursor.execute(
                            'UPDATE "IsraeliStockHolding" SET quantity = quantity + %s WHERE user_id = %s AND security_no = %s AND source_pdf = %s',
                            (float(pending_transaction.quantity), user_id, data['security_no'], data['source_pdf'])
                        )
                    else:
                        # Create new holding
                        insert_holding_sql = """
                        INSERT INTO "IsraeliStockHolding" (
                            user_id, security_no, symbol, company_name, quantity,
                            last_price, purchase_cost, current_value, currency,
                            holding_date, source_pdf
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """
                        
                        quantity = float(pending_transaction.quantity) if pending_transaction.quantity else 0
                        price = float(pending_transaction.price) if pending_transaction.price else 0
                        total_value = quantity * price if quantity and price else float(pending_transaction.amount) if pending_transaction.amount else 0
                        
                        cursor.execute(insert_holding_sql, (
                            user_id,
                            data['security_no'],
                            data['symbol'],
                            data['name'],
                            quantity,
                            price,
                            total_value,
                            total_value,
                            data['currency'],
                            transaction_date,
                            data['source_pdf']
                        ))
                    conn.commit()
                
                result = {
                    'type': 'transaction',
                    'transaction_type': transaction_type,
                    'message': f"{transaction_type} transaction processed for {data['name']}"
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
        """Get user's Israeli stock holdings from the latest report only"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            # First, get the latest report date for this user
            cursor.execute('''
                SELECT MAX(holding_date) 
                FROM "IsraeliStockHolding" 
                WHERE user_id = %s AND holding_date IS NOT NULL
            ''', (user_id,))
            
            latest_date_result = cursor.fetchone()
            latest_date = latest_date_result[0] if latest_date_result and latest_date_result[0] else None
            
            if not latest_date:
                # If no holding_date, fall back to latest source_pdf
                cursor.execute('''
                    SELECT source_pdf 
                    FROM "IsraeliStockHolding" 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ''', (user_id,))
                
                latest_pdf_result = cursor.fetchone()
                if not latest_pdf_result:
                    cursor.close()
                    conn.close()
                    return []
                
                latest_pdf = latest_pdf_result[0]
                
                # Get holdings from the latest PDF
                query = '''
                    SELECT h.id, h.security_no, h.symbol, h.company_name, h.quantity, 
                           h.last_price, h.current_value, h.holding_date, 
                           h.currency, h.purchase_cost, s.logo_svg
                    FROM "IsraeliStockHolding" h
                    LEFT JOIN "IsraeliStocks" s ON h.security_no = s.security_no
                    WHERE h.user_id = %s AND h.source_pdf = %s
                    ORDER BY h.symbol
                '''
                params = (user_id, latest_pdf)
            else:
                # Get holdings from the latest holding date
                query = '''
                    SELECT h.id, h.security_no, h.symbol, h.company_name, h.quantity, 
                           h.last_price, h.current_value, h.holding_date, 
                           h.currency, h.purchase_cost, s.logo_svg
                    FROM "IsraeliStockHolding" h
                    LEFT JOIN "IsraeliStocks" s ON h.security_no = s.security_no
                    WHERE h.user_id = %s AND h.holding_date = %s
                    ORDER BY h.symbol
                '''
                params = (user_id, latest_date)
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            holdings = []
            total_portfolio_value = 0
            
            # First pass: calculate total portfolio value
            for row in rows:
                current_value = float(row[6]) if row[6] else 0  # current_value is at index 6
                total_portfolio_value += current_value
            
            # Second pass: create holdings with calculated percentages
            for row in rows:
                current_value = float(row[6]) if row[6] else 0  # current_value is at index 6
                purchase_cost = float(row[9]) if row[9] else 0  # purchase_cost is at index 9
                
                # Israeli portfolio percentage (within Israeli stocks only)
                israeli_portfolio_percentage = (current_value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
                
                # Overall portfolio percentage (for future use when we add global stocks)
                # For now, it's the same as Israeli percentage since we only have Israeli stocks
                overall_portfolio_percentage = israeli_portfolio_percentage
                
                holdings.append({
                    'id': row[0],  # ID for editing
                    'security_no': row[1],
                    'symbol': row[2],
                    'company_name': row[3],
                    'quantity': float(row[4]) if row[4] else 0,
                    'last_price': float(row[5]) if row[5] else 0,
                    'current_value': current_value,
                    'purchase_cost': purchase_cost,
                    'portfolio_percentage': round(israeli_portfolio_percentage, 2),  # Israeli stocks percentage
                    'overall_portfolio_percentage': round(overall_portfolio_percentage, 2),  # Overall portfolio percentage
                    'currency': row[8],
                    'holding_date': row[7].isoformat() if row[7] else None,
                    'logo_svg': row[10] if len(row) > 10 else None
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
                       t.transaction_date, t.quantity, t.price, t.total_value,
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
                    'quantity': float(row[6]) if row[6] else 0,
                    'price': float(row[7]) if row[7] else 0,
                    'total_value': float(row[8]) if row[8] else 0,
                    'commission': float(row[9]) if row[9] else 0,
                    'tax': float(row[10]) if row[10] else 0,
                    'currency': row[11],
                    'created_at': row[12].isoformat() if row[12] else None,
                    'logo_svg': row[13] if len(row) > 13 else None
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
