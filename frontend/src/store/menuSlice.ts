import { createSlice } from "@reduxjs/toolkit";

/**
 *
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export interface MenuState {
  isOpen: boolean;
}

const initialState: MenuState = {
  isOpen: false,
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    openMenu: (state) => {
      state.isOpen = true;
    },
    closeMenu: (state) => {
      state.isOpen = false;
    },
    toggleMenu: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const { openMenu, closeMenu, toggleMenu } = menuSlice.actions;
export default menuSlice.reducer;
