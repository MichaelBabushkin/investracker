import { Category } from "../types";

export const riskManagement: Category = {
  id: "risk-management",
  name: "Risk Management",
  emoji: "⚠️",
  description: "Protect your capital and manage risk like professional traders",
  gradient: "from-red-400 to-rose-600",
  topics: [
    {
      id: "risk-1", title: "Why Risk Management Matters", difficulty: "beginner", readTime: 5,
      content: [
        { type: "heading", content: "The #1 Rule: Don't Lose Money" },
        { type: "text", content: "Warren Buffett's two rules of investing: Rule #1 — Never lose money. Rule #2 — Never forget Rule #1. While losses are inevitable, managing them is what separates successful investors from those who blow up their accounts." },
        { type: "callout", content: "If you lose 50% of your portfolio, you need a 100% gain just to break even. If you lose 90%, you need a 900% gain. Protecting against large losses is mathematically critical.", variant: "key-concept" },
        { type: "heading", content: "The Math of Recovery" },
        { type: "list", content: "", items: ["10% loss → Need 11% gain to recover", "25% loss → Need 33% gain to recover", "50% loss → Need 100% gain to recover", "75% loss → Need 300% gain to recover", "90% loss → Need 900% gain to recover"] },
        { type: "text", content: "This asymmetry is why professional traders focus more on managing downside risk than maximizing upside. Consistent, moderate returns with limited drawdowns will always beat volatile swings between big wins and big losses." },
        { type: "callout", content: "The best traders are right only 40-60% of the time. They succeed because their winners are bigger than their losers — that's risk management in action.", variant: "tip" },
      ],
      quiz: [
        { question: "How much do you need to gain to recover from a 50% loss?", options: ["50%", "75%", "100%", "150%"], correctIndex: 2, explanation: "After a 50% loss, you need a 100% gain to get back to even. If $100 drops to $50, you need $50 to double back to $100 — that's a 100% gain on $50." },
        { question: "What separates successful traders from unsuccessful ones?", options: ["Being right 90% of the time", "Finding the best stocks", "Managing risk so winners exceed losers", "Trading more frequently"], correctIndex: 2, explanation: "Successful traders often win only 40-60% of the time, but their winners are significantly larger than their losers thanks to disciplined risk management." },
      ],
    },
    {
      id: "risk-2", title: "Position Sizing & the 1-2% Rule", difficulty: "beginner", readTime: 5,
      content: [
        { type: "heading", content: "How Much to Risk Per Trade" },
        { type: "text", content: "Position sizing determines how many shares to buy based on your risk tolerance. The 1-2% rule says you should never risk more than 1-2% of your total portfolio on any single trade. This ensures that even a string of losses won't devastate your account." },
        { type: "callout", content: "With a $50,000 account and 2% risk: Maximum loss per trade = $1,000. If your stop-loss is $5 below entry, you can buy 200 shares ($1,000 ÷ $5). This is how you calculate position size!", variant: "example" },
        { type: "formula", content: "Position Size = (Account × Risk %) / (Entry Price − Stop Price)\n\nExample: ($50,000 × 0.02) / ($50 − $45) = $1,000 / $5 = 200 shares" },
        { type: "heading", content: "Why This Works" },
        { type: "list", content: "", items: ["10 consecutive losses at 2% risk = 18.3% total loss (painful but survivable)", "10 consecutive losses at 10% risk = 65.1% total loss (devastating)", "Even with a 50% win rate, proper sizing keeps you in the game", "It takes emotion out of sizing decisions"] },
        { type: "callout", content: "Professional traders typically risk 0.5-1% per trade. New traders should start with 1% until they have a proven edge.", variant: "tip" },
      ],
      quiz: [
        { question: "With a $100,000 account and 1% risk, what's the max loss per trade?", options: ["$100", "$500", "$1,000", "$10,000"], correctIndex: 2, explanation: "1% of a $100,000 account is $1,000. This is the maximum you should be willing to lose on any single trade." },
        { question: "How do you calculate position size?", options: ["Account balance divided by stock price", "Risk amount divided by distance to stop-loss", "Equal dollar amounts for every trade", "Based on gut feeling"], correctIndex: 1, explanation: "Position size = (Account × Risk %) ÷ (Entry Price − Stop Price). This ensures your loss is capped at your risk percentage if your stop-loss is hit." },
      ],
    },
    {
      id: "risk-3", title: "Stop-Loss Orders & Trailing Stops", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Your Safety Net" },
        { type: "text", content: "A stop-loss order automatically sells your position when the price drops to a predetermined level. It's the most important risk management tool in your arsenal — it ensures losses stay small and removes the emotional decision to 'hold and hope.'" },
        { type: "heading", content: "Types of Stops" },
        { type: "list", content: "", items: ["Fixed Stop-Loss — Set at a specific price (e.g., 'sell if stock drops to $45')", "Percentage Stop — Set at a % below entry (e.g., 'sell if stock drops 8% from entry')", "ATR Stop — Set at 1.5-2× ATR below entry (adapts to stock's volatility)", "Support-Level Stop — Set just below a key technical support level", "Trailing Stop — Moves up with the stock price, locks in profits as the trade moves in your favor"] },
        { type: "callout", content: "A trailing stop follows the price up but never moves down. If you set a $3 trailing stop and the stock rises from $50 to $60, your stop moves from $47 to $57. If the stock then drops to $57, you're sold out with a $7 profit instead of the original $3 risk.", variant: "key-concept" },
        { type: "heading", content: "Common Mistakes" },
        { type: "list", content: "", items: ["Stop too tight — Normal fluctuations trigger the stop before the trade works", "Stop too loose — Defeats the purpose of risk management", "Moving the stop further away — The cardinal sin! Never give a losing trade 'more room'", "No stop at all — Hoping a stock will come back is not a strategy"] },
      ],
      quiz: [
        { question: "What does a trailing stop do?", options: ["Moves down as the price drops", "Moves up with the price but never moves down", "Stays at a fixed price", "Only activates during market hours"], correctIndex: 1, explanation: "A trailing stop moves up as the stock price increases, locking in profits, but it never moves down. It sells the position if the price drops by the specified trailing amount." },
        { question: "What is the 'cardinal sin' of stop-loss management?", options: ["Setting stops too tight", "Using trailing stops", "Moving the stop further away on a losing trade", "Not using limit orders"], correctIndex: 2, explanation: "Moving your stop-loss further away to give a losing trade 'more room' is the most dangerous mistake. It turns small, manageable losses into large, account-damaging ones." },
      ],
    },
    {
      id: "risk-4", title: "Risk/Reward Ratio", difficulty: "intermediate", readTime: 5,
      content: [
        { type: "heading", content: "Risk Less, Reward More" },
        { type: "text", content: "The risk/reward ratio compares the potential loss on a trade to the potential gain. A 1:3 ratio means you're risking $1 to potentially make $3. Professional traders won't enter a trade unless the reward significantly exceeds the risk." },
        { type: "formula", content: "Risk/Reward Ratio = (Entry − Stop Loss) / (Target − Entry)\n\nExample: Buy at $50, Stop at $47, Target at $59\nRisk = $3, Reward = $9\nRatio = 1:3" },
        { type: "heading", content: "Why R:R Matters" },
        { type: "text", content: "With a 1:3 risk/reward ratio, you can be wrong 70% of the time and still break even! Win 3 out of 10 trades: 3 wins × $3 = $9, 7 losses × $1 = $7. Net profit: $2. This is why risk/reward is more important than win rate." },
        { type: "callout", content: "Minimum acceptable ratios: Day trading = 1:1.5, Swing trading = 1:2, Position trading = 1:3 or better.", variant: "key-concept" },
        { type: "heading", content: "Calculating Before You Trade" },
        { type: "list", content: "", items: ["Always calculate R:R BEFORE entering a trade", "If R:R is less than 1:2, skip the trade — wait for a better setup", "Use limit orders for targets and stop-losses for risk", "Adjust position size based on the risk amount, not the reward"] },
      ],
      quiz: [
        { question: "With a 1:3 risk/reward, what win rate do you need to break even?", options: ["50%", "33%", "25%", "75%"], correctIndex: 2, explanation: "With 1:3 R:R, you need to win only 25% of the time to break even. Winning 25 out of 100 trades: 25 × $3 = $75, 75 × $1 = $75. Net = $0 (breakeven)." },
      ],
    },
    {
      id: "risk-5", title: "Portfolio Diversification", difficulty: "beginner", readTime: 6,
      content: [
        { type: "heading", content: "The Only Free Lunch in Finance" },
        { type: "text", content: "Harry Markowitz, who won the Nobel Prize for Modern Portfolio Theory, called diversification 'the only free lunch in investing.' By spreading investments across uncorrelated assets, you can reduce risk without proportionally reducing expected returns." },
        { type: "heading", content: "Types of Diversification" },
        { type: "list", content: "", items: ["Across stocks — Don't put more than 5-10% in any single stock", "Across sectors — Spread across technology, healthcare, financials, etc.", "Across geographies — US, international developed, emerging markets", "Across asset classes — Stocks, bonds, real estate, commodities", "Across time — Dollar-cost averaging spreads entry points over time"] },
        { type: "callout", content: "Correlation is key. Owning 20 tech stocks is NOT true diversification. You want assets that don't all move in the same direction at the same time.", variant: "key-concept" },
        { type: "heading", content: "Over-Diversification" },
        { type: "text", content: "It's possible to over-diversify. Owning 100+ individual stocks makes it nearly impossible to outperform the market, and you're essentially recreating an index fund at higher cost. A focused portfolio of 15-30 well-researched stocks across sectors is the sweet spot." },
      ],
      quiz: [
        { question: "Who called diversification 'the only free lunch in investing'?", options: ["Warren Buffett", "Harry Markowitz", "Benjamin Graham", "Peter Lynch"], correctIndex: 1, explanation: "Harry Markowitz, who developed Modern Portfolio Theory and won the Nobel Prize in Economics, coined the term 'the only free lunch in investing' to describe diversification." },
        { question: "What is the key to effective diversification?", options: ["Owning as many stocks as possible", "Investing in assets with low correlation to each other", "Only buying large-cap stocks", "Avoiding international markets"], correctIndex: 1, explanation: "Effective diversification requires holding assets that aren't highly correlated — meaning they don't all move in the same direction at the same time." },
      ],
    },
    {
      id: "risk-6", title: "Hedging With Options (Intro)", difficulty: "advanced", readTime: 7,
      content: [
        { type: "heading", content: "Insurance for Your Portfolio" },
        { type: "text", content: "Options can be used as insurance to protect your portfolio against significant losses. Just as you insure your car against accidents, you can use put options to protect your stocks against crashes. This is called hedging." },
        { type: "heading", content: "Protective Put Strategy" },
        { type: "text", content: "A protective put involves buying a put option on a stock you own. The put gives you the right to sell at the strike price, regardless of how far the stock falls. It's like having a guaranteed floor price." },
        { type: "callout", content: "You own 100 shares of AAPL at $180. You buy a $170 put for $3. If AAPL crashes to $120, you can still sell at $170 — limiting your loss to $13/share ($10 price drop + $3 premium) instead of $60/share.", variant: "example" },
        { type: "heading", content: "Key Hedging Concepts" },
        { type: "list", content: "", items: ["Protective puts cost money (the premium) — it's the price of insurance", "Collar strategy — Buy a protective put AND sell a covered call to offset the put cost", "Portfolio-level hedging — Buy puts on index ETFs (SPY) to protect entire portfolio", "The cost of hedging reduces your overall return — only hedge when risk is elevated"] },
        { type: "callout", content: "Options are complex instruments. Only use hedging strategies after thoroughly understanding how options work. Mistakes can amplify rather than reduce risk.", variant: "warning" },
      ],
      quiz: [
        { question: "What does a protective put do?", options: ["Guarantees profit on a stock", "Sets a floor price for a stock you own", "Eliminates all risk", "Increases your leverage"], correctIndex: 1, explanation: "A protective put sets a floor price (the strike price) for a stock you own. No matter how far the stock falls, you can exercise the put and sell at the strike price." },
      ],
    },
    {
      id: "risk-7", title: "Volatility & Beta", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Measuring Risk" },
        { type: "text", content: "Volatility and beta are two essential measures of risk. Volatility tells you how much a stock's price swings, while beta tells you how much it moves relative to the overall market." },
        { type: "heading", content: "Volatility" },
        { type: "text", content: "Volatility is measured by the standard deviation of returns. High volatility means big price swings (both up and down). Low volatility means more stable prices. The VIX index (the 'fear index') measures expected volatility of the S&P 500." },
        { type: "heading", content: "Beta" },
        { type: "list", content: "", items: ["Beta = 1.0 — Moves in line with the market", "Beta > 1.0 — More volatile than market (tech stocks often 1.2-1.5)", "Beta < 1.0 — Less volatile than market (utilities often 0.3-0.6)", "Beta < 0 — Moves opposite to the market (rare, gold sometimes)"] },
        { type: "formula", content: "If a stock has Beta = 1.5:\nMarket goes up 10% → Stock goes up ~15%\nMarket goes down 10% → Stock goes down ~15%" },
        { type: "callout", content: "In bull markets, you want high-beta stocks for amplified gains. In uncertain times, shift toward low-beta stocks for protection. This is dynamic risk management.", variant: "key-concept" },
      ],
      quiz: [
        { question: "What does a beta of 0.5 mean?", options: ["The stock moves twice as much as the market", "The stock moves half as much as the market", "The stock always goes up", "The stock is risky"], correctIndex: 1, explanation: "A beta of 0.5 means the stock tends to move only half as much as the overall market. If the market drops 10%, this stock would typically drop about 5%." },
      ],
    },
    {
      id: "risk-8", title: "Correlation & Asset Allocation", difficulty: "advanced", readTime: 7,
      content: [
        { type: "heading", content: "Building a Resilient Portfolio" },
        { type: "text", content: "Correlation measures how two assets move relative to each other. Combining assets with low or negative correlation creates a portfolio that's more stable than any individual holding. This is the mathematical basis of diversification." },
        { type: "heading", content: "Correlation Scale" },
        { type: "list", content: "", items: ["+1.0 — Perfect positive correlation (move in lockstep)", "+0.5 to +0.9 — Moderate positive (tend to move together)", "0 — No correlation (independent movement)", "−0.5 to −0.9 — Moderate negative (tend to move opposite)", "−1.0 — Perfect negative correlation (exact opposite movement)"] },
        { type: "callout", content: "Historical correlation: US Stocks vs Bonds ≈ −0.2 to +0.3, US Stocks vs Gold ≈ 0.0, US Stocks vs Real Estate ≈ +0.6, US Stocks vs International Stocks ≈ +0.7", variant: "key-concept" },
        { type: "heading", content: "Strategic Asset Allocation" },
        { type: "text", content: "The goal is to combine asset classes with different correlation profiles. When stocks crash, bonds often rally (negative correlation), cushioning the blow. Adding gold, real estate, and international assets further reduces portfolio-level volatility." },
      ],
      quiz: [
        { question: "What correlation between assets is ideal for diversification?", options: ["+1.0 (perfect positive)", "0 or negative", "+0.8 (high positive)", "Correlation doesn't matter"], correctIndex: 1, explanation: "Low or negative correlation is ideal for diversification. When one asset falls, an uncorrelated or negatively correlated asset may hold steady or rise, reducing portfolio-level risk." },
      ],
    },
    {
      id: "risk-9", title: "Drawdown & Recovery Analysis", difficulty: "intermediate", readTime: 5,
      content: [
        { type: "heading", content: "Measuring Worst-Case Scenarios" },
        { type: "text", content: "Drawdown is the peak-to-trough decline in a portfolio's value before a new peak is reached. It's one of the most important risk metrics because it tells you the worst-case pain you might experience." },
        { type: "formula", content: "Drawdown = (Peak Value − Trough Value) / Peak Value × 100\nMax Drawdown = The largest drawdown ever experienced" },
        { type: "heading", content: "Historical Market Drawdowns" },
        { type: "list", content: "", items: ["2008 Financial Crisis: S&P 500 drawdown of −56.8% (took 5.5 years to recover)", "2020 COVID Crash: −33.9% (recovered in just 5 months)", "2000 Dot-Com Bust: −49.1% (took 7 years to recover)", "1987 Black Monday: −33.5% (recovered in 2 years)"] },
        { type: "callout", content: "Before investing, honestly ask yourself: 'Can I stomach a 50% drawdown and not sell?' If the answer is no, you need more bonds/cash in your portfolio or smaller positions.", variant: "key-concept" },
        { type: "heading", content: "Recovery Time" },
        { type: "text", content: "Drawdown depth determines recovery time. Shallow drawdowns (10-20%) recover relatively quickly. Deep drawdowns (40%+) can take years. This is why limiting maximum drawdown is often more important than maximizing returns." },
      ],
      quiz: [
        { question: "What was the approximate S&P 500 drawdown during the 2008 crisis?", options: ["About 25%", "About 35%", "About 57%", "About 75%"], correctIndex: 2, explanation: "The S&P 500 experienced a maximum drawdown of approximately 56.8% during the 2008 financial crisis, one of the worst in modern history." },
      ],
    },
    {
      id: "risk-10", title: "Trading Psychology & Emotional Discipline", difficulty: "intermediate", readTime: 6,
      content: [
        { type: "heading", content: "Master Your Mind, Master the Markets" },
        { type: "text", content: "The biggest risk in investing isn't the market — it's yourself. Emotional decisions driven by fear and greed account for more losses than any bad stock pick. Understanding behavioral biases is essential to long-term success." },
        { type: "heading", content: "Common Psychological Traps" },
        { type: "list", content: "", items: ["Loss Aversion — Losses feel 2x more painful than equivalent gains feel good, leading to holding losers too long", "FOMO (Fear of Missing Out) — Buying after a stock has already surged because 'everyone is making money'", "Confirmation Bias — Only seeking information that supports your existing position", "Anchoring — Fixating on the price you paid rather than where the stock is going", "Overconfidence — After a winning streak, taking bigger risks and ignoring warning signs", "Herd Mentality — Following the crowd into crowded trades (often near the top)"] },
        { type: "callout", content: "Keep a trading journal. Write down why you entered every trade, your planned exit, and your emotional state. Reviewing this regularly reveals patterns in your decision-making you wouldn't otherwise see.", variant: "key-concept" },
        { type: "heading", content: "Building Emotional Discipline" },
        { type: "list", content: "", items: ["Create a trading plan BEFORE the market opens", "Define exact entry, stop-loss, and target for every trade", "Never trade when angry, euphoric, or intoxicated", "Take breaks after significant wins or losses", "Accept that losses are a normal cost of doing business", "Focus on the process, not individual trade outcomes"] },
        { type: "callout", content: "The market is designed to make you do the wrong thing at the wrong time. When everyone is euphoric, it's time to be cautious. When everyone is panicking, it's time to look for opportunities.", variant: "tip" },
      ],
      quiz: [
        { question: "What is 'loss aversion'?", options: ["Avoiding all investment risk", "Losses feeling more painful than equivalent gains feel good", "Selling winners too quickly", "Only trading safe assets"], correctIndex: 1, explanation: "Loss aversion is the psychological tendency for losses to feel about twice as painful as equivalent gains feel pleasurable. This bias leads investors to hold losing positions too long, hoping to avoid 'locking in' the loss." },
        { question: "What's the best tool for improving emotional discipline?", options: ["Trading more frequently", "Keeping a trading journal", "Following market news constantly", "Using leverage"], correctIndex: 1, explanation: "A trading journal forces you to document your reasoning and emotions for every trade. Reviewing it reveals behavioral patterns and biases that undermine your performance." },
      ],
    },
  ],
};
