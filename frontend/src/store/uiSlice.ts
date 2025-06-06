import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  percentHeroInView: number;
  isMobileNavExpanded: boolean;
}

const initialState: UIState = {
  percentHeroInView: -1,
  isMobileNavExpanded: false,
};

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Use setters with payloads when setting state based
    // on external input (scroll position, screen size, etc).
    setHeroInView(state, action: PayloadAction<number>) {
      state.percentHeroInView = action.payload;
    },
    // Use imperative verbs without payloads for user interactions
    // with known results (open/close/toggle menus).
    openMobileNav: (state) => {
      state.isMobileNavExpanded = true;
    },
    expandMobileNav: (state) => {
      state.isMobileNavExpanded = false;
    },
    toggleMobileNav: (state) => {
      state.isMobileNavExpanded = !state.isMobileNavExpanded;
    },
  },
});

export const {
  setHeroInView,
  openMobileNav,
  expandMobileNav,
  toggleMobileNav,
} = uiSlice.actions;

export default uiSlice.reducer;
