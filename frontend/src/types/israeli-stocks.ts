export interface IsraeliStock {
  security_no: string;
  symbol: string;
  name: string;
  index_name: string;
  logo_svg?: string | null;
}

export interface IsraeliStockHolding {
  id: number;
  security_no: string;
  symbol: string;
  company_name: string;
  quantity: number;
  last_price?: number;
  purchase_cost?: number;
  current_value?: number;
  portfolio_percentage?: number; // Percentage within Israeli stocks portfolio
  overall_portfolio_percentage?: number; // Percentage within overall portfolio (for future global stocks)
  currency: string;
  holding_date?: string;
  source_pdf: string;
  created_at: string;
  logo_svg?: string | null;
  
  // Return metrics
  unrealized_gain?: number;
  unrealized_gain_pct?: number;
  twr?: number;  // Time-Weighted Return
  mwr?: number;  // Money-Weighted Return (IRR)
}

export interface IsraeliStockTransaction {
  id: number;
  security_no: string;
  symbol: string;
  company_name: string;
  transaction_type: "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAWAL";
  transaction_date?: string;
  transaction_time?: string;
  quantity: number;
  price?: number;
  total_value?: number;
  commission?: number;
  tax?: number;
  currency: string;
  source_pdf: string;
  created_at: string;
  logo_svg?: string | null;
}

export interface IsraeliDividend {
  id: number;
  security_no: string;
  symbol: string;
  company_name: string;
  payment_date: string;
  amount: number;
  tax?: number;
  currency: string;
  source_pdf: string;
  created_at: string;
  logo_svg?: string | null;
}

export interface IsraeliStockSummary {
  total_holdings: number;
  total_value: number;
  total_transactions: number;
  total_dividends: number;
  dividend_amount: number;
  top_holdings: IsraeliStockHolding[];
  recent_transactions: IsraeliStockTransaction[];
  recent_dividends: IsraeliDividend[];
}

export interface UploadResult {
  success: boolean;
  pdf_name: string;
  holding_date?: string;
  holdings_found: number;
  transactions_found: number;
  holdings_saved: number;
  transactions_saved: number;
  error?: string;
}
