'use client'

import React from 'react'

interface StockLogoProps {
  symbol: string
  logoSvg?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StockLogo({ symbol, logoSvg, size = 'md', className = '' }: StockLogoProps) {
  const sizeClasses = {
    sm: 'w-[3.5rem] h-[3.5rem]',
    md: 'w-[3.5rem] h-[3.5rem]',
    lg: 'w-[3.5rem] h-[3.5rem]'
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  if (logoSvg) {
    return (
      <div 
        className={`${sizeClasses[size]} ${className} rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center`}
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />
    )
  }

  // Fallback to symbol initials if no logo
  return (
    <div className={`${sizeClasses[size]} ${className} bg-blue-100 rounded-lg flex items-center justify-center`}>
      <span className={`text-blue-600 font-semibold ${textSizes[size]}`}>
        {symbol.substring(0, 2).toUpperCase()}
      </span>
    </div>
  )
}
