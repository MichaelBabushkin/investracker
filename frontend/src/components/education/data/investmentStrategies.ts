import { Category } from "../types";

export const investmentStrategies: Category = {
  id: "investment-strategies",
  name: "Investment Strategies",
  emoji: "💰",
  description: "Proven approaches to building wealth in the stock market",
  gradient: "from-yellow-400 to-orange-500",
  topics: [
    {
      id: "strategies-1", title: "Value Investing (Buffett Style)", difficulty: "beginner", readTime: 7,
      content: [
        { type: "heading", content: "Buy Wonderful Companies at Fair Prices" },
        { type: "text", content: "Value investing, pioneered by Benjamin Graham and perfected by Warren Buffett, is the strategy of finding stocks trading below their intrinsic value. The idea is simple: buy dollar bills for 50 cents and wait for the market to recognize the true worth." },
        { type: "callout", content: "'Price is what you pay, value is what you get.' — Warren Buffett. The goal is to find a gap between a company's market price and its real business value.", variant: "key-concept" },
        { type: "heading", content: "Key Principles" },
        { type: "list", content: "", items: ["Margin of Safety — Buy below intrinsic value to protect against errors in your analysis", "Circle of Competence — Invest only in businesses you understand", "Long-term holding — Let compound interest work its magic (Buffett's average hold: forever)", "Quality over cheapness — Buffett evolved from Graham: better to buy a wonderful company at a fair price than a fair company at a wonderful price", "Economic moat — Seek companies with durable competitive advantages (brand, network effects, cost advantages)"] },
        { type: "heading", content: "What to Look For" },
        { type: "list", content: "", items: ["Low P/E ratio relative to peers and history", "Strong and consistent ROE (Return on Equity) above 15%", "Low debt-to-equity ratio", "Consistent earnings growth over 5-10 years", "Competent and honest management", "Understandable business model"] },
      ],
      quiz: [
        { question: "What is 'margin of safety' in value investing?", options: ["A type of stop-loss order", "Buying below intrinsic value to protect against errors", "The minimum account balance required", "The difference between bid and ask"], correctIndex: 1, explanation: "Margin of safety means buying a stock at a significant discount to its calculated intrinsic value, creating a buffer against mistakes in your analysis or unforeseen events." },
        { question: "What did Buffett mean by 'economic moat'?", options: ["A company's physical headquarters", "Durable competitive advantages that protect profits", "Government regulations", "High stock price"], correctIndex: 1, explanation: "An economic moat refers to a company's durable competitive advantages — like brand strength, patents, network effects, or cost advantages — that protect its market position and profits over time." },
      ],
    },
    {
      id: "strategies-2", title: "Growth Investing", difficulty: "beginner", readTime: 6,
      content: [
        { type: "heading", content: "Investing in the Future" },
        { type: "text", content: "Growth investing focuses on companies with above-average earnings or revenue growth potential. Growth investors are willing to pay premium valuations because they believe the company's rapid expansion will justify the price over time." },
        { type: "heading", content: "Growth vs Value" },
        { type: "text", content: "While value investors look for bargains, growth investors look for rockets. They prioritize revenue growth, market expansion, and innovation over current profitability. Think early investments in Amazon, Tesla, or Netflix before they became giants." },
        { type: "heading", content: "What Growth Investors Look For" },
        { type: "list", content: "", items: ["Revenue growth of 20%+ per year", "Large addressable market (TAM) with room to expand", "Innovative products or services with competitive advantages", "Strong management with a clear vision", "Reinvesting profits into growth rather than paying dividends", "PEG ratio (P/E divided by growth rate) below 1.0 is ideal"] },
        { type: "callout", content: "Growth stocks can be volatile. Amazon dropped 93% during the dot-com crash before becoming a $1.5 trillion company. Conviction and patience are essential.", variant: "warning" },
      ],
      quiz: [
        { question: "What do growth investors primarily look for?", options: ["Low P/E ratios", "High dividend yields", "Above-average revenue/earnings growth", "Low stock prices"], correctIndex: 2, explanation: "Growth investors focus on companies showing strong revenue and earnings growth potential, often accepting higher valuations for faster growth." },
        { question: "What is the PEG ratio?", options: ["Price to Equity Growth", "P/E divided by earnings growth rate", "Profit to Expense Grade", "Performance to Expectation Gap"], correctIndex: 1, explanation: "The PEG ratio divides the P/E ratio by the earnings growth rate. A PEG below 1.0 suggests a stock may be undervalued relative to its growth." },
      ],
    },
    {
      id: "strategies-3", title: "Dollar-Cost Averaging (DCA)", difficulty: "beginner", readTime: 5,
      content: [
        { type: "heading", content: "The Power of Consistency" },
        { type: "text", content: "Dollar-Cost Averaging (DCA) is investing a fixed amount of money at regular intervals, regardless of the stock price. This strategy removes the emotional burden of trying to 'time the market' and has been proven to work over long periods." },
        { type: "callout", content: "Example: Investing $500/month into an S&P 500 ETF. When prices are high, you buy fewer shares. When prices are low, you buy more. Over time, your average cost per share is lower than the average price.", variant: "example" },
        { type: "heading", content: "Why DCA Works" },
        { type: "list", content: "", items: ["Removes emotion from investing decisions", "Automatically buys more shares when prices are low", "No need to predict market direction", "Builds investing discipline and habit", "Reduces the impact of volatility on your portfolio", "Perfect for regular income (investing each paycheck)"] },
        { type: "callout", content: "Studies show that DCA underperforms lump-sum investing about 66% of the time (because markets trend upward). But DCA dramatically reduces the risk of investing a large sum at the worst possible time.", variant: "key-concept" },
      ],
      quiz: [
        { question: "What is Dollar-Cost Averaging?", options: ["Buying stocks at the lowest price", "Investing fixed amounts at regular intervals", "Only investing in US dollar stocks", "Averaging down on losing positions"], correctIndex: 1, explanation: "DCA means investing a fixed dollar amount at regular intervals (e.g., $500/month), regardless of market conditions." },
        { question: "What happens when prices drop during DCA?", options: ["You lose money permanently", "You should stop investing", "You automatically buy more shares for the same amount", "Your average cost goes up"], correctIndex: 2, explanation: "When prices drop, your fixed investment amount buys more shares, lowering your average cost per share. This is one of the key benefits of DCA." },
      ],
    },
    {
      id: "strategies-4", title: "Dividend Investing & DRIP", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Getting Paid While You Wait" },
        { type: "text", content: "Dividend investing focuses on buying stocks that pay regular, growing dividends. Combined with a DRIP (Dividend Reinvestment Plan), this creates a compounding machine that can generate substantial wealth and passive income over time." },
        { type: "heading", content: "Dividend Aristocrats" },
        { type: "text", content: "The Dividend Aristocrats are S&P 500 companies that have increased their dividends for at least 25 consecutive years. These include household names like Coca-Cola (60+ years), Johnson & Johnson (60+ years), and Procter & Gamble (65+ years). Their consistency makes them core holdings for income investors." },
        { type: "callout", content: "If you invested $10,000 in Coca-Cola in 1990 and reinvested all dividends, you'd have over $100,000 by 2024. Without reinvesting dividends? About $55,000. That's the power of DRIP.", variant: "key-concept" },
        { type: "heading", content: "Key Metrics for Dividend Investors" },
        { type: "list", content: "", items: ["Dividend Yield — Annual dividend / stock price (look for 2-6%)", "Payout Ratio — % of earnings paid as dividends (under 60% is sustainable)", "Dividend Growth Rate — How fast dividends are increasing year over year", "Years of consecutive increases — Longer streaks show commitment and stability", "Free Cash Flow coverage — Dividends should be well-covered by FCF"] },
      ],
      quiz: [
        { question: "What is a Dividend Aristocrat?", options: ["Any stock paying dividends", "S&P 500 company with 25+ years of consecutive dividend increases", "The highest yielding stock in any sector", "A company with a yield above 5%"], correctIndex: 1, explanation: "A Dividend Aristocrat is an S&P 500 company that has increased its dividend for at least 25 consecutive years, demonstrating exceptional financial stability." },
        { question: "What does DRIP stand for?", options: ["Daily Returns Investment Plan", "Dividend Reinvestment Plan", "Direct Registered Investment Portfolio", "Discounted Rate Investment Program"], correctIndex: 1, explanation: "DRIP stands for Dividend Reinvestment Plan — automatically reinvesting dividend payments to purchase more shares, creating a compounding effect." },
      ],
    },
    {
      id: "strategies-5", title: "Index Fund & ETF Strategies", difficulty: "beginner", readTime: 6,
      content: [
        { type: "heading", content: "The Simplest Path to Wealth" },
        { type: "text", content: "Index investing means buying funds that track a market index, giving you broad diversification at minimal cost. Warren Buffett famously bet $1 million that an S&P 500 index fund would beat a collection of hedge funds over 10 years — and won decisively." },
        { type: "callout", content: "Over 90% of actively managed large-cap funds underperform the S&P 500 over a 15-year period. The simple index approach beats most professionals.", variant: "key-concept" },
        { type: "heading", content: "Popular Index Strategies" },
        { type: "list", content: "", items: ["Three-Fund Portfolio — Total US Stock Market + International + Bonds (the Boglehead approach)", "S&P 500 Core — Single fund covering 500 largest US companies", "Total Market — One fund covering entire US stock market (3,000+ stocks)", "Target Date Funds — Automatically adjusts stock/bond mix as you approach retirement"] },
        { type: "heading", content: "Expense Ratios Matter" },
        { type: "text", content: "The expense ratio is the annual fee charged by a fund. Index funds typically charge 0.03-0.20%, while actively managed funds charge 0.50-1.50%. Over 30 years, that difference can cost you hundreds of thousands of dollars." },
        { type: "callout", content: "A 1% higher fee on a $100,000 portfolio over 30 years (at 8% returns) costs you over $230,000 in lost gains. Keep fees low!", variant: "warning" },
      ],
      quiz: [
        { question: "What percentage of active funds underperform the S&P 500 over 15 years?", options: ["About 50%", "About 70%", "About 90%", "About 30%"], correctIndex: 2, explanation: "Research consistently shows that over 90% of actively managed large-cap funds fail to beat the S&P 500 index over a 15-year period." },
        { question: "Why are expense ratios important?", options: ["They determine stock selection", "Small fee differences compound into large losses over time", "They measure fund performance", "They indicate fund safety"], correctIndex: 1, explanation: "Even a small difference in expense ratios (like 1%) can cost hundreds of thousands of dollars over decades due to the compounding effect of fees." },
      ],
    },
    {
      id: "strategies-6", title: "Momentum Trading", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Riding the Wave" },
        { type: "text", content: "Momentum trading is based on the observation that stocks that have performed well tend to continue performing well, and stocks that have performed poorly tend to keep declining. The strategy involves buying winners and selling losers." },
        { type: "heading", content: "How Momentum Works" },
        { type: "text", content: "Academic research has confirmed the 'momentum factor' — stocks with strong recent performance (3-12 months) tend to outperform over the following 3-12 months. This is driven by behavioral biases: investors are slow to react to good news and overreact to trends." },
        { type: "heading", content: "Momentum Signals" },
        { type: "list", content: "", items: ["Relative strength — Stock outperforming its sector/market", "52-week high — Stocks near highs tend to keep rising (counterintuitive but proven)", "Moving average crossovers — Price crossing above key moving averages", "Sector momentum — Entire sectors can exhibit momentum", "Earnings momentum — Companies beating estimates consecutively"] },
        { type: "callout", content: "Momentum works until it doesn't. Momentum strategies can suffer sharp, sudden reversals ('momentum crashes'). Always use stop-losses to protect against rapid trend changes.", variant: "warning" },
      ],
      quiz: [
        { question: "What is the core idea behind momentum trading?", options: ["Buy low, sell high", "Winners tend to keep winning", "Buy stocks at 52-week lows", "Only trade on news"], correctIndex: 1, explanation: "Momentum trading is based on the observation that stocks with recent strong performance tend to continue performing well over the following months." },
      ],
    },
    {
      id: "strategies-7", title: "Swing Trading Basics", difficulty: "intermediate", readTime: 7,
      content: [
        { type: "heading", content: "Capturing Medium-Term Moves" },
        { type: "text", content: "Swing trading involves holding positions for days to weeks to capture short-to-medium term price movements. It sits between day trading (minutes to hours) and position trading (months to years), making it ideal for people who can't watch markets all day." },
        { type: "heading", content: "Swing Trading vs Day Trading" },
        { type: "list", content: "", items: ["Swing: Hold 2 days to 2 weeks | Day: Hold minutes to hours", "Swing: Check charts 1-2 times daily | Day: Watch screens constantly", "Swing: Uses daily/4-hour charts | Day: Uses 1-minute to 15-minute charts", "Swing: Lower stress, fewer trades | Day: Higher stress, many trades per day", "Swing: Works with a full-time job | Day: Essentially IS a full-time job"] },
        { type: "heading", content: "Swing Trading Process" },
        { type: "list", content: "", items: ["1. Scan for setups: Look for stocks pulling back to support in an uptrend", "2. Plan the trade: Define entry, stop-loss, and target before entering", "3. Enter on confirmation: Wait for a bullish candlestick pattern at support", "4. Manage the position: Trail your stop-loss as the trade moves in your favor", "5. Exit at target or stop: Stick to the plan, don't let emotions take over"] },
        { type: "callout", content: "The ideal swing trade has a risk/reward ratio of at least 1:2 or 1:3. Risk $1 to potentially make $2-3.", variant: "key-concept" },
      ],
      quiz: [
        { question: "How long does a typical swing trade last?", options: ["Minutes to hours", "2 days to 2 weeks", "3 months to a year", "Over a year"], correctIndex: 1, explanation: "Swing trades typically last from 2 days to about 2 weeks, capturing medium-term price movements." },
        { question: "What risk/reward ratio should swing traders aim for?", options: ["1:1", "1:2 or better", "3:1 (risk more than reward)", "Doesn't matter"], correctIndex: 1, explanation: "Swing traders should aim for at least a 1:2 risk/reward ratio, meaning the potential reward is at least twice the risk. This way, you can be profitable even if only half your trades win." },
      ],
    },
    {
      id: "strategies-8", title: "Sector Rotation Strategy", difficulty: "advanced", readTime: 6,
      content: [
        { type: "heading", content: "Following the Economic Cycle" },
        { type: "text", content: "Sector rotation is a strategy based on the observation that different sectors of the economy perform better at different stages of the business cycle. By rotating investments into the leading sectors, investors can potentially outperform the broad market." },
        { type: "heading", content: "The Four Phases" },
        { type: "list", content: "", items: ["Early Recovery — Financials, technology, consumer discretionary lead (low rates, improving sentiment)", "Mid Expansion — Industrials, materials, energy lead (economy growing, demand rising)", "Late Expansion — Energy, materials, staples lead (inflation rising, rates increasing)", "Recession — Utilities, healthcare, consumer staples lead (defensive sectors outperform)"] },
        { type: "callout", content: "Defensive sectors (utilities, healthcare, staples) are called 'defensive' because people still pay electricity bills, buy medicine, and eat food regardless of the economy.", variant: "key-concept" },
        { type: "heading", content: "Implementation" },
        { type: "text", content: "Use sector ETFs (like XLF for Financials, XLK for Technology, XLE for Energy) to easily rotate between sectors. Monitor economic indicators like GDP growth, unemployment, and interest rates to identify the current cycle phase." },
      ],
      quiz: [
        { question: "Which sectors typically lead during a recession?", options: ["Technology and financials", "Energy and materials", "Utilities, healthcare, and consumer staples", "Industrials and real estate"], correctIndex: 2, explanation: "During recessions, defensive sectors like utilities, healthcare, and consumer staples tend to outperform because demand for their products remains relatively stable." },
      ],
    },
    {
      id: "strategies-9", title: "Pairs Trading", difficulty: "advanced", readTime: 6,
      content: [
        { type: "heading", content: "Market-Neutral Profit" },
        { type: "text", content: "Pairs trading is a market-neutral strategy that involves simultaneously buying one stock and short-selling a correlated stock when their price relationship diverges from the historical norm. You profit when the spread between them reverts to normal." },
        { type: "callout", content: "Example: Coca-Cola and Pepsi normally move together. If Coke suddenly underperforms Pepsi by an unusual amount, a pairs trader would buy Coke and short Pepsi, betting the spread will normalize.", variant: "example" },
        { type: "heading", content: "How It Works" },
        { type: "list", content: "", items: ["1. Identify two highly correlated stocks (same sector, similar business models)", "2. Calculate their historical price ratio or spread", "3. When the spread deviates significantly (2+ standard deviations), enter the trade", "4. Buy the underperformer, short the outperformer", "5. Exit when the spread reverts to the mean"] },
        { type: "callout", content: "Pairs trading is 'market-neutral' — you can profit whether the overall market goes up or down. Your return comes from the relative performance between the two stocks.", variant: "key-concept" },
      ],
      quiz: [
        { question: "Why is pairs trading considered 'market-neutral'?", options: ["It only trades during flat markets", "Profit comes from relative performance, not market direction", "It uses no leverage", "It only trades bonds"], correctIndex: 1, explanation: "Pairs trading is market-neutral because you're simultaneously long one stock and short another. Your profit depends on the relative performance between the pair, not on the overall market direction." },
      ],
    },
    {
      id: "strategies-10", title: "Building a Diversified Portfolio", difficulty: "intermediate", readTime: 7,
      content: [
        { type: "heading", content: "Don't Put All Your Eggs in One Basket" },
        { type: "text", content: "Diversification is the only 'free lunch' in investing. By spreading investments across different asset classes, sectors, and geographies, you reduce risk without necessarily reducing expected returns." },
        { type: "heading", content: "Levels of Diversification" },
        { type: "list", content: "", items: ["Asset Class — Stocks, bonds, real estate, commodities, cash", "Geographic — US, international developed, emerging markets", "Sector — Technology, healthcare, financials, energy, etc.", "Company Size — Large-cap, mid-cap, small-cap", "Style — Growth stocks, value stocks, dividend stocks"] },
        { type: "callout", content: "Research suggests that 20-30 stocks across different sectors capture most diversification benefits for stock-only portfolios. Beyond that, additional stocks add minimal risk reduction.", variant: "key-concept" },
        { type: "heading", content: "Sample Portfolios by Age" },
        { type: "list", content: "", items: ["20s-30s (Aggressive): 90% stocks (60% US, 30% international), 10% bonds", "40s-50s (Moderate): 70% stocks, 25% bonds, 5% alternatives", "60s+ (Conservative): 50% stocks, 40% bonds, 10% cash/alternatives", "Rule of thumb: Bond allocation ≈ your age (e.g., 30 years old → 30% bonds). Though many experts now suggest age minus 10 or 20."] },
        { type: "callout", content: "Rebalance your portfolio at least once a year. If stocks outperform and grow to 80% of your portfolio (from a target of 70%), sell some stocks and buy bonds to return to your target allocation.", variant: "tip" },
      ],
      quiz: [
        { question: "How many stocks are needed to capture most diversification benefits?", options: ["5-10", "20-30", "100+", "500+"], correctIndex: 1, explanation: "Research shows that 20-30 stocks across different sectors capture most of the diversification benefits. Adding more stocks beyond that provides diminishing risk reduction." },
        { question: "What is portfolio rebalancing?", options: ["Selling all stocks to cash", "Adjusting allocations back to target percentages", "Only buying new investments", "Switching to a new broker"], correctIndex: 1, explanation: "Rebalancing means adjusting your portfolio back to your target allocation (e.g., 70% stocks, 30% bonds) when market movements cause drift from those targets." },
      ],
    },
  ],
};
