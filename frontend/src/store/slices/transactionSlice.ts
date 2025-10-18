import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { transactionAPI } from "@/services/api";

export interface Transaction {
  id: number;
  portfolio_id: number;
  asset_id?: number;
  transaction_type: string;
  transaction_date: string;
  settlement_date?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fees: number;
  currency: string;
  description?: string;
  broker?: string;
  account_number?: string;
  created_at: string;
  asset_symbol?: string;
  asset_name?: string;
}

export interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TransactionState = {
  transactions: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchTransactions = createAsyncThunk(
  "transaction/fetchTransactions",
  async (
    params: {
      portfolio_id?: number;
      asset_id?: number;
      transaction_type?: string;
      start_date?: string;
      end_date?: string;
      skip?: number;
      limit?: number;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionAPI.getTransactions(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to fetch transactions"
      );
    }
  }
);

export const createTransaction = createAsyncThunk(
  "transaction/createTransaction",
  async (
    transactionData: {
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
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionAPI.createTransaction(transactionData);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to create transaction"
      );
    }
  }
);

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload;
        state.error = null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create transaction
      .addCase(createTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions.unshift(action.payload);
        state.error = null;
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = transactionSlice.actions;
export default transactionSlice.reducer;
