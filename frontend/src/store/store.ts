import { configureStore } from "@reduxjs/toolkit";

import uiReducer from "./uiSlice";

/**
 *
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export default store;
