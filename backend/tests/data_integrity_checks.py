import os
import json
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
user_id = 'user_59ae3aa75f1ef4ed'

results = {}

with engine.connect() as conn:
    # 1. Transaction Completeness — World Stocks
    world_txs = conn.execute(text("""
        SELECT id, transaction_date, ticker, company_name, transaction_type,
               quantity, price, total_value, commission, realized_pl, cost_basis
        FROM world_stock_transactions
        WHERE user_id = :uid
          AND transaction_type IN ('BUY', 'SELL')
        ORDER BY transaction_date, id;
    """), {"uid": user_id}).fetchall()
    
    results['world_transactions'] = [dict(row._mapping) for row in world_txs]

    # 2. Holdings Correctness — World Stocks
    world_holdings = conn.execute(text("""
        SELECT ticker, company_name, quantity, purchase_cost
        FROM world_stock_holdings
        WHERE user_id = :uid
        ORDER BY ticker;
    """), {"uid": user_id}).fetchall()
    
    results['world_holdings'] = [dict(row._mapping) for row in world_holdings]

    # 2b. Expected world holdings from transactions
    world_holdings_expected = conn.execute(text("""
        SELECT ticker,
               SUM(CASE WHEN transaction_type='BUY' THEN quantity ELSE 0 END) as total_bought,
               SUM(CASE WHEN transaction_type='SELL' THEN quantity ELSE 0 END) as total_sold,
               SUM(CASE WHEN transaction_type='BUY' THEN quantity ELSE 0 END)
                 - SUM(CASE WHEN transaction_type='SELL' THEN quantity ELSE 0 END) as net_qty
        FROM world_stock_transactions
        WHERE user_id = :uid
          AND transaction_type IN ('BUY', 'SELL')
        GROUP BY ticker
        HAVING SUM(CASE WHEN transaction_type='BUY' THEN quantity ELSE 0 END)
               - SUM(CASE WHEN transaction_type='SELL' THEN quantity ELSE 0 END) > 0.001
        ORDER BY ticker;
    """), {"uid": user_id}).fetchall()
    
    results['world_holdings_expected'] = [dict(row._mapping) for row in world_holdings_expected]

    # 3. Realized P/L Verification — World Stocks (all sells)
    world_sells = conn.execute(text("""
        SELECT transaction_date, ticker, transaction_type,
               quantity, price, total_value, commission,
               cost_basis, realized_pl
        FROM world_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'SELL'
        ORDER BY transaction_date, id;
    """), {"uid": user_id}).fetchall()
    
    results['world_sells'] = [dict(row._mapping) for row in world_sells]

    # 4. Israeli Stock Holdings vs Transactions
    israeli_holdings_expected = conn.execute(text("""
        SELECT symbol,
               SUM(CASE WHEN transaction_type='BUY' THEN quantity ELSE 0 END) as bought,
               SUM(CASE WHEN transaction_type='SELL' THEN quantity ELSE 0 END) as sold,
               SUM(CASE WHEN transaction_type='BUY' THEN quantity ELSE 0 END)
                 - SUM(CASE WHEN transaction_type='SELL' THEN quantity ELSE 0 END) as net
        FROM israeli_stock_transactions
        WHERE user_id = :uid
          AND transaction_type IN ('BUY','SELL')
        GROUP BY symbol ORDER BY symbol;
    """), {"uid": user_id}).fetchall()
    
    results['israeli_holdings_expected'] = [dict(row._mapping) for row in israeli_holdings_expected]

    israeli_holdings = conn.execute(text("""
        SELECT symbol, company_name, quantity
        FROM israeli_stock_holdings
        WHERE user_id = :uid
        ORDER BY symbol;
    """), {"uid": user_id}).fetchall()
    
    results['israeli_holdings'] = [dict(row._mapping) for row in israeli_holdings]

    # 5. Israeli Realized P/L
    israeli_sells = conn.execute(text("""
        SELECT transaction_date, symbol, transaction_type,
               quantity, price, total_value, commission, realized_pl
        FROM israeli_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'SELL'
        ORDER BY transaction_date;
    """), {"uid": user_id}).fetchall()
    
    results['israeli_sells'] = [dict(row._mapping) for row in israeli_sells]

    # 6. Cash Flow / Deposits
    deposits = conn.execute(text("""
        SELECT transaction_date, transaction_type, total_value, currency
        FROM israeli_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'DEPOSIT'
        ORDER BY transaction_date;
    """), {"uid": user_id}).fetchall()
    
    results['deposits'] = [dict(row._mapping) for row in deposits]

    # 7. FX Conversions (ILS -> USD)
    fx_conversions = conn.execute(text("""
        SELECT transaction_date, transaction_type, quantity as usd_received,
               price as exchange_rate, total_value as ils_spent
        FROM israeli_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'FX_CONVERSION'
        ORDER BY transaction_date;
    """), {"uid": user_id}).fetchall()
    
    results['fx_conversions'] = [dict(row._mapping) for row in fx_conversions]

    # 8. Capital Gains Tax
    capital_gains_tax = conn.execute(text("""
        SELECT transaction_date, total_value as tax_ils
        FROM world_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'CAPITAL_GAINS_TAX'
        ORDER BY transaction_date;
    """), {"uid": user_id}).fetchall()
    
    results['capital_gains_tax'] = [dict(row._mapping) for row in capital_gains_tax]

    # 9. Dividends Completeness (World)
    world_dividends = conn.execute(text("""
        SELECT payment_date, ticker, amount, tax, net_amount
        FROM world_dividends
        WHERE user_id = :uid
        ORDER BY payment_date;
    """), {"uid": user_id}).fetchall()
    
    results['world_dividends'] = [dict(row._mapping) for row in world_dividends]

    # 9b. Israeli dividends
    israeli_dividends = conn.execute(text("""
        SELECT payment_date, symbol, amount, tax
        FROM israeli_dividends
        WHERE user_id = :uid
        ORDER BY payment_date;
    """), {"uid": user_id}).fetchall()
    
    results['israeli_dividends'] = [dict(row._mapping) for row in israeli_dividends]

    # 10. Duplicate Detection
    dup_world = conn.execute(text("""
        SELECT transaction_date, ticker, transaction_type, quantity, price, COUNT(*) as cnt
        FROM world_stock_transactions
        WHERE user_id = :uid
        GROUP BY transaction_date, ticker, transaction_type, quantity, price
        HAVING COUNT(*) > 1;
    """), {"uid": user_id}).fetchall()
    
    results['duplicate_world'] = [dict(row._mapping) for row in dup_world]

    dup_israeli = conn.execute(text("""
        SELECT transaction_date, symbol, transaction_type, quantity, price, COUNT(*) as cnt
        FROM israeli_stock_transactions
        WHERE user_id = :uid
        GROUP BY transaction_date, symbol, transaction_type, quantity, price
        HAVING COUNT(*) > 1;
    """), {"uid": user_id}).fetchall()
    
    results['duplicate_israeli'] = [dict(row._mapping) for row in dup_israeli]

# Helper for date/decimal/datetime serialization
def default_serializer(obj):
    import decimal
    from datetime import date, datetime
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError

print(json.dumps(results, default=default_serializer, indent=2))
