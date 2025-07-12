import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  // Add any custom fields from your Payload User collection
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  resetExperience: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider handles Payload-based auth with session or JWT support.
 *
 * Stores user info and provides login/logout/reset helpers.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // On mount, fetch the current user from Payload
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", {
          credentials: "include", // needed for session cookie-based auth
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
        setUser(null);
        setIsLoggedIn(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Login failed");

      const data = await res.json();
      setUser(data.user);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout may have failed:", err);
    } finally {
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const resetExperience = () => {
    console.info("Resetting local + session storage");
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setIsLoggedIn(false);
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn, login, logout, resetExperience }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
