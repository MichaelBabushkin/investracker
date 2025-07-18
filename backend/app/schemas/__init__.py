# This file makes the schemas directory a Python package
# Import all schemas for API validation and serialization

from .user import *
from .portfolio import *
from .transaction import *

# Israeli Stock Analysis Schemas
from .israeli_stock_schemas import (
    IsraeliStockCreate,
    IsraeliStockResponse,
    IsraeliStockHoldingCreate,
    IsraeliStockHoldingResponse,
    IsraeliStockTransactionCreate,
    IsraeliStockTransactionResponse,
    IsraeliDividendCreate,
    IsraeliDividendResponse,
    IsraeliStockSummaryResponse,
    PDFUploadResponse,
    CSVAnalysisResponse,
    PortfolioSummaryResponse,
    StockListFilter,
    ErrorResponse,
    ValidationErrorResponse
)

__all__ = [
    # Israeli Stock Schemas
    "IsraeliStockCreate",
    "IsraeliStockResponse",
    "IsraeliStockHoldingCreate",
    "IsraeliStockHoldingResponse",
    "IsraeliStockTransactionCreate",
    "IsraeliStockTransactionResponse",
    "IsraeliDividendCreate",
    "IsraeliDividendResponse",
    "IsraeliStockSummaryResponse",
    "PDFUploadResponse",
    "CSVAnalysisResponse",
    "PortfolioSummaryResponse",
    "StockListFilter",
    "ErrorResponse",
    "ValidationErrorResponse"
]
