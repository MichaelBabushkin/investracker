import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import portfolioSlice from "./slices/portfolioSlice";
import transactionSlice from "./slices/transactionSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    portfolio: portfolioSlice,
    transaction: transactionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
