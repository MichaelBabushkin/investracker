'use client'

import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { useRouter } from 'next/navigation'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import ReportUploader from './ReportUploader'
import IsraeliMarketHighlights from './IsraeliMarketHighlights'

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()

  // Mock data for demonstration
  const [portfolioData] = useState({
    totalValue: 125430.50,
    dayChange: 2340.25,
    dayChangePercent: 1.9,
    totalGainLoss: 15430.50,
    totalGainLossPercent: 13.9,
    totalInvested: 110000.00
  })

  const [holdings] = useState([
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, currentPrice: 182.52, value: 9126.00, gainLoss: 1205.50, gainLossPercent: 15.2, allocation: 7.3 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, currentPrice: 2785.48, value: 69637.00, gainLoss: -892.35, gainLossPercent: -1.3, allocation: 55.5 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 75, currentPrice: 415.26, value: 31144.50, gainLoss: 2134.75, gainLossPercent: 7.4, allocation: 24.8 },
    { symbol: 'TSLA', name: 'Tesla Inc.', shares: 30, currentPrice: 248.50, value: 7455.00, gainLoss: -523.20, gainLossPercent: -6.6, allocation: 5.9 },
    { symbol: 'Cash', name: 'Cash & Cash Equivalents', shares: 0, currentPrice: 1.00, value: 8068.00, gainLoss: 0, gainLossPercent: 0, allocation: 6.4 }
  ])

  const [recentTransactions] = useState([
    { id: 1, type: 'buy', symbol: 'AAPL', shares: 10, price: 178.25, date: '2024-01-15', total: 1782.50 },
    { id: 2, type: 'sell', symbol: 'GOOGL', shares: 5, price: 2790.00, date: '2024-01-14', total: 13950.00 },
    { id: 3, type: 'buy', symbol: 'MSFT', shares: 25, price: 412.80, date: '2024-01-12', total: 10320.00 },
    { id: 4, type: 'buy', symbol: 'TSLA', shares: 15, price: 245.30, date: '2024-01-10', total: 3679.50 },
    { id: 5, type: 'dividend', symbol: 'AAPL', shares: 0, price: 0.24, date: '2024-01-08', total: 12.00 }
  ])

  // Portfolio performance data (last 30 days)
  const [performanceData] = useState([
    { date: '2024-01-01', value: 120000 },
    { date: '2024-01-03', value: 121500 },
    { date: '2024-01-05', value: 119800 },
    { date: '2024-01-08', value: 122300 },
    { date: '2024-01-10', value: 123800 },
    { date: '2024-01-12', value: 124200 },
    { date: '2024-01-15', value: 125430 }
  ])

  const [sectorData] = useState([
    { name: 'Technology', value: 69.6, amount: 87340 },
    { name: 'Automotive', value: 5.9, amount: 7455 },
    { name: 'Cash', value: 6.4, amount: 8068 },
    { name: 'Services', value: 18.1, amount: 22568 }
  ])

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const [showUploader, setShowUploader] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                <span className="text-primary-600">Invest</span>racker
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <BellIcon className="h-6 w-6" />
              </button>
              
              <div className="flex items-center space-x-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-500"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-gray-600 mt-1">
            Here's an overview of your investment portfolio
          </p>
        </div>

        {/* Portfolio Summary Cards + Israeli Market Entry */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${portfolioData.totalValue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {portfolioData.dayChange >= 0 ? (
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                ) : (
                  <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Change</p>
                <p className={`text-2xl font-bold ${portfolioData.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioData.dayChange >= 0 ? '+' : ''}${portfolioData.dayChange.toLocaleString()}
                </p>
                <p className={`text-sm ${portfolioData.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioData.dayChangePercent >= 0 ? '+' : ''}{portfolioData.dayChangePercent}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Gain/Loss</p>
                <p className={`text-2xl font-bold ${portfolioData.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioData.totalGainLoss >= 0 ? '+' : ''}${portfolioData.totalGainLoss.toLocaleString()}
                </p>
                <p className={`text-sm ${portfolioData.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioData.totalGainLossPercent >= 0 ? '+' : ''}{portfolioData.totalGainLossPercent}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${portfolioData.totalInvested.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {((portfolioData.totalValue / portfolioData.totalInvested - 1) * 100).toFixed(1)}% return
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Holdings</p>
                <p className="text-2xl font-bold text-gray-900">{holdings.filter(h => h.symbol !== 'Cash').length}</p>
                <p className="text-sm text-gray-500">Active positions</p>
              </div>
              <button className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg">
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Israeli Market Link Card */}
          <a href="/israeli-stocks" className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white/80">Regional Markets</h3>
              <span className="text-[10px] px-2 py-0.5 bg-white/20 text-white rounded-full tracking-wide">NEW</span>
            </div>
            <div>
              <p className="text-xl font-bold text-white mb-1">Israeli Market</p>
              <p className="text-xs text-white/80 mb-4">Upload PDFs & analyze TA stocks</p>
              <div className="flex items-center text-sm text-white font-medium gap-1 transition-all">
                <span>Open Dashboard</span>
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </div>
            </div>
          </a>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Portfolio Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Portfolio Performance</h3>
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="1y">1 Year</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Portfolio Value']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Portfolio Allocation Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Portfolio Allocation</h3>
              <ChartPieIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {sectorData.map((sector, index) => (
                <div key={sector.name} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600">{sector.name}</span>
                  <span className="ml-auto text-gray-900">{sector.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Holdings Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Current Holdings</h3>
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search holdings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Allocation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gain/Loss
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holdings
                      .filter(holding => 
                        holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        holding.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((holding) => (
                      <tr key={holding.symbol} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                            <div className="text-sm text-gray-500 truncate max-w-32">{holding.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holding.symbol === 'Cash' ? '-' : holding.shares}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holding.symbol === 'Cash' ? '-' : `$${holding.currentPrice.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${holding.value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holding.allocation}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {holding.symbol === 'Cash' ? (
                            <span className="text-gray-500">-</span>
                          ) : (
                            <>
                              <span className={`${holding.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {holding.gainLoss >= 0 ? '+' : ''}${holding.gainLoss.toFixed(2)}
                              </span>
                              <br />
                              <span className={`text-xs ${holding.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent}%)
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          transaction.type === 'buy' ? 'bg-green-500' : 
                          transaction.type === 'sell' ? 'bg-red-500' : 
                          'bg-blue-500'
                        }`}>
                          {transaction.type === 'buy' ? 'B' : transaction.type === 'sell' ? 'S' : 'D'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.type.toUpperCase()} {transaction.symbol}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.type === 'dividend' ? 
                              `Dividend payment` : 
                              `${transaction.shares} shares @ $${transaction.price}`
                            }
                          </p>
                          <p className="text-xs text-gray-500">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'buy' ? '-' : '+'}${transaction.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 text-sm text-primary-600 hover:text-primary-500 font-medium py-2 hover:bg-gray-50 rounded-lg transition-colors">
                  View All Transactions
                </button>
              </div>
            </div>

            {/* Market Overview */}
            <div className="mt-6 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Market Overview</h3>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">S&P 500</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">4,185.47</div>
                    <div className="text-xs text-green-600">+0.8%</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">NASDAQ</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">13,052.20</div>
                    <div className="text-xs text-green-600">+1.2%</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">DOW</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">33,875.40</div>
                    <div className="text-xs text-red-600">-0.3%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Transaction</span>
                </button>
                <button 
                  onClick={() => setShowUploader(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <span>📄</span>
                  <span>Upload Report</span>
                </button>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors">
                  Create Portfolio
                </button>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors">
                  Import Data
                </button>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors">
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Israeli Market Highlights Section */}
        <div className="mt-12">
          <IsraeliMarketHighlights />
        </div>
      </div>

      {/* Report Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Upload Investment Reports</h2>
                <button
                  onClick={() => setShowUploader(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Upload your PDF investment reports to automatically extract and analyze your portfolio data.
              </p>
            </div>
            
            <div className="p-6">
              <ReportUploader 
                onUploadComplete={(results) => {
                  console.log('Upload results:', results)
                  // Here you could update the dashboard data with real extracted data
                  setShowUploader(false)
                }}
                maxFiles={3}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
