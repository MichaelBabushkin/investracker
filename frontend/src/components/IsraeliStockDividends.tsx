'use client'

import React, { useState, useEffect } from 'react'
import { 
  CurrencyDollarIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { israeliStocksAPI } from '@/services/api'
import { IsraeliDividend } from '@/types/israeli-stocks'

interface IsraeliStockDividendsProps {
  refreshTrigger?: number
}

export default function IsraeliStockDividends({ refreshTrigger }: IsraeliStockDividendsProps) {
  const [dividends, setDividends] = useState<IsraeliDividend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDividends = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await israeliStocksAPI.getDividends()
      setDividends(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load dividends')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDividends()
  }, [refreshTrigger])

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₪0.00'
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('he-IL')
  }

  const totalDividends = (dividends || []).reduce((sum, dividend) => sum + dividend.amount, 0)
  const totalTax = (dividends || []).reduce((sum, dividend) => sum + (dividend.tax || 0), 0)
  const netDividends = totalDividends - totalTax

  // Group dividends by company
  const dividendsByCompany = (dividends || []).reduce((acc, dividend) => {
    const key = dividend.symbol
    if (!acc[key]) {
      acc[key] = {
        company_name: dividend.company_name,
        symbol: dividend.symbol,
        total_amount: 0,
        total_tax: 0,
        count: 0,
        dividends: []
      }
    }
    acc[key].total_amount += dividend.amount
    acc[key].total_tax += dividend.tax || 0
    acc[key].count += 1
    acc[key].dividends.push(dividend)
    return acc
  }, {} as Record<string, any>)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Dividends</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, j) => (
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
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Dividends</h2>
          <button
            onClick={fetchDividends}
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

  if (!dividends || dividends.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Dividends</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BanknotesIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dividends Found</h3>
          <p className="text-gray-600 mb-4">
            Upload an Israeli investment PDF with dividend transactions to see them here.
          </p>
          <p className="text-sm text-gray-500">
            Dividends are automatically extracted from transaction data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Dividends</h2>
        <button
          onClick={fetchDividends}
          className="btn-secondary text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Summary */}
      {dividends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Dividends</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDividends)}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Tax</p>
                <p className="text-2xl font-bold">{formatCurrency(totalTax)}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Net Dividends</p>
                <p className="text-2xl font-bold">{formatCurrency(netDividends)}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Payments</p>
                <p className="text-2xl font-bold">{dividends.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dividends List */}
      {dividends.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dividends Found</h3>
          <p className="text-gray-500">Upload a PDF report to import your Israeli stock dividends.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* By Company Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dividends by Company</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(dividendsByCompany).map((company: any) => (
                <div key={company.symbol} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {company.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{company.symbol}</h4>
                      <p className="text-sm text-gray-600">{company.company_name}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Amount:</span>
                      <span className="font-medium">{formatCurrency(company.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax Paid:</span>
                      <span className="font-medium">{formatCurrency(company.total_tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Net Amount:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(company.total_amount - company.total_tax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payments:</span>
                      <span className="font-medium">{company.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Dividends */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">All Dividend Payments</h3>
            <div className="space-y-4">
              {dividends.map((dividend) => (
                <div key={dividend.id} className="investment-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {dividend.symbol}
                            </h3>
                            <span className="px-2 py-1 text-xs font-medium rounded-full border text-blue-600 bg-blue-50 border-blue-200">
                              DIVIDEND
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{dividend.company_name}</p>
                          <p className="text-xs text-gray-500">Security: {dividend.security_no}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Payment Date</p>
                          <p className="text-sm font-medium">{formatDate(dividend.payment_date)}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Gross Amount</p>
                          <p className="text-sm font-medium text-blue-600">{formatCurrency(dividend.amount)}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Tax Withheld</p>
                          <p className="text-sm font-medium text-red-600">{formatCurrency(dividend.tax)}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Net Amount</p>
                          <p className="text-sm font-medium text-green-600">
                            {formatCurrency(dividend.amount - (dividend.tax || 0))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Source: {dividend.source_pdf}</span>
                        <span>Added: {formatDate(dividend.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
