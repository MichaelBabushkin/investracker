export interface WorldStockAccount {
  id: number;
  user_id: string;
  account_number: string;
  account_alias?: string;
  account_type?: string;
  base_currency: string;
  broker_name?: string;
  created_at: string;
  updated_at: string;
}

export interface WorldStockHolding {
  id: number;
  user_id: string;
  account_id?: number;
  symbol: string;
  company_name?: string;
  description?: string;
  quantity?: number;
  avg_entry_price?: number;
  current_price?: number;
  current_value?: number;
  purchase_cost?: number;
  unrealized_pl?: number;
  unrealized_pl_percent?: number;
  currency: string;
  source_pdf: string;
  last_updated: string;
  created_at: string;
}

export interface WorldStockTransaction {
  id: number;
  user_id: string;
  account_id?: number;
  ticker: string;
  symbol: string;
  company_name?: string;
  transaction_date?: string;
  transaction_time?: string;
  transaction_type?: string;  // BUY, SELL
  quantity?: number;
  price?: number;  // Trade price
  trade_price?: number;  // Alias for compatibility
  total_value?: number;  // Total transaction value
  close_price?: number;
  proceeds?: number;
  commission?: number;
  tax?: number;
  basis?: number;
  realized_pl?: number;
  mtm_pl?: number;
  trade_code?: string;
  currency: string;
  exchange_rate?: number;
  source_pdf: string;
  created_at: string;
  updated_at?: string;
}

export interface WorldStockDividend {
  id: number;
  user_id: string;
  account_id?: number;
  symbol: string;
  description?: string;
  isin?: string;
  payment_date?: string;
  amount?: number;
  gross_amount?: number;
  amount_per_share?: number;
  withholding_tax?: number;
  net_amount?: number;
  dividend_type?: string;
  currency: string;
  source_pdf: string;
  created_at: string;
}

export interface WorldStockPerformance {
  id: number;
  user_id: string;
  account_id?: number;
  report_start_date?: string;
  report_end_date?: string;
  starting_nav?: number;
  ending_nav?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  total_dividends?: number;
  total_withholding_tax?: number;
  total_commissions?: number;
  total_fees?: number;
  time_weighted_return?: number;
  created_at: string;
}

export interface WorldStockSummary {
  total_accounts: number;
  total_value: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  total_dividends: number;
  total_withholding_tax: number;
  total_commissions: number;
  holdings_count: number;
  transactions_count: number;
  dividends_count: number;
}

export interface WorldStockUploadResult {
  success: boolean;
  pdf_name: string;
  account_number?: string;
  account_id?: number;
  holdings_found: number;
  transactions_found: number;
  dividends_found: number;
  holdings_saved: number;
  transactions_saved: number;
  dividends_saved: number;
  error?: string;
}
