import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import uiReducer from "./uiSlice";

/**
 * Main Redux store configuration for store state management
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
