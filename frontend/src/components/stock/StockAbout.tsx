import React, { useState } from 'react';
import { StockAbout as StockAboutType } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

interface StockAboutProps {
  about: StockAboutType;
}

export default function StockAbout({ about }: StockAboutProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>About</CardTitle>
      </CardHeader>
      <div>
        <div className="text-sm text-gray-300 leading-relaxed mb-4">
          <p className={expanded ? '' : 'line-clamp-4'}>
            {about.description || 'No description available.'}
          </p>
          {(about.description?.length ?? 0) > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-brand-400 hover:text-brand-300 mt-1"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mt-6">
          <div>
            <div className="text-gray-500 mb-1">CEO</div>
            <div className="font-medium">{about.ceo}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Employees</div>
            <div className="font-medium">{about.employees?.toLocaleString() ?? '-'}</div>
          </div>
          {about.founded !== null && (
            <div>
              <div className="text-gray-500 mb-1">Founded</div>
              <div className="font-medium">{about.founded}</div>
            </div>
          )}
          <div>
            <div className="text-gray-500 mb-1">Website</div>
            {about.website ? (
              <a href={about.website} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">
                Visit Site
              </a>
            ) : (
              <div className="font-medium">-</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
