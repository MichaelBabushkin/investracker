-- Script to migrate from Ta125Stock to IsraeliStocks table
-- This will include both TA-125 and SME-60 stocks

-- Drop existing table if it exists
DROP TABLE IF EXISTS "IsraeliStocks";

-- Create the new IsraeliStocks table
CREATE TABLE "IsraeliStocks" (
    id SERIAL PRIMARY KEY,
    security_no VARCHAR(20) NOT NULL UNIQUE,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    index_name VARCHAR(20) NOT NULL, -- 'TA-125' or 'SME-60'
    weight_percent DECIMAL(8,5), -- Weight percentage in the index
    market_cap_millions DECIMAL(15,2), -- Market cap in millions
    isin VARCHAR(12), -- International Securities Identification Number
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_israeli_stocks_security_no ON "IsraeliStocks"(security_no);
CREATE INDEX idx_israeli_stocks_symbol ON "IsraeliStocks"(symbol);
CREATE INDEX idx_israeli_stocks_index_name ON "IsraeliStocks"(index_name);
CREATE INDEX idx_israeli_stocks_name ON "IsraeliStocks"(name);

-- Copy existing TA-125 data from Ta125Stock table (if it exists)
INSERT INTO "IsraeliStocks" (security_no, symbol, name, index_name)
SELECT security_no, symbol, name, 'TA-125'
FROM "Ta125Stock"
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Ta125Stock')
ON CONFLICT (security_no) DO NOTHING;

-- Insert SME-60 stocks data
-- Based on the SME60.csv file provided
INSERT INTO "IsraeliStocks" (security_no, symbol, name, index_name, weight_percent, market_cap_millions, isin) VALUES
('1083955', 'QLTU', 'QUALITAU', 'SME-60', 4.71501, 1775, 'IL0010839558'),
('573014', 'LEVI', 'LEVINSTEIN ENG', 'SME-60', 3.42159, 2340, 'IL0005730143'),
('1156926', 'GNRS', 'GENERATION CAP', 'SME-60', 3.32397, 1336, 'IL0011569261'),
('288019', 'SCOP', 'SCOPE', 'SME-60', 3.26374, 2112, 'IL0002880198'),
('1139195', 'MGRT', 'MGURIT', 'SME-60', 3.25670, 1272, 'IL0011391955'),
('1141464', 'MRIN', 'MORE INVEST', 'SME-60', 3.20857, 2568, 'IL0011414641'),
('1095819', 'PERI', 'PERION NETWORK', 'SME-60', 3.14737, 1690, 'IL0010958192'),
('1081074', 'ISTA', 'ISSTA', 'SME-60', 3.14230, 1931, 'IL0010810740'),
('1140573', 'MNRT', 'MENIVIM REIT', 'SME-60', 3.02007, 1701, 'IL0011405730'),
('265017', 'ORBI', 'ORBIT', 'SME-60', 2.93955, 1122, 'IL0002650179'),
('1082510', 'GILT', 'GILAT', 'SME-60', 2.89403, 1497, 'IL0010825102'),
('1175934', 'KSTN', 'KEYSTONE INFRA', 'SME-60', 2.85607, 1498, 'IL0011759342'),
('1094119', 'KMDA', 'KAMADA', 'SME-60', 2.75585, 1465, 'IL0010941198'),
('1131523', 'MDTR', 'MEDITR TOWER', 'SME-60', 2.70213, 1873, 'IL0011315236'),
('1198910', 'ARF', 'ASHDOD REFINERY', 'SME-60', 2.68654, 764, 'IL0011989105'),
('1082726', 'TATT', 'TAT TECHNO', 'SME-60', 2.40220, 1300, 'IL0010827264'),
('1082965', 'AUDC', 'AUDIOCODES', 'SME-60', 2.24715, 889, 'IL0010829658'),
('1096106', 'ATRY', 'ATREYU CAP', 'SME-60', 2.12989, 1354, 'IL0010961063'),
('1184936', 'ALTF', 'ALTSHULER FIN', 'SME-60', 2.03592, 1311, 'IL0011849366'),
('612010', 'ILDC', 'LAND DEV', 'SME-60', 2.02068, 1416, 'IL0006120104'),
('1091651', 'ARD', 'ARAD', 'SME-60', 1.80264, 1238, 'IL0010916513'),
('823013', 'HGG', 'HAGAG', 'SME-60', 1.78250, 1148, 'IL0008230133'),
('431015', 'IES', 'IES', 'SME-60', 1.77017, 1619, 'IL0004310152'),
('208017', 'NAWI', 'NAWI', 'SME-60', 1.74885, 2003, 'IL0002080179'),
('1178722', 'RMON', 'RIMON', 'SME-60', 1.69416, 2028, 'IL0011787228'),
('368019', 'ELWS', 'ELECTREON', 'SME-60', 1.55692, 700, 'IL0003680191'),
('136010', 'LAHAV', 'LAHAV', 'SME-60', 1.45187, 1479, 'IL0001360101'),
('810010', 'CDEV', 'COHEN DEV', 'SME-60', 1.44379, 1328, 'IL0008100104'),
('1170216', 'POLP', 'POLYRAM PLS', 'SME-60', 1.43740, 1148, 'IL0011702169'),
('539015', 'ROTS', 'ROTSHTEIN', 'SME-60', 1.43045, 1415, 'IL0005390153'),
('1118447', 'KARE', 'KARDAN REAL ES', 'SME-60', 1.41161, 1212, 'IL0011184475'),
('103010', 'TTAM', 'TIV TAAM', 'SME-60', 1.36508, 884, 'IL0001030100'),
('1158161', 'SHVA', 'AUTO BANK SERV', 'SME-60', 1.35247, 871, 'IL0011581613'),
('731018', 'MLTH', 'MALAM-TEAM HOLD', 'SME-60', 1.35247, 1086, 'IL0007310183'),
('723007', 'NSTR', 'NORSTAR', 'SME-60', 1.27468, 730, 'PAL0605071A3'),
('1173491', 'DIPL', 'DIPLOMAT HOLDI.', 'SME-60', 1.21906, 1310, 'IL0011734915'),
('1170893', 'MNIF', 'MENIF', 'SME-60', 1.19366, 1437, 'IL0011708935'),
('1104058', 'ZMH', 'ZMH', 'SME-60', 1.09552, 849, 'IL0011040586'),
('315010', 'FBRT', 'FMS', 'SME-60', 1.08714, 1287, 'IL0003150104'),
('1080613', 'ANLT', 'ANALYST', 'SME-60', 1.08035, 1346, 'IL0010806136'),
('1140151', 'NVLG', 'NOVOLOG', 'SME-60', 1.05743, 718, 'IL0011401515'),
('1178334', 'ECNR', 'ECONERGY', 'SME-60', 1.05169, 1911, 'IL0011783342'),
('209015', 'AYAL', 'AYALON  HOLD.', 'SME-60', 0.98509, 1455, 'IL0002090152'),
('473017', 'LUZN', 'LUZON GROUP', 'SME-60', 0.93404, 1250, 'IL0004730177'),
('1082635', 'ELLO', 'ELLOMAY', 'SME-60', 0.83912, 741, 'IL0010826357'),
('366013', 'ARIN', 'ARI RAEL ESTATE', 'SME-60', 0.81795, 936, 'IL0003660136'),
('1820083', 'ADGR', 'ADGAR INV.', 'SME-60', 0.78962, 917, 'IL0018200837'),
('280016', 'CAST', 'CASTRO', 'SME-60', 0.78589, 1220, 'IL0002800162'),
('578013', 'AFHL', 'AFCON HOLD', 'SME-60', 0.73795, 958, 'IL0005780130'),
('1184381', 'MPP', 'MORE PENSION', 'SME-60', 0.72997, 1471, 'IL0011843815'),
('1184985', 'HIPR', 'HIPER GLOBAL', 'SME-60', 0.61337, 849, 'IL0011849853'),
('1179142', 'TPGM', 'TOP GUM', 'SME-60', 0.60099, 934, 'IL0011791428'),
('507012', 'CMDR', 'COMPUTER DIRECT', 'SME-60', 0.58560, 1574, 'IL0005070128'),
('621011', 'KRUR', 'KERUR', 'SME-60', 0.54351, 1018, 'IL0006210111'),
('1123777', 'VCTR', 'VICTORY', 'SME-60', 0.53059, 710, 'IL0011237778'),
('1109966', 'VTNA', 'VITANIA', 'SME-60', 0.43738, 1175, 'IL0011099665'),
('1194695', 'ZPRS', 'ZEPHYRUS', 'SME-60', 0.43321, 811, 'IL0011946956'),
('1183813', 'ISI', 'IMAGESAT  I.S.I', 'SME-60', 0.34690, 766, 'IL0011838138'),
('1080753', 'ILX', 'ILEX MEDICAL', 'SME-60', 0.33213, 662, 'IL0010807530'),
('1212539', 'BLDI', 'BALADI', 'SME-60', 0.12749, 1501, 'IL0012125394')
ON CONFLICT (security_no) DO UPDATE SET
    index_name = 'TA-125, SME-60',  -- If stock exists in both indexes
    weight_percent = EXCLUDED.weight_percent,
    market_cap_millions = EXCLUDED.market_cap_millions,
    isin = EXCLUDED.isin;

-- Add comments
COMMENT ON TABLE "IsraeliStocks" IS 'Stores Israeli stocks from TA-125 and SME-60 indexes';
COMMENT ON COLUMN "IsraeliStocks".security_no IS 'Israeli stock security number (unique identifier)';
COMMENT ON COLUMN "IsraeliStocks".symbol IS 'Stock symbol (e.g., TEVA, HARL)';
COMMENT ON COLUMN "IsraeliStocks".name IS 'Full company name';
COMMENT ON COLUMN "IsraeliStocks".index_name IS 'Index membership: TA-125, SME-60, or both';
COMMENT ON COLUMN "IsraeliStocks".weight_percent IS 'Weight percentage in the index';
COMMENT ON COLUMN "IsraeliStocks".market_cap_millions IS 'Market capitalization in millions';
COMMENT ON COLUMN "IsraeliStocks".isin IS 'International Securities Identification Number';

-- Display table structure and sample data
SELECT 'IsraeliStocks Table Structure:' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'IsraeliStocks' 
ORDER BY ordinal_position;

-- Show sample data
SELECT 'Sample IsraeliStocks Data:' as info;
SELECT security_no, symbol, name, index_name, weight_percent 
FROM "IsraeliStocks" 
ORDER BY index_name, weight_percent DESC 
LIMIT 20;

-- Show index counts
SELECT 'Index Counts:' as info;
SELECT index_name, COUNT(*) as stock_count
FROM "IsraeliStocks"
GROUP BY index_name
ORDER BY index_name;
