import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  isHeroInView: boolean;
  isMobileNavOpen: boolean;
}

const initialState: UIState = {
  isHeroInView: false,
  isMobileNavOpen: false,
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
      state.isMobileNavOpen = true;
    },
    closeMobileNav: (state) => {
      state.isMobileNavOpen = false;
    },
    toggleMobileNav: (state) => {
      state.isMobileNavOpen = !state.isMobileNavOpen;
    },
  },
});

export const { setHeroInView, openMobileNav, closeMobileNav, toggleMobileNav } =
  uiSlice.actions;

export default uiSlice.reducer;
