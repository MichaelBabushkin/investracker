import React, { useState, useEffect } from 'react';
import { Wallet, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { StockPortfolio } from '@/types/stock-detail';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockYourPositionProps {
  portfolio: StockPortfolio;
  currency: string;
  currentPrice: number | null;
}

const getCurrencySymbol = (cur: string) => {
  if (cur === 'ILS' || cur === '₪') return '₪';
  if (cur === 'USD' || cur === '$') return '$';
  return cur;
};

/**
 * Compact full-width band under the page header: the user's own stake comes
 * before any market data. Renders nothing when the stock isn't held.
 * Includes an exit calculator for estimating payout and profits.
 */
export default function StockYourPosition({ portfolio, currency, currentPrice }: StockYourPositionProps) {
  if (!portfolio.held || portfolio.quantity === 0) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [refType, setRefType] = useState<'cost' | 'current'>('cost');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [targetReturnPct, setTargetReturnPct] = useState<string>('');

  const avgCost = portfolio.avg_cost_per_share ?? 0;
  const current = currentPrice ?? 0;
  const currencySymbol = getCurrencySymbol(currency);

  const updatePrice = (priceStr: string, currentRefType: 'cost' | 'current' = refType) => {
    setTargetPrice(priceStr);
    const p = parseFloat(priceStr);
    if (isNaN(p)) {
      setTargetReturnPct('');
      return;
    }
    const basePrice = currentRefType === 'cost' ? avgCost : current;
    if (basePrice > 0) {
      const pct = ((p - basePrice) / basePrice) * 100;
      setTargetReturnPct(pct.toFixed(2));
    } else {
      setTargetReturnPct('');
    }
  };

  const updateReturn = (pctStr: string, currentRefType: 'cost' | 'current' = refType) => {
    setTargetReturnPct(pctStr);
    const pct = parseFloat(pctStr);
    if (isNaN(pct)) {
      setTargetPrice('');
      return;
    }
    const basePrice = currentRefType === 'cost' ? avgCost : current;
    const price = basePrice * (1 + pct / 100);
    setTargetPrice(price.toFixed(2));
  };

  const handleRefTypeChange = (newRef: 'cost' | 'current') => {
    setRefType(newRef);
    if (targetPrice) {
      updatePrice(targetPrice, newRef);
    }
  };

  const handlePriceChange = (val: string) => {
    updatePrice(val);
  };

  const handleReturnChange = (val: string) => {
    updateReturn(val);
  };

  // Initialize values when currentPrice or avgCost changes
  useEffect(() => {
    const initialPrice = currentPrice || portfolio.avg_cost_per_share || 0;
    if (initialPrice > 0) {
      setTargetPrice(initialPrice.toFixed(2));
      const base = refType === 'cost' ? avgCost : current;
      if (base > 0) {
        setTargetReturnPct(((initialPrice - base) / base * 100).toFixed(2));
      }
    }
  }, [currentPrice, portfolio.avg_cost_per_share]);

  // Set default reference type based on availability
  useEffect(() => {
    if (!portfolio.avg_cost_per_share && currentPrice) {
      setRefType('current');
    }
  }, [portfolio.avg_cost_per_share, currentPrice]);

  const plPositive = portfolio.unrealized_pl >= 0;

  const cells: Array<{ label: string; value: React.ReactNode; cls?: string }> = [
    {
      label: 'Shares Held',
      value: portfolio.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    {
      label: 'Avg Cost',
      value: formatCurrency(portfolio.avg_cost_per_share, currency as MarketCurrency),
    },
    {
      label: 'Current Value',
      value: formatCurrency(portfolio.current_value, currency as MarketCurrency),
    },
    {
      label: 'Unrealized P&L',
      value: (
        <>
          {plPositive ? '+' : '-'}
          {formatCurrency(Math.abs(portfolio.unrealized_pl), currency as MarketCurrency)}
          <span className="ml-1.5 text-sm font-medium">
            ({plPositive ? '+' : ''}{portfolio.unrealized_pl_pct.toFixed(2)}%)
          </span>
        </>
      ),
      cls: plPositive ? 'text-gain' : 'text-loss',
    },
  ];

  // Outputs for the calculator
  const parsedPrice = parseFloat(targetPrice);
  const isValid = !isNaN(parsedPrice) && parsedPrice >= 0;

  const totalSaleValue = isValid ? portfolio.quantity * parsedPrice : 0;
  const costBasis = portfolio.purchase_cost;
  const profitVsCost = isValid ? totalSaleValue - costBasis : 0;
  const profitVsCostPct = costBasis > 0 ? (profitVsCost / costBasis) * 100 : 0;

  const currentVal = portfolio.current_value;
  const profitVsCurrent = isValid ? totalSaleValue - currentVal : 0;
  const profitVsCurrentPct = currentVal > 0 ? (profitVsCurrent / currentVal) * 100 : 0;

  return (
    <div className="bg-surface-dark-secondary border border-white/10 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-brand-400" />
          <span className="text-sm font-heading font-semibold text-gray-200">Your Position</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1"
        >
          <Calculator size={13} className="text-brand-400" />
          <span>Exit Calculator</span>
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
        {cells.map(({ label, value, cls }) => (
          <div key={label}>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-lg font-semibold tabular-nums ${cls ?? 'text-gray-100'}`}>{value}</div>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Inputs Column */}
            <div className="lg:col-span-6 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-gray-400 font-medium">Estimate return relative to:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRefTypeChange('cost')}
                    disabled={!portfolio.avg_cost_per_share}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      refType === 'cost'
                        ? 'bg-brand-400/10 border-brand-400/30 text-brand-400'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    } disabled:opacity-30`}
                  >
                    Avg Cost ({formatCurrency(avgCost, currency as MarketCurrency)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefTypeChange('current')}
                    disabled={!currentPrice}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      refType === 'current'
                        ? 'bg-brand-400/10 border-brand-400/30 text-brand-400'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    } disabled:opacity-30`}
                  >
                    Current Price ({formatCurrency(current, currency as MarketCurrency)})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 font-medium">Target Sale Price</label>
                  <div className="relative rounded-lg shadow-sm w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm font-medium">{currencySymbol}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={targetPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="bg-white/5 border border-white/10 focus:border-brand-400/50 focus:ring-1 focus:ring-brand-400/50 rounded-lg py-1.5 pl-7 pr-3 text-sm text-gray-100 focus:outline-none w-full tabular-nums transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500 font-medium">Target Return</label>
                  <div className="relative rounded-lg shadow-sm w-full">
                    <input
                      type="number"
                      step="any"
                      value={targetReturnPct}
                      onChange={(e) => handleReturnChange(e.target.value)}
                      className="bg-white/5 border border-white/10 focus:border-brand-400/50 focus:ring-1 focus:ring-brand-400/50 rounded-lg py-1.5 pl-3 pr-7 text-sm text-gray-100 focus:outline-none w-full tabular-nums transition-all"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total Value</div>
                <div className="text-base font-semibold text-gray-200 tabular-nums">
                  {formatCurrency(totalSaleValue, currency as MarketCurrency)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {portfolio.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} shares
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Est. Profit (vs Cost)</div>
                <div className={`text-base font-semibold tabular-nums ${profitVsCost >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {profitVsCost >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(profitVsCost), currency as MarketCurrency)}
                </div>
                <div className={`text-[10px] ${profitVsCost >= 0 ? 'text-gain/80' : 'text-loss/80'} mt-0.5 font-medium`}>
                  {profitVsCost >= 0 ? '+' : ''}{profitVsCostPct.toFixed(2)}%
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Diff vs Current</div>
                <div className={`text-base font-semibold tabular-nums ${profitVsCurrent >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {profitVsCurrent >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(profitVsCurrent), currency as MarketCurrency)}
                </div>
                <div className={`text-[10px] ${profitVsCurrent >= 0 ? 'text-gain/80' : 'text-loss/80'} mt-0.5 font-medium`}>
                  {profitVsCurrent >= 0 ? '+' : ''}{profitVsCurrentPct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
