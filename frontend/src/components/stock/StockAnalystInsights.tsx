import React from 'react';
import { StockAnalyst } from '@/types/stock-detail';
import { formatDate } from '@/utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface StockAnalystInsightsProps {
  analyst: StockAnalyst;
}

const ACTION_TONE: Record<string, string> = {
  up: 'text-gain', down: 'text-loss', init: 'text-info', main: 'text-label', reit: 'text-label',
};
const ACTION_LABEL: Record<string, string> = {
  up: 'Upgrade', down: 'Downgrade', init: 'Initiated', main: 'Maintained', reit: 'Reiterated',
};

export default function StockAnalystInsights({ analyst }: StockAnalystInsightsProps) {
  const hasTrends = analyst.recommendations_trend && analyst.recommendations_trend.length > 0;
  const hasUpgrades = analyst.upgrades_downgrades && analyst.upgrades_downgrades.length > 0;
  if (!hasTrends && !hasUpgrades) return null;

  const getPeriodLabel = (period: string | null) => {
    switch (period?.toLowerCase()) {
      case '0m': return 'Now';
      case '-1m': return '1M';
      case '-2m': return '2M';
      case '-3m': return '3M';
      default: return period || '';
    }
  };

  const chartData = (analyst.recommendations_trend || []).map(t => ({ ...t, periodLabel: getPeriodLabel(t.period) }));
  const recentUpgrades = (analyst.upgrades_downgrades || []).slice(0, 8);

  return (
    <div>
      <div className="tape-label mb-2">Recommendation trend</div>
      {hasTrends && (
        <div className="h-[150px] w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--rule-row)" vertical={false} />
              <XAxis dataKey="periodLabel" stroke="var(--fg-label)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--fg-label)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--rule-section)', borderRadius: '4px', fontSize: '11px' }}
                itemStyle={{ fontSize: '11px' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
              <Bar dataKey="strong_buy" stackId="a" fill="#4ADE80" name="Strong Buy" />
              <Bar dataKey="buy" stackId="a" fill="#86EFAC" name="Buy" />
              <Bar dataKey="hold" stackId="a" fill="#F59E0B" name="Hold" />
              <Bar dataKey="sell" stackId="a" fill="#FB923C" name="Sell" />
              <Bar dataKey="strong_sell" stackId="a" fill="#F43F5E" name="Strong Sell" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasUpgrades && (
        <div>
          <div className="tape-label mb-2">Recent rating changes</div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-rule-section">
                  {['Date', 'Firm', 'Action', 'To', 'From'].map((h) => (
                    <th key={h} className="tape-label py-1.5 pr-4 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUpgrades.map((item, i) => (
                  <tr key={i} className="border-b border-rule-row hover:bg-white/[0.02] transition-colors h-7">
                    <td className="pr-4 text-[12px] text-label whitespace-nowrap tabular-nums">{formatDate(item.date || undefined)}</td>
                    <td className="pr-4 text-[12px] text-figure truncate max-w-[110px]">{item.firm || '—'}</td>
                    <td className={`pr-4 text-[12px] font-medium ${ACTION_TONE[item.action?.toLowerCase() ?? ''] ?? 'text-label'}`}>{ACTION_LABEL[item.action?.toLowerCase() ?? ''] ?? (item.action || '—')}</td>
                    <td className="pr-4 text-[12px] font-medium text-figure">{item.to_grade || '—'}</td>
                    <td className="text-[12px] text-label">{item.from_grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
