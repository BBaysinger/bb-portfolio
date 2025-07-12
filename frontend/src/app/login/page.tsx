"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import useClientDimensions from "@/hooks/useClientDimensions";

import styles from "./page.module.scss";

/**
 * LoginPage prompts user for credentials and attempts Payload CMS login.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version Updated for PayloadCMS login.
 */
const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); // using email, not username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { clientHeight } = useClientDimensions();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setIsLoggingIn(true); // Disable form while processing
    try {
      await login(email, password); // real API call
    } catch {
      setError("Invalid email or password.");
      setIsLoggingIn(false);
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
                disabled={isLoggingIn}
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
                disabled={isLoggingIn}
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <button type="submit" className="btn" disabled={isLoggingIn}>
            Login
          </button>
        </form>

        <div>
          <p>
            {isLoggingIn ? (
              <span className={styles.statusMessage}>Logging in...</span>
            ) : error ? (
              <span className={styles.errorMessage}>{error}</span>
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
