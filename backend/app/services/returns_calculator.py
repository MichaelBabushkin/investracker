"""
Calculate portfolio returns using TWR (Time-Weighted Return) and MWR (Money-Weighted Return/IRR)
"""

from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np
from scipy.optimize import newton
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)


class ReturnsCalculator:
    """Calculate investment returns for holdings using TWR and MWR methods"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_unrealized_gains(
        self,
        cost_basis: Decimal,
        current_value: Decimal
    ) -> Tuple[Decimal, Decimal]:
        """
        Calculate simple unrealized gains
        
        Args:
            cost_basis: Total amount invested
            current_value: Current market value
            
        Returns:
            (gain_amount, gain_percentage)
        """
        gain = current_value - cost_basis
        gain_pct = (gain / cost_basis * 100) if cost_basis > 0 else Decimal(0)
        return gain, gain_pct
    
    def calculate_twr(
        self,
        user_id: str,
        ticker: str,
        market: str = 'world'
    ) -> Optional[Decimal]:
        """
        Calculate Time-Weighted Return for a holding
        
        TWR measures portfolio performance independent of cash flows.
        Formula: [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
        where R = return for each sub-period between cash flows
        
        Args:
            user_id: User identifier
            ticker: Stock ticker
            market: 'world' or 'israeli'
            
        Returns:
            TWR as percentage, or None if calculation fails
        """
        table = 'world_stock_transactions' if market == 'world' else 'israeli_stock_transactions'
        ticker_field = 'ticker' if market == 'world' else 'symbol'
        
        # Get all transactions ordered by time
        result = self.db.execute(
            text(f"""
                SELECT transaction_type, quantity, price, transaction_date, transaction_time
                FROM "{table}"
                WHERE user_id = :user_id 
                AND {ticker_field} = :ticker
                ORDER BY transaction_date, transaction_time
            """),
            {"user_id": user_id, "ticker": ticker}
        )
        
        transactions = result.fetchall()
        
        if not transactions:
            logger.debug(f"No transactions found for {ticker}")
            return None
        
        # Get current price
        price_result = self.db.execute(
            text("""
                SELECT current_price 
                FROM "stock_prices"
                WHERE ticker = :ticker AND market = :market
            """),
            {"ticker": ticker, "market": market}
        )
        
        current_price_row = price_result.fetchone()
        if not current_price_row or not current_price_row[0]:
            logger.warning(f"No current price for {ticker}")
            return None
        
        current_price = float(current_price_row[0])
        
        # Calculate sub-period returns
        portfolio_value = 0.0
        shares = 0.0
        period_returns = []
        
        for i, txn in enumerate(transactions):
            txn_type, quantity, price, txn_date, txn_time = txn
            quantity = float(quantity) if quantity else 0
            price = float(price) if price else 0
            
            if i > 0 and portfolio_value > 0:
                # Calculate return for period before this transaction
                ending_value = shares * price
                period_return = (ending_value - portfolio_value) / portfolio_value
                period_returns.append(period_return)
                logger.debug(f"Period {i}: value {portfolio_value} -> {ending_value}, return {period_return*100:.2f}%")
            
            # Apply transaction
            if txn_type.upper() == 'BUY':
                shares += quantity
                portfolio_value = shares * price
            elif txn_type == 'SELL':
                shares -= quantity
                portfolio_value = shares * price if shares > 0 else 0
        
        # Final period return (to current price)
        if portfolio_value > 0 and shares > 0:
            ending_value = shares * current_price
            period_return = (ending_value - portfolio_value) / portfolio_value
            period_returns.append(period_return)
            logger.debug(f"Final period: value {portfolio_value} -> {ending_value}, return {period_return*100:.2f}%")
        
        if not period_returns:
            logger.debug(f"No period returns calculated for {ticker}")
            return None
        
        # Calculate TWR: compound all period returns
        twr = 1.0
        for r in period_returns:
            twr *= (1 + r)
        
        twr = (twr - 1) * 100  # Convert to percentage
        
        logger.info(f"TWR for {ticker}: {twr:.2f}%")
        return Decimal(str(round(twr, 4)))
    
    def calculate_mwr(
        self,
        user_id: str,
        ticker: str,
        market: str = 'world'
    ) -> Optional[Decimal]:
        """
        Calculate Money-Weighted Return (Internal Rate of Return) for a holding
        
        MWR measures actual investor return considering timing and size of cash flows.
        Solves: NPV = Σ(CF_i / (1 + MWR)^t_i) = 0
        where CF = cash flow (negative for buys, positive for sells + current value)
        
        Args:
            user_id: User identifier
            ticker: Stock ticker
            market: 'world' or 'israeli'
            
        Returns:
            MWR (IRR) as percentage, or None if calculation fails
        """
        table = 'world_stock_transactions' if market == 'world' else 'israeli_stock_transactions'
        ticker_field = 'ticker' if market == 'world' else 'symbol'
        
        # Get all transactions
        result = self.db.execute(
            text(f"""
                SELECT transaction_type, quantity, price, total_value, transaction_date, transaction_time
                FROM "{table}"
                WHERE user_id = :user_id 
                AND {ticker_field} = :ticker
                ORDER BY transaction_date, transaction_time
            """),
            {"user_id": user_id, "ticker": ticker}
        )
        
        transactions = result.fetchall()
        
        if not transactions:
            return None
        
        # Get current holding value
        holding_table = 'world_stock_holdings' if market == 'world' else 'israeli_stock_holdings'
        holding_result = self.db.execute(
            text(f"""
                SELECT quantity, current_value
                FROM "{holding_table}"
                WHERE user_id = :user_id AND {ticker_field} = :ticker
            """),
            {"user_id": user_id, "ticker": ticker}
        )
        
        holding = holding_result.fetchone()
        if not holding:
            logger.warning(f"No holding found for {ticker}")
            return None
        
        current_shares, current_value = holding
        current_shares = float(current_shares) if current_shares else 0
        current_value = float(current_value) if current_value else 0
        
        # Build cash flows list: (days_from_start, cash_flow)
        first_txn = transactions[0]
        first_date = first_txn[4]  # transaction_date
        
        # Use date only for calculation
        first_datetime = datetime.combine(first_date, datetime.min.time())
        
        cash_flows = []
        
        for txn in transactions:
            txn_type, quantity, price, total_value, txn_date, txn_time = txn
            
            # Calculate days from first transaction (use date only)
            txn_datetime = datetime.combine(txn_date, datetime.min.time())
            days = (txn_datetime - first_datetime).days
            
            # Cash flow (negative for buys, positive for sells)
            if txn_type == 'BUY':
                cf = -float(total_value) if total_value else -(float(quantity) * float(price))
            elif txn_type == 'SELL':
                cf = float(total_value) if total_value else (float(quantity) * float(price))
            else:
                continue
            
            cash_flows.append((days, cf))
        
        # Add current value as final positive cash flow
        days_now = (datetime.utcnow() - first_datetime).days
        cash_flows.append((days_now, current_value))
        
        logger.debug(f"Cash flows for {ticker}: {cash_flows}")
        
        # Calculate IRR using Newton's method
        def npv(rate):
            """Calculate NPV at given annual rate"""
            return sum(cf / (1 + rate) ** (days / 365.0) for days, cf in cash_flows)
        
        def npv_derivative(rate):
            """Derivative of NPV for Newton's method"""
            return sum(-cf * (days / 365.0) / (1 + rate) ** (days / 365.0 + 1) 
                       for days, cf in cash_flows)
        
        try:
            # Try to find IRR (starting guess: 10% return)
            irr = newton(npv, 0.1, fprime=npv_derivative, maxiter=100, tol=1e-6)
            mwr = irr * 100  # Convert to percentage
            
            # Sanity check: IRR should be reasonable (-100% to +1000%)
            if -100 <= mwr <= 1000:
                logger.info(f"MWR for {ticker}: {mwr:.2f}%")
                return Decimal(str(round(mwr, 4)))
            else:
                logger.warning(f"Unreasonable MWR calculated for {ticker}: {mwr}%")
                return None
                
        except Exception as e:
            logger.error(f"Error calculating MWR for {ticker}: {e}")
            return None
    
    def update_holding_returns(
        self,
        user_id: str,
        ticker: str,
        market: str = 'world'
    ) -> bool:
        """
        Update all return metrics for a specific holding
        
        Args:
            user_id: User identifier
            ticker: Stock ticker  
            market: 'world' or 'israeli'
            
        Returns:
            True if successful, False otherwise
        """
        holding_table = 'world_stock_holdings' if market == 'world' else 'israeli_stock_holdings'
        ticker_field = 'ticker' if market == 'world' else 'symbol'
        
        # Get current holding data
        result = self.db.execute(
            text(f"""
                SELECT purchase_cost, current_value
                FROM "{holding_table}"
                WHERE user_id = :user_id AND {ticker_field} = :ticker
            """),
            {"user_id": user_id, "ticker": ticker}
        )
        
        holding = result.fetchone()
        if not holding:
            logger.warning(f"No holding found for user {user_id}, ticker {ticker}")
            return False
        
        cost_basis = Decimal(str(holding[0])) if holding[0] else Decimal(0)
        current_value = Decimal(str(holding[1])) if holding[1] else Decimal(0)
        
        # Calculate metrics
        gain, gain_pct = self.calculate_unrealized_gains(cost_basis, current_value)
        twr = self.calculate_twr(user_id, ticker, market)
        mwr = self.calculate_mwr(user_id, ticker, market)
        
        # Update database
        try:
            self.db.execute(
                text(f"""
                    UPDATE "{holding_table}"
                    SET unrealized_gain = :gain,
                        unrealized_gain_pct = :gain_pct,
                        twr = :twr,
                        mwr = :mwr,
                        updated_at = :now
                    WHERE user_id = :user_id AND {ticker_field} = :ticker
                """),
                {
                    "gain": gain,
                    "gain_pct": gain_pct,
                    "twr": twr,
                    "mwr": mwr,
                    "now": datetime.utcnow(),
                    "user_id": user_id,
                    "ticker": ticker
                }
            )
            self.db.commit()
            logger.info(f"Updated returns for {ticker}: gain={gain_pct}%, TWR={twr}%, MWR={mwr}%")
            return True
        except Exception as e:
            logger.error(f"Error updating returns for {ticker}: {e}")
            self.db.rollback()
            return False
    
    def update_all_user_returns(
        self, 
        user_id: str, 
        market: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Update returns for all holdings of a user
        
        Args:
            user_id: User identifier
            market: Optional market filter ('world' or 'israeli'). If None, updates both
            
        Returns:
            Dict with counts: {"updated": N, "failed": M, "errors": []}
        """
        updated = 0
        failed = 0
        errors = []
        
        # Determine which markets to process
        markets_to_process = []
        if market is None:
            markets_to_process = ['world', 'israeli']
        elif market in ['world', 'israeli']:
            markets_to_process = [market]
        else:
            raise ValueError(f"Invalid market: {market}. Must be 'world', 'israeli', or None")
        
        for mkt in markets_to_process:
            if mkt == 'world':
                # Get all world holdings
                result = self.db.execute(
                    text("""
                        SELECT ticker FROM "world_stock_holdings"
                        WHERE user_id = :user_id
                    """),
                    {"user_id": user_id}
                )
                tickers = [row[0] for row in result.fetchall()]
                
                # Update world holdings
                for ticker in tickers:
                    try:
                        if self.update_holding_returns(user_id, ticker, 'world'):
                            updated += 1
                        else:
                            failed += 1
                    except Exception as e:
                        failed += 1
                        errors.append(f"World {ticker}: {str(e)}")
                        logger.error(f"Error updating world holding {ticker}: {e}")
            
            elif mkt == 'israeli':
                # Get all Israeli holdings
                result = self.db.execute(
                    text("""
                        SELECT symbol FROM "israeli_stock_holdings"
                        WHERE user_id = :user_id
                    """),
                    {"user_id": user_id}
                )
                tickers = [row[0] for row in result.fetchall()]
                
                # Update Israeli holdings
                for ticker in tickers:
                    try:
                        if self.update_holding_returns(user_id, ticker, 'israeli'):
                            updated += 1
                        else:
                            failed += 1
                    except Exception as e:
                        failed += 1
                        errors.append(f"Israeli {ticker}: {str(e)}")
                        logger.error(f"Error updating Israeli holding {ticker}: {e}")
        
        logger.info(f"Updated returns for user {user_id}: {updated} successful, {failed} failed")
        
        return {
            "updated": updated,
            "failed": failed,
            "errors": errors
        }
