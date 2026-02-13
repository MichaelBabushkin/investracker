import { Category } from "../types";

export const fundamentalAnalysis: Category = {
  id: "fundamental-analysis",
  name: "Fundamental Analysis",
  emoji: "🧮",
  description: "Evaluate companies like Wall Street analysts using financial data",
  gradient: "from-cyan-400 to-teal-600",
  topics: [
    {
      id: "fundamental-1", title: "Reading Financial Statements", difficulty: "beginner", readTime: 8,
      content: [
        { type: "heading", content: "The Three Core Financial Statements" },
        { type: "text", content: "Every public company must file financial statements that reveal its financial health. Understanding these three documents is the foundation of fundamental analysis — they're like a company's medical records." },
        { type: "heading", content: "1. Income Statement (Profit & Loss)" },
        { type: "text", content: "Shows revenue, expenses, and profit over a period (quarter or year). It answers: 'Is this company making money?' Key lines: Revenue → Gross Profit → Operating Income → Net Income." },
        { type: "heading", content: "2. Balance Sheet" },
        { type: "text", content: "A snapshot of what a company owns (assets) and owes (liabilities) at a specific point in time. The fundamental equation: Assets = Liabilities + Shareholders' Equity." },
        { type: "heading", content: "3. Cash Flow Statement" },
        { type: "text", content: "Tracks the actual cash moving in and out of the business. Divided into three sections: Operating (core business), Investing (buying/selling assets), and Financing (debt and equity transactions)." },
        { type: "callout", content: "Earnings can be manipulated through accounting choices, but cash flow is much harder to fake. Always compare net income to operating cash flow — if cash flow is consistently lower, be cautious.", variant: "key-concept" },
        { type: "callout", content: "You can find any public company's financial statements on the SEC's EDGAR database (sec.gov) or on sites like Yahoo Finance, Google Finance, or the company's investor relations page.", variant: "tip" },
      ],
      quiz: [
        { question: "Which statement shows if a company is profitable?", options: ["Balance Sheet", "Income Statement", "Cash Flow Statement", "Shareholder Letter"], correctIndex: 1, explanation: "The Income Statement (also called Profit & Loss statement) shows revenue, expenses, and ultimately whether the company made a profit or loss." },
        { question: "What is the fundamental balance sheet equation?", options: ["Revenue − Expenses = Profit", "Assets = Liabilities + Equity", "Cash In − Cash Out = Net Cash", "Price × Shares = Market Cap"], correctIndex: 1, explanation: "The fundamental equation of the balance sheet is: Assets = Liabilities + Shareholders' Equity. Everything a company owns is funded either by debt (liabilities) or owner investment (equity)." },
      ],
    },
    {
      id: "fundamental-2", title: "P/E Ratio & Valuation Multiples", difficulty: "beginner", readTime: 6,
      content: [
        { type: "heading", content: "The Price-to-Earnings Ratio" },
        { type: "text", content: "The P/E ratio is the most widely used valuation metric. It tells you how much investors are willing to pay for each dollar of earnings. A P/E of 20 means investors pay $20 for every $1 of annual earnings." },
        { type: "formula", content: "P/E Ratio = Stock Price / Earnings Per Share (EPS)" },
        { type: "heading", content: "Types of P/E" },
        { type: "list", content: "", items: ["Trailing P/E — Uses actual earnings from the past 12 months", "Forward P/E — Uses estimated future earnings (analyst projections)", "Shiller P/E (CAPE) — Uses inflation-adjusted earnings over 10 years (smooths cycles)"] },
        { type: "heading", content: "Other Key Multiples" },
        { type: "list", content: "", items: ["P/S (Price-to-Sales) — Useful for unprofitable companies; compares price to revenue", "P/B (Price-to-Book) — Compares market value to book value of assets", "EV/EBITDA — Enterprise Value to EBITDA; great for comparing companies with different capital structures", "PEG Ratio — P/E divided by growth rate; accounts for growth (under 1.0 may indicate undervaluation)"] },
        { type: "callout", content: "Never use P/E in isolation. A low P/E might signal a bargain — or a company with deteriorating fundamentals. Always compare P/E to the company's historical average, sector peers, and growth rate.", variant: "warning" },
      ],
      quiz: [
        { question: "What does a P/E ratio of 25 mean?", options: ["The stock costs $25", "Investors pay $25 for every $1 of earnings", "The company earns $25 per share", "The stock is 25% overvalued"], correctIndex: 1, explanation: "A P/E of 25 means investors are paying $25 for every $1 of the company's annual earnings per share." },
        { question: "Which ratio is most useful for unprofitable companies?", options: ["P/E ratio", "P/S (Price-to-Sales)", "Dividend yield", "P/B ratio"], correctIndex: 1, explanation: "The P/S (Price-to-Sales) ratio is useful for unprofitable companies because it uses revenue instead of earnings, which may be negative." },
      ],
    },
    {
      id: "fundamental-3", title: "EPS & Revenue Growth", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "The Engine of Stock Prices" },
        { type: "text", content: "Over the long term, stock prices follow earnings growth. Companies that consistently grow their earnings per share (EPS) tend to see their stock prices rise proportionally. Revenue growth fuels earnings growth." },
        { type: "formula", content: "EPS = Net Income / Shares Outstanding\nRevenue Growth = (Current Revenue − Prior Revenue) / Prior Revenue × 100" },
        { type: "heading", content: "What to Analyze" },
        { type: "list", content: "", items: ["EPS trend — Is EPS growing year over year? Consistent growth is key", "Revenue growth rate — Is the top line expanding? (Hard to grow earnings without growing revenue)", "EPS beats — Does the company consistently beat analyst estimates? (Positive surprises drive stock prices)", "Margin expansion — Are profit margins improving? Growing revenue with expanding margins = accelerating EPS", "Dilution — Is share count growing? EPS can shrink even if net income grows if too many new shares are issued"] },
        { type: "callout", content: "A company growing revenue at 20% with expanding margins can see EPS grow at 30%+. This 'operating leverage' is what creates explosive stock moves.", variant: "key-concept" },
      ],
      quiz: [
        { question: "Why might EPS shrink even if net income grows?", options: ["Rising revenue", "Share dilution (more shares issued)", "Higher dividends", "Stock splits"], correctIndex: 1, explanation: "If a company issues many new shares, the net income is spread across more shares, potentially decreasing EPS even if total profit grows." },
      ],
    },
    {
      id: "fundamental-4", title: "Debt-to-Equity & Financial Health", difficulty: "intermediate", readTime: 5,
      content: [
        { type: "heading", content: "Measuring Financial Strength" },
        { type: "text", content: "A company's balance sheet tells you about its financial health. Too much debt can amplify returns in good times but can be devastating in downturns. Understanding leverage ratios helps you assess risk." },
        { type: "formula", content: "Debt-to-Equity Ratio = Total Debt / Shareholders' Equity\nCurrent Ratio = Current Assets / Current Liabilities\nInterest Coverage = EBIT / Interest Expense" },
        { type: "heading", content: "Key Health Indicators" },
        { type: "list", content: "", items: ["Debt-to-Equity below 1.0 = Conservative (company has more equity than debt)", "D/E of 1.0-2.0 = Moderate leverage (common for established companies)", "D/E above 2.0 = High leverage (higher risk, must monitor closely)", "Current Ratio above 1.5 = Good short-term liquidity", "Interest Coverage above 3x = Can comfortably service debt"] },
        { type: "callout", content: "Some industries naturally carry more debt (utilities, banks, real estate). Always compare debt levels to industry peers, not across different sectors.", variant: "key-concept" },
      ],
      quiz: [
        { question: "What does a debt-to-equity ratio of 0.5 mean?", options: ["The company has $0.50 of debt for every $1 of equity", "The company is 50% profitable", "Half the shares are owned by insiders", "The stock is trading at half its book value"], correctIndex: 0, explanation: "A D/E of 0.5 means the company has 50 cents of debt for every dollar of shareholders' equity — a relatively conservative capital structure." },
      ],
    },
    {
      id: "fundamental-5", title: "Free Cash Flow Analysis", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Cash Is King" },
        { type: "text", content: "Free Cash Flow (FCF) is the cash a company generates after accounting for capital expenditures. It's the true measure of a company's ability to fund growth, pay dividends, reduce debt, and buy back shares. Many investors consider FCF more important than earnings." },
        { type: "formula", content: "Free Cash Flow = Operating Cash Flow − Capital Expenditures" },
        { type: "heading", content: "Why FCF Matters More Than Earnings" },
        { type: "list", content: "", items: ["Earnings can be manipulated through accounting choices; cash flow is harder to fake", "FCF shows actual cash available for shareholders", "Companies need positive FCF to sustain dividends and buybacks", "Negative FCF requires raising debt or equity, diluting shareholders", "FCF yield (FCF/Market Cap) is a better valuation metric than P/E for many companies"] },
        { type: "callout", content: "A company can report positive earnings while burning cash (negative FCF). This happens when earnings include non-cash items or when capital expenditures are very high. Always check both!", variant: "warning" },
        { type: "callout", content: "FCF yield above 5% often indicates an undervalued stock. Below 2% may be overvalued (or a high-growth company reinvesting heavily).", variant: "tip" },
      ],
      quiz: [
        { question: "How is Free Cash Flow calculated?", options: ["Revenue minus expenses", "Operating Cash Flow minus Capital Expenditures", "Net Income minus dividends", "Total Assets minus Total Liabilities"], correctIndex: 1, explanation: "Free Cash Flow = Operating Cash Flow − Capital Expenditures. It represents the cash available to the company after maintaining and expanding its asset base." },
      ],
    },
    {
      id: "fundamental-6", title: "Intrinsic Value & DCF Models", difficulty: "advanced", readTime: 8,
      content: [
        { type: "heading", content: "What Is a Company Really Worth?" },
        { type: "text", content: "Intrinsic value is the true underlying worth of a company, independent of its current market price. The Discounted Cash Flow (DCF) model is the gold standard for calculating intrinsic value — it estimates the present value of all future cash flows a company will generate." },
        { type: "heading", content: "DCF in Simple Terms" },
        { type: "text", content: "A dollar today is worth more than a dollar tomorrow (because you could invest it). DCF takes all the future cash flows a company is expected to generate and 'discounts' them back to today's value using a discount rate (usually 8-12%)." },
        { type: "formula", content: "Intrinsic Value = Σ [FCFt / (1 + r)^t] + Terminal Value / (1 + r)^n\n\nWhere:\nFCFt = Free Cash Flow in year t\nr = Discount rate (WACC)\nn = Number of years projected\nTerminal Value = FCFn × (1 + g) / (r − g)\ng = Long-term growth rate (usually 2-3%)" },
        { type: "callout", content: "Small changes in the discount rate or growth rate assumptions dramatically change the result. That's why Buffett demands a large 'margin of safety' — buying well below calculated intrinsic value to account for errors.", variant: "warning" },
        { type: "heading", content: "Practical Steps" },
        { type: "list", content: "", items: ["1. Project Free Cash Flow for 5-10 years", "2. Calculate Terminal Value (value beyond projection period)", "3. Discount all cash flows to present value using WACC", "4. Sum everything up = Enterprise Value", "5. Subtract debt, add cash = Equity Value", "6. Divide by shares outstanding = Intrinsic Value per share", "7. Compare to current price — buy if price is well below intrinsic value"] },
      ],
      quiz: [
        { question: "What does DCF stand for?", options: ["Discounted Cash Flow", "Direct Capital Funding", "Derivative Correlation Factor", "Deferred Cost Formula"], correctIndex: 0, explanation: "DCF stands for Discounted Cash Flow — a valuation method that estimates the present value of future cash flows a company is expected to generate." },
        { question: "Why is 'margin of safety' important in valuation?", options: ["It guarantees profits", "It accounts for potential errors in assumptions", "It's required by law", "It reduces taxes"], correctIndex: 1, explanation: "Since DCF valuations depend on assumptions (growth rate, discount rate) that could be wrong, buying below intrinsic value provides a buffer against estimation errors." },
      ],
    },
    {
      id: "fundamental-7", title: "Understanding Earnings Reports", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Earnings Season Decoded" },
        { type: "text", content: "Four times a year, public companies report their quarterly results. Earnings season is when the most dramatic stock moves happen — a single report can send a stock up 20% or down 30% overnight." },
        { type: "heading", content: "Key Things to Watch" },
        { type: "list", content: "", items: ["EPS vs Estimate — Did the company beat or miss Wall Street expectations?", "Revenue vs Estimate — Top-line growth matters as much as bottom-line earnings", "Guidance — Forward-looking projections often matter MORE than current results", "Margins — Are profit margins expanding or contracting?", "Management Commentary — Listen to the earnings call for tone and insights"] },
        { type: "callout", content: "A company can beat on both EPS and revenue but still see its stock drop if the forward guidance disappoints. The market is always looking ahead.", variant: "key-concept" },
        { type: "callout", content: "Earnings are usually reported after market close (4 PM ET) or before market open (before 9:30 AM ET). The biggest moves happen in after-hours or pre-market trading.", variant: "tip" },
      ],
      quiz: [
        { question: "What often matters more than current earnings results?", options: ["Past performance", "Forward guidance", "Dividend announcement", "Share count"], correctIndex: 1, explanation: "Forward guidance — management's projection for future quarters — often matters more than current results because the stock market is forward-looking." },
      ],
    },
    {
      id: "fundamental-8", title: "Economic Indicators", difficulty: "intermediate", readTime: 7,
      content: [
        { type: "heading", content: "The Big Picture" },
        { type: "text", content: "Economic indicators are statistics that provide insight into the overall health of the economy. They affect interest rates, corporate earnings, and investor sentiment — ultimately driving stock market performance." },
        { type: "heading", content: "Key Indicators" },
        { type: "list", content: "", items: ["GDP (Gross Domestic Product) — The total value of goods and services; two consecutive quarters of negative GDP = recession", "CPI (Consumer Price Index) — Measures inflation; rising CPI leads to higher interest rates", "Federal Funds Rate — The interest rate set by the Fed; affects borrowing costs for everyone", "Unemployment Rate — Below 4% is considered 'full employment'; rising unemployment signals recession", "PMI (Purchasing Managers Index) — Above 50 = expansion, below 50 = contraction", "Consumer Confidence — How optimistic consumers feel; affects spending and markets"] },
        { type: "callout", content: "Markets react to whether indicators are better or worse than EXPECTED, not whether they're good or bad in absolute terms. A 'bad' jobs report that's better than feared can actually boost stocks.", variant: "key-concept" },
      ],
      quiz: [
        { question: "What defines a recession technically?", options: ["Stock market drop of 20%", "Two consecutive quarters of negative GDP", "Unemployment above 10%", "Interest rates above 5%"], correctIndex: 1, explanation: "A recession is technically defined as two consecutive quarters of negative GDP growth, indicating the economy is shrinking." },
      ],
    },
    {
      id: "fundamental-9", title: "Sector Analysis", difficulty: "advanced", readTime: 6,
      content: [
        { type: "heading", content: "Comparing Apples to Apples" },
        { type: "text", content: "You can't compare a bank's P/E to a tech company's P/E and draw useful conclusions. Different sectors have different financial characteristics, growth rates, and valuation norms. Sector analysis ensures you compare within the right peer group." },
        { type: "heading", content: "The 11 GICS Sectors" },
        { type: "list", content: "", items: ["Technology — High growth, high P/E, asset-light", "Healthcare — Stable demand, regulatory risks, patent cliffs", "Financials — Interest-rate sensitive, measured by P/B ratio", "Consumer Discretionary — Cyclical, tied to consumer spending", "Consumer Staples — Defensive, consistent dividends", "Energy — Commodity-driven, cyclical, capital-intensive", "Industrials — Economic bellwether, infrastructure plays", "Materials — Commodity prices matter, inflation beneficiary", "Utilities — Bond-like, high dividend yields, regulated", "Real Estate (REITs) — Must pay 90%+ of income as dividends", "Communication Services — Mix of media, telecom, and internet"] },
        { type: "callout", content: "When a whole sector is out of favor, you may find the best bargains. Contrarian investors often look for quality companies in beaten-down sectors.", variant: "tip" },
      ],
      quiz: [
        { question: "Why shouldn't you compare a tech stock's P/E to a utility stock's P/E?", options: ["It's illegal", "Different sectors have different normal valuation ranges", "P/E only works for tech stocks", "Utilities don't have earnings"], correctIndex: 1, explanation: "Different sectors have inherently different growth rates, risk profiles, and capital structures. Tech stocks normally trade at higher P/E ratios than utilities because of higher expected growth." },
      ],
    },
    {
      id: "fundamental-10", title: "Analyst Ratings Explained", difficulty: "beginner", readTime: 4,
      content: [
        { type: "heading", content: "Buy, Hold, or Sell?" },
        { type: "text", content: "Wall Street analysts publish research reports with ratings and price targets for stocks. While these can be useful, understanding how to interpret them — and their limitations — is important." },
        { type: "heading", content: "Common Rating Systems" },
        { type: "list", content: "", items: ["Buy / Overweight / Outperform — Analyst expects the stock to beat the market", "Hold / Neutral / Market Perform — Expect performance roughly in line with market", "Sell / Underweight / Underperform — Expect the stock to lag the market", "Price Target — The analyst's 12-month price forecast"] },
        { type: "callout", content: "About 55% of analyst ratings are 'Buy,' 35% are 'Hold,' and only about 10% are 'Sell.' Analysts have conflicts of interest — their firms often do business with the companies they cover. Take ratings with a grain of salt.", variant: "warning" },
        { type: "heading", content: "What's Actually Useful" },
        { type: "list", content: "", items: ["Rating changes matter more than the rating itself (upgrade/downgrade)", "Consensus estimates for EPS and revenue are useful benchmarks", "Price target changes can move stocks significantly", "Read the actual research for insights, not just the headline rating", "Track which analysts have the best accuracy records"] },
        { type: "callout", content: "Use analyst reports for research and data, but make your own investment decisions. The best investors think independently.", variant: "tip" },
      ],
      quiz: [
        { question: "What percentage of analyst ratings are typically 'Sell'?", options: ["About 30%", "About 25%", "About 10%", "About 50%"], correctIndex: 2, explanation: "Only about 10% of analyst ratings are 'Sell.' Analysts tend to be overly optimistic, partly because their firms often have business relationships with the companies they cover." },
        { question: "What tends to move a stock price more?", options: ["The absolute rating (Buy/Hold/Sell)", "A rating change (upgrade or downgrade)", "The analyst's name", "The report length"], correctIndex: 1, explanation: "Rating changes (upgrades and downgrades) tend to move stock prices more than the absolute rating because they signal a shift in the analyst's view." },
      ],
    },
  ],
};
