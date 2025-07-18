#!/usr/bin/env python3

"""
LEGACY SCRIPT - This functionality has been migrated to IsraeliStockService
This file is kept for reference only. Use the API endpoints in /israeli-stocks/ instead.
"""

import sys
import pdfplumber
import re
import psycopg2
from dotenv import load_dotenv
import os
import pandas as pd
import glob
from datetime import datetime
import json
from decimal import Decimal, InvalidOperation

def load_israeli_stocks_data():
    """Load Israeli stocks from PostgreSQL database (TA-125 and SME-60)"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Get all Israeli stocks from both indexes
        cursor.execute('SELECT security_no, symbol, name, index_name FROM "IsraeliStocks"')
        stocks = cursor.fetchall()
        
        # Convert to dictionary: security_no -> (symbol, name, index_name)
        israeli_stocks_dict = {}
        for security_no, symbol, name, index_name in stocks:
            israeli_stocks_dict[security_no] = (symbol, name, index_name)
        
        cursor.close()
        conn.close()
        
        print(f"Loaded {len(israeli_stocks_dict)} Israeli stocks from database")
        
        # Show index breakdown
        index_counts = {}
        for security_no, (symbol, name, index_name) in israeli_stocks_dict.items():
            for idx in index_name.split(', '):  # Handle stocks in multiple indexes
                index_counts[idx] = index_counts.get(idx, 0) + 1
        
        for idx, count in index_counts.items():
            print(f"  {idx}: {count} stocks")
        
        return israeli_stocks_dict
        
    except Exception as e:
        print(f"Error loading Israeli stocks data from database: {e}")
        print("Database connection failed. Cannot proceed without Israeli stocks data.")
        return {}

def analyze_investment_pdf(pdf_path):
    """Analyze PDF and look for investment-specific patterns"""
    
    # Load Israeli stocks data
    israeli_stocks = load_israeli_stocks_data()
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages\n")
            
            all_text = ""
            for page_num, page in enumerate(pdf.pages):
                print(f"==== PAGE {page_num + 1} ====")
                
                text = page.extract_text()
                if text:
                    all_text += text + "\n"
                    
                    # Show first 1000 characters
                    print("First 1000 chars:")
                    print(text[:1000])
                    print("...\n" if len(text) > 1000 else "\n")
                    
                    # Look for tables
                    tables = page.extract_tables()
                    if tables:
                        print(f"Found {len(tables)} tables on this page:")
                        for i, table in enumerate(tables):
                            print(f"\nTable {i+1} (first 3 rows):")
                            for row in table[:3]:
                                print(row)
                    else:
                        print("No tables found on this page")
                
                print("-" * 50)
            
            # Analyze the complete text
            print("\n==== ANALYSIS ====")
            
            # Look for currency symbols and amounts
            dollar_amounts = re.findall(r'\$?([\d,]+\.?\d*)', all_text)
            print(f"Found {len(dollar_amounts)} potential dollar amounts")
            if dollar_amounts:
                print("First 10:", dollar_amounts[:10])
            
            # Look for stock symbols (2-5 uppercase letters)
            stock_symbols = re.findall(r'\b[A-Z]{2,5}\b', all_text)
            unique_symbols = list(set(stock_symbols))
            print(f"Found {len(unique_symbols)} unique potential stock symbols")
            if unique_symbols:
                print("First 20:", unique_symbols[:20])
            
            # Look for dates
            dates = re.findall(r'\b\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b', all_text)
            print(f"Found {len(dates)} potential dates")
            if dates:
                print("First 10:", dates[:10])
            
            # Look for Hebrew/RTL text (approximate)
            hebrew_chars = re.findall(r'[\u0590-\u05FF]+', all_text)
            print(f"Found {len(hebrew_chars)} Hebrew text segments")
            if hebrew_chars:
                print("First 5:", hebrew_chars[:5])
                
            # ENHANCED: Look for Israeli stocks by security numbers and symbols
            print("\n==== ISRAELI STOCKS ANALYSIS ====")
            
            # Check which Israeli stocks appear in the PDF
            found_israeli_stocks = []
            found_methods = []  # Track how each stock was found
            
            for security_no, (symbol, name, index_name) in israeli_stocks.items():
                found_method = None
                
                # Check by security number (most reliable)
                if security_no in all_text:
                    found_method = "security_number"
                # Check by symbol (case-insensitive)
                elif symbol.upper() in all_text.upper():
                    found_method = "symbol"
                # Check by company name (case-insensitive, partial match)
                elif name.upper() in all_text.upper():
                    found_method = "company_name"
                
                if found_method:
                    found_israeli_stocks.append((security_no, symbol, name, index_name, found_method))
                    found_methods.append(found_method)
            
            if found_israeli_stocks:
                print(f"Found {len(found_israeli_stocks)} Israeli stocks in PDF:")
                
                # Group by detection method
                by_security = [stock for stock in found_israeli_stocks if stock[4] == "security_number"]
                by_symbol = [stock for stock in found_israeli_stocks if stock[4] == "symbol"]
                by_name = [stock for stock in found_israeli_stocks if stock[4] == "company_name"]
                
                if by_security:
                    print(f"\n  Found by Security Number ({len(by_security)}):")
                    for security_no, symbol, name, index_name, _ in by_security:
                        print(f"    {security_no} ({symbol}): {name} [{index_name}]")
                        
                        # Extract detailed transaction data for this security
                        print(f"      Transaction Details:")
                        extract_transaction_details(all_text, security_no, symbol, name)
                
                if by_symbol:
                    print(f"\n  Found by Symbol ({len(by_symbol)}):")
                    for security_no, symbol, name, index_name, _ in by_symbol:
                        print(f"    {security_no} ({symbol}): {name} [{index_name}]")
                
                if by_name:
                    print(f"\n  Found by Company Name ({len(by_name)}):")
                    for security_no, symbol, name, index_name, _ in by_name:
                        print(f"    {security_no} ({symbol}): {name} [{index_name}]")
                        
                # Summary
                print(f"\n  Detection Summary:")
                print(f"    Security Number matches: {len(by_security)}")
                print(f"    Symbol matches: {len(by_symbol)}")
                print(f"    Company Name matches: {len(by_name)}")
                
            else:
                print("No Israeli stocks found in PDF")
                
            # Look for Hebrew company names
            hebrew_companies = re.findall(r'[\u0590-\u05FF\s]+(?:בע"מ|בע״מ|לימיטד|הולדינגס)', all_text)
            if hebrew_companies:
                print(f"\nFound {len(hebrew_companies)} Hebrew company names:")
                for company in hebrew_companies[:10]:  # Show first 10
                    print(f"  {company.strip()}")
                    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

def extract_transaction_details(text, security_no, symbol, name):
    """Extract detailed transaction information for a specific security"""
    
    # Find all lines containing the security number
    lines = text.split('\n')
    relevant_lines = []
    
    for i, line in enumerate(lines):
        if security_no in line:
            # Include context lines (2 before, 2 after)
            start = max(0, i-2)
            end = min(len(lines), i+3)
            context_lines = lines[start:end]
            relevant_lines.extend(context_lines)
    
    if not relevant_lines:
        print(f"        No transaction details found for security {security_no}")
        return
    
    # Remove duplicates while preserving order
    seen = set()
    unique_lines = []
    for line in relevant_lines:
        if line.strip() and line not in seen:
            seen.add(line)
            unique_lines.append(line)
    
    print(f"        Raw transaction data:")
    for line in unique_lines:
        if line.strip():
            print(f"          {line.strip()}")
    
    # Try to extract structured data
    print(f"        Parsed transaction data:")
    
    # Look for quantity patterns
    quantity_patterns = [
        r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:shares?|יחידות|מניות)',
        r'(?:qty|quantity|כמות)[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
        r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:units?|יח\')'
    ]
    
    quantities = []
    for pattern in quantity_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        quantities.extend(matches)
    
    # Look for price patterns
    price_patterns = [
        r'(?:price|מחיר)[:\s]*(?:\$|₪|ILS|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
        r'(?:\$|₪|ILS|USD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
        r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:\$|₪|ILS|USD)'
    ]
    
    prices = []
    for pattern in price_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        prices.extend(matches)
    
    # Look for value/amount patterns
    value_patterns = [
        r'(?:value|amount|סכום|ערך)[:\s]*(?:\$|₪|ILS|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
        r'(?:total|סה\"כ)[:\s]*(?:\$|₪|ILS|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
        r'(?:\$|₪|ILS|USD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)'
    ]
    
    values = []
    for pattern in value_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        values.extend(matches)
    
    # Look for date patterns near the security
    date_patterns = [
        r'\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\b',
        r'\b(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b',
        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b'
    ]
    
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        dates.extend(matches)
    
    # Look for transaction type (buy/sell)
    transaction_types = []
    if re.search(r'\b(?:buy|bought|purchase|acquired|רכישה|קנייה)\b', text, re.IGNORECASE):
        transaction_types.append("BUY")
    if re.search(r'\b(?:sell|sold|sale|disposed|מכירה|מיכור)\b', text, re.IGNORECASE):
        transaction_types.append("SELL")
    
    # Print extracted data
    if quantities:
        print(f"          Quantities found: {', '.join(set(quantities))}")
    if prices:
        print(f"          Prices found: {', '.join(set(prices))}")
    if values:
        print(f"          Values found: {', '.join(set(values))}")
    if dates:
        print(f"          Dates found: {', '.join(set(dates))}")
    if transaction_types:
        print(f"          Transaction types: {', '.join(set(transaction_types))}")
    
    # Try to find table data
    print(f"        Table data extraction:")
    extract_table_data_for_security(text, security_no, symbol)
    
    print()  # Add spacing between securities

def extract_table_data_for_security(text, security_no, symbol):
    """Extract table data that contains the security"""
    
    # Split text into lines and look for table-like structures
    lines = text.split('\n')
    table_lines = []
    
    for i, line in enumerate(lines):
        if security_no in line or symbol in line:
            # Look for lines with multiple columns (tabs or multiple spaces)
            if '\t' in line or re.search(r'\s{3,}', line):
                table_lines.append(line.strip())
                
                # Also check adjacent lines for table structure
                for j in range(max(0, i-2), min(len(lines), i+3)):
                    adjacent_line = lines[j].strip()
                    if adjacent_line and ('\t' in adjacent_line or re.search(r'\s{3,}', adjacent_line)):
                        if adjacent_line not in table_lines:
                            table_lines.append(adjacent_line)
    
    if table_lines:
        print(f"          Table-like data found:")
        for line in table_lines:
            print(f"            {line}")
    else:
        print(f"          No table-like data found for {security_no}")

def create_database_connection():
    """Create and return a database connection"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    return psycopg2.connect(**db_config)

def analyze_csv_files(csv_directory="extracted_tables"):
    """Analyze CSV files extracted from PDF and find Israeli stocks"""
    
    # Get Israeli stocks data from database
    israeli_stocks = load_israeli_stocks_data()
    if not israeli_stocks:
        print("No Israeli stocks data available. Cannot proceed.")
        return [], []
    
    # Find all CSV files
    csv_pattern = os.path.join(csv_directory, "*.csv")
    csv_files = glob.glob(csv_pattern)
    
    if not csv_files:
        print(f"No CSV files found in {csv_directory}")
        return [], []
    
    print(f"Found {len(csv_files)} CSV files to analyze:")
    for csv_file in csv_files:
        print(f"  {csv_file}")
    
    all_holdings = []
    all_transactions = []
    
    for csv_file in csv_files:
        print(f"\n==== ANALYZING {csv_file} ====")
        
        try:
            # Extract PDF name and holding date
            pdf_name, holding_date = extract_pdf_name_and_date(csv_file)
            
            # Read CSV file
            df = pd.read_csv(csv_file)
            print(f"CSV has {len(df)} rows and {len(df.columns)} columns")
            print(f"Columns: {list(df.columns)}")
            
            # Determine if this is a holdings or transactions CSV
            csv_type = determine_csv_type(df, csv_file)
            print(f"Detected CSV type: {csv_type}")
            
            if csv_type == "holdings":
                # Process as holdings
                israeli_holdings = find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "holdings", pdf_name, holding_date)
                all_holdings.extend(israeli_holdings)
            elif csv_type == "transactions":
                # Process as transactions
                israeli_transactions = find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, "transactions", pdf_name, holding_date)
                all_transactions.extend(israeli_transactions)
            else:
                print(f"Could not determine CSV type for {csv_file}, skipping...")
            
        except Exception as e:
            print(f"Error reading {csv_file}: {e}")
            continue
    
    return all_holdings, all_transactions

def determine_csv_type(df, csv_file):
    """Determine if a CSV contains holdings or transactions data"""
    
    # Convert column names to lowercase for easier matching
    columns_lower = [col.lower() if isinstance(col, str) else str(col).lower() for col in df.columns]
    columns_str = ' '.join(columns_lower)
    
    # Convert first few rows to string for content analysis
    sample_data = ""
    for i in range(min(5, len(df))):
        row_str = ' '.join([str(val).lower() for val in df.iloc[i].values if pd.notna(val)])
        sample_data += row_str + " "
    
    # Holdings indicators (English and Hebrew)
    holdings_indicators = [
        'current', 'holding', 'position', 'portfolio', 'balance',
        'market value', 'current price', 'holdings', 'positions',
        'נכסים', 'אחזקות', 'יתרה', 'שווי שוק',
        'זוחא', 'יווש', 'יחכונ רעש', 'השיכרה תולע', 'קיתהמ'  # Hebrew portfolio terms
    ]
    
    # Transaction indicators (English and Hebrew)
    transaction_indicators = [
        'buy', 'sell', 'purchase', 'sale', 'transaction', 'trade',
        'date', 'executed', 'settlement', 'activity', 'movement',
        'קנייה', 'מכירה', 'עסקה', 'פעילות', 'תאריך',
        'ךיראת', 'עוציב', 'העונת', 'הקסע', 'גוס'  # Hebrew transaction terms
    ]
    
    holdings_score = 0
    transaction_score = 0
    
    # Check column names
    for indicator in holdings_indicators:
        if indicator in columns_str:
            holdings_score += 1
    
    for indicator in transaction_indicators:
        if indicator in columns_str:
            transaction_score += 1
    
    # Check sample data content
    for indicator in holdings_indicators:
        if indicator in sample_data:
            holdings_score += 1
    
    for indicator in transaction_indicators:
        if indicator in sample_data:
            transaction_score += 1
    
    # File name hints - table_1 is usually holdings, table_2 is usually transactions
    filename_lower = os.path.basename(csv_file).lower()
    if 'holding' in filename_lower or 'position' in filename_lower or 'portfolio' in filename_lower:
        holdings_score += 2
    elif 'table_1' in filename_lower or 'table1' in filename_lower:
        holdings_score += 3  # Strong hint that first table is holdings
    
    if 'transaction' in filename_lower or 'trade' in filename_lower or 'activity' in filename_lower:
        transaction_score += 2
    elif 'table_2' in filename_lower or 'table2' in filename_lower:
        transaction_score += 3  # Strong hint that second table is transactions
    
    print(f"  Holdings score: {holdings_score}, Transactions score: {transaction_score}")
    print(f"  Sample data: {sample_data[:200]}...")  # Show sample content
    print(f"  Columns: {columns_str[:100]}...")  # Show column content
    
    if holdings_score > transaction_score:
        return "holdings"
    elif transaction_score > holdings_score:
        return "transactions"
    else:
        # Default based on file order (usually holdings come first)
        if 'table_0' in filename_lower or 'table1' in filename_lower:
            return "holdings"
        elif 'table_1' in filename_lower or 'table2' in filename_lower:
            return "transactions"
        else:
            return "unknown"

def find_israeli_stocks_in_csv(df, israeli_stocks, csv_file, csv_type="transactions", pdf_name="unknown.pdf", holding_date=None):
    """Find Israeli stocks in a CSV DataFrame"""
    
    results = []
    
    # Convert DataFrame to string for searching
    df_str = df.to_string()
    
    print(f"\nSearching for Israeli stocks in {os.path.basename(csv_file)} ({csv_type})...")
    
    found_stocks = []
    
    # Check each Israeli stock
    for security_no, (symbol, name, index_name) in israeli_stocks.items():
        # Look for security number in any cell
        if security_no in df_str:
            found_stocks.append((security_no, symbol, name, "security_number"))
        # Look for symbol
        elif symbol in df_str:
            found_stocks.append((security_no, symbol, name, "symbol"))
        # Look for name (partial match)
        elif name.upper() in df_str.upper():
            found_stocks.append((security_no, symbol, name, "name"))
    
    if found_stocks:
        print(f"Found {len(found_stocks)} Israeli stocks:")
        for security_no, symbol, name, match_type in found_stocks:
            print(f"  {security_no} ({symbol}): {name} [matched by {match_type}]")
            
            # Extract data based on CSV type
            if csv_type == "holdings":
                holding_data = extract_holding_from_csv(df, security_no, symbol, name, csv_file, pdf_name, holding_date)
                if holding_data:
                    results.extend(holding_data)
            else:  # transactions
                transaction_data = extract_transaction_from_csv(df, security_no, symbol, name, csv_file, pdf_name)
                if transaction_data:
                    results.extend(transaction_data)
    else:
        print("No Israeli stocks found in this CSV")
    
    return results

def extract_transaction_from_csv(df, security_no, symbol, name, csv_file, source_pdf):
    """Extract transaction details for a specific stock from CSV"""
    
    transactions = []
    
    # Find rows that contain this security
    mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
    relevant_rows = df[mask]
    
    if len(relevant_rows) == 0:
        # Try by symbol if security number not found
        mask = df.astype(str).apply(lambda x: x.str.contains(symbol, na=False, case=False)).any(axis=1)
        relevant_rows = df[mask]
    
    print(f"\n    Transaction data for {symbol} ({security_no}):")
    
    for idx, row in relevant_rows.iterrows():
        print(f"      Row {idx}: {dict(row)}")
        
        # Try to parse transaction data
        transaction = parse_transaction_row(row, security_no, symbol, name, csv_file, source_pdf, idx)
        if transaction:
            transactions.append(transaction)
    
    return transactions

def parse_transaction_row(row, security_no, symbol, name, csv_file, source_pdf, row_idx):
    """Parse a single row into transaction data"""
    
    transaction = {
        'security_no': security_no,
        'symbol': symbol,
        'name': name,
        'source_pdf': source_pdf,
        'row_index': row_idx
    }
    
    # Convert row to list for easier column access
    row_values = [str(val).replace(',', '') if pd.notna(val) else '' for val in row.values]
    
    print(f"        Parsing transaction row values: {row_values}")
    
    # Hebrew transaction type mapping
    hebrew_transaction_types = {
        'דנדביד': 'DIVIDEND',
        'ףיצר/ק': 'BUY',
        'הריכמ': 'SELL',
        'הינק': 'BUY',
        'ביד/פה': 'DIVIDEND',
        'חסמ/שמ': 'FEE',  # Management fee
        'למע/שמ': 'FEE',  # Commission fee
        'ביר/שמ': 'INTEREST',  # Interest
        'הדקפה': 'DEPOSIT',
        'הכישמ': 'WITHDRAWAL',
        'הרבעה': 'TRANSFER'
    }
    
    try:
        # Based on the Hebrew transaction CSV structure:
        # Column 0: Total amount (53.00)
        # Column 1: Transaction date (07/01/25)
        # Column 2: Cash balance - not needed
        # Column 3: Tax (0.00)
        # Column 4: Commission (3.00)
        # Column 5: Not needed
        # Column 6: Stock price (5,199.00)
        # Column 7: Transaction amount/quantity (30.00)
        # Column 8: Transaction type in Hebrew (ףיצר/ק)
        # Column 9: Security name in Hebrew
        # Column 10: Security number (585018)
        # Column 11: Time (optional)
        # Column 12: Date again
        
        # Extract total amount (column 0)
        if len(row_values) > 0 and row_values[0]:
            try:
                total_value_str = row_values[0].replace('-', '')  # Remove negative sign for parsing
                transaction['total_value'] = float(total_value_str)
            except (ValueError, TypeError):
                pass
        
        # Extract transaction date (column 1)
        if len(row_values) > 1 and row_values[1]:
            transaction['transaction_date'] = row_values[1]
        
        # Extract tax (column 3)
        if len(row_values) > 3 and row_values[3]:
            try:
                transaction['tax'] = float(row_values[3])
            except (ValueError, TypeError):
                pass
        
        # Extract commission (column 4)
        if len(row_values) > 4 and row_values[4]:
            try:
                transaction['commission'] = float(row_values[4])
            except (ValueError, TypeError):
                pass
        
        # Extract stock price (column 6)
        if len(row_values) > 6 and row_values[6]:
            try:
                transaction['price'] = float(row_values[6])
            except (ValueError, TypeError):
                pass
        
        # Extract quantity/amount (column 7)
        if len(row_values) > 7 and row_values[7]:
            try:
                transaction['quantity'] = float(row_values[7])
            except (ValueError, TypeError):
                pass
        
        # Extract transaction type (column 8) and translate from Hebrew
        if len(row_values) > 8 and row_values[8]:
            hebrew_type = row_values[8].strip()
            
            # Try exact match first
            if hebrew_type in hebrew_transaction_types:
                transaction['transaction_type'] = hebrew_transaction_types[hebrew_type]
            else:
                # Try partial matches for compound types
                for hebrew_key, english_type in hebrew_transaction_types.items():
                    if hebrew_key in hebrew_type:
                        transaction['transaction_type'] = english_type
                        break
                else:
                    # Default fallback
                    transaction['transaction_type'] = 'BUY'
                    print(f"        Unknown Hebrew transaction type: '{hebrew_type}', defaulting to BUY")
        
        # Extract time (column 11) if available
        if len(row_values) > 11 and row_values[11]:
            transaction['transaction_time'] = row_values[11]
        
        print(f"        Extracted transaction: Date: {transaction.get('transaction_date')}, "
              f"Type: {transaction.get('transaction_type')}, "
              f"Quantity: {transaction.get('quantity')}, "
              f"Price: {transaction.get('price')}, "
              f"Total: {transaction.get('total_value')}, "
              f"Commission: {transaction.get('commission')}, "
              f"Tax: {transaction.get('tax')}")
        
    except Exception as e:
        print(f"        Error parsing transaction row: {e}")
    
    # Set default currency
    transaction['currency'] = 'ILS'  # Israeli Shekel
    
    return transaction

def extract_holding_from_csv(df, security_no, symbol, name, csv_file, pdf_name, holding_date):
    """Extract holding details for a specific stock from CSV"""
    
    holdings = []
    
    # Find rows that contain this security
    mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
    relevant_rows = df[mask]
    
    if len(relevant_rows) == 0:
        # Try by symbol if security number not found
        mask = df.astype(str).apply(lambda x: x.str.contains(symbol, na=False, case=False)).any(axis=1)
        relevant_rows = df[mask]
    
    print(f"\n    Holding data for {symbol} ({security_no}):")
    
    for idx, row in relevant_rows.iterrows():
        print(f"      Row {idx}: {dict(row)}")
        
        # Try to parse holding data
        holding = parse_holding_row(row, security_no, symbol, name, pdf_name, holding_date, idx)
        if holding:
            holdings.append(holding)
    
    return holdings

def parse_holding_row(row, security_no, symbol, name, pdf_name, holding_date, row_idx):
    """Parse a single row into holding data based on the CSV structure"""
    
    holding = {
        'security_no': security_no,
        'symbol': symbol,
        'name': name,
        'source_pdf': pdf_name,
        'holding_date': holding_date,
        'row_index': row_idx
    }
    
    # Convert row to list for easier column access
    row_values = [str(val).replace(',', '') if pd.notna(val) else '' for val in row.values]
    
    print(f"        Parsing row values: {row_values}")
    
    # Based on the CSV structure:
    # Column 0: Portfolio percentage (קיתהמ זוחא)
    # Column 1: Current value in shekels (ריינ יווש םילקשב)  
    # Column 2: Purchase cost (השיכרה תולע)
    # Column 3: Current price (יחכונ רעש)
    # Column 4: Quantity (תומכ)
    # Column 5: Security name (ריינ םש)
    # Column 6: Security number (ריינ רפסמ)
    
    try:
        # Extract portfolio percentage (column 0)
        if len(row_values) > 0 and row_values[0]:
            try:
                holding['portfolio_percentage'] = float(row_values[0])
            except (ValueError, TypeError):
                pass
        
        # Extract current value (column 1)
        if len(row_values) > 1 and row_values[1]:
            try:
                holding['current_value'] = float(row_values[1])
            except (ValueError, TypeError):
                pass
        
        # Extract purchase cost (column 2)
        if len(row_values) > 2 and row_values[2]:
            try:
                holding['purchase_cost'] = float(row_values[2])
            except (ValueError, TypeError):
                pass
        
        # Extract last price (column 3)
        if len(row_values) > 3 and row_values[3]:
            try:
                holding['last_price'] = float(row_values[3])
            except (ValueError, TypeError):
                pass
        
        # Extract quantity (column 4)
        if len(row_values) > 4 and row_values[4]:
            try:
                holding['quantity'] = float(row_values[4])
            except (ValueError, TypeError):
                pass
        
        print(f"        Extracted: Portfolio %: {holding.get('portfolio_percentage')}, "
              f"Current Value: {holding.get('current_value')}, "
              f"Purchase Cost: {holding.get('purchase_cost')}, "
              f"Last Price: {holding.get('last_price')}, "
              f"Quantity: {holding.get('quantity')}")
        
    except Exception as e:
        print(f"        Error parsing holding row: {e}")
    
    # Set default currency
    holding['currency'] = 'ILS'  # Israeli Shekel
    
    return holding

def save_transactions_to_database(transactions, user_id=1):
    """Save extracted transactions to the existing Transaction table"""
    
    if not transactions:
        print("No transactions to save")
        return
    
    try:
        conn = create_database_connection()
        cursor = conn.cursor()
        
        # Check if we have required tables (we need portfolios and assets for the Transaction table)
        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Transaction'")
        transaction_table_exists = cursor.fetchone()[0] > 0
        
        if not transaction_table_exists:
            print("Transaction table does not exist. Creating simplified transaction table...")
            
            # Check if IsraeliStockTransaction table exists
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'IsraeliStockTransaction'
            """)
            israeli_table_exists = cursor.fetchone()[0] > 0
            
            # Determine the correct user_id column type based on actual user_id
            if isinstance(user_id, str):
                user_id_type = "VARCHAR(50)"  # For UUID strings
                print(f"Using VARCHAR user_id for: {user_id}")
            else:
                user_id_type = "INTEGER"  # For integer IDs
                print(f"Using INTEGER user_id for: {user_id}")
            
            if not israeli_table_exists:
                print("Creating IsraeliStockTransaction table...")
                create_table_sql = f"""
                CREATE TABLE "IsraeliStockTransaction" (
                    id SERIAL PRIMARY KEY,
                    user_id {user_id_type} NOT NULL,
                    security_no VARCHAR(20) NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    company_name VARCHAR(100) NOT NULL,
                    transaction_type VARCHAR(20),
                    transaction_date DATE,
                    transaction_time TIME,
                    quantity DECIMAL(15,4),
                    price DECIMAL(15,4),
                    total_value DECIMAL(15,4),
                    commission DECIMAL(15,4),
                    tax DECIMAL(15,4),
                    currency VARCHAR(3),
                    source_pdf VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, security_no, transaction_date, transaction_type, source_pdf)
                );
                
                CREATE INDEX idx_israeli_stock_transaction_security_no 
                ON "IsraeliStockTransaction"(security_no);
                
                CREATE INDEX idx_israeli_stock_transaction_user_id 
                ON "IsraeliStockTransaction"(user_id);
                """
                
                cursor.execute(create_table_sql)
                conn.commit()
                print(f"✓ Created IsraeliStockTransaction table with {user_id_type} user_id column")
            else:
                print("✓ IsraeliStockTransaction table already exists")
            
            # Create IsraeliDividend table if it doesn't exist
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'IsraeliDividend'
            """)
            dividend_table_exists = cursor.fetchone()[0] > 0
            
            if not dividend_table_exists:
                print("Creating IsraeliDividend table...")
                create_dividend_sql = f"""
                CREATE TABLE "IsraeliDividend" (
                    id SERIAL PRIMARY KEY,
                    user_id {user_id_type} NOT NULL,
                    security_no VARCHAR(20) NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    company_name VARCHAR(100) NOT NULL,
                    payment_date DATE,
                    amount DECIMAL(15,4) NOT NULL,
                    tax DECIMAL(15,4),
                    currency VARCHAR(3) DEFAULT 'ILS',
                    source_pdf VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, security_no, payment_date, source_pdf)
                );
                
                CREATE INDEX idx_israeli_dividend_security_no 
                ON "IsraeliDividend"(security_no);
                
                CREATE INDEX idx_israeli_dividend_user_id 
                ON "IsraeliDividend"(user_id);
                """
                
                cursor.execute(create_dividend_sql)
                conn.commit()
                print(f"✓ Created IsraeliDividend table with {user_id_type} user_id column")
            else:
                print("✓ IsraeliDividend table already exists")
            
            # Create or update trigger function and trigger for automatic dividend insertion
            print("Creating/updating dividend trigger...")
            trigger_sql = """
            CREATE OR REPLACE FUNCTION create_dividend_record()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Only create dividend record if transaction type is DIVIDEND
                IF NEW.transaction_type = 'DIVIDEND' THEN
                    INSERT INTO "IsraeliDividend" (
                        user_id, security_no, symbol, company_name, 
                        payment_date, amount, tax, currency, source_pdf
                    ) VALUES (
                        NEW.user_id,
                        NEW.security_no,
                        NEW.symbol,
                        NEW.company_name,
                        NEW.transaction_date,
                        NEW.total_value,
                        NEW.tax,
                        NEW.currency,
                        NEW.source_pdf
                    )
                    ON CONFLICT (user_id, security_no, payment_date, source_pdf) DO NOTHING;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            DROP TRIGGER IF EXISTS trigger_create_dividend ON "IsraeliStockTransaction";
            CREATE TRIGGER trigger_create_dividend
                AFTER INSERT ON "IsraeliStockTransaction"
                FOR EACH ROW
                EXECUTE FUNCTION create_dividend_record();
            """
            
            cursor.execute(trigger_sql)
            conn.commit()
            print("✓ Created/updated dividend trigger for automatic dividend record creation")
            
            # Prepare bulk insert data
            print(f"Preparing {len(transactions)} transactions for bulk insert...")
            bulk_data = []
            
            for transaction in transactions:
                try:
                    # Parse date if available
                    transaction_date = None
                    if 'transaction_date' in transaction and transaction['transaction_date']:
                        try:
                            date_str = transaction['transaction_date']
                            for fmt in ['%d/%m/%y', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d']:
                                try:
                                    transaction_date = datetime.strptime(date_str, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            pass
                    
                    # Ensure currency is properly formatted (max 3 chars)
                    currency = transaction.get('currency', 'ILS')
                    if currency == 'UNKNOWN' or len(currency) > 3:
                        currency = 'ILS'
                    
                    # Ensure transaction_type is properly formatted (max 20 chars)
                    transaction_type = transaction.get('transaction_type', 'BUY')
                    if transaction_type == 'UNKNOWN' or len(transaction_type) > 20:
                        transaction_type = 'BUY'
                    
                    # Add to bulk data
                    bulk_data.append((
                        user_id,
                        transaction['security_no'],
                        transaction['symbol'],
                        transaction['name'],
                        transaction_type,
                        transaction_date,
                        transaction.get('transaction_time'),
                        transaction.get('quantity'),
                        transaction.get('price'),
                        transaction.get('total_value'),
                        transaction.get('commission'),
                        transaction.get('tax'),
                        currency,
                        transaction['source_pdf']
                    ))
                    
                except Exception as e:
                    print(f"⚠ Skipping invalid transaction for {transaction.get('symbol', 'UNKNOWN')}: {e}")
                    continue
            
            # Perform bulk insert
            if bulk_data:
                try:
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
                    print(f"✓ Successfully bulk inserted {saved_count} transactions")
                    
                except Exception as e:
                    print(f"✗ Error during bulk insert: {e}")
                    conn.rollback()
                    saved_count = 0
            else:
                saved_count = 0
                print("No valid transactions to save")
            
            print(f"Successfully saved {saved_count} transactions to IsraeliStockTransaction table")
            
        else:
            print("Using existing Transaction table structure...")
            # Here we would need to handle the full Transaction table requirements
            # For now, let's just create the simplified table anyway
            print("Note: Full Transaction table integration requires portfolio and asset setup.")
            print("Creating IsraeliStockTransaction table for now...")
            
            # Create simplified table anyway
            # Check if IsraeliStockTransaction table exists and has correct schema
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'IsraeliStockTransaction'
            """)
            israeli_table_exists = cursor.fetchone()[0] > 0
            
            # Determine the correct user_id column type based on actual user_id
            if isinstance(user_id, str):
                user_id_type = "VARCHAR(50)"  # For UUID strings
                print(f"Using VARCHAR user_id for: {user_id}")
            else:
                user_id_type = "INTEGER"  # For integer IDs
                print(f"Using INTEGER user_id for: {user_id}")
            
            if not israeli_table_exists:
                print("Creating IsraeliStockTransaction table...")
                create_simple_sql = f"""
                CREATE TABLE "IsraeliStockTransaction" (
                    id SERIAL PRIMARY KEY,
                    user_id {user_id_type} NOT NULL,
                    security_no VARCHAR(20) NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    company_name VARCHAR(100) NOT NULL,
                    transaction_type VARCHAR(20),
                    transaction_date DATE,
                    transaction_time TIME,
                    quantity DECIMAL(15,4),
                    price DECIMAL(15,4),
                    total_value DECIMAL(15,4),
                    commission DECIMAL(15,4),
                    tax DECIMAL(15,4),
                    currency VARCHAR(3),
                    source_pdf VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, security_no, transaction_date, transaction_type, source_pdf)
                );
                """
                
                cursor.execute(create_simple_sql)
                conn.commit()
                print(f"✓ Created IsraeliStockTransaction table with {user_id_type} user_id column")
            else:
                print("✓ IsraeliStockTransaction table already exists")
            
            # Create IsraeliDividend table if it doesn't exist
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'IsraeliDividend'
            """)
            dividend_table_exists = cursor.fetchone()[0] > 0
            
            if not dividend_table_exists:
                print("Creating IsraeliDividend table...")
                create_dividend_sql = f"""
                CREATE TABLE "IsraeliDividend" (
                    id SERIAL PRIMARY KEY,
                    user_id {user_id_type} NOT NULL,
                    security_no VARCHAR(20) NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    company_name VARCHAR(100) NOT NULL,
                    payment_date DATE,
                    amount DECIMAL(15,4) NOT NULL,
                    tax DECIMAL(15,4),
                    currency VARCHAR(3) DEFAULT 'ILS',
                    source_pdf VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, security_no, payment_date, source_pdf)
                );
                
                CREATE INDEX idx_israeli_dividend_security_no 
                ON "IsraeliDividend"(security_no);
                
                CREATE INDEX idx_israeli_dividend_user_id 
                ON "IsraeliDividend"(user_id);
                """
                
                cursor.execute(create_dividend_sql)
                conn.commit()
                print(f"✓ Created IsraeliDividend table with {user_id_type} user_id column")
            else:
                print("✓ IsraeliDividend table already exists")
            
            # Create or update trigger function and trigger
            print("Creating/updating dividend trigger...")
            trigger_sql = """
            CREATE OR REPLACE FUNCTION create_dividend_record()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.transaction_type = 'DIVIDEND' THEN
                    INSERT INTO "IsraeliDividend" (
                        user_id, security_no, symbol, company_name, 
                        payment_date, amount, tax, currency, source_pdf
                    ) VALUES (
                        NEW.user_id,
                        NEW.security_no,
                        NEW.symbol,
                        NEW.company_name,
                        NEW.transaction_date,
                        NEW.total_value,
                        NEW.tax,
                        NEW.currency,
                        NEW.source_pdf
                    )
                    ON CONFLICT (user_id, security_no, payment_date, source_pdf) DO NOTHING;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            DROP TRIGGER IF EXISTS trigger_create_dividend ON "IsraeliStockTransaction";
            CREATE TRIGGER trigger_create_dividend
                AFTER INSERT ON "IsraeliStockTransaction"
                FOR EACH ROW
                EXECUTE FUNCTION create_dividend_record();
            """
            
            cursor.execute(trigger_sql)
            conn.commit()
            print("✓ Created/updated dividend trigger for automatic dividend records")
            
            # Prepare bulk insert data for the second section
            print(f"Preparing {len(transactions)} transactions for bulk insert...")
            bulk_data = []
            
            for transaction in transactions:
                try:
                    transaction_date = None
                    if 'transaction_date' in transaction and transaction['transaction_date']:
                        try:
                            date_str = transaction['transaction_date']
                            for fmt in ['%d/%m/%y', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d']:
                                try:
                                    transaction_date = datetime.strptime(date_str, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            pass
                    
                    # Ensure currency is properly formatted (max 3 chars)
                    currency = transaction.get('currency', 'ILS')
                    if currency == 'UNKNOWN' or len(currency) > 3:
                        currency = 'ILS'
                    
                    # Ensure transaction_type is properly formatted (max 20 chars)
                    transaction_type = transaction.get('transaction_type', 'BUY')
                    if transaction_type == 'UNKNOWN' or len(transaction_type) > 20:
                        transaction_type = 'BUY'
                    
                    # Add to bulk data
                    bulk_data.append((
                        user_id,
                        transaction['security_no'],
                        transaction['symbol'],
                        transaction['name'],
                        transaction_type,
                        transaction_date,
                        transaction.get('transaction_time'),
                        transaction.get('quantity'),
                        transaction.get('price'),
                        transaction.get('total_value'),
                        transaction.get('commission'),
                        transaction.get('tax'),
                        currency,
                        transaction['source_pdf']
                    ))
                    
                except Exception as e:
                    print(f"⚠ Skipping invalid transaction for {transaction.get('symbol', 'UNKNOWN')}: {e}")
                    continue
            
            # Perform bulk insert
            if bulk_data:
                try:
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
                    print(f"✓ Successfully bulk inserted {saved_count} transactions")
                    
                except Exception as e:
                    print(f"✗ Error during bulk insert: {e}")
                    conn.rollback()
                    saved_count = 0
            else:
                saved_count = 0
                print("No valid transactions to save")
            
            print(f"Successfully saved {saved_count} transactions to IsraeliStockTransaction table")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error saving transactions to database: {e}")
        import traceback
        traceback.print_exc()

def save_holdings_to_database(holdings, user_id=1):
    """Save extracted holdings to the database"""
    
    if not holdings:
        print("No holdings to save")
        return
    
    try:
        conn = create_database_connection()
        cursor = conn.cursor()
        
        # Check if IsraeliStockHolding table exists
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'IsraeliStockHolding'
        """)
        holdings_table_exists = cursor.fetchone()[0] > 0
        
        # Determine the correct user_id column type based on actual user_id
        if isinstance(user_id, str):
            user_id_type = "VARCHAR(50)"  # For UUID strings
            print(f"Using VARCHAR user_id for: {user_id}")
        else:
            user_id_type = "INTEGER"  # For integer IDs
            print(f"Using INTEGER user_id for: {user_id}")
        
        if not holdings_table_exists:
            print("Creating IsraeliStockHolding table...")
            create_table_sql = f"""
            CREATE TABLE "IsraeliStockHolding" (
                id SERIAL PRIMARY KEY,
                user_id {user_id_type} NOT NULL,
                security_no VARCHAR(20) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                company_name VARCHAR(100) NOT NULL,
                quantity DECIMAL(15,4) NOT NULL,
                last_price DECIMAL(15,4),
                purchase_cost DECIMAL(15,4),
                current_value DECIMAL(15,4),
                portfolio_percentage DECIMAL(5,2),
                currency VARCHAR(3) DEFAULT 'ILS',
                holding_date DATE,
                source_pdf VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, security_no, source_pdf)
            );
            
            CREATE INDEX idx_israeli_stock_holding_security_no 
            ON "IsraeliStockHolding"(security_no);
            
            CREATE INDEX idx_israeli_stock_holding_user_id 
            ON "IsraeliStockHolding"(user_id);
            """
            
            cursor.execute(create_table_sql)
            conn.commit()
            print(f"✓ Created IsraeliStockHolding table with {user_id_type} user_id column")
        else:
            print("✓ IsraeliStockHolding table already exists")
        
        # Prepare bulk insert data for holdings
        print(f"Preparing {len(holdings)} holdings for bulk insert...")
        bulk_data = []
        
        for holding in holdings:
            try:
                # Parse date if available
                holding_date = None
                if 'holding_date' in holding and holding['holding_date']:
                    if isinstance(holding['holding_date'], str):
                        # If it's a string, try to parse it
                        try:
                            date_str = holding['holding_date']
                            for fmt in ['%d/%m/%y', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d']:
                                try:
                                    holding_date = datetime.strptime(date_str, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            pass
                    else:
                        # If it's already a date object, use it directly
                        holding_date = holding['holding_date']
                
                # Ensure currency is properly formatted (max 3 chars)
                currency = holding.get('currency', 'ILS')
                if len(currency) > 3:
                    currency = 'ILS'
                
                # Ensure quantity is present (required field)
                quantity = holding.get('quantity')
                if quantity is None:
                    print(f"⚠ Skipping holding for {holding['symbol']} - no quantity found")
                    continue
                
                # Add to bulk data
                bulk_data.append((
                    user_id,
                    holding['security_no'],
                    holding['symbol'],
                    holding['name'],
                    quantity,
                    holding.get('last_price'),
                    holding.get('purchase_cost'),
                    holding.get('current_value'),
                    holding.get('portfolio_percentage'),
                    currency,
                    holding_date,
                    holding['source_pdf']
                ))
                
            except Exception as e:
                print(f"⚠ Skipping invalid holding for {holding.get('symbol', 'UNKNOWN')}: {e}")
                continue
        
        # Perform bulk insert for holdings
        if bulk_data:
            try:
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
                print(f"✓ Successfully bulk inserted {saved_count} holdings")
                
            except Exception as e:
                print(f"✗ Error during bulk insert: {e}")
                conn.rollback()
                saved_count = 0
        else:
            saved_count = 0
            print("No valid holdings to save")
        
        print(f"Successfully saved {saved_count} holdings to IsraeliStockHolding table")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error saving holdings to database: {e}")
        import traceback
        traceback.print_exc()

def get_or_create_user(email="mishaba@gmail.com"):
    """Get or create a user for transactions. Returns user_id."""
    try:
        conn = create_database_connection()
        cursor = conn.cursor()
        
        # Try different possible table names for users
        user_tables = ['"User"', 'users', '"users"']
        user_id = None
        user_id_type = "integer"  # Track whether we're dealing with integer or string IDs
        
        for table_name in user_tables:
            try:
                # First check the data type of the id column
                cursor.execute(f"""
                    SELECT data_type FROM information_schema.columns 
                    WHERE table_name = {table_name.replace('"', "'")} AND column_name = 'id'
                """)
                id_type_result = cursor.fetchone()
                if id_type_result:
                    id_data_type = id_type_result[0]
                    if id_data_type in ['character varying', 'varchar', 'text', 'uuid']:
                        user_id_type = "string"
                    print(f"Table {table_name} id column type: {id_data_type}")
                
                # Check if user exists
                cursor.execute(f'SELECT id FROM {table_name} WHERE email = %s', (email,))
                result = cursor.fetchone()
                
                if result:
                    user_id = result[0]
                    print(f"Using existing user: {email} (ID: {user_id}) from table {table_name}")
                    break
                else:
                    # Try to create a new user
                    cursor.execute(
                        f'''INSERT INTO {table_name} (email, hashed_password, first_name, last_name, is_active) 
                           VALUES (%s, %s, %s, %s, %s) RETURNING id''',
                        (email, "hashed_password_placeholder", "Investment", "User", True)
                    )
                    user_id = cursor.fetchone()[0]
                    conn.commit()
                    print(f"Created new user: {email} (ID: {user_id}) in table {table_name}")
                    break
                    
            except Exception as table_error:
                print(f"Error with table {table_name}: {table_error}")
                # Try next table name
                continue
        
        cursor.close()
        conn.close()
        
        if user_id is None:
            print(f"Could not find or create user table. Using default user_id=1")
            return 1  # Return as integer
            
        # Return just the user_id (not the type info)
        return user_id
        
    except Exception as e:
        print(f"Error getting/creating user: {e}")
        print("Using default user_id=1")
        return 1  # Return as integer

def main_csv_analysis(email="mishaba@gmail.com"):
    """Main function to analyze CSV files and save both holdings and transactions"""
    
    print("=== CSV INVESTMENT ANALYSIS ===")
    
    # Get or create user
    user_id = get_or_create_user(email)
    
    # Check if extracted_tables directory exists
    csv_dir = "extracted_tables"
    if not os.path.exists(csv_dir):
        print(f"Directory {csv_dir} not found. Please run PDF extraction first.")
        return
    
    # Analyze CSV files
    holdings, transactions = analyze_csv_files(csv_dir)
    
    print(f"\n=== ANALYSIS SUMMARY ===")
    print(f"Total holdings found: {len(holdings)}")
    print(f"Total transactions found: {len(transactions)}")
    
    # Debug output
    if len(holdings) == 0 and len(transactions) == 0:
        print("\n=== DEBUG: No data found, checking CSV files manually ===")
        csv_files = glob.glob(os.path.join(csv_dir, "*.csv"))
        for csv_file in csv_files:
            print(f"\nChecking {os.path.basename(csv_file)}:")
            try:
                df = pd.read_csv(csv_file)
                print(f"  Rows: {len(df)}, Columns: {df.columns.tolist()}")
                csv_type = determine_csv_type(df, csv_file)
                print(f"  Detected type: {csv_type}")
            except Exception as e:
                print(f"  Error: {e}")
    
    if holdings:
        print(f"\n=== HOLDINGS SUMMARY ===")
        # Group by stock
        by_stock = {}
        for h in holdings:
            key = f"{h['symbol']} ({h['security_no']})"
            if key not in by_stock:
                by_stock[key] = []
            by_stock[key].append(h)
        
        for stock, stock_holdings in by_stock.items():
            print(f"\n{stock}: {len(stock_holdings)} holdings")
            for i, h in enumerate(stock_holdings):
                print(f"  {i+1}. Qty: {h.get('quantity', 'N/A')}, "
                      f"Last Price: {h.get('last_price', 'N/A')}, "
                      f"Purchase Cost: {h.get('purchase_cost', 'N/A')}, "
                      f"Current Value: {h.get('current_value', 'N/A')}, "
                      f"Portfolio %: {h.get('portfolio_percentage', 'N/A')}%")
    
    if transactions:
        print(f"\n=== TRANSACTIONS SUMMARY ===")
        # Group by stock
        by_stock = {}
        for t in transactions:
            key = f"{t['symbol']} ({t['security_no']})"
            if key not in by_stock:
                by_stock[key] = []
            by_stock[key].append(t)
        
        for stock, stock_transactions in by_stock.items():
            print(f"\n{stock}: {len(stock_transactions)} transactions")
            for i, t in enumerate(stock_transactions):
                print(f"  {i+1}. Type: {t.get('transaction_type', 'N/A')}, "
                      f"Qty: {t.get('quantity', 'N/A')}, "
                      f"Price: {t.get('price', 'N/A')}, "
                      f"Value: {t.get('total_value', 'N/A')}, "
                      f"Currency: {t.get('currency', 'N/A')}")
    
    # Save to database
    print(f"\n=== SAVING TO DATABASE ===")
    if holdings:
        save_holdings_to_database(holdings, user_id)
    if transactions:
        save_transactions_to_database(transactions, user_id)
    
    if not holdings and not transactions:
        print("No Israeli stock data found in CSV files.")

def extract_pdf_name_and_date(csv_file):
    """Extract original PDF name and holding date from CSV file or directory"""
    
    # For now, we'll derive the PDF name from the CSV file name
    # CSV files are named like "page_1_table_1.csv", so we need to find the original PDF
    csv_dir = os.path.dirname(csv_file)
    csv_basename = os.path.basename(csv_file)
    
    # Look for PDF files in the same directory or parent directory
    possible_pdf_paths = [
        os.path.join(csv_dir, "*.pdf"),
        os.path.join(os.path.dirname(csv_dir), "*.pdf"),
        os.path.join(os.path.dirname(csv_dir), "pdf", "*.pdf")
    ]
    
    pdf_name = "unknown.pdf"  # Default
    holding_date = None
    
    for pattern in possible_pdf_paths:
        pdf_files = glob.glob(pattern)
        if pdf_files:
            # Take the first PDF file found
            pdf_path = pdf_files[0]
            pdf_name = os.path.basename(pdf_path)
            
            # Try to extract date from PDF
            holding_date = extract_date_from_pdf(pdf_path)
            break
    
    # If no PDF found, try to derive from CSV filename pattern
    if pdf_name == "unknown.pdf":
        # Assume CSV is from a PDF with similar name
        if "page_" in csv_basename:
            # Extract base name before "page_"
            base_name = csv_basename.split("page_")[0].rstrip("_")
            if base_name:
                pdf_name = f"{base_name}.pdf"
            else:
                pdf_name = "investment_report.pdf"
    
    print(f"  Detected PDF source: {pdf_name}")
    if holding_date:
        print(f"  Extracted holding date: {holding_date}")
    
    return pdf_name, holding_date

def extract_date_from_pdf(pdf_path):
    """Extract the holding date from the PDF header"""
    
    if not os.path.exists(pdf_path):
        return None
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Get text from first page
            if len(pdf.pages) > 0:
                first_page_text = pdf.pages[0].extract_text()
                if first_page_text:
                    # Look at the first few lines for the date (before tables)
                    lines = first_page_text.split('\n')
                    header_lines = lines[:20]  # Check first 20 lines
                    
                    print(f"  Searching for date in PDF header lines:")
                    for i, line in enumerate(header_lines[:10]):  # Show first 10 for debugging
                        if line.strip():
                            print(f"    Line {i}: {line.strip()}")
                    
                    # Date patterns to look for
                    date_patterns = [
                        # DD/MM/YYYY format (31/01/2025)
                        r'\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})\b',
                        # DD/MM/YY format (31/01/25)
                        r'\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2})\b',
                        # YYYY-MM-DD format
                        r'\b(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b',
                        # Hebrew date formats or text with date
                        r'(?:תאריך|ךיראת|דעומ)[:\s]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                        # Date near "as of" or similar terms
                        r'(?:as of|נכון ל)[:\s]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                        # Date in parentheses
                        r'\((\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\)',
                    ]
                    
                    # Search each header line for dates
                    for line in header_lines:
                        line_clean = line.strip()
                        if not line_clean:
                            continue
                            
                        for pattern in date_patterns:
                            matches = re.findall(pattern, line_clean)
                            if matches:
                                date_str = matches[0]
                                print(f"  Found potential date: '{date_str}' in line: '{line_clean}'")
                                
                                # Try to parse the date
                                parsed_date = parse_date_string(date_str)
                                if parsed_date:
                                    print(f"  Successfully parsed date: {parsed_date}")
                                    return parsed_date
                    
                    print(f"  No valid date found in PDF header")
                    
    except Exception as e:
        print(f"  Error extracting date from PDF: {e}")
    
    return None

def parse_date_string(date_str):
    """Parse a date string into a date object"""
    
    if not date_str:
        return None
    
    # Clean the date string
    date_str = date_str.strip()
    
    # Date formats to try
    date_formats = [
        '%d/%m/%Y',   # 31/01/2025
        '%d/%m/%y',   # 31/01/25
        '%d-%m-%Y',   # 31-01-2025
        '%d-%m-%y',   # 31-01-25
        '%d.%m.%Y',   # 31.01.2025
        '%d.%m.%y',   # 31.01.25
        '%Y/%m/%d',   # 2025/01/31
        '%Y-%m-%d',   # 2025-01-31
        '%m/%d/%Y',   # 01/31/2025
        '%m/%d/%y',   # 01/31/25
    ]
    
    for fmt in date_formats:
        try:
            parsed_date = datetime.strptime(date_str, fmt).date()
            
            # Validate the date is reasonable (not too far in past/future)
            current_year = datetime.now().year
            if 2000 <= parsed_date.year <= current_year + 1:
                return parsed_date
            elif parsed_date.year < 100:  # Handle 2-digit years
                # Assume dates 0-30 are 2000-2030, 31-99 are 1931-1999
                if parsed_date.year <= 30:
                    corrected_year = 2000 + parsed_date.year
                else:
                    corrected_year = 1900 + parsed_date.year
                
                corrected_date = parsed_date.replace(year=corrected_year)
                if 2000 <= corrected_date.year <= current_year + 1:
                    return corrected_date
                    
        except ValueError:
            continue
    
    print(f"  Could not parse date string: '{date_str}'")
    return None

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # No arguments - run CSV analysis with default user
        main_csv_analysis()
    elif len(sys.argv) == 2:
        arg = sys.argv[1]
        if arg == "--csv":
            # Analyze CSV files only with default user
            main_csv_analysis()
        elif arg.endswith('.pdf'):
            # Analyze PDF file
            analyze_investment_pdf(arg)
        else:
            print("Usage:")
            print("  python analyze_investment_pdf.py <pdf_path>                    # Analyze PDF")
            print("  python analyze_investment_pdf.py --csv                         # Analyze CSV files")
            print("  python analyze_investment_pdf.py --csv --user <email>          # Analyze CSV with specific user")
            print("  python analyze_investment_pdf.py                               # Analyze CSV files (default)")
            sys.exit(1)
    elif len(sys.argv) == 4 and sys.argv[1] == "--csv" and sys.argv[2] == "--user":
        # Analyze CSV files with specific user
        email = sys.argv[3]
        main_csv_analysis(email)
    else:
        print("Usage:")
        print("  python analyze_investment_pdf.py <pdf_path>                    # Analyze PDF")
        print("  python analyze_investment_pdf.py --csv                         # Analyze CSV files")
        print("  python analyze_investment_pdf.py --csv --user <email>          # Analyze CSV with specific user")
        print("  python analyze_investment_pdf.py                               # Analyze CSV files (default)")
        sys.exit(1)
