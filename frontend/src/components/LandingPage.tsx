import React from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  <span className="text-primary-600">Invest</span>racker
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Track Your <span className="text-primary-600">Investments</span>
            <br />
            Like a Pro
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Monitor your portfolio performance, analyze market trends, and make informed investment decisions with our comprehensive tracking platform.
          </p>
          <div className="space-x-4">
            <Link
              href="/auth/register"
              className="btn-primary btn-lg"
            >
              Start Tracking Free
            </Link>
            <Link
              href="/auth/login"
              className="btn-secondary btn-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need to track your investments
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From portfolio tracking to advanced analytics, we provide all the tools you need to stay on top of your investments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 ml-2">
                Portfolio Analytics
              </h3>
            </div>
            <p className="text-gray-600">
              Get detailed insights into your portfolio performance with advanced charts and analytics.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 ml-2">
                Real-time Tracking
              </h3>
            </div>
            <p className="text-gray-600">
              Monitor your investments in real-time with live market data and instant updates.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <ArrowTrendingUpIcon className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 ml-2">
                Performance Metrics
              </h3>
            </div>
            <p className="text-gray-600">
              Track ROI, gains/losses, and other key performance indicators across all your holdings.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 ml-2">
                Secure & Private
              </h3>
            </div>
            <p className="text-gray-600">
              Your financial data is protected with bank-level security and encryption.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <UserGroupIcon className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 ml-2">
                Multi-Portfolio Support
              </h3>
            </div>
            <p className="text-gray-600">
              Manage multiple portfolios and investment accounts from a single dashboard.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <SparklesIcon className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 ml-2">
                Smart Insights
              </h3>
            </div>
            <p className="text-gray-600">
              Get AI-powered insights and recommendations to optimize your investment strategy.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to take control of your investments?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of investors who trust Investracker to manage their portfolios.
          </p>
          <Link
            href="/auth/register"
            className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition duration-300"
          >
            Get Started Today
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-primary-400">Invest</span>racker
            </h3>
            <p className="text-gray-400">
              © 2024 Investracker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
