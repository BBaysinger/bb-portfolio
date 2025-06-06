import { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    sessionStorage.getItem("isLoggedIn") === "true",
  );

  useEffect(() => {
    // Update state when sessionStorage changes
    const handleStorageChange = () => {
      setIsLoggedIn(sessionStorage.getItem("isLoggedIn") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = () => {
    sessionStorage.setItem("isLoggedIn", "true");
    setIsLoggedIn(true);
  };

  const logout = () => {
    // sessionStorage.removeItem("isLoggedIn");

    // Reset the entire experience on logout (and refresh), because the intro
    // sequence can get overlooked, and there's no harm in repeating it.
    while (sessionStorage.length > 0) {
      const key = sessionStorage.key(0);
      if (key !== null) {
        const value = sessionStorage.getItem(key);
        console.info(`${key}: ${value}`);
        sessionStorage.removeItem(key);
      }
    }

    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
