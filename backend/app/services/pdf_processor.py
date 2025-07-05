import PyPDF2
import pdfplumber
import re
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    """
    PDF processor for extracting investment data from brokerage reports
    """
    
    def __init__(self):
        self.supported_brokers = {
            'fidelity': self._process_fidelity_report,
            'generic': self._process_generic_report
        }
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF using pdfplumber for better accuracy"""
        try:
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            # Fallback to PyPDF2
            return self._extract_text_pypdf2(pdf_path)
    
    def _extract_text_pypdf2(self, pdf_path: str) -> str:
        """Fallback text extraction using PyPDF2"""
        try:
            text = ""
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error with PyPDF2 extraction: {str(e)}")
            return ""
    
    def detect_broker(self, text: str) -> str:
        """Detect the broker from PDF text"""
        text_lower = text.lower()
        
        # Check for Fidelity indicators
        if any(keyword in text_lower for keyword in ['fidelity', 'fmr', 'ibmcognos']):
            return 'fidelity'
        
        # Add more broker detection logic here
        return 'generic'
    
    def process_pdf(self, pdf_path: str) -> Dict:
        """Main method to process PDF and extract investment data"""
        try:
            # Extract text from PDF
            text = self.extract_text_from_pdf(pdf_path)
            
            if not text.strip():
                raise ValueError("No text could be extracted from the PDF")
            
            # Detect broker
            broker = self.detect_broker(text)
            
            # Process based on broker
            processor = self.supported_brokers.get(broker, self._process_generic_report)
            return processor(text)
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise
    
    def _process_fidelity_report(self, text: str) -> Dict:
        """Process Fidelity investment reports"""
        data = {
            'broker': 'fidelity',
            'report_type': 'portfolio_statement',
            'holdings': [],
            'transactions': [],
            'account_summary': {},
            'raw_text': text
        }
        
        try:
            # Extract account summary
            data['account_summary'] = self._extract_fidelity_account_summary(text)
            
            # Extract holdings
            data['holdings'] = self._extract_fidelity_holdings(text)
            
            # Extract transactions
            data['transactions'] = self._extract_fidelity_transactions(text)
            
            # Extract date range
            data['report_date'] = self._extract_report_date(text)
            
        except Exception as e:
            logger.error(f"Error processing Fidelity report: {str(e)}")
        
        return data
    
    def _extract_fidelity_account_summary(self, text: str) -> Dict:
        """Extract account summary from Fidelity report"""
        summary = {}
        
        # Look for total account value patterns
        value_patterns = [
            r'Total Account Value[:\s]+\$?([\d,]+\.?\d*)',
            r'Account Total[:\s]+\$?([\d,]+\.?\d*)',
            r'Total Value[:\s]+\$?([\d,]+\.?\d*)'
        ]
        
        for pattern in value_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                summary['total_value'] = float(match.group(1).replace(',', ''))
                break
        
        # Look for cash balance
        cash_patterns = [
            r'Cash & Cash Equivalents[:\s]+\$?([\d,]+\.?\d*)',
            r'Cash Balance[:\s]+\$?([\d,]+\.?\d*)',
            r'Available Cash[:\s]+\$?([\d,]+\.?\d*)'
        ]
        
        for pattern in cash_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                summary['cash_balance'] = float(match.group(1).replace(',', ''))
                break
        
        return summary
    
    def _extract_fidelity_holdings(self, text: str) -> List[Dict]:
        """Extract holdings from Fidelity report"""
        holdings = []
        
        # Look for holdings table patterns
        # This is a simplified version - you'd need to refine based on actual report format
        lines = text.split('\n')
        
        in_holdings_section = False
        for line in lines:
            line = line.strip()
            
            # Detect start of holdings section
            if re.search(r'(holdings|positions|investments)', line, re.IGNORECASE):
                in_holdings_section = True
                continue
            
            # Skip empty lines
            if not line or len(line) < 10:
                continue
            
            # If we're in holdings section, try to parse holdings
            if in_holdings_section:
                holding = self._parse_holding_line(line)
                if holding:
                    holdings.append(holding)
        
        return holdings
    
    def _parse_holding_line(self, line: str) -> Optional[Dict]:
        """Parse a single holding line"""
        # Pattern for stock holdings: Symbol Name Shares Price Value
        # This is a simplified regex - you'd need to refine based on actual format
        pattern = r'([A-Z]{1,5})\s+(.+?)\s+([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)'
        
        match = re.search(pattern, line)
        if match:
            return {
                'symbol': match.group(1),
                'name': match.group(2).strip(),
                'shares': float(match.group(3).replace(',', '')),
                'price': float(match.group(4).replace(',', '')),
                'value': float(match.group(5).replace(',', ''))
            }
        
        return None
    
    def _extract_fidelity_transactions(self, text: str) -> List[Dict]:
        """Extract transactions from Fidelity report"""
        transactions = []
        
        # Look for transaction patterns
        # This would need to be refined based on actual report format
        transaction_patterns = [
            r'(\d{1,2}/\d{1,2}/\d{4})\s+(BUY|SELL|DIVIDEND)\s+([A-Z]{1,5})\s+([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)',
        ]
        
        for pattern in transaction_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                transactions.append({
                    'date': match.group(1),
                    'type': match.group(2).lower(),
                    'symbol': match.group(3),
                    'quantity': float(match.group(4).replace(',', '')),
                    'price': float(match.group(5).replace(',', ''))
                })
        
        return transactions
    
    def _extract_report_date(self, text: str) -> Optional[str]:
        """Extract report date"""
        date_patterns = [
            r'Report Date[:\s]+(\d{1,2}/\d{1,2}/\d{4})',
            r'Statement Date[:\s]+(\d{1,2}/\d{1,2}/\d{4})',
            r'As of[:\s]+(\d{1,2}/\d{1,2}/\d{4})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _process_generic_report(self, text: str) -> Dict:
        """Process generic investment reports"""
        data = {
            'broker': 'generic',
            'report_type': 'unknown',
            'holdings': [],
            'transactions': [],
            'account_summary': {},
            'raw_text': text
        }
        
        # Basic extraction for unknown formats
        # Look for common patterns
        
        # Try to find dollar amounts
        dollar_amounts = re.findall(r'\$?([\d,]+\.?\d*)', text)
        if dollar_amounts:
            data['account_summary']['found_amounts'] = [float(amt.replace(',', '')) for amt in dollar_amounts[:10]]
        
        # Try to find stock symbols
        stock_symbols = re.findall(r'\b[A-Z]{1,5}\b', text)
        if stock_symbols:
            data['found_symbols'] = list(set(stock_symbols[:20]))  # Unique symbols, max 20
        
        return data
