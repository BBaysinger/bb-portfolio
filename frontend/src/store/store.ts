import { configureStore } from "@reduxjs/toolkit";
import menuReducer from "./menuSlice";

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
    menu: menuReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export default store;
