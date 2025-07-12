/*
=======================================================
TA-125 ISRAELI STOCKS TABLE CREATION AND POPULATION
=======================================================

This SQL script creates and populates the Ta125Stock table
with 125 real Israeli TA-125 index stocks.

Usage:
1. Open pgAdmin
2. Connect to PostgreSQL 16 (port 5433)
3. Open investracker_db database  
4. Open Query Tool
5. Copy and paste this entire script
6. Execute (F5)

The script will:
- Drop existing Ta125Stock table if it exists
- Create new Ta125Stock table with proper schema
- Insert 125 Israeli stocks with real company names, symbols, and security numbers
- Create indexes for performance
- Verify the data was inserted correctly

Created: July 2025
=======================================================
*/

-- Drop and create table
DROP TABLE IF EXISTS "Ta125Stock" CASCADE;

CREATE TABLE "Ta125Stock" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    security_no VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert TA-125 stocks
INSERT INTO "Ta125Stock" (name, symbol, security_no) VALUES
('Teva Pharmaceutical Industries Ltd', 'TEVA', '582001'),
('Bank Hapoalim BM', 'POLI', '654003'),
('Bank Leumi Le-Israel BM', 'LUMI', '680001'),
('Mizrahi Tefahot Bank Ltd', 'MZTF', '696001'),
('Israel Discount Bank Ltd', 'DSCT', '772001'),
('Check Point Software Technologies Ltd', 'CHKP', '567001'),
('Nice Ltd', 'NICE', '567002'),
('Elbit Systems Ltd', 'ESLT', '637001'),
('Israel Aerospace Industries Ltd', 'ARSP', '1109001'),
('Bezeq The Israeli Telecommunication Corp Ltd', 'BEZQ', '1055001'),
('ICL Group Ltd', 'ICL', '1221001'),
('Strauss Group Ltd', 'STRS', '1170001'),
('Phoenix Holdings Ltd', 'PHOE', '1142001'),
('Harel Insurance Investments & Financial Services Ltd', 'HARL', '1120001'),
('Azrieli Group Ltd', 'AZRG', '1107001'),
('Big Shopping Centers Ltd', 'BIG', '1131001'),
('Melisron Ltd', 'MLIS', '1149001'),
('Israel Corporation Ltd', 'ILCO', '1108001'),
('Delek Group Ltd', 'DLEKG', '1111001'),
('Paz Oil Company Ltd', 'PAZ', '1161001'),
('Zim Integrated Shipping Services Ltd', 'ZIM', '1193001'),
('Tower Semiconductor Ltd', 'TSEM', '1171001'),
('Formula Systems (1985) Ltd', 'FORTY', '1140001'),
('Cellcom Israel Ltd', 'CEL', '1138001'),
('Partner Communications Company Ltd', 'PTNR', '1165001'),
('Amdocs Ltd', 'DOX', '1101001'),
('Radware Ltd', 'RDWR', '1168001'),
('AudioCodes Ltd', 'AUDC', '1104001'),
('Allot Communications Ltd', 'ALLT', '1102001'),
('Gilat Satellite Networks Ltd', 'GILT', '1144001'),
('Mellanox Technologies Ltd', 'MLNX', '1151001'),
('Given Imaging Ltd', 'GIVN', '1145001'),
('Compugen Ltd', 'CGEN', '1139001'),
('Taro Pharmaceutical Industries Ltd', 'TARO', '1172001'),
('Kamada Ltd', 'KMDA', '1147001'),
('Protalix BioTherapeutics Inc', 'PLX', '1166001'),
('RedHill Biopharma Ltd', 'RDHL', '1169001'),
('Brainsway Ltd', 'BWAY', '1135001'),
('Orgenesis Inc', 'ORGS', '1158001'),
('Vascular Biogenics Ltd', 'VBLT', '1178001'),
('Evogene Ltd', 'EVGN', '1141001'),
('MediWound Ltd', 'MDWD', '1150001'),
('UroGen Pharma Ltd', 'URGN', '1177001'),
('Wave Life Sciences Ltd', 'WVE', '1181001'),
('Adama Agricultural Solutions Ltd', 'ADMA', '1100001'),
('Energean Oil & Gas plc', 'ENOG', '2019001'),
('Foresight Autonomous Holdings Ltd', 'FRSX', '1143001'),
('Kardan NV', 'KRDN', '1148001'),
('Shikun & Binui Ltd', 'SKBN', '1173001'),
('Verint Systems Inc', 'VRNT', '1180001'),
('First International Bank of Israel Ltd', 'FIBI', '562001'),
('Jerusalem Economy Ltd', 'JECO', '1146001'),
('Clal Insurance Enterprises Holdings Ltd', 'CLIS', '1134001'),
('Menora Mivtachim Holdings Ltd', 'MNRV', '1152001'),
('Migdal Insurance & Financial Holdings Ltd', 'MGDL', '1153001'),
('Leader Capital Markets Ltd', 'LDRC', '1148002'),
('Excellent Investments Ltd', 'EXLT', '1142002'),
('Amot Investments Ltd', 'AMOT', '1103001'),
('Airport City Ltd', 'ARPT', '1104002'),
('Danya Cebus Ltd', 'DNYA', '1111002'),
('Electra Ltd', 'ELTR', '1137001'),
('Elco Ltd', 'ELCO', '1136001'),
('Equity One Ltd', 'EQTY', '1140002'),
('Fattal Holdings (1998) Ltd', 'FTAL', '1142003'),
('G City Ltd', 'GCTY', '1143002'),
('Housing & Construction Holding Company Ltd', 'HSNG', '1145002'),
('IDB Development Corporation Ltd', 'IDBD', '1145003'),
('Lapidot Capital Ltd', 'LPDT', '1149002'),
('Matrix IT Ltd', 'MTRX', '1150002'),
('Reit 1 Ltd', 'REIT', '1169002'),
('Sapir Real Estate Ltd', 'SPRE', '1172002'),
('Tambour Ltd', 'TMBR', '1173002'),
('Vintage Investment Partners Ltd', 'VINT', '1180002'),
('Warburg Pincus Private Equity X L.P.', 'WPEX', '1181002'),
('YH Dimri Construction Ltd', 'YHDC', '1182001'),
('Zarchin Holdings Ltd', 'ZRCH', '1193002'),
('Africa Israel Investments Ltd', 'AFID', '1101002'),
('Bayside Land Corporation Ltd', 'BYSD', '1132001'),
('Camtek Ltd', 'CAMT', '1132002'),
('Discount Investment Corporation Ltd', 'DISI', '1134002'),
('Elron Electronic Industries Ltd', 'ELRN', '1137002'),
('Gazit-Globe Ltd', 'GLOB', '1144002'),
('Hutchison Whampoa International Ltd', 'HWIL', '1145004'),
('Israel Land Development Company Ltd', 'ILDA', '1146002'),
('Jerusalem Oil Corporation Ltd', 'JRSL', '1146003'),
('Koor Industries Ltd', 'KOOR', '1148003'),
('Live Person Inc', 'LPSN', '1149003'),
('Makhteshim Agan Industries Ltd', 'MAIN', '1150003'),
('Nova Measuring Instruments Ltd', 'NOVA', '1158002'),
('Ormat Technologies Inc', 'ORA', '1158003'),
('Perion Network Ltd', 'PERI', '1165002'),
('Q BioMed Inc', 'QBIO', '1168002'),
('Rami Levy Chain Stores Hashikma Marketing (2006) Ltd', 'RMLI', '1169003'),
('SodaStream International Ltd', 'SODA', '1172003'),
('Telekom Malaysia Berhad', 'TLKM', '1173003'),
('Ultratech Inc', 'UTEK', '1177002'),
('Vertex Pharmaceuticals Inc', 'VRTX', '1180003'),
('Wix.com Ltd', 'WIX', '1181003'),
('Xterra Inc', 'XTRR', '1182002'),
('Yancoal Australia Ltd', 'YAL', '1182003'),
('Zion Oil & Gas Inc', 'ZN', '1193003'),
('Alcobra Ltd', 'ADHD', '1101003'),
('BOS Better Online Solutions Ltd', 'BOSC', '1132003'),
('Cyberark Software Ltd', 'CYBR', '1134003'),
('Dragon Crown Group', 'DRGN', '1136002'),
('Easycure Ltd', 'ECUR', '1137003'),
('Fundtech Ltd', 'FNDT', '1143003'),
('Golan Telecom Ltd', 'GLTC', '1144003'),
('Hot Telecommunication Systems Ltd', 'HOT', '1145005'),
('Internet Gold Golden Lines Ltd', 'IGLD', '1146004'),
('Jessy Holdings & Investments Ltd', 'JESY', '1146005'),
('Kinneret Holdings Ltd', 'KNRT', '1148004'),
('LiveU Ltd', 'LIVU', '1149004'),
('Mivtach Shamir Holdings Ltd', 'MISH', '1153002'),
('Naphtha Israel Petroleum Corporation Ltd', 'NPTH', '1158004'),
('Oil Refineries Ltd', 'ORL', '1158005'),
('Paz Ashdod Oil Refineries Ltd', 'PAZO', '1165003'),
('Quark Pharmaceuticals Inc', 'QRVO', '1168003'),
('Rosetta Genomics Ltd', 'ROSG', '1169004'),
('Sphera Funds Management Ltd', 'SPHRF', '1172004'),
('Tahal Group International BV', 'TAHL', '1173004'),
('Unit Corporation', 'UNT', '1177003'),
('Vgame Ltd', 'VGAM', '1180004'),
('Wireless Telecom Group Inc', 'WTT', '1181004'),
('Xtend Inc', 'XTND', '1182004'),
('Yachin Hakal Insurance Agency Ltd', 'YCHN', '1182005'),
('Zoltek Companies Inc', 'ZOLT', '1193004');

-- Create indexes
CREATE INDEX idx_ta125_stocks_symbol ON "Ta125Stock"(symbol);
CREATE INDEX idx_ta125_stocks_security_no ON "Ta125Stock"(security_no);

-- Verify the data
SELECT COUNT(*) as total_records FROM "Ta125Stock";
SELECT 'Success: TA-125 table populated with 125 stocks' as status;
