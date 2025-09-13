#!/usr/bin/env python3

"""
LEGACY SCRIPT - This functionality has been migrated to IsraeliStockService
This file is kept for reference only. Use the API endpoints in /israeli-stocks/ instead.
"""

import sys
import pdfplumber
import pandas as pd
import re
import csv
from io import StringIO
import psycopg2
from dotenv import load_dotenv
import os

def load_ta125_data():
    """Load TA-125 stocks from PostgreSQL database"""
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
        
        # Get all TA-125 stocks
        cursor.execute('SELECT security_no, symbol, name FROM "Ta125Stock"')
        stocks = cursor.fetchall()
        
        # Convert to dictionary: security_no -> (symbol, name)
        ta125_dict = {}
        for security_no, symbol, name in stocks:
            ta125_dict[security_no] = (symbol, name)
        
        cursor.close()
        conn.close()
        
        print(f"Loaded {len(ta125_dict)} TA-125 stocks from database")
        return ta125_dict
        
    except Exception as e:
        print(f"Error loading TA-125 data from database: {e}")
        print("Falling back to hardcoded data...")
        
        # Fallback to hardcoded data if database connection fails
        return get_hardcoded_ta125_data()

def get_hardcoded_ta125_data():
    """Fallback hardcoded TA-125 data based on populate_ta125.sql"""
    return {
        '691212': ('DSCT', 'DISCOUNT'),
        '662577': ('POLI', 'POALIM'),
        '695437': ('MZTF', 'MIZRAHI TEFAHOT'),
        '604611': ('LUMI', 'LEUMI'),
        '629014': ('TEVA', 'TEVA'),
        '1084557': ('NVMI', 'NOVA'),
        '1081124': ('ESLT', 'ELBIT SYSTEMS'),
        '273011': ('NICE', 'NICE'),
        '767012': ('PHOE', 'PHOENIX'),
        '281014': ('ICL', 'ICL'),
        '1134402': ('ORA', 'ORMAT TECHNO'),
        '1082379': ('TSEM', 'TOWER'),
        '230011': ('BEZQ', 'BEZEQ'),
        '593038': ('FIBI', 'FIBI BANK'),
        '1119478': ('AZRG', 'AZRIELI GROUP'),
        '224014': ('CLIS', 'CLAL INSURANCE'),
        '585018': ('HARL', 'HAREL'),
        '1097260': ('BIG', 'BIG'),
        '720011': ('ENLT', 'ENLIGHT ENERGY'),
        '323014': ('MLSR', 'MELISRON'),
        '1141969': ('NVPT', 'NAVITAS PTRO PU'),
        '475020': ('NWMD', 'NEWMED ENERG PU'),
        '1095264': ('CAMT', 'CAMTEK'),
        '777037': ('SAE', 'SHUFERSAL'),
        '1176593': ('NXSN', 'NEXT VISION'),
        '226019': ('MVNE', 'MIVNE'),
        '1084128': ('DLEKG', 'DELEK GROUP'),
        '1155290': ('ENOG', 'ENERGEAN'),
        '566018': ('MMHD', 'MENORA MIV HLD'),
        '390013': ('ALHE', 'ALONY HETZ'),
        '1081942': ('SKBN', 'SHIKUN & BINUI'),
        '1097278': ('AMOT', 'AMOT'),
        '1141571': ('OPCE', 'OPC ENERGY'),
        '746016': ('STRS', 'STRAUSS GROUP'),
        '1081165': ('MGDL', 'MIGDAL INSUR.'),
        '1100007': ('PAZ', 'PAZ ENERGY'),
        '576017': ('ILCO', 'ISRAEL CORP'),
        '763011': ('FIBIH', 'FIBI HOLDINGS'),
        '739037': ('ELTR', 'ELECTRA'),
        '1133875': ('SPEN', 'SHAPIR      ENG'),
        '1143429': ('FTAL', 'FATTAL HOLD'),
        '1084698': ('HLAN', 'HILAN'),
        '1159029': ('TASE', 'TASE'),
        '373019': ('AURA', 'AURA'),
        '232017': ('ISRA', 'ISRAMCO     PU'),
        '1157403': ('ISCD', 'ISRACARD'),
        '1132315': ('ASHG', 'ASHTROM GROUP'),
        '1090315': ('DIMRI', 'DIMRI'),
        '1095835': ('ARPT', 'AIRPORT CITY'),
        '1098920': ('RIT1', 'REIT 1'),
        '1081561': ('BSEN', 'BET SHEMESH'),
        '1123355': ('ENRG', 'ENERGIX'),
        '445015': ('MTRX', 'MATRIX'),
        '256016': ('FORTY', 'FORMULA'),
        '394015': ('RATI', 'RATIO      PU'),
        '161018': ('ONE', 'ONE TECHNOLOGI'),
        '1087824': ('ELAL', 'EL AL'),
        '1083484': ('PTNR', 'PARTNER'),
        '1104488': ('MGOR', 'MEGA OR'),
        '1101534': ('CEL', 'CELLCOM'),
        '1087659': ('SPNS', 'SAPIENS'),
        '1134139': ('KEN', 'KENON'),
        '755017': ('EQTL', 'EQUITAL'),
        '1087022': ('FOX', 'FOX'),
        '1109644': ('SLARL', 'SELLA REAL EST'),
        '434019': ('ISCN', 'ISRAEL CANADA'),
        '1104249': ('RMLI', 'RAMI LEVI'),
        '1081843': ('MTAV', 'MEITAV INVEST'),
        '1132356': ('INRM', 'INROM CONST'),
        '314013': ('DANE', 'DANEL'),
        '1170877': ('NOFR', 'NOFAR ENERGY'),
        '1098565': ('BLSR', 'BLUE SQ REAL ES'),
        '1175116': ('NYAX', 'NAYAX'),
        '2590248': ('ORL', 'BAZAN'),
        '1081686': ('SMT', 'SUMMIT'),
        '627034': ('DELG', 'DELTA GALIL'),
        '694034': ('ELCO', 'ELCO'),
        '1097948': ('AFRE', 'AFRICA RESIDENC'),
        '715011': ('AZRM', 'AZORIM'),
        '5010129': ('ECP', 'ELECTRA CO  PR'),
        '328013': ('PRTC', 'PRIORTECH'),
        '1094044': ('ELCRE', 'ELECTRA REAL E.'),
        '1129501': ('IDIN', 'IDI INSUR'),
        '1184902': ('ACRO', 'ACRO KVUT'),
        '1175371': ('ARGO', 'ARGO PROP.'),
        '1166768': ('DORL', 'DORAL ENERGY'),
        '1161264': ('YHNF', 'YOCHANANOF'),
        '1175611': ('TRPZ', 'TURPAZ'),
        '127019': ('MISH', 'MIVTACH SHAMIR'),
        '126011': ('GCT', 'G CITY'),
        '587014': ('ARYT', 'ARYT'),
        '829010': ('DLEA', 'DELEK AUTOMOTIV'),
        '1082312': ('MGIC', 'MAGIC'),
        '1202977': ('ISHO', 'ISRAS HOLDINGS'),
        '759019': ('GVYM', 'GAV YAM'),
        '1141357': ('TMRP', 'TAMAR PET'),
        '613034': ('ISRS', 'ISRAS'),
        '642017': ('LAPD', 'LAPIDOTH   CAP.'),
        '1175488': ('RTLS', 'RETAILORS'),
        '1129543': ('OPK', 'OPKO HEALTH'),
        '1102128': ('PRSK', 'PRASHKOVSKY'),
        '1168558': ('MAXO', 'MAX STOCK'),
        '1105097': ('NTML', 'NETO MALINDA'),
        '1123850': ('CRSM', 'CARASSO MOTORS'),
        '644013': ('PLRM', 'PALRAM'),
        '1173137': ('DNYA', 'DANYA CEBUS'),
        '1080985': ('ISRO', 'ISROTEL'),
        '1168186': ('DIFI', 'DIRECT FINANCE'),
        '1176387': ('VRDS', 'VERIDIS'),
        '1166974': ('MSKE', 'MESHEK ENERGY'),
        '258012': ('TDRN', 'TADIRAN GROUP'),
        '699017': ('PTBL', 'PROPERT & BUIL'),
        '1168533': ('ISHI', 'ISRAEL SHIPYARD'),
        '416016': ('VILR', 'VILLAR'),
        '1187962': ('CRSR', 'CARASSO REAL ES'),
        '400010': ('DUNI', 'DUNIEC'),
        '1176205': ('ACKR', 'ACKERSTEIN GRP.'),
        '1188242': ('SBEN', 'SHIKN&BINUI ENE'),
        '354019': ('TLSY', 'TELSYS'),
        '175018': ('IBI', 'IBI INV HOUSE'),
        '1081603': ('PLSN', 'PLASSON INDUS'),
        '1173699': ('DLTI', 'DELTA BRANDS'),
        '1107663': ('BCOM', 'B COMMUNICATION'),
        '1188200': ('AMRM', 'AMRM'),
        '156018': ('MLTM', 'MALAM TEAM')
    }

def extract_tables_from_pdf(pdf_path):
    """Extract all tables from PDF and convert to CSV format"""
    all_tables = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Processing PDF with {len(pdf.pages)} pages...")
            
            for page_num, page in enumerate(pdf.pages):
                print(f"Extracting tables from page {page_num + 1}...")
                
                # Extract tables from this page
                tables = page.extract_tables()
                
                if tables:
                    print(f"Found {len(tables)} tables on page {page_num + 1}")
                    for table_num, table in enumerate(tables):
                        if table and len(table) > 0:
                            # Clean the table data
                            cleaned_table = []
                            for row in table:
                                cleaned_row = []
                                for cell in row:
                                    if cell is not None:
                                        # Clean cell content
                                        cleaned_cell = str(cell).strip()
                                        cleaned_row.append(cleaned_cell)
                                    else:
                                        cleaned_row.append("")
                                cleaned_table.append(cleaned_row)
                            
                            # Add metadata
                            table_info = {
                                'page': page_num + 1,
                                'table_number': table_num + 1,
                                'data': cleaned_table
                            }
                            all_tables.append(table_info)
                else:
                    print(f"No tables found on page {page_num + 1}")
            
            return all_tables
            
    except Exception as e:
        print(f"Error extracting tables: {e}")
        return []

def save_tables_to_csv(tables, output_dir):
    """Save extracted tables to CSV files"""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    csv_files = []
    
    for table_info in tables:
        page_num = table_info['page']
        table_num = table_info['table_number']
        data = table_info['data']
        
        # Create filename
        filename = f"page_{page_num}_table_{table_num}.csv"
        filepath = os.path.join(output_dir, filename)
        
        # Save to CSV
        try:
            with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerows(data)
            
            csv_files.append(filepath)
            print(f"Saved table to: {filepath}")
            
        except Exception as e:
            print(f"Error saving table to CSV: {e}")
    
    return csv_files

def analyze_csv_for_israeli_stocks(csv_files, ta125_stocks):
    """Analyze CSV files for Israeli stocks"""
    print(f"\n==== ANALYZING CSV FILES FOR ISRAELI STOCKS ====")
    
    found_stocks = []
    
    for csv_file in csv_files:
        print(f"\nAnalyzing: {csv_file}")
        
        try:
            # Read the CSV file
            df = pd.read_csv(csv_file, dtype=str)
            
            print(f"Table size: {df.shape[0]} rows, {df.shape[1]} columns")
            
            # Show first few rows
            print("First 5 rows:")
            print(df.head())
            
            # Convert DataFrame to string for searching
            df_str = df.to_string()
            
            # Search for TA-125 stocks
            found_in_this_file = []
            
            for security_no, (symbol, name) in ta125_stocks.items():
                found_method = None
                row_info = None
                
                # Search by security number
                if security_no in df_str:
                    found_method = "security_number"
                    # Find the specific row
                    for idx, row in df.iterrows():
                        if any(security_no in str(cell) for cell in row):
                            row_info = row.to_dict()
                            break
                
                # Search by symbol if not found by security number
                elif symbol.upper() in df_str.upper():
                    found_method = "symbol"
                    for idx, row in df.iterrows():
                        if any(symbol.upper() in str(cell).upper() for cell in row):
                            row_info = row.to_dict()
                            break
                
                # Search by company name if not found by symbol
                elif name.upper() in df_str.upper():
                    found_method = "company_name"
                    for idx, row in df.iterrows():
                        if any(name.upper() in str(cell).upper() for cell in row):
                            row_info = row.to_dict()
                            break
                
                if found_method:
                    stock_info = {
                        'security_no': security_no,
                        'symbol': symbol,
                        'name': name,
                        'found_method': found_method,
                        'csv_file': csv_file,
                        'row_data': row_info
                    }
                    found_in_this_file.append(stock_info)
                    found_stocks.append(stock_info)
            
            if found_in_this_file:
                print(f"Found {len(found_in_this_file)} Israeli stocks in this file:")
                for stock in found_in_this_file:
                    print(f"  {stock['security_no']} ({stock['symbol']}): {stock['name']} - found by {stock['found_method']}")
            else:
                print("No Israeli stocks found in this file")
                
        except Exception as e:
            print(f"Error analyzing CSV file {csv_file}: {e}")
    
    return found_stocks

def display_detailed_results(found_stocks):
    """Display detailed analysis results"""
    print(f"\n==== DETAILED ISRAELI STOCK ANALYSIS RESULTS ====")
    
    if not found_stocks:
        print("No Israeli TA-125 stocks found in the PDF")
        return
    
    print(f"Total Israeli stocks found: {len(found_stocks)}")
    
    # Group by detection method
    by_security = [s for s in found_stocks if s['found_method'] == 'security_number']
    by_symbol = [s for s in found_stocks if s['found_method'] == 'symbol']
    by_name = [s for s in found_stocks if s['found_method'] == 'company_name']
    
    print(f"\nDetection Summary:")
    print(f"  By Security Number: {len(by_security)}")
    print(f"  By Symbol: {len(by_symbol)}")
    print(f"  By Company Name: {len(by_name)}")
    
    # Show detailed data for stocks found by security number
    if by_security:
        print(f"\n==== STOCKS FOUND BY SECURITY NUMBER ({len(by_security)}) ====")
        for stock in by_security:
            print(f"\n{stock['security_no']} ({stock['symbol']}): {stock['name']}")
            print(f"  Found in: {stock['csv_file']}")
            print(f"  Row data:")
            for key, value in stock['row_data'].items():
                if pd.notna(value) and str(value).strip():
                    print(f"    {key}: {value}")
    
    # Show summary for other detection methods
    if by_symbol:
        print(f"\n==== STOCKS FOUND BY SYMBOL ({len(by_symbol)}) ====")
        for stock in by_symbol:
            print(f"{stock['security_no']} ({stock['symbol']}): {stock['name']} - in {stock['csv_file']}")
    
    if by_name:
        print(f"\n==== STOCKS FOUND BY COMPANY NAME ({len(by_name)}) ====")
        for stock in by_name:
            print(f"{stock['security_no']} ({stock['symbol']}): {stock['name']} - in {stock['csv_file']}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python pdf_to_csv_analyzer.py <pdf_path>")
        print("Example: python pdf_to_csv_analyzer.py 'pdf/January - report.pdf'")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    # Check if PDF exists
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    # Create output directory
    output_dir = "extracted_tables"
    
    print(f"Starting PDF to CSV analysis...")
    print(f"PDF: {pdf_path}")
    print(f"Output directory: {output_dir}")
    
    # Load TA-125 data
    ta125_stocks = load_ta125_data()
    
    # Extract tables from PDF
    tables = extract_tables_from_pdf(pdf_path)
    
    if not tables:
        print("No tables found in PDF")
        sys.exit(1)
    
    # Save tables to CSV
    csv_files = save_tables_to_csv(tables, output_dir)
    
    if not csv_files:
        print("No CSV files created")
        sys.exit(1)
    
    # Analyze CSV files for Israeli stocks
    found_stocks = analyze_csv_for_israeli_stocks(csv_files, ta125_stocks)
    
    # Display results
    display_detailed_results(found_stocks)
    
    print(f"\nAnalysis complete!")
    print(f"CSV files saved in: {output_dir}")
    print(f"Total stocks found: {len(found_stocks)}")

if __name__ == "__main__":
    main()
