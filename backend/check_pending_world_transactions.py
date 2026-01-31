#!/usr/bin/env python3
"""
Check pending world transactions in database
"""
import sys
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.world_stock_models import PendingWorldTransaction

db = SessionLocal()

# Get the latest batch
transactions = db.query(PendingWorldTransaction).order_by(PendingWorldTransaction.created_at.desc()).limit(20).all()

print('='*80)
print('LATEST PENDING WORLD TRANSACTIONS')
print('='*80)
print(f'\nTotal pending: {db.query(PendingWorldTransaction).count()}')
print(f'\nLatest 20 transactions:')

for txn in transactions:
    print(f'\n{txn.ticker} ({txn.stock_name})')
    print(f'  Type: {txn.transaction_type}')
    print(f'  Date: {txn.transaction_date}, Time: {txn.transaction_time}')
    print(f'  Quantity: {txn.quantity}, Price: {txn.price}')
    print(f'  Amount: {txn.amount}, Currency: {txn.currency}')
    print(f'  Commission: {txn.commission}, Tax: {txn.tax}')
    print(f'  Source: {txn.pdf_filename}')

db.close()
