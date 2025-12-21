import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
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
    const isNdaRoute = /^\/nda(\/|$)/.test(pathname || "");

    try {
      // Fire-and-forget: don't block UX/redirect on a slow network/backend.
      void fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
        // Allow the request to complete during navigation in supporting browsers.
        keepalive: true,
      }).catch(() => {
        // Continue with client-side cleanup even if API fails
      });
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

    // Proactively clear the auth cookie on the client as a safety net.
    // (The server-side logout should also expire it, but we don't want to depend on timing.)
    try {
      document.cookie =
        "payload-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {}

    // Set a flag to prevent automatic re-authentication
    localStorage.setItem("manualLogout", "true");

    try {
      if (isNdaRoute) {
        // Hard navigation is the most reliable way to exit NDA routes.
        window.location.replace("/");
        return;
      } else {
        // Re-evaluate Server Components so NDA/admin guard updates.
        router.refresh();
      }
    } catch {
      // Fallback to a hard navigation if the router isn't available.
      if (typeof window !== "undefined") {
        window.location.assign(isNdaRoute ? "/" : window.location.href);
      }
    }
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
