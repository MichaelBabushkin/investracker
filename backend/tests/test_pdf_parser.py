import os
import re
from datetime import datetime
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.services.israeli_stock_service import IsraeliStockService

service = IsraeliStockService()
reports_dir = "/Users/michaelbabushkin/Desktop/projects/investracker/backend/reports"

all_pdf_paths = []
for root, dirs, files in os.walk(reports_dir):
    for file in files:
        if file.endswith(".pdf"):
            all_pdf_paths.append(os.path.join(root, file))

print(f"Found {len(all_pdf_paths)} PDFs.")

# We want to check what transactions are found in the CSVs for each PDF
for pdf_path in all_pdf_paths:
    pdf_name = os.path.basename(pdf_path)
    holding_date = service.extract_date_from_pdf(pdf_path)
    
    tables = service.extract_tables_from_pdf(pdf_path)
    if not tables:
        continue
        
    temp_dir = f"temp_test_csv"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    csv_files = service.save_tables_to_csv(tables, temp_dir)
    
    # We want to see all rows from the transactions CSV where type matches world trade types
    import pandas as pd
    WORLD_TRADE_TYPES = {'ל"וח/ק', 'ק/חו"ל', 'ק/חול', 'ל"וח/מ', 'מ/חו"ל', 'מ/חול'}
    
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file, encoding='utf-8')
            csv_type = service.determine_csv_type(df, csv_file)
            if csv_type != 'transactions':
                # Try excellence_broker's determine_table_type too
                csv_type = service.broker_parser.determine_table_type(df, csv_file)
                if csv_type != 'transactions':
                    continue
            
            # Let's inspect the columns
            col_map = service.broker_parser.detect_column_indices(df)
            idx_security_id = col_map.get('security_id', 10)
            idx_description = col_map.get('description', 9)
            idx_type = col_map.get('type', 8)
            
            for idx, row in df.iterrows():
                if len(row) <= max(idx_security_id, idx_description, idx_type):
                    continue
                sec_id = str(row.iloc[idx_security_id]).replace('.0', '').strip()
                name = str(row.iloc[idx_description]).strip()
                t_type = str(row.iloc[idx_type]).strip()
                
                # Check if it matches world trade types
                is_world_type = any(wt in t_type for wt in WORLD_TRADE_TYPES)
                
                # Also check what _is_world_stock would say
                # Clean name like the parser does
                hebrew_prefixes = [
                    'ביד/פה', 'סמ/שמ', 'למע/שמ', 'חסמ/שמ', 'ל"וח/ק', 'ל"וח/מ',
                    'הפ/דיב', 'מש/מסח', 'מש/עמל', 'ק/חו"ל', 'מ/חו"ל',
                    'ביד/', 'חסמ/', 'ח"טמ.ע', 'סמ/', 'הפ/', 'מש/',
                    'הינק', 'הריכמ', 'ףיצר/ק', 'ףיצר/מ',
                ]
                cleaned_name = name
                for prefix in hebrew_prefixes:
                    if cleaned_name.startswith(prefix):
                        cleaned_name = cleaned_name[len(prefix):].strip()
                        break
                        
                is_world_by_name = service.broker_parser._is_world_stock(cleaned_name, sec_id)
                
                if is_world_type or is_world_by_name:
                    print(f"PDF: {os.path.relpath(pdf_path, reports_dir)}, SecID: {sec_id}, Name: {name}, Cleaned: {cleaned_name}, Type: {t_type}, is_world_by_name: {is_world_by_name}, is_world_type: {is_world_type}")
        except Exception as e:
            # print(f"Error {csv_file}: {e}")
            pass
            
    # clean up temp_dir
    import shutil
    shutil.rmtree(temp_dir)
