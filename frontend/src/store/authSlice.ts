import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { LOGIN_FAILED_MESSAGE } from "../constants/messages";

// Debug flag for auth state logging
const debug =
  process.env.DEBUG_AUTH === "1" || process.env.NODE_ENV !== "production";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "user";
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  hasInitialized: boolean; // Track if we've checked auth status
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: true, // Start with loading true to check existing session
  error: null,
  hasInitialized: false,
};

/**
 * Redux authentication slice for managing user authentication state.
 *
 * Handles user login, logout, and authentication status checking with
 * automatic session restoration on app initialization. Integrates with
 * Payload CMS authentication endpoints.
 *
 * Features:
 * - Automatic session restoration on page load
 * - Login/logout state management
 * - Error handling and loading states
 * - NDA content access control
 * - Secure HTTP-only cookie authentication
 */

// Async thunks for API calls
export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/users/me/", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return rejectWithValue("Not authenticated");
        }

        return rejectWithValue(
          `Failed to check auth status (${response.status}).`,
        );
      }

      const data = await response.json();
      // Defensive: ensure user object looks valid (has an id/email)
      const user = data?.user;
      if (
        !user ||
        typeof user !== "object" ||
        (!("id" in user) && !("email" in user))
      ) {
        return rejectWithValue("Auth status response was missing user data.");
      }
      return user;
    } catch {
      return rejectWithValue("Failed to check auth status");
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (
    { identifier, password }: { identifier: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || LOGIN_FAILED_MESSAGE);
      }

      const data = await response.json();
      return data.user;
    } catch {
      return rejectWithValue("Network error during login");
    }
  },
);

/**
 * Redux slice for authentication state management
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuthState: (state) => {
      state.user = null;
      state.isLoggedIn = false;
      state.error = null;
      state.isLoading = false;
      // Consider auth flow "initialized" after an explicit reset (e.g., manual logout)
      // so the UI can immediately render the Login control without hiding it.
      state.hasInitialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        checkAuthStatus.fulfilled,
        (state, action: PayloadAction<User>) => {
          if (debug)
            console.info(
              "✅ checkAuthStatus.fulfilled - User found:",
              action.payload,
            );
          state.user = action.payload;
          state.isLoggedIn = Boolean(
            action.payload?.id || action.payload?.email,
          );
          state.isLoading = false;
          state.error = null;
          state.hasInitialized = true;
        },
      )
      .addCase(checkAuthStatus.rejected, (state, action) => {
        const authError =
          typeof action.payload === "string"
            ? action.payload
            : "Failed to check auth status";
        if (debug) console.info("❌ checkAuthStatus.rejected", { authError });
        state.isLoading = false;
        if (authError === "Not authenticated") {
          state.user = null;
          state.isLoggedIn = false;
        }
        state.error = authError === "Not authenticated" ? null : authError;
        state.hasInitialized = true;
      })

      // Login user
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isLoggedIn = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.user = null;
        state.isLoggedIn = false;
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetAuthState } = authSlice.actions;
export default authSlice.reducer;
