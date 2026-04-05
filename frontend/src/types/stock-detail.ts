export interface StockPortfolio {
  held: boolean;
  quantity: number;
  purchase_cost: number;
  avg_cost_per_share: number;
  current_value: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
}

export interface StockStats {
  market_cap: number;
  pe_ratio: number;
  eps: number;
  dividend_yield: number;
  beta: number;
  week_52_high: number;
  week_52_low: number;
  avg_volume: number;
}

export interface StockAbout {
  description: string;
  employees: number;
  website: string;
  ceo: string;
  founded: number;
}

export interface StockTransaction {
  id: number;
  date: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  total: number;
  realized_pl: number | null;
}

export interface StockDividend {
  id: number;
  date: string;
  amount: number;
  per_share: number;
}

export interface StockDetail {
  ticker: string;
  company_name: string;
  exchange: string;
  sector: string;
  industry: string;
  logo_url: string | null;
  currency: string;
  market_status: 'open' | 'closed' | 'pre' | 'after';
  price: {
    current: number;
    change: number;
    change_pct: number;
    previous_close: number;
  };
  stats: StockStats;
  about: StockAbout;
  portfolio: StockPortfolio;
  transactions: StockTransaction[];
  dividends: StockDividend[];
}
