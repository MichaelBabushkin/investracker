'use client'

import React, { useState, useEffect } from 'react'
import { 
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { israeliStocksAPI } from '@/services/api'
import { IsraeliStockHolding } from '@/types/israeli-stocks'

interface IsraeliStockHoldingsProps {
  refreshTrigger?: number
}

export default function IsraeliStockHoldings({ refreshTrigger }: IsraeliStockHoldingsProps) {
  const [holdings, setHoldings] = useState<IsraeliStockHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHoldings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await israeliStocksAPI.getHoldings()
      setHoldings(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load holdings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHoldings()
  }, [refreshTrigger])

  const handleDeleteHolding = async (holdingId: number) => {
    if (!confirm('Are you sure you want to delete this holding?')) return

    try {
      await israeliStocksAPI.deleteHolding(holdingId)
      setHoldings(prev => prev.filter(h => h.id !== holdingId))
    } catch (err: any) {
      alert('Failed to delete holding: ' + (err.response?.data?.detail || err.message))
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₪0.00'
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatNumber = (num?: number) => {
    if (!num) return '0'
    return new Intl.NumberFormat('he-IL').format(num)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('he-IL')
  }

  const totalValue = Array.isArray(holdings) ? holdings.reduce((sum, holding) => sum + (holding.current_value || 0), 0) : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Holdings</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Holdings</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Holdings</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchHoldings}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Holdings</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BuildingOfficeIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Holdings Found</h3>
          <p className="text-gray-600 mb-4">
            Upload an Israeli investment PDF to see your stock holdings here.
          </p>
          <p className="text-sm text-gray-500">
            We support TA-125 and SME-60 stocks from Israeli brokers.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Holdings</h2>
          <button
            onClick={fetchHoldings}
            className="btn-primary text-sm"
          >
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Holdings</h2>
        <button
          onClick={fetchHoldings}
          className="btn-secondary text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Summary */}
      {Array.isArray(holdings) && holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Holdings</p>
                <p className="text-2xl font-bold">{Array.isArray(holdings) ? holdings.length : 0}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-purple-500 to-purple-600">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Avg. Portfolio %</p>
                <p className="text-2xl font-bold">
                  {Array.isArray(holdings) && holdings.length > 0 
                    ? (holdings.reduce((sum, h) => sum + (h.portfolio_percentage || 0), 0) / holdings.length).toFixed(1)
                    : '0'
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings List */}
      {!Array.isArray(holdings) || holdings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Holdings Found</h3>
          <p className="text-gray-500">Upload a PDF report to import your Israeli stock holdings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {holdings.map((holding) => (
            <div key={holding.id} className="investment-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {holding.symbol.substring(0, 2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {holding.symbol}
                      </h3>
                      <p className="text-sm text-gray-600">{holding.company_name}</p>
                      <p className="text-xs text-gray-500">Security: {holding.security_no}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-sm font-medium">{formatNumber(holding.quantity)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Current Value</p>
                      <p className="text-sm font-medium">{formatCurrency(holding.current_value)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Last Price</p>
                      <p className="text-sm font-medium">{formatCurrency(holding.last_price)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Portfolio %</p>
                      <p className="text-sm font-medium">
                        {holding.portfolio_percentage ? `${holding.portfolio_percentage.toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                    {holding.holding_date && (
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>Last Updated: {formatDate(holding.holding_date)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleDeleteHolding(holding.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
