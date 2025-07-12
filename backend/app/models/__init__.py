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
    "TA125Stock"
]