import { StockDetail } from '@/types/stock-detail';

export const mockWorldStockDetail: StockDetail = {
  ticker: "AAPL",
  company_name: "Apple Inc.",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Consumer Electronics",
  logo_url: "https://logo.clearbit.com/apple.com",
  logo_svg: null,
  currency: "USD",
  market_state: "OPEN",
  price: {
    current: 255.92,
    change: 0.29,
    change_pct: 0.11,
    previous_close: 255.63,
    day_high: 256.50,
    day_low: 254.10,
    post_market_price: null,
    post_market_change_pct: null,
    pre_market_price: null
  },
  stats: {
    market_cap: 3900000000000,
    pe_ratio: 32.1,
    forward_pe: 28.5,
    eps: 6.43,
    forward_eps: 8.90,
    dividend_yield: 0.52,
    dividend_rate: 1.0,
    ex_dividend_date: "2024-02-09",
    last_dividend_value: 0.24,
    five_yr_avg_yield: 0.6,
    beta: 1.24,
    week_52_high: 260.10,
    week_52_low: 169.21,
    avg_volume: 58000000,
    fifty_day_avg: 245.10,
    two_hundred_day_avg: 215.80,
    earnings_date: "2024-04-25"
  },
  analyst: {
    recommendation: "buy",
    recommendation_mean: 1.8,
    analyst_count: 35,
    target_mean: 265.5,
    target_high: 300.0,
    target_low: 200.0
  },
  about: {
    description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
    employees: 150000,
    website: "https://apple.com",
    ceo: "Tim Cook",
    founded: 1976
  },
  portfolio: {
    held: true,
    quantity: 11.0,
    purchase_cost: 2372.14,
    avg_cost_per_share: 215.65,
    current_value: 2815.12,
    unrealized_pl: 442.98,
    unrealized_pl_pct: 18.67
  },
  transactions: [
    { id: 1, date: "2024-02-05", type: "BUY", quantity: 11, price: 185.85, total: 2372.14, realized_pl: null }
  ],
  dividends: [
    { id: 1, payment_date: "2024-02-15", ex_dividend_date: "2024-02-09", net_amount: 2.79, gross_amount: 3.2, per_share: 0.24 }
  ]
};

export const mockIlStockDetail: StockDetail = {
  ticker: "TEVA.TA",
  company_name: "Teva Pharmaceutical Industries Ltd.",
  exchange: "TASE",
  sector: "Healthcare",
  industry: "Drug Manufacturers",
  logo_url: "https://logo.clearbit.com/tevapharm.com",
  logo_svg: null,
  currency: "ILS",
  market_state: "CLOSED",
  price: {
    current: 6542,
    change: -12,
    change_pct: -0.18,
    previous_close: 6554,
    day_high: 6600,
    day_low: 6500,
    post_market_price: null,
    post_market_change_pct: null,
    pre_market_price: null
  },
  stats: {
    market_cap: 72000000000,
    pe_ratio: 15.5,
    forward_pe: null,
    eps: 422,
    forward_eps: null,
    dividend_yield: 0,
    dividend_rate: null,
    ex_dividend_date: null,
    last_dividend_value: null,
    five_yr_avg_yield: null,
    beta: 0.85,
    week_52_high: 7100,
    week_52_low: 3200,
    avg_volume: 1200000,
    fifty_day_avg: 6100,
    two_hundred_day_avg: 5500,
    earnings_date: null
  },
  analyst: {
    recommendation: "hold",
    recommendation_mean: 3.1,
    analyst_count: 12,
    target_mean: 6600,
    target_high: 7500,
    target_low: 5000
  },
  about: {
    description: "Teva Pharmaceutical Industries develops, manufactures, and markets generic medicines, specialty medicines, and active pharmaceutical ingredients.",
    employees: 35000,
    website: "https://tevapharm.com",
    ceo: "Richard Francis",
    founded: 1901
  },
  portfolio: {
    held: true,
    quantity: 150.0,
    purchase_cost: 981300,
    avg_cost_per_share: 6542,
    current_value: 981300,
    unrealized_pl: 0,
    unrealized_pl_pct: 0
  },
  transactions: [
    { id: 2, date: "2024-03-10", type: "BUY", quantity: 150, price: 6542, total: 981300, realized_pl: null }
  ],
  dividends: []
};
