"""
Calculate portfolio returns using TWR (Time-Weighted Return) and MWR (Money-Weighted Return/IRR)
"""

from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

# scipy is imported lazily inside calculate_mwr — importing it at module load
# pulls ~100MB of resident memory into every process for a solver used only
# during returns recalculation.

logger = logging.getLogger(__name__)


class ReturnsCalculator:
    """Calculate investment returns for holdings using TWR and MWR methods.

    Both metrics are scoped to the CURRENT open position: the stretch of
    transactions since the position was last opened from zero shares.
    Earlier round trips (buy → sell to zero → re-buy) are realized history and
    belong to realized P&L, not to the return of what the user holds now.
    Both are cumulative (non-annualized) so they are directly comparable with
    the unrealized-gain percentage shown next to them.
    """

    def __init__(self, db: Session):
        self.db = db

    def _get_position_transactions(
        self,
        user_id: str,
        ticker: str,
        market: str
    ) -> list:
        """
        Return BUY/SELL transactions of the current open position only —
        everything after the last time the running share count hit zero.
        Rows: (transaction_type, quantity, price, total_value, transaction_date)
        """
        table = 'world_stock_transactions' if market == 'world' else 'israeli_stock_transactions'
        ticker_field = 'ticker' if market == 'world' else 'symbol'

        result = self.db.execute(
            text(f"""
                SELECT transaction_type, quantity, price, total_value, transaction_date
                FROM "{table}"
                WHERE user_id = :user_id
                AND {ticker_field} = :ticker
                AND UPPER(transaction_type) IN ('BUY', 'SELL')
                ORDER BY transaction_date, id
            """),
            {"user_id": user_id, "ticker": ticker}
        )
        transactions = result.fetchall()
        if not transactions:
            return []

        shares = 0.0
        stretch_start = 0
        for i, txn in enumerate(transactions):
            qty = float(txn[1]) if txn[1] else 0.0
            if txn[0].upper() == 'BUY':
                if shares <= 1e-9:
                    stretch_start = i
                shares += qty
            else:
                shares -= qty

        if shares <= 1e-9:
            return []          # position currently closed
        return transactions[stretch_start:]
    
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
        Time-Weighted Return of the CURRENT open position (cumulative, not
        annualized): compounds the price return of each sub-period between
        cash flows, from the day the position was last opened until now.

        Formula: [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1

        Returns:
            TWR as percentage, or None if calculation fails
        """
        transactions = self._get_position_transactions(user_id, ticker, market)
        if not transactions:
            logger.debug(f"No open position for {ticker}")
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
            txn_type, quantity, price = txn[0], txn[1], txn[2]
            quantity = float(quantity) if quantity else 0
            price = float(price) if price else 0

            if i > 0 and portfolio_value > 0 and price > 0:
                # Return for the period ending at this transaction
                ending_value = shares * price
                period_return = (ending_value - portfolio_value) / portfolio_value
                period_returns.append(period_return)
                logger.debug(f"Period {i}: value {portfolio_value} -> {ending_value}, return {period_return*100:.2f}%")

            # Apply transaction
            if txn_type.upper() == 'BUY':
                shares += quantity
            else:
                shares -= quantity
            portfolio_value = shares * price if shares > 0 and price > 0 else portfolio_value

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
        Money-Weighted Return of the CURRENT open position, cumulative over the
        holding period (not annualized), so it is directly comparable with TWR
        and the unrealized-gain percentage.

        Solves the IRR of the position's cash flows — buys negative, sells and
        dividends positive, current market value as the terminal inflow — then
        compounds it over the actual holding period:
            MWR = (1 + irr_annual)^(days/365) - 1

        Returns:
            MWR as percentage, or None if calculation fails
        """
        transactions = self._get_position_transactions(user_id, ticker, market)
        if not transactions:
            return None

        # Get current holding value
        holding_table = 'world_stock_holdings' if market == 'world' else 'israeli_stock_holdings'
        ticker_field = 'ticker' if market == 'world' else 'symbol'
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

        current_value = float(holding[1]) if holding[1] else 0

        # Build cash flows list: (days_from_start, cash_flow)
        first_date = transactions[0][4]  # transaction_date of position open
        first_datetime = datetime.combine(first_date, datetime.min.time())

        cash_flows = []
        total_invested = 0.0

        for txn in transactions:
            txn_type, quantity, price, total_value, txn_date = txn
            days = (datetime.combine(txn_date, datetime.min.time()) - first_datetime).days
            value = float(total_value) if total_value else float(quantity or 0) * float(price or 0)
            if txn_type.upper() == 'BUY':
                cash_flows.append((days, -value))
                total_invested += value
            else:
                cash_flows.append((days, value))

        # Dividends received during the position's holding period
        div_table = 'world_dividends' if market == 'world' else 'israeli_dividends'
        div_field = 'ticker' if market == 'world' else 'symbol'
        div_rows = self.db.execute(
            text(f"""
                SELECT payment_date, amount, tax
                FROM "{div_table}"
                WHERE user_id = :user_id AND {div_field} = :ticker
                AND payment_date >= :start
            """),
            {"user_id": user_id, "ticker": ticker, "start": first_date}
        ).fetchall()
        for pay_date, amount, tax in div_rows:
            days = (datetime.combine(pay_date, datetime.min.time()) - first_datetime).days
            net = float(amount or 0) - float(tax or 0)
            if net > 0:
                cash_flows.append((days, net))

        # Current value as the terminal positive cash flow
        days_now = max((datetime.utcnow() - first_datetime).days, 0)
        cash_flows.append((days_now, current_value))

        logger.debug(f"Cash flows for {ticker}: {cash_flows}")

        if total_invested <= 0:
            return None

        # Position opened today: no time dimension, return simple gain
        if days_now == 0:
            simple = (sum(cf for _, cf in cash_flows if cf > 0) / total_invested - 1) * 100
            return Decimal(str(round(simple, 4)))

        def npv(rate):
            return sum(cf / (1 + rate) ** (days / 365.0) for days, cf in cash_flows)

        try:
            from scipy.optimize import brentq
            # Bracket the root: NPV is monotonically decreasing in rate for
            # investment-shaped flows. Expand the bracket until sign change.
            lo, hi = -0.9999, 10.0
            npv_lo, npv_hi = npv(lo), npv(hi)
            attempts = 0
            while npv_lo * npv_hi > 0 and attempts < 5:
                hi *= 10
                npv_hi = npv(hi)
                attempts += 1
            if npv_lo * npv_hi > 0:
                logger.warning(f"Could not bracket IRR for {ticker}")
                return None

            irr = brentq(npv, lo, hi, maxiter=200, xtol=1e-8)

            # Convert annualized IRR to cumulative return over holding period
            years = days_now / 365.0
            mwr = ((1 + irr) ** years - 1) * 100

            logger.info(f"MWR for {ticker}: {mwr:.2f}% (irr {irr*100:.2f}%/yr over {days_now}d)")
            return Decimal(str(round(mwr, 4)))

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
