"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import useClientDimensions from "@/hooks/useClientDimensions";

import styles from "./page.module.scss";

/**
 * LoginPage prompts user for credentials and attempts Payload CMS login.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version Updated for PayloadCMS login.
 */
const LoginPage = () => {
  const { login, isLoggedIn, isLoading, error: authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState(""); // using email, not username
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { clientHeight } = useClientDimensions();

  // Clear any existing auth errors when component mounts
  useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  // Redirect if already logged in (but wait for loading to finish)
  if (!isLoading && isLoggedIn) {
    window.location.href = "/";
    return null;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.login} style={{ minHeight: `${clientHeight}px` }}>
        <div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearAuthError();

    // Client-side validation
    if (!email || !email.includes("@")) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 3) {
      setLocalError("Password is required.");
      return;
    }

    try {
      await login(email, password); // real API call
      // Login successful - the useAuth hook will handle redirect
    } catch (loginError) {
      const errorMessage = loginError instanceof Error 
        ? loginError.message 
        : "Invalid email or password.";
      setLocalError(errorMessage);
    }
  };

  return (
    <div className={styles.login} style={{ minHeight: `${clientHeight}px` }}>
      <div>
        <h1>Login</h1>
        <p>
          Some of my work is protected under non-disclosure agreements (NDAs).
          To respect these agreements and ensure confidentiality, access to my
          portfolio requires authentication.
        </p>
        <p>
          If you have been provided login credentials, please enter them below
          to proceed. If you need access, feel free to{" "}
          <Link href="/contact#top">reach out</Link> to me directly.
        </p>
        <p>Thank you for your understanding!</p>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.sameRow}>
            <label htmlFor="email">
              <div>Email:</div>
              <input
                type="email"
                id="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                required
              />
            </label>
            <label htmlFor="password">
              <div>Password:</div>
              <input
                type="password"
                id="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div>
          <p>
            {(authError || localError) ? (
              <span className={styles.errorMessage}>
                {authError || localError}
              </span>
            ) : (
              <>&nbsp;</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
