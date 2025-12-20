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
                            name: str, pdf_name: str) -> Optional[Dict]:
        """
        Parse a transaction row from the broker's format
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
