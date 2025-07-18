import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          })
          
          const { access_token, refresh_token } = response.data
          localStorage.setItem('token', access_token)
          localStorage.setItem('refreshToken', refresh_token)
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/auth/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
  
  register: async (userData: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone?: string
    country?: string
  }) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  
  updateUser: async (userData: any) => {
    const response = await api.put('/auth/me', userData)
    return response.data
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
    return response.data
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },
}

// Portfolio API
export const portfolioAPI = {
  getPortfolios: async (skip = 0, limit = 100) => {
    const response = await api.get(`/portfolios?skip=${skip}&limit=${limit}`)
    return response.data
  },
  
  getPortfolio: async (portfolioId: number) => {
    const response = await api.get(`/portfolios/${portfolioId}`)
    return response.data
  },
  
  createPortfolio: async (portfolioData: {
    name: string
    description?: string
    base_currency?: string
  }) => {
    const response = await api.post('/portfolios', portfolioData)
    return response.data
  },
  
  updatePortfolio: async (portfolioId: number, portfolioData: any) => {
    const response = await api.put(`/portfolios/${portfolioId}`, portfolioData)
    return response.data
  },
  
  deletePortfolio: async (portfolioId: number) => {
    const response = await api.delete(`/portfolios/${portfolioId}`)
    return response.data
  },
}

// Transaction API
export const transactionAPI = {
  getTransactions: async (params: {
    portfolio_id?: number
    asset_id?: number
    transaction_type?: string
    start_date?: string
    end_date?: string
    skip?: number
    limit?: number
  } = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString())
      }
    })
    
    const response = await api.get(`/transactions?${queryParams}`)
    return response.data
  },
  
  getTransaction: async (transactionId: number) => {
    const response = await api.get(`/transactions/${transactionId}`)
    return response.data
  },
  
  createTransaction: async (transactionData: {
    portfolio_id: number
    asset_id?: number
    transaction_type: string
    transaction_date: string
    settlement_date?: string
    quantity?: number
    price?: number
    amount: number
    fees?: number
    currency?: string
    description?: string
    broker?: string
    account_number?: string
  }) => {
    const response = await api.post('/transactions', transactionData)
    return response.data
  },
  
  updateTransaction: async (transactionId: number, transactionData: any) => {
    const response = await api.put(`/transactions/${transactionId}`, transactionData)
    return response.data
  },
  
  deleteTransaction: async (transactionId: number) => {
    const response = await api.delete(`/transactions/${transactionId}`)
    return response.data
  },
}

// Analytics API
export const analyticsAPI = {
  getPortfolioOverview: async (portfolioId: number) => {
    const response = await api.get(`/analytics/portfolio/${portfolioId}/overview`)
    return response.data
  },
  
  getPortfolioAllocation: async (portfolioId: number, groupBy = 'asset_class') => {
    const response = await api.get(`/analytics/portfolio/${portfolioId}/allocation?group_by=${groupBy}`)
    return response.data
  },
  
  getPortfolioPerformance: async (portfolioId: number, period = '1y') => {
    const response = await api.get(`/analytics/portfolio/${portfolioId}/performance?period=${period}`)
    return response.data
  },
  
  getDividendAnalysis: async (portfolioId: number) => {
    const response = await api.get(`/analytics/portfolio/${portfolioId}/dividends`)
    return response.data
  },
}

// Reports API
export const reportsAPI = {
  uploadReport: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/reports/upload-report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  testExtraction: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/reports/test-extraction', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  getSupportedBrokers: async () => {
    const response = await api.get('/reports/supported-brokers')
    return response.data
  },
}

// Israeli Stocks API
export const israeliStocksAPI = {
  uploadPDF: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/israeli-stocks/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  uploadCSV: async (files: File[]) => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    
    const response = await api.post('/israeli-stocks/analyze-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  getHoldings: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : ''
    const response = await api.get(`/israeli-stocks/holdings${params}`)
    return response.data
  },
  
  getTransactions: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : ''
    const response = await api.get(`/israeli-stocks/transactions${params}`)
    return response.data
  },
  
  getDividends: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : ''
    const response = await api.get(`/israeli-stocks/dividends${params}`)
    return response.data
  },
  
  getStocks: async (indexName?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (indexName) params.append('index_name', indexName)
    if (limit) params.append('limit', limit.toString())
    
    const paramString = params.toString()
    const response = await api.get(`/israeli-stocks/stocks${paramString ? `?${paramString}` : ''}`)
    return response.data
  },
  
  deleteHolding: async (holdingId: number) => {
    const response = await api.delete(`/israeli-stocks/holdings/${holdingId}`)
    return response.data
  },
  
  deleteTransaction: async (transactionId: number) => {
    const response = await api.delete(`/israeli-stocks/transactions/${transactionId}`)
    return response.data
  },
  
  getSummary: async () => {
    const response = await api.get('/israeli-stocks/summary')
    return response.data
  }
}

export default api
