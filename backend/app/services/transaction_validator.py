"""
Transaction Validator Service
Validates transactions before saving to pending transactions table
"""
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import re


class TransactionValidator:
    """Validates transaction data for integrity and completeness"""
    
    # Valid transaction types
    VALID_TYPES = {'BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'}
    
    def __init__(self):
        self.errors = []
        self.warnings = []
    
    def validate_transaction(self, transaction: Dict) -> Tuple[bool, List[str], List[str]]:
        """
        Validate a single transaction
        
        Returns: (is_valid, errors, warnings)
        """
        self.errors = []
        self.warnings = []
        
        # Required field validation
        self._validate_required_fields(transaction)
        
        # Type-specific validation
        self._validate_transaction_type(transaction)
        
        # Date validation
        self._validate_dates(transaction)
        
        # Numeric validation
        self._validate_numeric_fields(transaction)
        
        # Logical validation
        self._validate_business_rules(transaction)
        
        return (len(self.errors) == 0, self.errors.copy(), self.warnings.copy())
    
    def validate_batch(self, transactions: List[Dict]) -> Dict:
        """
        Validate a batch of transactions
        
        Returns: {
            'valid_count': int,
            'invalid_count': int,
            'transactions_with_errors': [(transaction, errors, warnings)]
        }
        """
        results = {
            'valid_count': 0,
            'invalid_count': 0,
            'transactions_with_errors': []
        }
        
        for trans in transactions:
            is_valid, errors, warnings = self.validate_transaction(trans)
            
            if is_valid:
                results['valid_count'] += 1
            else:
                results['invalid_count'] += 1
                results['transactions_with_errors'].append((trans, errors, warnings))
            
            # Track warnings even for valid transactions
            if warnings and is_valid:
                results['transactions_with_errors'].append((trans, [], warnings))
        
        return results
    
    def _validate_required_fields(self, transaction: Dict):
        """Check for required fields based on transaction type"""
        trans_type = transaction.get('transaction_type', '').upper()
        
        # Common required fields for all transactions
        required = ['transaction_type']
        
        # Type-specific requirements
        if trans_type in ('BUY', 'SELL'):
            required.extend(['security_no', 'name', 'quantity', 'price', 'transaction_date'])
        elif trans_type == 'DIVIDEND':
            required.extend(['security_no', 'name', 'total_value', 'transaction_date'])
        elif trans_type in ('DEPOSIT', 'WITHDRAWAL'):
            required.extend(['total_value', 'transaction_date'])
        
        # Check for missing fields
        for field in required:
            value = transaction.get(field)
            if value is None or (isinstance(value, str) and not value.strip()):
                self.errors.append(f"Missing required field: {field}")
    
    def _validate_transaction_type(self, transaction: Dict):
        """Validate transaction type"""
        trans_type = transaction.get('transaction_type', '').upper()
        
        if not trans_type:
            self.errors.append("Transaction type is required")
            return
        
        if trans_type not in self.VALID_TYPES:
            self.errors.append(
                f"Invalid transaction type: '{trans_type}'. "
                f"Must be one of: {', '.join(self.VALID_TYPES)}"
            )
    
    def _validate_dates(self, transaction: Dict):
        """Validate date fields"""
        transaction_date = transaction.get('transaction_date')
        
        if not transaction_date:
            return  # Already caught by required fields
        
        # Parse date if it's a string
        parsed_date = self._parse_date(transaction_date)
        
        if not parsed_date:
            self.errors.append(f"Invalid date format: {transaction_date}")
            return
        
        # Check if date is in the future
        if parsed_date > datetime.now().date():
            self.warnings.append(f"Transaction date is in the future: {transaction_date}")
        
        # Check if date is too old (more than 10 years)
        years_ago = (datetime.now().date() - parsed_date).days / 365.25
        if years_ago > 10:
            self.warnings.append(f"Transaction date is more than 10 years old: {transaction_date}")
        
        # Validate transaction time if present
        transaction_time = transaction.get('transaction_time')
        if transaction_time and not self._is_valid_time(transaction_time):
            self.warnings.append(f"Invalid time format: {transaction_time}")
    
    def _validate_numeric_fields(self, transaction: Dict):
        """Validate numeric fields"""
        trans_type = transaction.get('transaction_type', '').upper()
        
        # Quantity validation (for BUY/SELL)
        if trans_type in ('BUY', 'SELL'):
            quantity = transaction.get('quantity')
            if quantity is not None:
                try:
                    qty = Decimal(str(quantity))
                    if qty <= 0:
                        self.errors.append("Quantity must be greater than 0")
                    if qty > 1_000_000:
                        self.warnings.append(f"Unusually large quantity: {quantity}")
                except (ValueError, TypeError):
                    self.errors.append(f"Invalid quantity value: {quantity}")
        
        # Price validation (for BUY/SELL)
        if trans_type in ('BUY', 'SELL'):
            price = transaction.get('price')
            if price is not None:
                try:
                    prc = Decimal(str(price))
                    if prc <= 0:
                        self.errors.append("Price must be greater than 0")
                    if prc > 100_000:
                        self.warnings.append(f"Unusually high price: {price}")
                except (ValueError, TypeError):
                    self.errors.append(f"Invalid price value: {price}")
        
        # Total value validation
        total_value = transaction.get('total_value')
        if total_value is not None:
            try:
                total = Decimal(str(total_value))
                if abs(total) > 10_000_000:
                    self.warnings.append(f"Unusually large amount: {total_value}")
            except (ValueError, TypeError):
                self.errors.append(f"Invalid total value: {total_value}")
        
        # Commission validation
        commission = transaction.get('commission')
        if commission is not None:
            try:
                comm = Decimal(str(commission))
                if comm < 0:
                    self.errors.append("Commission cannot be negative")
                if comm > 10000:
                    self.warnings.append(f"Unusually high commission: {commission}")
            except (ValueError, TypeError):
                self.warnings.append(f"Invalid commission value: {commission}")
        
        # Tax validation
        tax = transaction.get('tax')
        if tax is not None:
            try:
                tax_val = Decimal(str(tax))
                if tax_val < 0:
                    self.warnings.append("Tax is negative (unusual)")
            except (ValueError, TypeError):
                self.warnings.append(f"Invalid tax value: {tax}")
    
    def _validate_business_rules(self, transaction: Dict):
        """Validate business logic rules"""
        trans_type = transaction.get('transaction_type', '').upper()
        
        # For BUY/SELL: check if quantity * price ≈ total_value
        if trans_type in ('BUY', 'SELL'):
            quantity = transaction.get('quantity')
            price = transaction.get('price')
            total_value = transaction.get('total_value')
            
            if all([quantity, price, total_value]):
                try:
                    qty = Decimal(str(quantity))
                    prc = Decimal(str(price))
                    total = Decimal(str(total_value))
                    
                    calculated_total = abs(qty * prc)
                    actual_total = abs(total)
                    
                    # Allow 5% difference for rounding/fees
                    if calculated_total > 0:
                        difference_pct = abs(calculated_total - actual_total) / calculated_total * 100
                        
                        if difference_pct > 5:
                            self.warnings.append(
                                f"Total value mismatch: {quantity} × {price} = {calculated_total:.2f}, "
                                f"but total_value is {total}. Difference: {difference_pct:.1f}%"
                            )
                except (ValueError, TypeError, ZeroDivisionError):
                    pass  # Already caught by numeric validation
        
        # Security number format validation
        security_no = transaction.get('security_no')
        if security_no and trans_type in ('BUY', 'SELL', 'DIVIDEND'):
            # Israeli securities are typically 5-7 digits
            if not re.match(r'^\d{5,7}$', str(security_no)):
                self.warnings.append(f"Unusual security number format: {security_no}")
    
    def _parse_date(self, date_value) -> Optional[date]:
        """Parse various date formats"""
        if isinstance(date_value, date):
            return date_value
        
        if isinstance(date_value, datetime):
            return date_value.date()
        
        if not isinstance(date_value, str):
            return None
        
        # Try various date formats
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%d/%m/%y',
            '%d-%m-%Y',
            '%d-%m-%y',
            '%Y/%m/%d',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_value.strip(), fmt).date()
            except ValueError:
                continue
        
        return None
    
    def _is_valid_time(self, time_str: str) -> bool:
        """Validate time format (HH:MM or HH:MM:SS)"""
        if not isinstance(time_str, str):
            return False
        
        patterns = [
            r'^\d{1,2}:\d{2}$',          # HH:MM
            r'^\d{1,2}:\d{2}:\d{2}$',    # HH:MM:SS
        ]
        
        return any(re.match(pattern, time_str.strip()) for pattern in patterns)


def validate_transaction(transaction: Dict) -> Tuple[bool, List[str], List[str]]:
    """
    Convenience function to validate a single transaction
    
    Returns: (is_valid, errors, warnings)
    """
    validator = TransactionValidator()
    return validator.validate_transaction(transaction)


def validate_batch(transactions: List[Dict]) -> Dict:
    """
    Convenience function to validate a batch of transactions
    
    Returns: {
        'valid_count': int,
        'invalid_count': int,
        'transactions_with_errors': [(transaction, errors, warnings)]
    }
    """
    validator = TransactionValidator()
    return validator.validate_batch(transactions)
