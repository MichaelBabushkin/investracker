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
('DISCOUNT', 'DSCT', '691212'),
('POALIM', 'POLI', '662577'),
('MIZRAHI TEFAHOT', 'MZTF', '695437'),
('LEUMI', 'LUMI', '604611'),
('TEVA', 'TEVA', '629014'),
('NOVA', 'NVMI', '1084557'),
('ELBIT SYSTEMS', 'ESLT', '1081124'),
('NICE', 'NICE', '273011'),
('PHOENIX', 'PHOE', '767012'),
('ICL', 'ICL', '281014'),
('ORMAT TECHNO', 'ORA', '1134402'),
('TOWER', 'TSEM', '1082379'),
('BEZEQ', 'BEZQ', '230011'),
('FIBI BANK', 'FIBI', '593038'),
('AZRIELI GROUP', 'AZRG', '1119478'),
('CLAL INSURANCE', 'CLIS', '224014'),
('HAREL', 'HARL', '585018'),
('BIG', 'BIG', '1097260'),
('ENLIGHT ENERGY', 'ENLT', '720011'),
('MELISRON', 'MLSR', '323014'),
('NAVITAS PTRO PU', 'NVPT', '1141969'),
('NEWMED ENERG PU', 'NWMD', '475020'),
('CAMTEK', 'CAMT', '1095264'),
('SHUFERSAL', 'SAE', '777037'),
('NEXT VISION', 'NXSN', '1176593'),
('MIVNE', 'MVNE', '226019'),
('DELEK GROUP', 'DLEKG', '1084128'),
('ENERGEAN', 'ENOG', '1155290'),
('MENORA MIV HLD', 'MMHD', '566018'),
('ALONY HETZ', 'ALHE', '390013'),
('SHIKUN & BINUI', 'SKBN', '1081942'),
('AMOT', 'AMOT', '1097278'),
('OPC ENERGY', 'OPCE', '1141571'),
('STRAUSS GROUP', 'STRS', '746016'),
('MIGDAL INSUR.', 'MGDL', '1081165'),
('PAZ ENERGY', 'PAZ', '1100007'),
('ISRAEL CORP', 'ILCO', '576017'),
('FIBI HOLDINGS', 'FIBIH', '763011'),
('ELECTRA', 'ELTR', '739037'),
('SHAPIR      ENG', 'SPEN', '1133875'),
('FATTAL HOLD', 'FTAL', '1143429'),
('HILAN', 'HLAN', '1084698'),
('TASE', 'TASE', '1159029'),
('AURA', 'AURA', '373019'),
('ISRAMCO     PU', 'ISRA', '232017'),
('ISRACARD', 'ISCD', '1157403'),
('ASHTROM GROUP', 'ASHG', '1132315'),
('DIMRI', 'DIMRI', '1090315'),
('AIRPORT CITY', 'ARPT', '1095835'),
('REIT 1', 'RIT1', '1098920'),
('BET SHEMESH', 'BSEN', '1081561'),
('ENERGIX', 'ENRG', '1123355'),
('MATRIX', 'MTRX', '445015'),
('FORMULA', 'FORTY', '256016'),
('RATIO      PU', 'RATI', '394015'),
('ONE TECHNOLOGI', 'ONE', '161018'),
('EL AL', 'ELAL', '1087824'),
('PARTNER', 'PTNR', '1083484'),
('MEGA OR', 'MGOR', '1104488'),
('CELLCOM', 'CEL', '1101534'),
('SAPIENS', 'SPNS', '1087659'),
('KENON', 'KEN', '1134139'),
('EQUITAL', 'EQTL', '755017'),
('FOX', 'FOX', '1087022'),
('SELLA REAL EST', 'SLARL', '1109644'),
('ISRAEL CANADA', 'ISCN', '434019'),
('RAMI LEVI', 'RMLI', '1104249'),
('MEITAV INVEST', 'MTAV', '1081843'),
('INROM CONST', 'INRM', '1132356'),
('DANEL', 'DANE', '314013'),
('NOFAR ENERGY', 'NOFR', '1170877'),
('BLUE SQ REAL ES', 'BLSR', '1098565'),
('NAYAX', 'NYAX', '1175116'),
('BAZAN', 'ORL', '2590248'),
('SUMMIT', 'SMT', '1081686'),
('DELTA GALIL', 'DELG', '627034'),
('ELCO', 'ELCO', '694034'),
('AFRICA RESIDENC', 'AFRE', '1097948'),
('AZORIM', 'AZRM', '715011'),
('ELECTRA CO  PR', 'ECP', '5010129'),
('PRIORTECH', 'PRTC', '328013'),
('ELECTRA REAL E.', 'ELCRE', '1094044'),
('IDI INSUR', 'IDIN', '1129501'),
('ACRO KVUT', 'ACRO', '1184902'),
('ARGO PROP.', 'ARGO', '1175371'),
('DORAL ENERGY', 'DORL', '1166768'),
('YOCHANANOF', 'YHNF', '1161264'),
('TURPAZ', 'TRPZ', '1175611'),
('MIVTACH SHAMIR', 'MISH', '127019'),
('G CITY', 'GCT', '126011'),
('ARYT', 'ARYT', '587014'),
('DELEK AUTOMOTIV', 'DLEA', '829010'),
('MAGIC', 'MGIC', '1082312'),
('ISRAS HOLDINGS', 'ISHO', '1202977'),
('GAV YAM', 'GVYM', '759019'),
('TAMAR PET', 'TMRP', '1141357'),
('ISRAS', 'ISRS', '613034'),
('LAPIDOTH   CAP.', 'LAPD', '642017'),
('RETAILORS', 'RTLS', '1175488'),
('OPKO HEALTH', 'OPK', '1129543'),
('PRASHKOVSKY', 'PRSK', '1102128'),
('MAX STOCK', 'MAXO', '1168558'),
('NETO MALINDA', 'NTML', '1105097'),
('CARASSO MOTORS', 'CRSM', '1123850'),
('PALRAM', 'PLRM', '644013'),
('DANYA CEBUS', 'DNYA', '1173137'),
('ISROTEL', 'ISRO', '1080985'),
('DIRECT FINANCE', 'DIFI', '1168186'),
('VERIDIS', 'VRDS', '1176387'),
('MESHEK ENERGY', 'MSKE', '1166974'),
('TADIRAN GROUP', 'TDRN', '258012'),
('PROPERT & BUIL', 'PTBL', '699017'),
('ISRAEL SHIPYARD', 'ISHI', '1168533'),
('VILLAR', 'VILR', '416016'),
('CARASSO REAL ES', 'CRSR', '1187962'),
('DUNIEC', 'DUNI', '400010'),
('ACKERSTEIN GRP.', 'ACKR', '1176205'),
('SHIKN&BINUI ENE', 'SBEN', '1188242'),
('TELSYS', 'TLSY', '354019'),
('IBI INV HOUSE', 'IBI', '175018'),
('PLASSON INDUS', 'PLSN', '1081603'),
('DELTA BRANDS', 'DLTI', '1173699'),
('B COMMUNICATION', 'BCOM', '1107663'),
('AMRM', 'AMRM', '1188200'),
('MALAM TEAM', 'MLTM', '156018');

-- Create indexes
CREATE INDEX idx_ta125_stocks_symbol ON "Ta125Stock"(symbol);
CREATE INDEX idx_ta125_stocks_security_no ON "Ta125Stock"(security_no);

-- Verify the data
SELECT COUNT(*) as total_records FROM "Ta125Stock";
SELECT 'Success: TA-125 table populated with 125 stocks' as status;
