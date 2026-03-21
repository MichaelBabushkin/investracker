"""
Base Broker Parser
Abstract base class for all broker-specific parsers
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import pandas as pd


class BaseBrokerParser(ABC):
    """Base class for broker-specific PDF parsers"""
    
    def detect_column_indices(self, df: pd.DataFrame) -> Dict[str, int]:
        """Detect column indices from DataFrame headers.
        
        Returns a mapping from semantic name to column index.
        Subclasses should override this for broker-specific column detection.
        Default implementation returns empty dict (use hardcoded defaults).
        """
        return {}
    
    @abstractmethod
    def get_hebrew_headings(self) -> Dict[str, str]:
        """
        Return Hebrew heading patterns specific to this broker
        Returns: dict with 'holdings' and 'transactions' keys
        """
        pass
    
    @abstractmethod
    def determine_table_type(self, df: pd.DataFrame, csv_file: str) -> str:
        """
        Determine if a table contains holdings or transactions
        Returns: 'holdings' or 'transactions'
        """
        pass
    
    @abstractmethod
    def parse_holding_row(self, row: pd.Series, security_no: str, symbol: str, 
                         name: str, pdf_name: str, holding_date: Optional[datetime]) -> Optional[Dict]:
        """
        Parse a holding row from the broker's format
        Returns: dict with holding data or None if invalid
        """
        pass
    
    @abstractmethod
    def parse_transaction_row(self, row: pd.Series, security_no: str, symbol: str,
                            name: str, pdf_name: str, holding_date: Optional[datetime] = None,
                            col_map: Optional[Dict[str, int]] = None) -> Optional[Dict]:
        """
        Parse a transaction row from the broker's format
        Args:
            holding_date: Report date used to filter transactions to the report's month only
            col_map: Optional pre-computed column mapping from detect_column_indices
        Returns: dict with transaction data or None if invalid
        """
        pass
    
    @abstractmethod
    def extract_date_from_pdf_text(self, text: str) -> Optional[datetime]:
        """
        Extract holding date from PDF text
        Returns: datetime object or None
        """
        pass
    
    # Common helper methods that can be used by all brokers
    
    def parse_date_string(self, date_str: str) -> Optional[datetime]:
        """Parse a date string into a date object (common for all brokers)"""
        if not date_str:
            return None
        
        date_str = date_str.strip()
        date_formats = [
            '%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y',
            '%d.%m.%Y', '%d.%m.%y', '%Y/%m/%d', '%Y-%m-%d',
            '%m/%d/%Y', '%m/%d/%y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None
    
    def clean_numeric_value(self, value: str) -> Optional[float]:
        """Clean and convert numeric string to float"""
        try:
            clean_value = str(value).replace('₪', '').replace(',', '').replace(' ', '').replace('+', '').strip()
            # Handle trailing minus sign (Israeli number format: "30,000.00-" → -30000.00)
            if clean_value.endswith('-'):
                clean_value = '-' + clean_value[:-1]
            if clean_value and clean_value.replace('.', '').replace('-', '').isdigit():
                return float(clean_value)
        except (ValueError, AttributeError):
            pass
        return None
    
    def extract_numeric_values(self, row_values: List[str]) -> List[float]:
        """Extract all numeric values from a row"""
        numeric_values = []
        for value in row_values:
            num = self.clean_numeric_value(value)
            if num is not None:
                numeric_values.append(num)
        return numeric_values
