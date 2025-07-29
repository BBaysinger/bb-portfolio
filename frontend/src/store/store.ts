import { configureStore } from "@reduxjs/toolkit";

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
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export default store;
