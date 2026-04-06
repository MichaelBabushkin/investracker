export interface StockPortfolio {
  held: boolean;
  quantity: number;
  purchase_cost: number;
  avg_cost_per_share: number | null;
  current_value: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
}

export interface StockStats {
  market_cap: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  eps: number | null;
  forward_eps: number | null;
  dividend_yield: number | null;   // already in % e.g. 6.68
  dividend_rate: number | null;    // annual $ amount e.g. 6.56
  ex_dividend_date: string | null; // "YYYY-MM-DD"
  last_dividend_value: number | null;
  five_yr_avg_yield: number | null;
  beta: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  avg_volume: number | null;
  fifty_day_avg: number | null;
  two_hundred_day_avg: number | null;
  earnings_date: string | null;    // "YYYY-MM-DD"
}

export interface RecommendationTrendItem {
  period: string | null;   // e.g. "0m", "-1m", "-2m", "-3m"
  strong_buy: number;
  buy: number;
  hold: number;
  sell: number;
  strong_sell: number;
}

export interface UpgradeDowngradeItem {
  date: string | null;
  firm: string | null;
  to_grade: string | null;
  from_grade: string | null;
  action: string | null;  // "up" | "down" | "main" | "init" | "reit"
}

export interface StockAnalyst {
  recommendation: string | null;        // "buy" | "hold" | "sell" | "strong_buy" etc.
  recommendation_mean: number | null;   // 1=Strong Buy … 5=Strong Sell
  analyst_count: number | null;
  target_mean: number | null;
  target_high: number | null;
  target_low: number | null;
  recommendations_trend: RecommendationTrendItem[];
  upgrades_downgrades: UpgradeDowngradeItem[];
}

export interface StockAbout {
  description: string | null;
  employees: number | null;
  website: string | null;
  ceo: string | null;
  founded: number | null;
}

export interface StockTransaction {
  id: number;
  date: string | null;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | string;
  quantity: number;
  price: number;
  total: number;
  realized_pl: number | null;
  commission?: number;
}

export interface StockDividend {
  id: number;
  payment_date: string | null;
  ex_dividend_date: string | null;
  net_amount: number;
  gross_amount: number;
  per_share: number | null;
}

export interface StockDetail {
  ticker: string;
  company_name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  logo_url: string | null;
  logo_svg: string | null;
  currency: string;
  market_state: 'OPEN' | 'CLOSED' | 'PRE' | 'POST' | string;
  price: {
    current: number | null;
    change: number | null;
    change_pct: number | null;
    previous_close: number | null;
    day_high: number | null;
    day_low: number | null;
    post_market_price: number | null;
    post_market_change_pct: number | null;
    pre_market_price: number | null;
  };
  stats: StockStats;
  analyst: StockAnalyst;
  about: StockAbout;
  portfolio: StockPortfolio;
  transactions: StockTransaction[];
  dividends: StockDividend[];
}
