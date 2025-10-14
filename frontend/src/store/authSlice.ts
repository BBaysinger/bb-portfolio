import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

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
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: true, // Start with loading true to check existing session
  error: null,
};

// Async thunks for API calls
export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/users/me", {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Not authenticated");
      }

      const data = await response.json();
      return data.user;
    } catch {
      return rejectWithValue("Failed to check auth status");
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Login failed");
      }

      const data = await response.json();
      return data.user;
    } catch {
      return rejectWithValue("Network error during login");
    }
  },
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue: _rejectWithValue }) => {
    try {
      const response = await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.warn("Logout request failed, but continuing with local logout");
      }

      return null;
    } catch (error) {
      console.warn("Logout error:", error);
      // Still clear local auth state even if API call fails
      return null;
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
          state.user = action.payload;
          state.isLoggedIn = true;
          state.isLoading = false;
          state.error = null;
        },
      )
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.isLoggedIn = false;
        state.isLoading = false;
        state.error = null; // Don't show error for failed auth check
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
      })

      // Logout user
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isLoggedIn = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if logout fails, clear local state
        state.user = null;
        state.isLoggedIn = false;
        state.isLoading = false;
        state.error = null;
      });
  },
});

export const { clearError, resetAuthState } = authSlice.actions;
export default authSlice.reducer;
