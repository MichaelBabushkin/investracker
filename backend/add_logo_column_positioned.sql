-- Add logo_svg column to IsraeliStocks table with proper positioning
-- This script recreates the table to put logo_svg column before created_at/updated_at

DO $$
DECLARE 
    table_exists boolean;
    column_exists boolean;
    has_data boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'IsraeliStocks'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION 'Table IsraeliStocks does not exist';
    END IF;
    
    -- Check if column already exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'IsraeliStocks' 
        AND column_name = 'logo_svg'
    ) INTO column_exists;
    
    -- Check if table has data
    SELECT EXISTS (SELECT 1 FROM "IsraeliStocks" LIMIT 1) INTO has_data;
    
    IF column_exists THEN
        RAISE NOTICE 'Column logo_svg already exists in IsraeliStocks table';
    ELSE
        RAISE NOTICE 'Adding logo_svg column to IsraeliStocks table with proper positioning...';
        
        -- Create new table with desired column order
        CREATE TABLE "IsraeliStocks_new" (
            id SERIAL PRIMARY KEY,
            security_no VARCHAR(20) UNIQUE NOT NULL,
            symbol VARCHAR(10) NOT NULL,
            name VARCHAR(100) NOT NULL,
            index_name VARCHAR(20) NOT NULL DEFAULT 'TA-125',
            is_active BOOLEAN DEFAULT true,
            logo_svg TEXT,  -- New column positioned before dates
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Copy existing data if any
        IF has_data THEN
            INSERT INTO "IsraeliStocks_new" (
                id, security_no, symbol, name, index_name, is_active, created_at, updated_at
            )
            SELECT 
                id, security_no, symbol, name, 
                COALESCE(index_name, 'TA-125'), 
                COALESCE(is_active, true), 
                COALESCE(created_at, CURRENT_TIMESTAMP), 
                COALESCE(updated_at, CURRENT_TIMESTAMP)
            FROM "IsraeliStocks"
            ORDER BY id;
            
            -- Update the sequence to continue from the max id
            PERFORM setval('"IsraeliStocks_new_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "IsraeliStocks_new"));
            
            RAISE NOTICE 'Copied % rows from original table', (SELECT COUNT(*) FROM "IsraeliStocks");
        END IF;
        
        -- Drop old table
        DROP TABLE "IsraeliStocks" CASCADE;
        
        -- Rename new table
        ALTER TABLE "IsraeliStocks_new" RENAME TO "IsraeliStocks";
        
        -- Recreate indexes for performance
        CREATE INDEX idx_israeli_stocks_security_no ON "IsraeliStocks"(security_no);
        CREATE INDEX idx_israeli_stocks_symbol ON "IsraeliStocks"(symbol);
        CREATE INDEX idx_israeli_stocks_index ON "IsraeliStocks"(index_name);
        
        -- Add column comment
        COMMENT ON COLUMN "IsraeliStocks".logo_svg IS 'SVG logo content fetched from TradingView';
        COMMENT ON TABLE "IsraeliStocks" IS 'Israeli stocks master table with TA-125 and SME-60 indexes';
        
        RAISE NOTICE 'Successfully recreated IsraeliStocks table with logo_svg column in correct position';
    END IF;
END
$$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    character_maximum_length, 
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'IsraeliStocks' 
ORDER BY ordinal_position;

-- Show row count
SELECT COUNT(*) as total_stocks FROM "IsraeliStocks";
