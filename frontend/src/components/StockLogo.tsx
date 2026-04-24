'use client'

import React from 'react'

interface StockLogoProps {
  symbol: string
  logoSvg?: string | null
  logoUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export default function StockLogo({ symbol, logoSvg, logoUrl, size = 'md', className = '' }: StockLogoProps) {
  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-[3.5rem] h-[3.5rem]',
    md: 'w-[3.5rem] h-[3.5rem]',
    lg: 'w-[3.5rem] h-[3.5rem]'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // The wrapper sets the clipping boundaries so square backgrounds get nicely rounded corners
  const radiusClass = size === 'xs' ? 'rounded-lg' : 'rounded-xl';
  const wrapperClass = `${sizeClasses[size]} ${className} relative flex shrink-0 items-center justify-center ${radiusClass} overflow-hidden shadow-sm`;
  
  // Drop shadow helps transparent/dark logos remain visible without needing a background
  const imgClass = `w-full h-full object-contain relative z-10 drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]`;
  const svgClass = `w-full h-full relative z-10 [&>svg]:w-full [&>svg]:h-full [&>svg]:drop-shadow-[0_0_2px_rgba(255,255,255,0.6)]`;

  const fallbackClass = `${sizeClasses[size]} ${className} bg-surface-dark-secondary ${radiusClass} border border-white/10 shadow-inner flex shrink-0 items-center justify-center transition-all duration-300 hover:border-brand-400/30`;
  const fallbackTextClass = `text-brand-400 font-bold tracking-tight ${size === 'xs' ? 'text-xs scale-90' : textSizes[size]}`;

  if (logoUrl) {
    return (
      <div className={wrapperClass}>
        <img src={logoUrl} alt={symbol} className={imgClass} />
      </div>
    );
  }

  if (logoSvg) {
    return (
      <div className={wrapperClass}>
        <div className={svgClass} dangerouslySetInnerHTML={{ __html: logoSvg }} />
      </div>
    );
  }

  // Fallback to symbol initials if no logo
  return (
    <div className={fallbackClass}>
      <span className={fallbackTextClass}>
        {symbol.substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
