"""
Israeli Stock Analysis Service
Handles PDF processing, CSV extraction, and Israeli stock analysis for investment reports
"""

import os
import sys
import json
import glob
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
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5433'),
            'database': os.getenv('DB_NAME', 'investracker_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        
    def create_database_connection(self):
        """Create and return a database connection"""
        return psycopg2.connect(**self.db_config)
    
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
                    
                    # Determine table type based on Hebrew headings
                    table_type = None
                    if "תורתי טוריפ" in page_text:  # Holdings details
                        table_type = "holdings"
                    elif "תועונת טוריפ" in page_text:  # Transactions details
                        table_type = "transactions"
                    
                    # Extract tables from this page
                    tables = page.extract_tables()
                    
                    if tables:
                        for table_num, table in enumerate(tables):
                            if table and len(table) > 0:
                                cleaned_table = []
                                for row in table:
                                    cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                                    cleaned_table.append(cleaned_row)
                                
                                table_info = {
                                    'page': page_num + 1,
                                    'table_number': table_num + 1,
                                    'data': cleaned_table,
                                    'hebrew_heading_type': table_type  # Add the heading-based type
                                }
                                all_tables.append(table_info)
                                
                                print(f"DEBUG: Page {page_num + 1}, Table {table_num + 1} - Hebrew heading indicates: {table_type}")
            
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
                            date_match = re.search(r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})', line)
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
    
    def process_pdf_report(self, pdf_path: str, user_id: str) -> Dict:
        """Main function to process a PDF investment report"""
        try:
            # Extract PDF name and date
            pdf_name = os.path.basename(pdf_path)
            holding_date = self.extract_date_from_pdf(pdf_path)
            
            # Extract tables from PDF
            tables = self.extract_tables_from_pdf(pdf_path)
            if not tables:
                return {'error': 'No tables found in PDF'}
            
            # Save to temporary CSV files
            temp_dir = f"temp_csv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            csv_files = self.save_tables_to_csv(tables, temp_dir)
            
            try:
                # Analyze CSV files
                # Analyze CSV files with heading information
                holdings, transactions = self.analyze_csv_files_with_headings(csv_files, tables, pdf_name, holding_date)
                
                # Separate dividends from transactions
                dividends = [t for t in transactions if t.get('transaction_type') == 'DIVIDEND']
                regular_transactions = [t for t in transactions if t.get('transaction_type') != 'DIVIDEND']
                
                print(f"DEBUG: Found {len(holdings)} holdings, {len(regular_transactions)} transactions, {len(dividends)} dividends")
                
                # Save to database
                holdings_saved = self.save_holdings_to_database(holdings, user_id) if holdings else 0
                transactions_saved = self.save_transactions_to_database(regular_transactions, user_id) if regular_transactions else 0
                dividends_saved = self.save_dividends_to_database(dividends, user_id) if dividends else 0
                
                # Clean up temporary files
                import shutil
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                
                return {
                    'success': True,
                    'pdf_name': pdf_name,
                    'holding_date': holding_date.isoformat() if holding_date else None,
                    'holdings_found': len(holdings),
                    'transactions_found': len(regular_transactions),
                    'dividends_found': len(dividends),
                    'holdings_saved': holdings_saved,
                    'transactions_saved': transactions_saved,
                    'dividends_saved': dividends_saved
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
                
                # Get the table type from Hebrew heading
                csv_type = "holdings"  # default
                if filename in table_info_map:
                    heading_type = table_info_map[filename].get('hebrew_heading_type')
                    if heading_type:
                        csv_type = heading_type
                        print(f"DEBUG: {filename} - Using Hebrew heading type: {csv_type}")
                    else:
                        print(f"DEBUG: {filename} - No Hebrew heading found, defaulting to holdings")
                else:
                    print(f"DEBUG: {filename} - Not found in table info map")
                
                if csv_type == "holdings":
                    holdings = self.find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "holdings", pdf_name, holding_date)
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
        df_str = df.to_string()
        
        for security_no, (symbol, name, index_name) in israeli_stocks.items():
            if security_no in df_str:
                if csv_type == "holdings":
                    # For holdings tables, check if this row contains dividend data
                    mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
                    relevant_rows = df[mask]
                    
                    for idx, row in relevant_rows.iterrows():
                        # Check if this row is a dividend entry in the holdings table
                        row_str = ' '.join(str(val) for val in row.values).lower()
                        if any(dividend_kw in row_str for dividend_kw in ['דנדביד', 'דיבידנד', 'dividend']):
                            # This is a dividend entry in the holdings table
                            dividend_data = self.parse_dividend_from_holdings_row(row, security_no, symbol, name, pdf_name)
                            if dividend_data:
                                dividend_data['transaction_type'] = 'DIVIDEND'  # Mark as dividend
                                results.append(dividend_data)
                                print(f"DEBUG: Found dividend in holdings table - {symbol}: {dividend_data}")
                        else:
                            # Regular holding entry
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
    
    def parse_dividend_from_holdings_row(self, row, security_no: str, symbol: str, name: str, pdf_name: str) -> Optional[Dict]:
        """Parse a dividend entry from holdings table row"""
        row_values = [str(val).replace(',', '') if pd.notna(val) else '' for val in row.values]
        
        dividend = {
            'security_no': security_no,
            'symbol': symbol,
            'name': name,
            'source_pdf': pdf_name,
            'currency': 'ILS',
            'transaction_type': 'DIVIDEND'
        }
        
        try:
            # For dividends in holdings table, the structure is typically:
            # [percentage, dividend_amount, cost_basis, market_price, quantity, name_with_dividend_keyword, security_no]
            
            # Extract dividend amount (usually in column 1)
            if len(row_values) > 1 and row_values[1]:
                try:
                    dividend_amount = float(row_values[1])
                    dividend['total_value'] = abs(dividend_amount)
                except ValueError:
                    pass
            
            # Extract quantity if available (usually in column 4)
            if len(row_values) > 4 and row_values[4]:
                try:
                    quantity = float(row_values[4])
                    dividend['quantity'] = abs(quantity)
                except ValueError:
                    pass
            
            # Set a default date (we can't extract it from holdings table)
            dividend['transaction_date'] = None
            
            # Only return if we found a dividend amount
            if dividend.get('total_value'):
                print(f"DEBUG: Parsed dividend from holdings - {symbol}: Amount={dividend.get('total_value')}, Quantity={dividend.get('quantity', 'N/A')}")
                return dividend
            else:
                return None
                
        except Exception as e:
            print(f"DEBUG: Error parsing dividend from holdings row for {symbol}: {e}")
            return None
    
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
        row_values = [str(val).replace(',', '') if pd.notna(val) else '' for val in row.values]
        
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
            'ביד/': 'DIVIDEND',
            'div/': 'DIVIDEND',
            'dividend': 'DIVIDEND',
            'ףיצר/ק': 'BUY',
            'ךיצר': 'BUY',
            'קנייה': 'BUY',
            'מכירה': 'SELL',
            'מיכור': 'SELL',
            'חסמ/': 'BUY',  # Assuming this is a buy transaction type from the debug output
            'buy': 'BUY',
            'sell': 'SELL'
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
        
        # Look for date patterns
        transaction_date = None
        import re
        for value in row_values:
            value_str = str(value).strip()
            # Look for date patterns like DD/MM/YY or DD/MM/YYYY
            date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})', value_str)
            if date_match:
                transaction_date = date_match.group(1)
                break
        
        # Try to extract numeric values (amounts, prices, quantities)
        numeric_values = []
        for value in row_values:
            try:
                # Clean the value and try to convert to float
                clean_value = str(value).replace(',', '').replace(' ', '').strip()
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
            
            # Set transaction date if found
            if transaction_date:
                transaction['transaction_date'] = transaction_date
            
            # Assign numeric values to appropriate fields based on transaction type
            if numeric_values:
                if transaction_type == 'DIVIDEND':
                    # For dividends in transaction tables, the structure is:
                    # [remaining_qty, date, cash_balance, tax, commission, net_amount, price, quantity, type, name, security_no, hour, value_date]
                    # Column 5 = net_amount (38.03), Column 3 = tax (12.68)
                    
                    # Try to extract from specific columns first
                    try:
                        # Column 5: Net dividend amount
                        if len(row_values) >= 6 and row_values[5]:
                            net_amount = float(str(row_values[5]).replace(',', ''))
                            transaction['total_value'] = abs(net_amount)
                        
                        # Column 3: Tax withheld
                        if len(row_values) >= 4 and row_values[3]:
                            tax_amount = float(str(row_values[3]).replace(',', ''))
                            transaction['tax'] = abs(tax_amount)
                        
                        # Column 0: Remaining quantity (might be relevant)
                        if len(row_values) >= 1 and row_values[0]:
                            qty = float(str(row_values[0]).replace(',', ''))
                            if qty > 0:
                                transaction['quantity'] = abs(qty)
                        
                    except (ValueError, IndexError):
                        # Fallback to old logic if specific column parsing fails
                        if len(numeric_values) >= 1:
                            transaction['total_value'] = abs(numeric_values[0])
                        if len(numeric_values) >= 2:
                            transaction['tax'] = abs(numeric_values[1]) if numeric_values[1] > 0 else 0
                else:
                    # For buy/sell transactions: quantity, price, total_value, commission, tax
                    if len(numeric_values) >= 1:
                        transaction['total_value'] = abs(numeric_values[0])
                    if len(numeric_values) >= 2:
                        transaction['quantity'] = abs(numeric_values[1])
                    if len(numeric_values) >= 3:
                        transaction['price'] = abs(numeric_values[2])
                    if len(numeric_values) >= 4:
                        transaction['commission'] = abs(numeric_values[3]) if numeric_values[3] > 0 else 0
                    if len(numeric_values) >= 5:
                        transaction['tax'] = abs(numeric_values[4]) if numeric_values[4] > 0 else 0
            
            # Only return transaction if we found a transaction type or date
            if transaction_type or transaction_date:
                print(f"DEBUG: Found transaction - {symbol}: {transaction_type} on {transaction_date}, value: {transaction.get('total_value', 'N/A')}")
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
                           h.currency, s.logo_svg
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
                           h.currency, s.logo_svg
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
                current_value = float(row[6]) if row[6] else 0  # current_value is now at index 6
                portfolio_percentage = (current_value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
                
                holdings.append({
                    'id': row[0],  # ID for editing
                    'security_no': row[1],
                    'symbol': row[2],
                    'company_name': row[3],
                    'quantity': float(row[4]) if row[4] else 0,
                    'last_price': float(row[5]) if row[5] else 0,
                    'current_value': current_value,
                    'portfolio_percentage': round(portfolio_percentage, 2),
                    'currency': row[8],
                    'holding_date': row[7].isoformat() if row[7] else None,
                    'logo_svg': row[9] if len(row) > 9 else None
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
