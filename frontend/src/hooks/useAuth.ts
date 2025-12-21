import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { clearRUMUser } from "@/services/rum";
import {
  checkAuthStatus,
  loginUser,
  clearError,
  resetAuthState,
} from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Custom hook for authentication using Redux
 *
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoggedIn, isLoading, error, hasInitialized } = useAppSelector(
    (state) => state.auth,
  );

  // Check auth status on mount, but only once globally
  useEffect(() => {
    if (!hasInitialized) {
      // Check if user manually logged out
      const manualLogout = localStorage.getItem("manualLogout");
      if (manualLogout === "true") {
        // Don't check auth status, just set initialized to prevent loops
        dispatch(resetAuthState());
        return;
      }

      dispatch(checkAuthStatus());
    }
  }, [dispatch, hasInitialized]);

  const login = async (email: string, password: string) => {
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();

      // Clear manual logout flag on successful login
      localStorage.removeItem("manualLogout");
      return result;
    } catch (error) {
      // Error is already in Redux state, just re-throw for form handling
      throw new Error(error as string);
    }
  };

  const logout = async () => {
    try {
      // Call the logout API to clear server-side cookies (especially payload-token for SSR)
      const response = await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include", // Include cookies in the request
      });

      if (!response.ok) {
        console.error(
          "Logout API failed:",
          response.status,
          response.statusText,
        );
        // Continue with client-side cleanup even if API fails
      }
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with client-side cleanup even if API fails
    }

    // Force clear Redux auth state
    dispatch(resetAuthState());

    // Clear RUM user tracking
    clearRUMUser();

    // Clear all local storage
    localStorage.clear();
    sessionStorage.clear();

    // Set a flag to prevent automatic re-authentication
    localStorage.setItem("manualLogout", "true");

    // After clearing session, refresh to re-evaluate Server Components so NDA content/admin guard updates
    try {
      router.refresh();
    } catch {}
  };

  const resetExperience = () => {
    console.info("Resetting local + session storage + cookies");
    localStorage.clear();
    sessionStorage.clear();

    // Clear all cookies by setting them to expire
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    dispatch(resetAuthState());
    window.location.reload();
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  return {
    user,
    isLoggedIn,
    isLoading,
    error,
    login,
    logout,
    resetExperience,
    clearAuthError,
  };
};
