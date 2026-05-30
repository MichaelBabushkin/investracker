# Investracker — Pre-Launch Correctness Audit

**Audited:** 2026-05-30  
**Reports covered:** Nov 2023 – Dec 2024 (14 monthly PDFs, Excellence broker, account #627410)  
**Method:** Full DB extraction + PDF cross-reference against raw Hebrew broker statements  

---

## Overall Verdict

> **Not ready for live use yet.** Three categories of bugs — stale holdings, missing transactions, and broken realized P/L — mean the portfolio value, P/L totals, and position list are all materially wrong. The issues are fixable but touch the core data model.

---

## Issue 1 — CRITICAL: World Holdings Are PDF Snapshots, Not Computed Positions

**Root cause:** `world_stock_holdings` stores one row per `(user, ticker, source_pdf)`, loaded from each monthly PDF's holdings section. When a stock is sold after the PDF snapshot, the old row is never removed or replaced. The result: the holdings table shows positions from older PDFs that no longer exist.

**Stale / wrong positions (as of Dec 31 2024):**

| Ticker | DB Qty | Correct Qty | Source PDF | Error |
|--------|--------|-------------|------------|-------|
| DV | 120 | 0 | September_24.pdf | Sold Oct 15 — never removed |
| ELF | 17 | 0 | October_24.pdf | Full position (29 shares) bought & sold |
| F | 200 | 0 | October_24.pdf | Sold Dec 3 |
| HITI | 400 | 0 | October_24.pdf | Sold Nov 26 |
| IBTA | 40 | 0 | September_24.pdf | All 70 shares (2 lots) sold |
| INTC | 120 | 100 | October_24.pdf | 120 sold Nov 11, 100 re-bought Dec 3 |
| LYB | 20 | 0 | October_24.pdf | Sold Dec 23 |
| MRK | 20 | 0 | October_24.pdf | Sold Dec 26 |
| TMDX | 30 | 0 | November_24.pdf | All 60 shares bought & sold (net 0) |
| VRTX | 4 | 0 | October_24.pdf | Sold Nov 11 |
| ADBE | 4 ✓ qty | cost $1,937 ❌ | October_24.pdf | Correct qty, wrong cost — shows Oct purchase ($1,937), but current 4 shares are from Dec 16 ($1,860.24 + $5) |

**Impact:** Portfolio shows ~$20,856 in phantom cost-basis and an inflated position count (33 holdings in DB vs ~23 correct holdings).

**Fix required:** Holdings must be computed dynamically from transactions (BUY − SELL aggregation), not imported from PDF snapshots. Alternatively, on each new PDF import, stale holdings rows must be deleted and replaced using the latest PDF's holdings section as authoritative truth.

---

## Issue 2 — CRITICAL: Missing Transactions (AMZN BUY + SELL)

**Verified against PDF (Oct and Nov 2024 statements):**

| Date | Type | Ticker | Qty | USD Amount | PDF Source |
|------|------|--------|-----|------------|------------|
| 2024-10-23 | BUY | AMZN | 11 | $2,043.80 + $5 commission | October_24.pdf |
| 2024-11-15 | SELL | AMZN | 11 | $2,232.78 − $5 commission | November_24.pdf |

Both transactions are **completely absent** from `world_stock_transactions`. The parser skipped AMZN — likely because the stock name is stored in Hebrew (AMZN ןוזאמא) with a non-standard security number (108092).

**Missing realized P/L:** $2,232.78 − $5 − $2,043.80 − $5 = **+$178.98**

---

## Issue 3 — CRITICAL: Israeli Holdings Has Stale KSM.F63

| Symbol | DB Qty | Correct Qty | Notes |
|--------|--------|-------------|-------|
| KSM.F63 | 10 | 0 | Bought Oct 27, sold Dec 1 — still in holdings |

The Israeli holdings system uses `source_pdf = 'Multiple PDFs'` and aggregates correctly for most stocks, but KSM.F63 was bought and sold within a single statement cycle and the sell did not trigger a holdings removal.

---

## Issue 4 — CRITICAL: Realized P/L Incomplete (9 NULL Entries in World, 2 NULL in Israeli)

### World Stocks — NULL realized_pl on SELL transactions

The system sets `realized_pl = NULL` when it cannot find the cost basis for a sell. This happens for the stocks that are also in the stale-holdings problem (chicken-and-egg: the wrong cost basis source causes both issues).

| Date | Ticker | Sell Proceeds (net) | Estimated P/L | Commission Notes |
|------|--------|---------------------|---------------|-----------------|
| 2024-10-15 | DV | $2,095.01 | **+$41.61** | Cost: 120 × $17.07 + $5 = $2,053.40 |
| 2024-10-16 | IBTA | $2,702.20 | **+$177.20** | Cost: 40 × $63.00 + $5 = $2,525.00 |
| 2024-11-11 | VRTX | $2,053.28 | **+$179.48** | Cost: 4 × $467.20 + $5 = $1,873.80 |
| 2024-11-12 | ELF | $2,146.79 | **+$346.25** | Cost: 17 × $105.62 + $5 = $1,800.54 |
| 2024-11-26 | HITI | $1,165.00 | **+$52.00** | Cost: 400 × $2.745 + $5 = $1,103.00 |
| 2024-12-03 | F | $2,166.00 | **+$69.00** | Cost: 200 × $10.41 + $5 = $2,087.00 |
| 2024-12-23 | LYB | $1,472.20 | **−$369.80** | Cost: 20 × $91.85 + $5 = $1,842.00 |
| 2024-12-26 | MRK | $1,984.40 | **−$219.60** | Cost: 20 × $109.95 + $5 = $2,204.00 |
| 2024-12-27 | TMDX | $1,815.70 | **−$931.00** | Cost (FIFO): Oct 10sh + Nov 20sh = $2,746.70 |

**Net missing world P/L: approx −$655** (sum of above)

**Total reported world P/L: $3,708.82**  
**Estimated true world P/L: ~$3,047 + AMZN $179 = ~$3,226**

### Israeli Stocks — realized_pl NULL for both SELLs

| Date | Ticker | Proceeds | Estimated P/L (ILS) |
|------|--------|----------|---------------------|
| 2024-10-20 | MTF.F100 | ₪16,981 net | **+₪1,416** (4 BUYs totalling ₪15,565 cost) |
| 2024-12-01 | KSM.F63 | ₪1,013 net | **−₪67** (cost ₪1,080) |

**Net missing Israeli P/L: +₪1,349**

---

## Issue 5 — HIGH: INTC Cost Basis Wrong in Realized P/L

INTC SELL on Nov 11 (120 shares) reports:
- `realized_pl = $335.44`, `cost_basis = $2,718.00`  
- **Correct cost from BUY transaction: $2,621.00** (120 × $21.80 + $5)
- **Correct P/L: $432.44** (understated by **$96.56**)

The cost_basis of $2,718 appears to be derived from the ILS holdings purchase cost (₪9,844 from October PDF) converted at a period exchange rate, rather than from the original USD transaction amount. This is a systematic issue where ILS↔USD conversion creates rounding/rate errors in realized P/L.

---

## Issue 6 — MEDIUM: World Holdings Cost Basis Uses ILS Conversion Instead of Original USD

For many positions, `purchase_cost` in `world_stock_holdings` reflects the ILS cost from the PDF holdings section, converted back to USD at whatever rate was available at import time. The correct approach is to sum the original USD `total_value` from `world_stock_transactions`.

Known affected: INTC (confirmed), likely others with long hold periods crossing multiple FX rate changes.

---

## Issue 7 — MEDIUM: Cash Flow — DEPOSIT quantity stores running balance, not deposit amount

In `israeli_stock_transactions`, DEPOSIT records have:
- `quantity` = **account running balance after the deposit**
- `total_value` = **actual deposit amount**

Example: Nov 24, 2024 deposit shows `quantity=25,892.10` but `total_value=5,500.00`. The 25,892.10 is the cumulative ILS cash balance after the deposit, not the deposited amount.

This is consistent with how the broker PDF reports deposits, so the system is faithfully capturing it. **However, any code that uses `quantity` for deposit math will produce wrong results.** The cash balance service should only use `total_value`.

---

## Issue 8 — MEDIUM: Tax Accounting Cross-Currency

Capital gains tax is withheld in ILS (account 9992983 / 9993983) and stored correctly as `CAPITAL_GAINS_TAX` type transactions. Total withheld 2023–2024: **₪4,588.37**.

Issue: These tax transactions originate from the world stocks account but are stored in `israeli_stock_transactions` (ILS account). The world stocks P/L dashboard does not reflect these taxes, understating the true cost of gains.

---

## Issue 9 — LOW: Exchange Rates Table Has No Historical Data

`exchange_rates` table only contains 2026 rates (6 rows). No 2023 or 2024 exchange rates are stored here. The actual rates used for conversions are embedded in `world_stock_transactions.exchange_rate` per-transaction, which is correct. But any feature that queries the `exchange_rates` table for historical USD/ILS conversion will silently fail or use wrong rates.

---

## Issue 10 — LOW: Minor MNDY Cost Basis Rounding

MNDY holding shows `purchase_cost = $2,538.65` but the Dec 17 BUY transaction was `$2,538.85`. Difference: $0.20. Negligible but indicates a rounding inconsistency.

---

## Complete Holdings: What's Correct (for reference)

### World Stocks — Correct as of Dec 31, 2024
Derived from `BUY qty − SELL qty` in `world_stock_transactions`:

| Ticker | Correct Qty | DB Has Correct Row? |
|--------|------------|---------------------|
| ADBE | 4 | ✅ qty, ❌ cost ($1,937 vs correct $1,865) |
| AMAT | 10 | ✅ |
| AMD | 30 | ✅ |
| ARGT | 8 | ✅ |
| ASML | 3 | ✅ |
| BBY | 20 | ✅ |
| CHKP | 12 | ✅ |
| CVX | 15 | ✅ |
| DELL | 15 | ✅ |
| IBM | 15 | ✅ |
| INTC | 100 | ❌ (DB shows 120) |
| MNDY | 10 | ✅ (minor $0.20 cost rounding) |
| MO | 50 | ✅ |
| MSFT | 8 | ✅ |
| NKE | 30 | ✅ |
| NLR | 25 | ✅ |
| OXY | 30 | ✅ |
| REALITY (O) | 40 | ✅ |
| STX | 20 | ✅ |
| UBER | 30 | ✅ |
| UPS | 21 | ✅ |
| URA | 70 | ✅ |
| VISA INC (V) | 9 | ✅ |
| VZ | 60 | ✅ |
| **PHANTOM: DV** | should be 0 | ❌ shows 120 |
| **PHANTOM: ELF** | should be 0 | ❌ shows 17 |
| **PHANTOM: F** | should be 0 | ❌ shows 200 |
| **PHANTOM: HITI** | should be 0 | ❌ shows 400 |
| **PHANTOM: IBTA** | should be 0 | ❌ shows 40 |
| **PHANTOM: LYB** | should be 0 | ❌ shows 20 |
| **PHANTOM: MRK** | should be 0 | ❌ shows 20 |
| **PHANTOM: TMDX** | should be 0 | ❌ shows 30 |
| **PHANTOM: VRTX** | should be 0 | ❌ shows 4 |

### Israeli Stocks — Correct as of Dec 31, 2024
Israeli holdings appear **correct** for 14 of 15 positions. Only KSM.F63 is stale (should be 0, shows 10).

| Symbol | DB Qty | Correct | Notes |
|--------|--------|---------|-------|
| AZRG | 11 | ✅ | |
| BEZQ | 1000 | ✅ | |
| DLEKG | 10 | ✅ | |
| DNYA | 30 | ✅ | |
| DSCT | 168 | ✅ | |
| FIBI | 24 | ✅ | |
| HARL | 23 | ✅ | |
| KSM.F63 | 10 | ❌ | Should be 0, sold Dec 1 |
| LUMI | 100 | ✅ | |
| MLSR | 11 | ✅ | |
| MZTF | 24 | ✅ | |
| PHOE | 85 | ✅ | |
| RMLI | 12 | ✅ | |
| STRS | 70 | ✅ | |
| TTAM | 110 | ✅ | |

---

## What's Working Correctly

- ✅ All 43 Israeli transactions captured (dates, amounts, quantities verified)
- ✅ All 103 world transactions captured **except AMZN** (2 missing)
- ✅ All 7 Israeli dividends captured (RMLI ×2, LUMI, FIBI, DLEKG, TTAM, MLSR)
- ✅ All 19 world dividends captured
- ✅ FX conversions (ILS→USD) — 6 conversion records, all amounts/rates match PDF
- ✅ Capital gains tax transactions (₪4,588.37 total) — all 7 records match
- ✅ PDF parsing date accuracy — no date errors found
- ✅ Quantity accuracy — no unit count errors on correctly-tracked positions
- ✅ Commission amounts accurate throughout
- ✅ Israeli holdings aggregate correctly across "Multiple PDFs" source
- ✅ Realized P/L is correct for 22 of 31 SELL transactions

---

## Priority Fix List

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | World holdings shows sold positions | Compute holdings from transactions (BUY−SELL), not PDF snapshots |
| P0 | AMZN BUY+SELL missing | Re-import Oct/Nov 2024 PDFs; fix parser for Hebrew stock names with TA security numbers |
| P0 | 9 world SELLs + 2 Israeli SELLs have NULL realized_pl | Fix P/L calculation to use original USD transaction cost_basis, not ILS holdings conversion |
| P1 | KSM.F63 stale in Israeli holdings | Same fix as P0 holdings computation |
| P1 | INTC cost_basis wrong ($2,718 vs $2,621) | Use BUY transaction total_value, not ILS PDF cost |
| P1 | DEPOSIT quantity = running balance bug | Document clearly; ensure cash balance service only uses `total_value` |
| P2 | Tax paid not reflected in world P/L dashboard | Show ₪4,588 withheld tax as a separate line in world portfolio summary |
| P2 | Exchange rates table lacks historical data | Populate from FX conversion transactions for correct historical lookups |
| P3 | ADBE cost $1,937 vs correct $1,865 | Fix cost basis to use latest lot cost |
| P3 | MNDY cost $0.20 rounding | Minor |
