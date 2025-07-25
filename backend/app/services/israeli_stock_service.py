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
        """Extract all tables from PDF"""
        all_tables = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
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
                                    'data': cleaned_table
                                }
                                all_tables.append(table_info)
            
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
                holdings, transactions = self.analyze_csv_files(csv_files, pdf_name, holding_date)
                
                # Save to database
                holdings_saved = self.save_holdings_to_database(holdings, user_id) if holdings else 0
                transactions_saved = self.save_transactions_to_database(transactions, user_id) if transactions else 0
                
                # Clean up temporary files
                import shutil
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                
                return {
                    'success': True,
                    'pdf_name': pdf_name,
                    'holding_date': holding_date.isoformat() if holding_date else None,
                    'holdings_found': len(holdings),
                    'transactions_found': len(transactions),
                    'holdings_saved': holdings_saved,
                    'transactions_saved': transactions_saved
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
        
        for csv_file in csv_files:
            try:
                df = pd.read_csv(csv_file)
                csv_type = self.determine_csv_type(df, csv_file)
                
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
    
    def determine_csv_type(self, df: pd.DataFrame, csv_file: str) -> str:
        """Determine if a CSV contains holdings or transactions data"""
        columns_str = ' '.join([str(col).lower() for col in df.columns])
        sample_data = ' '.join([str(val).lower() for val in df.iloc[:3].values.flatten() if pd.notna(val)])
        
        holdings_indicators = [
            'current', 'holding', 'position', 'portfolio', 'balance',
            'market value', 'זוחא', 'יווש', 'יחכונ רעש', 'השיכרה תולע', 'קיתהמ'
        ]
        
        transaction_indicators = [
            'buy', 'sell', 'transaction', 'trade', 'date', 'activity',
            'קנייה', 'מכירה', 'עסקה', 'ךיראת', 'דנדביד', 'ףיצר'
        ]
        
        holdings_score = sum(1 for indicator in holdings_indicators if indicator in columns_str or indicator in sample_data)
        transaction_score = sum(1 for indicator in transaction_indicators if indicator in columns_str or indicator in sample_data)
        
        filename_lower = os.path.basename(csv_file).lower()
        if 'table_1' in filename_lower:
            holdings_score += 3
        elif 'table_2' in filename_lower:
            transaction_score += 3
        
        return "holdings" if holdings_score > transaction_score else "transactions"
    
    def find_israeli_stocks_in_csv(self, df: pd.DataFrame, israeli_stocks: Dict, csv_file: str, 
                                 csv_type: str, pdf_name: str, holding_date: Optional[datetime]) -> List[Dict]:
        """Find Israeli stocks in a CSV DataFrame"""
        results = []
        df_str = df.to_string()
        
        for security_no, (symbol, name, index_name) in israeli_stocks.items():
            if security_no in df_str:
                if csv_type == "holdings":
                    holding_data = self.extract_holding_from_csv(df, security_no, symbol, name, pdf_name, holding_date)
                    if holding_data:
                        results.extend(holding_data)
                else:
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
        row_values = [str(val).replace(',', '') if pd.notna(val) else '' for val in row.values]
        
        transaction = {
            'security_no': security_no,
            'symbol': symbol,
            'name': name,
            'source_pdf': pdf_name,
            'currency': 'ILS'
        }
        
        # Hebrew to English transaction type mapping
        hebrew_mappings = {
            'דנדביד': 'DIVIDEND',
            'ףיצר/ק': 'BUY',
            'ךיצר': 'BUY',
            'קנייה': 'BUY',
            'מכירה': 'SELL',
            'מיכור': 'SELL'
        }
        
        try:
            # Based on CSV structure from your example
            if len(row_values) > 0 and row_values[0]:
                transaction['total_value'] = float(row_values[0])  # Total amount
            if len(row_values) > 1 and row_values[1]:
                transaction['transaction_date'] = row_values[1]  # Date
            if len(row_values) > 3 and row_values[3]:
                transaction['tax'] = float(row_values[3])  # Tax
            if len(row_values) > 4 and row_values[4]:
                transaction['commission'] = float(row_values[4])  # Commission
            if len(row_values) > 6 and row_values[6]:
                transaction['price'] = float(row_values[6])  # Stock price
            if len(row_values) > 7 and row_values[7]:
                transaction['quantity'] = float(row_values[7])  # Amount/Quantity
            if len(row_values) > 8 and row_values[8]:
                # Transaction type in Hebrew
                hebrew_type = row_values[8].strip()
                transaction['transaction_type'] = hebrew_mappings.get(hebrew_type, 'BUY')
            if len(row_values) > 11 and row_values[11]:
                transaction['transaction_time'] = row_values[11]  # Time
                
        except (ValueError, TypeError):
            pass
        
        return transaction
    
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
    
    # REMOVED: Dynamic table creation methods to prevent duplicate tables
    # Tables are now managed by SQLAlchemy models only
    
    def get_user_holdings(self, user_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Get user's Israeli stock holdings"""
        try:
            conn = self.create_database_connection()
            cursor = conn.cursor()
            
            query = '''
                SELECT security_no, symbol, company_name, quantity, 
                       last_price, current_value, holding_date, 
                       currency, source_pdf, created_at
                FROM "IsraeliStockHolding" 
                WHERE user_id = %s 
                ORDER BY created_at DESC
            '''
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            
            holdings = []
            for row in rows:
                holdings.append({
                    'security_no': row[0],
                    'symbol': row[1],
                    'company_name': row[2],
                    'quantity': float(row[3]) if row[3] else 0,
                    'last_price': float(row[4]) if row[4] else 0,
                    'current_value': float(row[5]) if row[5] else 0,
                    'holding_date': row[6].isoformat() if row[6] else None,
                    'currency': row[7],
                    'source_pdf': row[8],
                    'created_at': row[9].isoformat() if row[9] else None
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
                SELECT security_no, symbol, company_name, transaction_type,
                       transaction_date, quantity, price, total_value,
                       commission, tax, currency, source_pdf, created_at
                FROM "IsraeliStockTransaction" 
                WHERE user_id = %s 
                ORDER BY transaction_date DESC, created_at DESC
            '''
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            
            transactions = []
            for row in rows:
                transactions.append({
                    'security_no': row[0],
                    'symbol': row[1],
                    'company_name': row[2],
                    'transaction_type': row[3],
                    'transaction_date': row[4].isoformat() if row[4] else None,
                    'quantity': float(row[5]) if row[5] else 0,
                    'price': float(row[6]) if row[6] else 0,
                    'total_value': float(row[7]) if row[7] else 0,
                    'commission': float(row[8]) if row[8] else 0,
                    'tax': float(row[9]) if row[9] else 0,
                    'currency': row[10],
                    'source_pdf': row[11],
                    'created_at': row[12].isoformat() if row[12] else None
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
                SELECT security_no, symbol, company_name, payment_date,
                       amount, tax, currency, source_pdf, created_at
                FROM "IsraeliDividend" 
                WHERE user_id = %s 
                ORDER BY payment_date DESC, created_at DESC
            '''
            
            if limit:
                query += f' LIMIT {limit}'
                
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            
            dividends = []
            for row in rows:
                dividends.append({
                    'security_no': row[0],
                    'symbol': row[1],
                    'company_name': row[2],
                    'payment_date': row[3].isoformat() if row[3] else None,
                    'amount': float(row[4]) if row[4] else 0,
                    'tax': float(row[5]) if row[5] else 0,
                    'currency': row[6],
                    'source_pdf': row[7],
                    'created_at': row[8].isoformat() if row[8] else None
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
