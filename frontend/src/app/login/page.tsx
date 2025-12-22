"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

import styles from "./LoginPage.module.scss";

/**
 * LoginPage prompts user for credentials and attempts Payload CMS login.
 *
 */
const LoginPage = () => {
  const router = useRouter();
  const {
    login,
    isLoggedIn,
    isLoading,
    error: authError,
    clearAuthError,
  } = useAuth();
  const [email, setEmail] = useState(""); // using email, not username
  const [password, setPassword] = useState("");
  const [_localError, setLocalError] = useState("");

  const getPostLoginRedirectTo = (): string | null => {
    try {
      // Prefer a stable projectId redirect when available.
      // Short code is an optional opaque alias; keep it as a fallback.
      const projectIdRaw = sessionStorage.getItem("postLoginProjectId") || "";
      const codeRaw = sessionStorage.getItem("postLoginProjectCode") || "";
      const projectId = projectIdRaw.trim();
      const code = codeRaw.trim();

      sessionStorage.removeItem("postLoginProjectId");
      sessionStorage.removeItem("postLoginProjectCode");

      const chosen = projectId || code;
      if (!chosen) return null;
      return `/nda/${encodeURIComponent(chosen)}/`;
    } catch {
      return null;
    }
  };

  // Clear any existing auth errors when component mounts
  useEffect(() => {
    if (authError) {
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  // Redirect if already logged in (but wait for loading to finish)
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const redirectTo = getPostLoginRedirectTo();
      router.replace(redirectTo ?? "/");
      // Ensure Server Components re-evaluate with the new HttpOnly cookie.
      router.refresh();
    }
  }, [isLoading, isLoggedIn, router]);

  if (!isLoading && isLoggedIn) {
    return null;
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
      const errorMessage =
        loginError instanceof Error
          ? loginError.message
          : "Invalid email or password.";
      setLocalError(errorMessage);
    }
  };

  // Single computed status message for display
  const errorMessage = authError || _localError;
  const statusText = isLoading
    ? "Checking authentication..."
    : errorMessage || "\u00A0"; // keep layout height with non-breaking space when idle

  return (
    <div className={styles.login}>
      <div>
        <h1>
          <span>Secure</span> <span>Login</span>
        </h1>
        <p>
          Some of my work is protected under non-disclosure agreements (NDAs).
          To respect these agreements and ensure confidentiality, access to
          certain portfolio projects requires authentication.
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
                placeholder="your@email.com"
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
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </label>
            <div className={styles.buttonRow}>
              <button type="submit" className="btn" disabled={isLoading}>
                {/* {isLoading ? "Logging in..." : "Login"} */}
                Login
              </button>
              <span
                className={clsx(
                  styles.message,
                  styles.statusMessage,
                  errorMessage && styles.errorMessage,
                )}
              >
                {statusText}
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
