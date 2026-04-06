import React from 'react';
import { StockAnalyst } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface StockAnalystInsightsProps {
  analyst: StockAnalyst;
}

export default function StockAnalystInsights({ analyst }: StockAnalystInsightsProps) {
  const hasTrends = analyst.recommendations_trend && analyst.recommendations_trend.length > 0;
  const hasUpgrades = analyst.upgrades_downgrades && analyst.upgrades_downgrades.length > 0;

  if (!hasTrends && !hasUpgrades) return null;

  const getActionBadge = (action: string | null) => {
    switch (action?.toLowerCase()) {
      case 'up':
        return <Badge variant="gain">Upgrade</Badge>;
      case 'down':
        return <Badge variant="loss">Downgrade</Badge>;
      case 'init':
        return <Badge variant="info">Initiated</Badge>;
      case 'main':
        return <Badge variant="neutral">Maintained</Badge>;
      case 'reit':
        return <Badge variant="neutral">Reiterated</Badge>;
      default:
        return <Badge variant="neutral">{action?.toUpperCase() || '-'}</Badge>;
    }
  };

  const getPeriodLabel = (period: string | null) => {
    switch (period?.toLowerCase()) {
      case '0m': return 'Current';
      case '-1m': return '1M ago';
      case '-2m': return '2M ago';
      case '-3m': return '3M ago';
      default: return period || '';
    }
  };

  // Format data for chart
  const chartData = (analyst.recommendations_trend || []).map(t => ({
    ...t,
    periodLabel: getPeriodLabel(t.period)
  }));

  // Limit upgrades to 8 rows
  const recentUpgrades = (analyst.upgrades_downgrades || []).slice(0, 8);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recommendation Trend</CardTitle>
      </CardHeader>
      <div>
        <div className="mb-6 mt-2">
          {!hasTrends ? (
            <div className="text-sm text-gray-400 py-4 text-center">No trend data available</div>
          ) : (
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="periodLabel" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="strong_buy" stackId="a" fill="#4ADE80" name="Strong Buy" />
                  <Bar dataKey="buy" stackId="a" fill="#86EFAC" name="Buy" />
                  <Bar dataKey="hold" stackId="a" fill="#F59E0B" name="Hold" />
                  <Bar dataKey="sell" stackId="a" fill="#FB923C" name="Sell" />
                  <Bar dataKey="strong_sell" stackId="a" fill="#F43F5E" name="Strong Sell" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Rating Changes</h3>
          {!hasUpgrades ? (
            <div className="text-sm text-gray-400 py-4 text-center">No recent rating changes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] text-gray-400 border-b border-white/10 uppercase bg-surface-dark/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Firm</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">To</th>
                    <th className="px-3 py-2 font-medium">From</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-300">
                  {recentUpgrades.map((item, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatDate(item.date || undefined)}</td>
                      <td className="px-3 py-2 truncate max-w-[100px]">{item.firm || '-'}</td>
                      <td className="px-3 py-2">{getActionBadge(item.action)}</td>
                      <td className="px-3 py-2 font-medium">{item.to_grade || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{item.from_grade || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
