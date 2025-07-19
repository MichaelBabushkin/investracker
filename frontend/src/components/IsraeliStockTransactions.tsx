'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { israeliStocksAPI } from '@/services/api'
import { IsraeliStockTransaction } from '@/types/israeli-stocks'

interface IsraeliStockTransactionsProps {
  refreshTrigger?: number
}

export default function IsraeliStockTransactions({ refreshTrigger }: IsraeliStockTransactionsProps) {
  const [transactions, setTransactions] = useState<IsraeliStockTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await israeliStocksAPI.getTransactions()
      setTransactions(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [refreshTrigger])

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      await israeliStocksAPI.deleteTransaction(transactionId)
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
    } catch (err: any) {
      alert('Failed to delete transaction: ' + (err.response?.data?.detail || err.message))
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

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'BUY':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
      case 'SELL':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
      case 'DIVIDEND':
        return <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
      default:
        return <ArrowRightIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'BUY':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'SELL':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'DIVIDEND':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const totalValue = (transactions || [])
    .filter(t => t.transaction_type !== 'DIVIDEND')
    .reduce((sum, t) => sum + (t.total_value || 0), 0)
  
  const dividendAmount = (transactions || [])
    .filter(t => t.transaction_type === 'DIVIDEND')
    .reduce((sum, t) => sum + (t.total_value || 0), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Transactions</h2>
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
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Transactions</h2>
          <button
            onClick={fetchTransactions}
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

  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Transactions</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <CurrencyDollarIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
          <p className="text-gray-600 mb-4">
            Upload an Israeli investment PDF to see your transaction history here.
          </p>
          <p className="text-sm text-gray-500">
            We support buy, sell, and dividend transactions from Israeli brokers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Israeli Stock Transactions</h2>
        <button
          onClick={fetchTransactions}
          className="btn-secondary text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card">
            <div className="flex items-center">
              <ArrowRightIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Trading Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          
          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Dividends</p>
                <p className="text-2xl font-bold">{formatCurrency(dividendAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ArrowRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
          <p className="text-gray-500">Upload a PDF report to import your Israeli stock transactions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="investment-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {transaction.symbol}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTransactionColor(transaction.transaction_type)}`}>
                          {transaction.transaction_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{transaction.company_name}</p>
                      <p className="text-xs text-gray-500">Security: {transaction.security_no}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium">{formatDate(transaction.transaction_date)}</p>
                      {transaction.transaction_time && (
                        <p className="text-xs text-gray-400">{formatTime(transaction.transaction_time)}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-sm font-medium">{formatNumber(transaction.quantity)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-sm font-medium">{formatCurrency(transaction.price)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-sm font-medium">{formatCurrency(transaction.total_value)}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Fees & Tax</p>
                      <div className="text-sm">
                        {transaction.commission && (
                          <p className="text-gray-600">Fee: {formatCurrency(transaction.commission)}</p>
                        )}
                        {transaction.tax && (
                          <p className="text-gray-600">Tax: {formatCurrency(transaction.tax)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Source: {transaction.source_pdf}</span>
                    <span>Added: {formatDate(transaction.created_at)}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleDeleteTransaction(transaction.id)}
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
