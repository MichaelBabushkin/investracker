-- Drop existing tables if they exist
DROP TABLE IF EXISTS "IsraeliStockTransaction";
DROP TABLE IF EXISTS "IsraeliStockHolding";
DROP TABLE IF EXISTS "IsraeliDividend";

-- Script to recreate Israeli stock tables with correct user_id type
-- This script creates separate tables for holdings and transactions

-- Create the Holdings table (for current positions)
CREATE TABLE "IsraeliStockHolding" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    security_no VARCHAR(20) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    last_price DECIMAL(15,4),
    purchase_cost DECIMAL(15,4),  -- Total amount paid for purchase
    current_value DECIMAL(15,4),  -- Current position worth (market value)
    portfolio_percentage DECIMAL(5,2),  -- Percentage of whole portfolio
    currency VARCHAR(3) DEFAULT 'ILS',
    holding_date DATE,  -- Date from PDF header (e.g., 31/01/2025)
    source_pdf VARCHAR(255) NOT NULL,  -- Original PDF filename for duplicate prevention
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicates per user/security/pdf combination
    UNIQUE(user_id, security_no, source_pdf)
);

-- Create the Transactions table (for buy/sell activities)
CREATE TABLE "IsraeliStockTransaction" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    security_no VARCHAR(20) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- BUY, SELL, DIVIDEND, FEE, etc.
    transaction_date DATE,
    transaction_time TIME,
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,4),
    total_value DECIMAL(15,4),
    commission DECIMAL(15,4),
    tax DECIMAL(15,4),
    currency VARCHAR(3) DEFAULT 'ILS',
    source_pdf VARCHAR(255) NOT NULL,  -- Original PDF filename for duplicate prevention
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicates per user/security/transaction/pdf combination
    UNIQUE(user_id, security_no, transaction_date, transaction_type, source_pdf)
);

-- Create the Dividends table (for dividend payments)
CREATE TABLE "IsraeliDividend" (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    security_no VARCHAR(20) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    payment_date DATE,
    amount DECIMAL(15,4) NOT NULL,  -- Dividend amount paid
    tax DECIMAL(15,4),  -- Tax withheld
    currency VARCHAR(3) DEFAULT 'ILS',
    source_pdf VARCHAR(255) NOT NULL,  -- Original PDF filename for reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicates per user/security/date/pdf combination
    UNIQUE(user_id, security_no, payment_date, source_pdf)
);

-- Create indexes for Holdings table
CREATE INDEX idx_israeli_stock_holding_security_no 
ON "IsraeliStockHolding"(security_no);

CREATE INDEX idx_israeli_stock_holding_user_id 
ON "IsraeliStockHolding"(user_id);

CREATE INDEX idx_israeli_stock_holding_symbol 
ON "IsraeliStockHolding"(symbol);

CREATE INDEX idx_israeli_stock_holding_date 
ON "IsraeliStockHolding"(holding_date);

-- Create indexes for Transactions table
CREATE INDEX idx_israeli_stock_transaction_security_no 
ON "IsraeliStockTransaction"(security_no);

CREATE INDEX idx_israeli_stock_transaction_user_id 
ON "IsraeliStockTransaction"(user_id);

CREATE INDEX idx_israeli_stock_transaction_symbol 
ON "IsraeliStockTransaction"(symbol);

CREATE INDEX idx_israeli_stock_transaction_date 
ON "IsraeliStockTransaction"(transaction_date);

CREATE INDEX idx_israeli_stock_transaction_type 
ON "IsraeliStockTransaction"(transaction_type);

-- Create indexes for Dividends table
CREATE INDEX idx_israeli_dividend_security_no 
ON "IsraeliDividend"(security_no);

CREATE INDEX idx_israeli_dividend_user_id 
ON "IsraeliDividend"(user_id);

CREATE INDEX idx_israeli_dividend_symbol 
ON "IsraeliDividend"(symbol);

CREATE INDEX idx_israeli_dividend_date 
ON "IsraeliDividend"(payment_date);

-- Create trigger function to automatically insert dividend records
CREATE OR REPLACE FUNCTION create_dividend_record()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create dividend record if transaction type is DIVIDEND
    IF NEW.transaction_type = 'DIVIDEND' THEN
        INSERT INTO "IsraeliDividend" (
            user_id, security_no, symbol, company_name, 
            payment_date, amount, tax, currency, source_pdf
        ) VALUES (
            NEW.user_id,
            NEW.security_no,
            NEW.symbol,
            NEW.company_name,
            NEW.transaction_date,
            NEW.total_value,  -- Use total_value as the dividend amount
            NEW.tax,
            NEW.currency,
            NEW.source_pdf
        )
        ON CONFLICT (user_id, security_no, payment_date, source_pdf) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate dividend table
CREATE TRIGGER trigger_create_dividend
    AFTER INSERT ON "IsraeliStockTransaction"
    FOR EACH ROW
    EXECUTE FUNCTION create_dividend_record();

-- Add comments for documentation
COMMENT ON TABLE "IsraeliStockHolding" IS 'Stores current Israeli TA-125 stock holdings from PDF reports';
COMMENT ON COLUMN "IsraeliStockHolding".user_id IS 'User ID (supports both integer and UUID string formats)';
COMMENT ON COLUMN "IsraeliStockHolding".security_no IS 'Israeli stock security number';
COMMENT ON COLUMN "IsraeliStockHolding".symbol IS 'Stock symbol (e.g., TEVA, HARL)';
COMMENT ON COLUMN "IsraeliStockHolding".company_name IS 'Full company name';
COMMENT ON COLUMN "IsraeliStockHolding".quantity IS 'Number of shares/units held';
COMMENT ON COLUMN "IsraeliStockHolding".last_price IS 'Last/current price per share';
COMMENT ON COLUMN "IsraeliStockHolding".purchase_cost IS 'Total amount paid for purchase (cost basis)';
COMMENT ON COLUMN "IsraeliStockHolding".current_value IS 'Current market value of the position';
COMMENT ON COLUMN "IsraeliStockHolding".portfolio_percentage IS 'Percentage of total portfolio value';
COMMENT ON COLUMN "IsraeliStockHolding".currency IS 'Currency code (ILS, USD, etc.)';
COMMENT ON COLUMN "IsraeliStockHolding".holding_date IS 'Date from PDF header (e.g., 31/01/2025)';
COMMENT ON COLUMN "IsraeliStockHolding".source_pdf IS 'Original PDF filename for duplicate prevention';

COMMENT ON TABLE "IsraeliStockTransaction" IS 'Stores Israeli TA-125 stock transactions extracted from PDF reports';
COMMENT ON COLUMN "IsraeliStockTransaction".user_id IS 'User ID (supports both integer and UUID string formats)';
COMMENT ON COLUMN "IsraeliStockTransaction".security_no IS 'Israeli stock security number';
COMMENT ON COLUMN "IsraeliStockTransaction".symbol IS 'Stock symbol (e.g., TEVA, HARL)';
COMMENT ON COLUMN "IsraeliStockTransaction".company_name IS 'Full company name';
COMMENT ON COLUMN "IsraeliStockTransaction".transaction_type IS 'BUY, SELL, DIVIDEND, FEE, etc.';
COMMENT ON COLUMN "IsraeliStockTransaction".transaction_date IS 'Date of the transaction';
COMMENT ON COLUMN "IsraeliStockTransaction".transaction_time IS 'Time of the transaction (HH:MM)';
COMMENT ON COLUMN "IsraeliStockTransaction".quantity IS 'Number of shares/units transacted';
COMMENT ON COLUMN "IsraeliStockTransaction".price IS 'Price per share/unit';
COMMENT ON COLUMN "IsraeliStockTransaction".total_value IS 'Total transaction value';
COMMENT ON COLUMN "IsraeliStockTransaction".commission IS 'Commission/fee paid for transaction';
COMMENT ON COLUMN "IsraeliStockTransaction".tax IS 'Tax paid on transaction';
COMMENT ON COLUMN "IsraeliStockTransaction".currency IS 'Currency code (ILS, USD, etc.)';
COMMENT ON COLUMN "IsraeliStockTransaction".source_pdf IS 'Original PDF filename for duplicate prevention';

COMMENT ON TABLE "IsraeliDividend" IS 'Stores Israeli TA-125 stock dividend payments automatically created from transactions';
COMMENT ON COLUMN "IsraeliDividend".user_id IS 'User ID (supports both integer and UUID string formats)';
COMMENT ON COLUMN "IsraeliDividend".security_no IS 'Israeli stock security number';
COMMENT ON COLUMN "IsraeliDividend".symbol IS 'Stock symbol (e.g., TEVA, HARL)';
COMMENT ON COLUMN "IsraeliDividend".company_name IS 'Full company name';
COMMENT ON COLUMN "IsraeliDividend".payment_date IS 'Date when dividend was paid';
COMMENT ON COLUMN "IsraeliDividend".amount IS 'Dividend amount paid (before tax)';
COMMENT ON COLUMN "IsraeliDividend".tax IS 'Tax withheld from dividend payment';
COMMENT ON COLUMN "IsraeliDividend".currency IS 'Currency code (ILS, USD, etc.)';
COMMENT ON COLUMN "IsraeliDividend".source_pdf IS 'Original PDF filename for reference';

-- Display Holdings table structure
SELECT 'Holdings Table Structure:' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'IsraeliStockHolding' 
ORDER BY ordinal_position;

-- Display Transactions table structure
SELECT 'Transactions Table Structure:' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'IsraeliStockTransaction' 
ORDER BY ordinal_position;

-- Display Dividends table structure
SELECT 'Dividends Table Structure:' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'IsraeliDividend' 
ORDER BY ordinal_position;
