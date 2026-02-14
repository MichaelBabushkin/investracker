"""
Cash Balance Service
Tracks cash deposits/withdrawals for Israeli stock investments
Calculates available cash balance for stock purchases
"""
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, date


class CashBalanceService:
    """Service for tracking cash balance from deposits/withdrawals"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
    
    def calculate_cash_balance(self, user_id: str, as_of_date: Optional[date] = None) -> Dict:
        """
        Calculate cash balance for a user
        
        Returns:
            {
                'total_deposits': Decimal,
                'total_withdrawals': Decimal,
                'total_stock_purchases': Decimal,
                'total_stock_sales': Decimal,
                'total_commissions': Decimal,
                'total_taxes': Decimal,
                'total_dividends': Decimal,
                'available_cash': Decimal,
                'transactions': List[Dict]
            }
        """
        cursor = self.conn.cursor()
        
        # Build date filter
        date_filter = ""
        params = [user_id]
        if as_of_date:
            date_filter = " AND transaction_date <= %s"
            params.append(as_of_date)
        
        # Get all cash-affecting transactions
        query = f"""
            SELECT 
                transaction_type,
                transaction_date,
                transaction_time,
                security_no,
                company_name,
                quantity,
                price,
                total_value,
                commission,
                tax,
                currency,
                source_pdf,
                created_at
            FROM "israeli_stock_transactions"
            WHERE user_id = %s{date_filter}
            ORDER BY transaction_date, transaction_time, created_at
        """
        
        cursor.execute(query, params)
        transactions = cursor.fetchall()
        
        # Calculate totals
        total_deposits = Decimal('0')
        total_withdrawals = Decimal('0')
        total_purchases = Decimal('0')  # Money spent on stocks
        total_sales = Decimal('0')      # Money received from selling
        total_commissions = Decimal('0')
        total_taxes = Decimal('0')
        
        transaction_list = []
        running_balance = Decimal('0')
        
        for row in transactions:
            trans_type = row[0]
            trans_date = row[1]
            trans_time = row[2]
            security_no = row[3]
            company_name = row[4]
            quantity = Decimal(str(row[5])) if row[5] else Decimal('0')
            price = Decimal(str(row[6])) if row[6] else Decimal('0')
            total_value = Decimal(str(row[7])) if row[7] else Decimal('0')
            commission = Decimal(str(row[8])) if row[8] else Decimal('0')
            tax = Decimal(str(row[9])) if row[9] else Decimal('0')
            currency = row[10]
            source_pdf = row[11]
            created_at = row[12]
            
            cash_impact = Decimal('0')
            
            if trans_type == 'DEPOSIT':
                total_deposits += abs(total_value)
                cash_impact = abs(total_value)
                running_balance += cash_impact
                
            elif trans_type == 'WITHDRAWAL':
                total_withdrawals += abs(total_value)
                cash_impact = -abs(total_value)
                running_balance += cash_impact
                
            elif trans_type == 'BUY':
                # Money goes out: stock cost + commission + tax
                purchase_cost = abs(total_value) + abs(commission) + abs(tax)
                total_purchases += purchase_cost
                total_commissions += abs(commission)
                total_taxes += abs(tax)
                cash_impact = -purchase_cost
                running_balance += cash_impact
                
            elif trans_type == 'SELL':
                # Money comes in: sale proceeds - commission - tax
                sale_proceeds = abs(total_value) - abs(commission) - abs(tax)
                total_sales += abs(total_value)
                total_commissions += abs(commission)
                total_taxes += abs(tax)
                cash_impact = sale_proceeds
                running_balance += cash_impact
            
            transaction_list.append({
                'date': trans_date.isoformat() if trans_date else None,
                'time': trans_time.isoformat() if trans_time else None,
                'type': trans_type,
                'security_no': security_no,
                'company_name': company_name,
                'quantity': float(quantity),
                'price': float(price),
                'total_value': float(total_value),
                'commission': float(commission),
                'tax': float(tax),
                'cash_impact': float(cash_impact),
                'running_balance': float(running_balance),
                'currency': currency,
                'source_pdf': source_pdf
            })
        
        # Get dividends (they increase cash)
        div_query = f"""
            SELECT 
                payment_date,
                security_no,
                company_name,
                amount,
                tax_withheld,
                currency
            FROM "israeli_dividends"
            WHERE user_id = %s{date_filter.replace('transaction_date', 'payment_date') if date_filter else ''}
            ORDER BY payment_date
        """
        
        cursor.execute(div_query, params)
        dividends = cursor.fetchall()
        
        total_dividends = Decimal('0')
        dividend_taxes = Decimal('0')
        
        for div in dividends:
            payment_date = div[0]
            security_no = div[1]
            company_name = div[2]
            amount = Decimal(str(div[3])) if div[3] else Decimal('0')
            tax_withheld = Decimal(str(div[4])) if div[4] else Decimal('0')
            currency = div[5]
            
            net_dividend = abs(amount) - abs(tax_withheld)
            total_dividends += abs(amount)
            dividend_taxes += abs(tax_withheld)
            running_balance += net_dividend
            
            transaction_list.append({
                'date': payment_date.isoformat() if payment_date else None,
                'time': None,
                'type': 'DIVIDEND',
                'security_no': security_no,
                'company_name': company_name,
                'quantity': 0,
                'price': 0,
                'total_value': float(amount),
                'commission': 0,
                'tax': float(tax_withheld),
                'cash_impact': float(net_dividend),
                'running_balance': float(running_balance),
                'currency': currency,
                'source_pdf': None
            })
        
        # Calculate available cash
        available_cash = total_deposits - total_withdrawals - total_purchases + total_sales + total_dividends - dividend_taxes
        
        cursor.close()
        
        return {
            'total_deposits': float(total_deposits),
            'total_withdrawals': float(total_withdrawals),
            'total_stock_purchases': float(total_purchases),
            'total_stock_sales': float(total_sales),
            'total_commissions': float(total_commissions),
            'total_taxes': float(total_taxes),
            'total_dividends': float(total_dividends),
            'dividend_taxes': float(dividend_taxes),
            'available_cash': float(available_cash),
            'currency': 'ILS',
            'as_of_date': as_of_date.isoformat() if as_of_date else datetime.now().date().isoformat(),
            'transactions': transaction_list
        }
    
    def get_cash_flow_summary(self, user_id: str, period: str = 'all') -> Dict:
        """
        Get cash flow summary grouped by period
        
        Args:
            period: 'all', 'year', 'month'
            
        Returns:
            Summary of cash flows
        """
        cursor = self.conn.cursor()
        
        # This would implement period-based grouping
        # For now, return overall summary
        balance_data = self.calculate_cash_balance(user_id)
        
        return {
            'period': period,
            'total_inflow': balance_data['total_deposits'] + balance_data['total_stock_sales'] + balance_data['total_dividends'],
            'total_outflow': balance_data['total_withdrawals'] + balance_data['total_stock_purchases'] + balance_data['total_commissions'] + balance_data['total_taxes'],
            'net_cash_flow': balance_data['available_cash'],
            'breakdown': {
                'deposits': balance_data['total_deposits'],
                'withdrawals': balance_data['total_withdrawals'],
                'stock_purchases': balance_data['total_stock_purchases'],
                'stock_sales': balance_data['total_stock_sales'],
                'dividends': balance_data['total_dividends'],
                'fees': balance_data['total_commissions'] + balance_data['total_taxes']
            }
        }
    
    def can_afford_purchase(self, user_id: str, purchase_amount: float) -> Tuple[bool, str]:
        """
        Check if user has enough cash to make a purchase
        
        Returns:
            (can_afford: bool, message: str)
        """
        balance_data = self.calculate_cash_balance(user_id)
        available = balance_data['available_cash']
        
        if available >= purchase_amount:
            return (True, f"Sufficient funds. Available: ₪{available:,.2f}")
        else:
            shortfall = purchase_amount - available
            return (False, f"Insufficient funds. Available: ₪{available:,.2f}, Need: ₪{purchase_amount:,.2f}, Shortfall: ₪{shortfall:,.2f}")
