import axios from "axios";

// Prefer relative base '/api' to leverage Next.js rewrites in dev/prod
// This maps '/api/<path>' -> '<NEXT_PUBLIC_API_URL or http://localhost:8000/api/v1>/<path>' per next.config.js
// Falls back to explicit NEXT_PUBLIC_API_URL when provided
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle authentication errors (401 Unauthorized, 403 Forbidden)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't retry if it's already a retry or if it's a login/register request
      if (originalRequest._retry || originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        // Clear tokens and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        
        // Only redirect if not already on login page
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
          window.location.href = "/auth/login?session_expired=true";
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem("token", access_token);
          localStorage.setItem("refreshToken", refresh_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } else {
          // No refresh token available, redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            window.location.href = "/auth/login?session_expired=true";
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
          window.location.href = "/auth/login?session_expired=true";
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    country?: string;
  }) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  updateUser: async (userData: any) => {
    const response = await api.put("/auth/me", userData);
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },
};

// Portfolio API
export const portfolioAPI = {
  getPortfolios: async (skip = 0, limit = 100) => {
    const response = await api.get(`/portfolios?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getPortfolio: async (portfolioId: number) => {
    const response = await api.get(`/portfolios/${portfolioId}`);
    return response.data;
  },

  createPortfolio: async (portfolioData: {
    name: string;
    description?: string;
    base_currency?: string;
  }) => {
    const response = await api.post("/portfolios", portfolioData);
    return response.data;
  },

  updatePortfolio: async (portfolioId: number, portfolioData: any) => {
    const response = await api.put(`/portfolios/${portfolioId}`, portfolioData);
    return response.data;
  },

  deletePortfolio: async (portfolioId: number) => {
    const response = await api.delete(`/portfolios/${portfolioId}`);
    return response.data;
  },
};

// Transaction API
export const transactionAPI = {
  getTransactions: async (
    params: {
      portfolio_id?: number;
      asset_id?: number;
      transaction_type?: string;
      start_date?: string;
      end_date?: string;
      skip?: number;
      limit?: number;
    } = {}
  ) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/transactions?${queryParams}`);
    return response.data;
  },

  getTransaction: async (transactionId: number) => {
    const response = await api.get(`/transactions/${transactionId}`);
    return response.data;
  },

  createTransaction: async (transactionData: {
    portfolio_id: number;
    asset_id?: number;
    transaction_type: string;
    transaction_date: string;
    settlement_date?: string;
    quantity?: number;
    price?: number;
    amount: number;
    fees?: number;
    currency?: string;
    description?: string;
    broker?: string;
    account_number?: string;
  }) => {
    const response = await api.post("/transactions", transactionData);
    return response.data;
  },

  updateTransaction: async (transactionId: number, transactionData: any) => {
    const response = await api.put(
      `/transactions/${transactionId}`,
      transactionData
    );
    return response.data;
  },

  deleteTransaction: async (transactionId: number) => {
    const response = await api.delete(`/transactions/${transactionId}`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getPortfolioOverview: async (portfolioId: number) => {
    const response = await api.get(
      `/analytics/portfolio/${portfolioId}/overview`
    );
    return response.data;
  },

  getPortfolioAllocation: async (
    portfolioId: number,
    groupBy = "asset_class"
  ) => {
    const response = await api.get(
      `/analytics/portfolio/${portfolioId}/allocation?group_by=${groupBy}`
    );
    return response.data;
  },

  getPortfolioPerformance: async (portfolioId: number, period = "1y") => {
    const response = await api.get(
      `/analytics/portfolio/${portfolioId}/performance?period=${period}`
    );
    return response.data;
  },

  getDividendAnalysis: async (portfolioId: number) => {
    const response = await api.get(
      `/analytics/portfolio/${portfolioId}/dividends`
    );
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  uploadReport: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/reports/upload-report", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  testExtraction: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/reports/test-extraction", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getSupportedBrokers: async () => {
    const response = await api.get("/reports/supported-brokers");
    return response.data;
  },
};

// Israeli Stocks API
export const israeliStocksAPI = {
  upload: async (files: File[], brokerId: string = "excellence") => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post(
      `/israeli-stocks/upload?broker_id=${brokerId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  uploadPDF: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/israeli-stocks/upload-pdf", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  uploadCSV: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post("/israeli-stocks/analyze-csv", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getHoldings: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : "";
    const response = await api.get(`/israeli-stocks/holdings${params}`);
    return response.data.holdings || [];
  },

  getTransactions: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : "";
    const response = await api.get(`/israeli-stocks/transactions${params}`);
    return response.data.transactions || [];
  },

  getDividends: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : "";
    const response = await api.get(`/israeli-stocks/dividends${params}`);
    return response.data.dividends || [];
  },

  getStocks: async (indexName?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (indexName) params.append("index_name", indexName);
    if (limit) params.append("limit", limit.toString());

    const paramString = params.toString();
    const response = await api.get(
      `/israeli-stocks/stocks${paramString ? `?${paramString}` : ""}`
    );
    return response.data;
  },

  deleteHolding: async (holdingId: number) => {
    const response = await api.delete(`/israeli-stocks/holdings/${holdingId}`);
    return response.data;
  },

  deleteTransaction: async (transactionId: number) => {
    const response = await api.delete(
      `/israeli-stocks/transactions/${transactionId}`
    );
    return response.data;
  },

  createTransaction: async (transactionData: any) => {
    const response = await api.post(
      "/israeli-stocks/transactions",
      transactionData
    );
    return response.data;
  },

  updateTransaction: async (transactionId: number, transactionData: any) => {
    const response = await api.put(
      `/israeli-stocks/transactions/${transactionId}`,
      transactionData
    );
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get("/israeli-stocks/summary");
    return response.data;
  },

  // Pending Transactions
  getPendingTransactions: async (batchId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (batchId) params.append("batch_id", batchId);
    if (status) params.append("status", status);
    
    const paramString = params.toString();
    const response = await api.get(
      `/israeli-stocks/pending-transactions${paramString ? `?${paramString}` : ""}`
    );
    return response.data;
  },

  approvePendingTransaction: async (transactionId: number) => {
    const response = await api.post(
      `/israeli-stocks/pending-transactions/${transactionId}/approve`
    );
    return response.data;
  },

  approveAllInBatch: async (batchId: string) => {
    const response = await api.post(
      `/israeli-stocks/pending-transactions/batch/${batchId}/approve-all`
    );
    return response.data;
  },

  approveAllBatches: async () => {
    const response = await api.post(
      `/israeli-stocks/pending-transactions/approve-all-batches`
    );
    return response.data;
  },

  updatePendingTransaction: async (transactionId: number, data: any) => {
    const response = await api.put(
      `/israeli-stocks/pending-transactions/${transactionId}`,
      data
    );
    return response.data;
  },

  rejectPendingTransaction: async (transactionId: number) => {
    const response = await api.delete(
      `/israeli-stocks/pending-transactions/${transactionId}`
    );
    return response.data;
  },

  rejectAllInBatch: async (batchId: string) => {
    const response = await api.post(
      `/israeli-stocks/pending-transactions/batch/${batchId}/reject-all`
    );
    return response.data;
  },

  // Admin: list stocks by logo presence
  getStocksWithoutLogos: async () => {
    const response = await api.get("/israeli-stocks/stocks-without-logos");
    return response.data;
  },

  getStocksWithLogos: async () => {
    const response = await api.get("/israeli-stocks/stocks-with-logos");
    return response.data;
  },

  updateStockLogo: async (stockId: number, svgContent: string) => {
    const response = await api.put(`/israeli-stocks/stocks/${stockId}/logo`, {
      svg_content: svgContent,
    });
    return response.data;
  },

  // Admin: logo crawler endpoints
  crawlLogos: async (batchSize?: number) => {
    const body = batchSize ? { batch_size: batchSize } : {};
    const response = await api.post("/israeli-stocks/crawl-logos", body);
    return response.data;
  },

  crawlLogoForStock: async (stockName: string) => {
    const encoded = encodeURIComponent(stockName);
    const response = await api.post(`/israeli-stocks/crawl-logo/${encoded}`);
    return response.data;
  },

  // Admin: TradingView logo URL crawling
  crawlTradingViewLogoUrls: async (
    batchSize?: number,
    missingOnly: boolean = true
  ) => {
    const body: any = {};
    if (batchSize) body.batch_size = batchSize;
    body.missing_only = missingOnly;
    const response = await api.post(
      "/israeli-stocks/crawl-tradingview-logo-urls",
      body
    );
    return response.data;
  },

  crawlTradingViewLogoUrlForSymbol: async (symbol: string) => {
    const encoded = encodeURIComponent(symbol);
    const response = await api.post(
      `/israeli-stocks/crawl-tradingview-logo-url/${encoded}`
    );
    return response.data;
  },

  // Admin: populate logo_svg from stored logo_url
  populateLogoSvgFromUrlBulk: async (
    batchSize?: number,
    onlyMissing: boolean = true
  ) => {
    const body: any = {};
    if (batchSize) body.batch_size = batchSize;
    body.only_missing = onlyMissing;
    const response = await api.post(
      "/israeli-stocks/fetch-logo-svg-from-url",
      body
    );
    return response.data;
  },

  populateLogoSvgFromUrlForStock: async (stockId: number) => {
    const response = await api.post(
      `/israeli-stocks/fetch-logo-svg-from-url/${stockId}`
    );
    return response.data;
  },

  importStocksFromCSV: async () => {
    const response = await api.post("/israeli-stocks/import-stocks-from-csv");
    return response.data;
  },

  // Reports Management
  getReports: async () => {
    const response = await api.get("/israeli-stocks/reports");
    return response.data;
  },

  downloadReport: async (reportId: number): Promise<Blob> => {
    const response = await api.get(
      `/israeli-stocks/reports/${reportId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  deleteReport: async (reportId: number, deleteTransactions: boolean = false) => {
    const response = await api.delete(
      `/israeli-stocks/reports/${reportId}?delete_transactions=${deleteTransactions}`
    );
    return response.data;
  },
};

// World Stocks API
export const worldStocksAPI = {
  uploadPDF: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/world-stocks/upload-pdf", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getAccounts: async () => {
    const response = await api.get("/world-stocks/accounts");
    return response.data || [];
  },

  getHoldings: async (accountId?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (accountId) params.append("account_id", accountId.toString());
    if (limit) params.append("limit", limit.toString());

    const paramString = params.toString();
    const response = await api.get(
      `/world-stocks/holdings${paramString ? `?${paramString}` : ""}`
    );
    return response.data || [];
  },

  getTransactions: async (
    accountId?: number,
    symbol?: string,
    limit?: number
  ) => {
    const params = new URLSearchParams();
    if (accountId) params.append("account_id", accountId.toString());
    if (symbol) params.append("symbol", symbol);
    if (limit) params.append("limit", limit.toString());

    const paramString = params.toString();
    const response = await api.get(
      `/world-stocks/transactions${paramString ? `?${paramString}` : ""}`
    );
    return response.data || [];
  },

  getDividends: async (accountId?: number, symbol?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (accountId) params.append("account_id", accountId.toString());
    if (symbol) params.append("symbol", symbol);
    if (limit) params.append("limit", limit.toString());

    const paramString = params.toString();
    const response = await api.get(
      `/world-stocks/dividends${paramString ? `?${paramString}` : ""}`
    );
    return response.data || [];
  },

  getSummary: async (accountId?: number) => {
    const params = accountId ? `?account_id=${accountId}` : "";
    const response = await api.get(`/world-stocks/summary${params}`);
    return response.data;
  },

  deleteHolding: async (holdingId: number) => {
    const response = await api.delete(`/world-stocks/holdings/${holdingId}`);
    return response.data;
  },

  deleteAccount: async (accountId: number) => {
    const response = await api.delete(`/world-stocks/accounts/${accountId}`);
    return response.data;
  },

  // Logo Crawler APIs
  crawlAllLogos: async (batchSize: number = 5) => {
    const response = await api.post(`/world-stocks/crawl-logos?batch_size=${batchSize}`);
    return response.data;
  },

  crawlLogoForTicker: async (ticker: string, exchange: string = "NASDAQ") => {
    const response = await api.post(`/world-stocks/crawl-logo/${ticker}?exchange=${exchange}`);
    return response.data;
  },

  crawlTradingViewLogoUrls: async (batchSize: number = 5, missingOnly: boolean = true) => {
    const response = await api.post(
      `/world-stocks/crawl-tradingview-logo-urls?batch_size=${batchSize}&missing_only=${missingOnly}`
    );
    return response.data;
  },

  fetchLogoSvgFromUrl: async (batchSize: number = 5, onlyMissing: boolean = true) => {
    const response = await api.post(
      `/world-stocks/fetch-logo-svg-from-url?batch_size=${batchSize}&only_missing=${onlyMissing}`
    );
    return response.data;
  },

  getLogoStats: async () => {
    const response = await api.get("/world-stocks/logo-stats");
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  resetUserStockData: async (email: string) => {
    const response = await api.delete(`/admin/users/${encodeURIComponent(email)}/stock-data`);
    return response.data;
  },

  getUsers: async (skip = 0, limit = 100) => {
    const response = await api.get(`/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getSystemStats: async () => {
    const response = await api.get("/admin/stats");
    return response.data;
  },
};

export default api;
