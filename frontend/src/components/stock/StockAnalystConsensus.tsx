import React from 'react';
import { StockAnalyst } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockAnalystConsensusProps {
  analyst: StockAnalyst;
  currency: string;
  currentPrice: number | null;
}

export default function StockAnalystConsensus({ analyst, currency, currentPrice }: StockAnalystConsensusProps) {
  if (!analyst || !analyst.recommendation) return null;

  const getRecommendationBadge = () => {
    switch (analyst.recommendation?.toLowerCase()) {
      case 'strong_buy':
      case 'strong buy':
        return <Badge variant="gain">STRONG BUY</Badge>;
      case 'buy':
        return <Badge variant="gain" className="bg-brand-400/10 text-brand-400 border-brand-400/20">BUY</Badge>;
      case 'hold':
        return <Badge variant="warn">HOLD</Badge>;
      case 'sell':
        return <Badge variant="loss" className="bg-red-400/10 text-red-500 border-red-400/20">SELL</Badge>;
      case 'strong_sell':
      case 'strong sell':
        return <Badge variant="loss">STRONG SELL</Badge>;
      default:
        return <Badge variant="neutral">{analyst.recommendation!.toUpperCase()}</Badge>;
    }
  };

  // Calculate percentage positions for the dot within the range
  const hasRange = analyst.target_low !== null && analyst.target_high !== null && currentPrice !== null;
  let pricePosition = 0;
  if (hasRange) {
    const min = analyst.target_low!;
    const max = analyst.target_high!;
    const range = max - min;
    if (range > 0) {
      pricePosition = Math.max(0, Math.min(100, ((currentPrice! - min) / range) * 100));
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Analyst Consensus</CardTitle>
      </CardHeader>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>{getRecommendationBadge()}</div>
          <div className="text-sm text-gray-400">
            {analyst.analyst_count ? `${analyst.analyst_count} analysts` : 'No analyst data'}
          </div>
        </div>

        {hasRange && (
          <div className="mt-6">
            <div className="text-sm text-gray-400 mb-2">Price Target</div>
            <div className="relative pt-6 pb-2">
              <div className="absolute top-0 left-0 text-xs text-gray-500 tabular-nums">
                Low {formatCurrency(analyst.target_low, currency as MarketCurrency)}
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-100 tabular-nums">
                Mean {formatCurrency(analyst.target_mean, currency as MarketCurrency)}
              </div>
              <div className="absolute top-0 right-0 text-xs text-gray-500 tabular-nums">
                High {formatCurrency(analyst.target_high, currency as MarketCurrency)}
              </div>
              
              <div className="h-1 w-full bg-white/10 rounded-full relative mt-2">
                <div className="absolute top-1/2 left-1/2 w-1 h-3 -translate-y-1/2 bg-white/20" />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)] z-10"
                  style={{ left: `calc(${pricePosition}% - 6px)` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
