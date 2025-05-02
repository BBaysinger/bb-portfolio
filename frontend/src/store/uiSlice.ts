import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  isHeroInView: boolean;
  isMobileNavExpanded: boolean;
}

const initialState: UIState = {
  isHeroInView: false,
  isMobileNavExpanded: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Use setters with payloads when setting state based
    // on external input (scroll position, screen size, etc).
    setHeroInView(state, action: PayloadAction<boolean>) {
      state.isHeroInView = action.payload;
    },
    // Use imperative verbs without payloads for user interactions
    // with known results (open/close/toggle menus).
    openMobileNav: (state) => {
      state.isMobileNavExpanded = true;
    },
    closeMobileNav: (state) => {
      state.isMobileNavExpanded = false;
    },
    toggleMobileNav: (state) => {
      state.isMobileNavExpanded = !state.isMobileNavExpanded;
    },
  },
});

export const { setHeroInView, openMobileNav, closeMobileNav, toggleMobileNav } =
  uiSlice.actions;

export default uiSlice.reducer;
