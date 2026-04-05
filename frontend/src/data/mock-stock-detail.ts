import { StockDetail } from '@/types/stock-detail';

export const mockWorldStockDetail: StockDetail = {
  ticker: "AAPL",
  company_name: "Apple Inc.",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Consumer Electronics",
  logo_url: "https://logo.clearbit.com/apple.com",
  currency: "USD",
  market_status: "open",
  price: {
    current: 255.92,
    change: 0.29,
    change_pct: 0.11,
    previous_close: 255.63
  },
  stats: {
    market_cap: 3900000000000,
    pe_ratio: 32.1,
    eps: 6.43,
    dividend_yield: 0.0052,
    beta: 1.24,
    week_52_high: 260.10,
    week_52_low: 169.21,
    avg_volume: 58000000
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
    { id: 1, date: "2024-02-15", amount: 2.79, per_share: 0.24 }
  ]
};

export const mockIlStockDetail: StockDetail = {
  ticker: "TEVA.TA",
  company_name: "Teva Pharmaceutical Industries Ltd.",
  exchange: "TASE",
  sector: "Healthcare",
  industry: "Drug Manufacturers",
  logo_url: "https://logo.clearbit.com/tevapharm.com",
  currency: "ILS",
  market_status: "closed",
  price: {
    current: 6542,
    change: -12,
    change_pct: -0.18,
    previous_close: 6554
  },
  stats: {
    market_cap: 72000000000,
    pe_ratio: 15.5,
    eps: 422,
    dividend_yield: 0,
    beta: 0.85,
    week_52_high: 7100,
    week_52_low: 3200,
    avg_volume: 1200000
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
