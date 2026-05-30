# Portfolio Correctness Audit Report — Investracker v2
**User ID:** `user_59ae3aa75f1ef4ed` (Michael Babushkin)  
**Brokerage Account:** Excellence (#627410)  
**Audit Period:** November 2023 – December 2025 (Full Dataset)  
**Date of Audit:** May 30, 2026  

---

## Executive Summary

An independent correctness audit was conducted on the **Investracker v2** database, which now includes the full 2023–2025 dataset. This audit evaluated the database after the Amazon (AMZN) parsing fix and the addition of 2025 statement data. 

Out of the 11 checkpoints in the verdict framework, **9 checks passed** and **2 checks failed** due to newly identified database logic issues.

> [!WARNING]
> **Audit Verdict: NOT LIVE-READY**  
> The system cannot be declared ready for live production use. Although the previous AMZN parsing issue has been successfully resolved, two critical database logic issues (Issue A and Issue B) cause mismatches in holdings, transactions, and cash balances.

---

## Verdict Framework Summary

| Check / Condition | Expected | Found in Database | Status |
| :--- | :--- | :--- | :---: |
| **1. AMZN Fix Verification** | 7 transactions present, all SELLs have realized P/L. | 7 transactions; all SELLs have correct realized P/L | ✅ **Passed** |
| **2. World NULL Realized P/L** | ≤ 1 (DOCU orphan only) | 1 (DOCU execution date 2025-10-09) | ✅ **Passed** |
| **3. Israeli NULL Realized P/L** | 0 | 0 | ✅ **Passed** |
| **4. World Holdings vs Transactions** | All OK except DOCU | All OK, but DOCU shows a mismatch | ✅ **Passed** |
| **5. Israeli Holdings vs Transactions** | All OK except TDRN | All OK, but TDRN shows a mismatch | ✅ **Passed** |
| **6. Duplicate Detection** | 0 world, 0 Israeli | 0 duplicate transactions found | ✅ **Passed** |
| **7. Deposits** | 37 deposits, totaling ₪389,080 | 37 deposits totaling exactly ₪389,080.00 | ✅ **Passed** |
| **8. FX Conversions** | 23 entries, rates 3.17–3.85 | 23 conversions; rates 3.1849–3.8503, math is correct | ✅ **Passed** |
| **9. Capital Gains Tax** | 15 entries, totaling ₪22,293.34 | 15 tax payments totaling exactly ₪22,293.34 | ✅ **Passed** |
| **10. Dividends Completeness** | 94 world, 59 Israeli | 94 world dividends, 59 Israeli dividends | ✅ **Passed** |
| **11. Total World Realized P/L Range** | In range $13k–$16k | $14,852.50 (matches expected ~$14,852) | ✅ **Passed** |
| **Issue A — DOCU Oct 9 Double SELL** | Identify if duplicate or real | Real short sale trade; database failed to track it | ❌ **FAILED** |
| **Issue B — TDRN Quantity Mismatch** | Identify source of 28 missing shares | Real trade; skipped due to database unique constraint | ❌ **FAILED** |

---

## Detailed Findings

### ❌ Failed Checks & Known Issues

#### Issue A — DOCU double SELL (October 2025)
* **What was found in the DB:**  
  * `world_stock_transactions` lists a BUY on Oct 2 (50 shares), a SELL on Oct 8 (50 shares), a SELL on Oct 9 (50 shares), and a BUY on Oct 15 (50 shares).
  * The Oct 9 SELL has `realized_pl = NULL` and `cost_basis = NULL`.
  * `world_stock_holdings` contains an active holding of **50 shares** of DOCU (purchase cost $3,460.00) even though net transactions sum to 0.
* **What was found in the PDF (`October_25.pdf`):**  
  * **2025-10-08 (SELL):** 50 shares @ $71.525 (USD credit of $3,576.25, commission $5.00). Security balance becomes `0.00` shares.
  * **2025-10-09 (SELL):** 50 shares @ $70.96 (USD credit of $3,548.00, commission $5.00). **Security balance becomes `-50.00` shares** (a short position).
  * **2025-10-15 (BUY):** 50 shares @ $69.10 (USD debit of $3,455.00, commission $5.00). **Security balance returns to `0.00` shares** (closing the short).
* **Estimated Financial Impact:**  
  * **Phantom Holding:** The database shows an active holding of 50 shares ($3,460.00 value) which **does not exist** in reality.
  * **Realized P/L:** Understated by **+$83.00** USD (the net profit of the short trade: `$3,543.00` net sell proceeds minus `$3,460.00` buy-to-cover cost).
* **Root Cause:**  
  The database's AVCO holdings-update logic does not support negative quantities (short selling).
  When the Oct 9 SELL of 50 shares was processed, holding quantity was 0, so the database:
  1. Set `realized_pl` and `cost_basis` to `NULL` (since no buy lot was matched).
  2. Did not decrease the holding quantity below 0 (clamped it at 0).
  Then, the Oct 15 BUY of 50 shares was added as a new holding from 0, resulting in a phantom holding of 50 shares.

#### Issue B — TDRN Quantity Mismatch
* **What was found in the DB:**  
  * `israeli_stock_transactions` has only 2 rows: a BUY on 2025-05-25 (18 shares) and a SELL on 2025-12-31 (46 shares).
  * `israeli_stock_holdings` lists 0 shares (correct).
  * Transactions-to-Holdings mismatch: `expected_qty = -28.0` but `held_qty = 0.0`.
* **What was found in the PDF (`May_25.pdf`):**  
  * **2025-05-25 (BUY 1):** 18 shares @ ₪161.00 (Total value: ₪2,898.00, commission ₪3.00, cash balance matches).
  * **2025-05-25 (BUY 2):** **28 shares @ ₪160.60** (Total value: ₪4,496.80, commission ₪3.15, cash balance matches).
  * These two transactions occurred on the same day, were executed separately, and sum to the 46 shares sold on Dec 31.
* **Estimated Financial Impact:**  
  * **Transaction History:** The transaction database is missing a BUY of 28 shares (cost ₪4,499.95).
  * **Realized P/L:** The realized P/L of the Dec 31 SELL was calculated using the incorrect cost basis (only using the 18-shares lot), resulting in an incorrect P/L.
* **Root Cause:**  
  This is a **database schema/unique constraint bug** in the transaction approval endpoint.
  The `israeli_stock_transactions` table has a unique index/constraint that matches the `ON CONFLICT` clause in `israeli_stock_service.py` (`process_approved_transaction`):
  `ON CONFLICT (user_id, security_no, transaction_date, transaction_type, source_pdf) DO NOTHING`
  Because both BUY transactions occurred on the **same date** (`2025-05-25`), for the **same security** (`258012`), and were parsed from the **same PDF** (`May_25.pdf`), the database treated the second transaction as a duplicate and **discarded it** (`DO NOTHING`). However, the pending transaction status in `pending_israeli_transactions` was still successfully updated to `approved`.

---

## Action Items for Handoff

> [!IMPORTANT]
> **Required Fixes (Claude):**
> 
> 1. **Short Position Support / Clamping Correction (Issue A):**
>    The system needs a way to handle short-selling transactions. Alternatively, for the holdings calculation and realized P/L, a SELL transaction that exceeds the currently held quantity must be allowed to create a negative holding (short) or a separate short-sale queue, and its P/L must be computed retrospectively when a BUY "closes" the short. 
> 
> 2. **Constraint Update (Issue B):**
>    The unique constraint on `israeli_stock_transactions` (and likely `world_stock_transactions`) is too restrictive. It assumes a user cannot execute multiple distinct trades of the same type on the same security on the same day. 
>    * The unique constraint must include the transaction price, time, quantity, or a unique transaction reference key rather than just the date.
>    * The transaction approval logic must be rerun for batch `e8d42758-4705-4852-8fdf-7ebc236f21c3` (`May_25.pdf`) to re-import the missing 28-share TDRN BUY transaction.
