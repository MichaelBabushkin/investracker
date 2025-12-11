# This file makes the models directory a Python package
# Import all models so SQLAlchemy can find them

from .user import User
from .portfolio import Portfolio
from .asset import Asset
from .transaction import Transaction
from .holding import Holding
from .market_data import PriceHistory, CurrencyRate
from .report import ReportUpload, ExtractedHolding, ExtractedTransaction
from .ta125_stock import TA125Stock

# Israeli Stock Analysis Models
from .israeli_stock_models import (
    IsraeliStock,
    IsraeliStockHolding,
    IsraeliStockTransaction,
    IsraeliDividend,
    IsraeliStockSummary
)
from .pending_transaction import PendingIsraeliTransaction

# World Stock Analysis Models
from .world_stock import (
    WorldStockAccount,
    WorldStockHolding,
    WorldStockTransaction,
    WorldStockDividend,
    WorldStockPerformance
)

__all__ = [
    "User",
    "Portfolio", 
    "Asset",
    "Transaction",
    "Holding",
    "PriceHistory",
    "CurrencyRate",
    "ReportUpload",
    "ExtractedHolding", 
    "ExtractedTransaction",
    "TA125Stock",
    # Israeli Stock Models
    "IsraeliStock",
    "IsraeliStockHolding",
    "IsraeliStockTransaction", 
    "IsraeliDividend",
    "IsraeliStockSummary",
    "PendingIsraeliTransaction",
    # World Stock Models
    "WorldStockAccount",
    "WorldStockHolding",
    "WorldStockTransaction",
    "WorldStockDividend",
    "WorldStockPerformance"
]