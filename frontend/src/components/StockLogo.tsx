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
  }

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const isXs = size === 'xs';

  const wrapperClass = isXs 
    ? `${sizeClasses[size]} ${className} relative flex items-center justify-center` 
    : `${sizeClasses[size]} ${className} relative rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(45,212,191,0.15)]`;
  
  const imgClass = isXs
    ? `w-full h-full object-contain relative z-10 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]`
    : `w-full h-full object-contain p-1.5 relative z-10 drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]`;

  const svgClass = isXs
    ? `w-full h-full relative z-10 [&>svg]:w-full [&>svg]:h-full [&>svg]:drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]`
    : `w-full h-full p-1.5 relative z-10 [&>svg]:w-full [&>svg]:h-full [&>svg]:drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]`;

  const fallbackClass = isXs
    ? `${sizeClasses[size]} ${className} bg-surface-dark-secondary rounded-lg border border-white/10 flex flex-shrink-0 items-center justify-center`
    : `${sizeClasses[size]} ${className} bg-surface-dark-secondary rounded-xl border border-white/10 shadow-inner flex items-center justify-center transition-all duration-300 hover:border-brand-400/30`;

  const fallbackTextClass = isXs
    ? `text-brand-400 font-bold ${textSizes[size]} scale-90 tracking-tight`
    : `text-brand-400 font-bold tracking-tight ${textSizes[size]}`;

  if (logoUrl) {
    return (
      <div className={wrapperClass}>
        {!isXs && <div className="absolute inset-0 bg-white/20 blur-md rounded-full scale-150 opacity-20 pointer-events-none" />}
        <img src={logoUrl} alt={symbol} className={imgClass} />
      </div>
    )
  }

  if (logoSvg) {
    return (
      <div className={wrapperClass}>
        {!isXs && <div className="absolute inset-0 bg-white/20 blur-md rounded-full scale-150 opacity-20 pointer-events-none" />}
        <div className={svgClass} dangerouslySetInnerHTML={{ __html: logoSvg }} />
      </div>
    )
  }

  // Fallback to symbol initials if no logo
  return (
    <div className={fallbackClass}>
      <span className={fallbackTextClass}>
        {symbol.substring(0, 2).toUpperCase()}
      </span>
    </div>
  )
}
