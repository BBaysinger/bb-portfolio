import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { checkAuthStatus, loginUser, logoutUser, clearError, resetAuthState } from "@/store/authSlice";

/**
 * Custom hook for authentication using Redux
 * 
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoggedIn, isLoading, error } = useAppSelector((state) => state.auth);

  // Check auth status on mount
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      // Redirect on successful login
      router.push('/');
      return result;
    } catch (error) {
      // Error is already in Redux state, just re-throw for form handling
      throw new Error(error as string);
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      // Redirect to login page after logout
      router.push('/login');
    } catch (error) {
      console.warn('Logout error:', error);
      // Still redirect even if logout API call fails
      router.push('/login');
    }
  };

  const resetExperience = () => {
    console.info("Resetting local + session storage");
    localStorage.clear();
    sessionStorage.clear();
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