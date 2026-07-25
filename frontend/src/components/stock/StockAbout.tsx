import React, { useState } from 'react';
import { StockAbout as StockAboutType } from '@/types/stock-detail';

interface StockAboutProps {
  about: StockAboutType;
}

export default function StockAbout({ about }: StockAboutProps) {
  const [expanded, setExpanded] = useState(false);

  const meta: Array<[string, React.ReactNode]> = [
    ['CEO', about.ceo || '—'],
    ['Employees', about.employees?.toLocaleString() ?? '—'],
    ...(about.founded !== null ? [['Founded', String(about.founded)] as [string, React.ReactNode]] : []),
    ['Website', about.website
      ? <a href={about.website} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">{about.website.replace(/^https?:\/\//, '')}</a>
      : '—'],
  ];

  return (
    <div>
      <div className="tape-label mb-2">About</div>
      <div className="text-[14px] text-gray-300 leading-relaxed max-w-[70ch]">
        <p className={expanded ? '' : 'line-clamp-3'}>{about.description || 'No description available.'}</p>
        {(about.description?.length ?? 0) > 200 && (
          <button onClick={() => setExpanded(!expanded)} className="text-brand-400 hover:text-brand-300 mt-1 text-[13px]">
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 mt-5">
        {meta.map(([label, value]) => (
          <div key={label}>
            <div className="text-[11px] text-label mb-0.5">{label}</div>
            <div className="text-[13px] font-medium text-figure truncate">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
