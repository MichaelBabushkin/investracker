#!/usr/bin/env python3
"""
Test script for PDF processing functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.pdf_processor import PDFProcessor

def test_pdf_processor():
    """Test the PDF processor with a sample text"""
    
    # Sample text that might be found in a Fidelity report
    sample_text = """
    FIDELITY INVESTMENTS
    Portfolio Statement
    Account Summary
    Total Account Value: $125,430.50
    Cash & Cash Equivalents: $8,068.00
    
    Holdings
    AAPL  Apple Inc.                50.00    $182.52    $9,126.00
    GOOGL Alphabet Inc.             25.00   $2,785.48   $69,637.00
    MSFT  Microsoft Corporation     75.00    $415.26    $31,144.50
    TSLA  Tesla Inc.                30.00    $248.50     $7,455.00
    
    Recent Transactions
    01/15/2024  BUY   AAPL   10.00  $178.25
    01/14/2024  SELL  GOOGL   5.00 $2,790.00
    01/12/2024  BUY   MSFT   25.00  $412.80
    """
    
    processor = PDFProcessor()
    
    # Test broker detection
    broker = processor.detect_broker(sample_text)
    print(f"Detected broker: {broker}")
    
    # Test processing
    if broker == 'fidelity':
        result = processor._process_fidelity_report(sample_text)
    else:
        result = processor._process_generic_report(sample_text)
    
    print(f"Processing result: {result}")
    
    return result

if __name__ == "__main__":
    print("Testing PDF processor...")
    result = test_pdf_processor()
    print("\nTest completed!")
    print(f"Found {len(result.get('holdings', []))} holdings")
    print(f"Found {len(result.get('transactions', []))} transactions")
    print(f"Account summary: {result.get('account_summary', {})}")
