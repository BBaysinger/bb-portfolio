import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import uiReducer from "./uiSlice";

/**
 *
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
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
