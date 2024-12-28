import { combineReducers } from '@reduxjs/toolkit';

// Import your slice reducers here
const uiReducer = {
  theme: (state = 'light', action: any) => state,
  loading: (state = false, action: any) => state,
  error: (state = null, action: any) => state
};

const productsReducer = (state = {}, action: any) => state;
const sellersReducer = (state = {}, action: any) => state;
const priceHistoryReducer = (state = {}, action: any) => state;
const settingsReducer = (state = {
  notifications: true,
  autoAnalyze: true
}, action: any) => state;

export const rootReducer = combineReducers({
  ui: combineReducers(uiReducer),
  products: productsReducer,
  sellers: sellersReducer,
  priceHistory: priceHistoryReducer,
  settings: settingsReducer
});

export type RootState = ReturnType<typeof rootReducer>;
