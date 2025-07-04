import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { portfolioAPI } from '@/services/api'

export interface Portfolio {
  id: number
  name: string
  base_currency: string
  total_value?: number
  unrealized_gain_loss?: number
  unrealized_gain_loss_percent?: number
  asset_count: number
}

export interface PortfolioState {
  portfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  isLoading: boolean
  error: string | null
}

const initialState: PortfolioState = {
  portfolios: [],
  currentPortfolio: null,
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchPortfolios = createAsyncThunk(
  'portfolio/fetchPortfolios',
  async (_, { rejectWithValue }) => {
    try {
      const response = await portfolioAPI.getPortfolios()
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch portfolios')
    }
  }
)

export const createPortfolio = createAsyncThunk(
  'portfolio/createPortfolio',
  async (portfolioData: {
    name: string
    description?: string
    base_currency?: string
  }, { rejectWithValue }) => {
    try {
      const response = await portfolioAPI.createPortfolio(portfolioData)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create portfolio')
    }
  }
)

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentPortfolio: (state, action) => {
      state.currentPortfolio = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch portfolios
      .addCase(fetchPortfolios.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPortfolios.fulfilled, (state, action) => {
        state.isLoading = false
        state.portfolios = action.payload
        state.error = null
      })
      .addCase(fetchPortfolios.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Create portfolio
      .addCase(createPortfolio.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createPortfolio.fulfilled, (state, action) => {
        state.isLoading = false
        state.portfolios.push(action.payload)
        state.error = null
      })
      .addCase(createPortfolio.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, setCurrentPortfolio } = portfolioSlice.actions
export default portfolioSlice.reducer
