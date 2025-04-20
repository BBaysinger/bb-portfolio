import { useState } from "react";
import { NavLink } from "react-router-dom";
// import * as CryptoJS from "crypto-js"; // Add in for testing iOS on local network

import useClientDimensions from "hooks/useClientDimensions";
import { useAuth } from "context/AuthContext";
import styles from "./LoginPage.module.scss";

// Obvs, this is not secure. It doesn't need to be.
const users = [
  {
    username: "admin",
    hash: "713bfda78870bf9d1b261f565286f85e97ee614efe5f0faf7c34e7ca4f65baca",
  },
  {
    username: "TheOther",
    hash: "1ecb9e6bdf6cc8088693c11e366415fe5c73662ecdf08f3df337924d8ea26adc",
  },
  {
    username: "Leslie",
    hash: "6e2a9c2005c195088bc774cdd44def3a886a3e2598219d4e39353ae837b8b081",
  },
  {
    username: "Guest",
    hash: "8e6133f9422f1cb76f58c8b6b8e894fddb76104967babf7818b30a02493010ca",
  },
];

const hashPassword = async (password: string) => {
  const isLocalNetwork = /^192\.168\./.test(window.location.hostname);

  if (!window.crypto?.subtle) {
    if (isLocalNetwork) {
      // An error throws when testing in Safari for iOS over local network.
      // Use CryptoJS.SHA256 for testing, but beware that it bloats the bundle size.
      // DO NOT INCLUDE IN PRODUCTION.
      console.warn("crypto.subtle is not available. Using fallback.");
      return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    }

    const message = "crypto.subtle is not supported in this browser.";
    alert(message);
    console.error(message);
    return null;
  }

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  const retVal = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.info("Passed:", password, "Hashed:", retVal);
  return retVal;
};

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { clientHeight } = useClientDimensions();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoggingIn(true); // Disable form while processing

    const hashedPassword = await hashPassword(password);
    const user = users.find(
      (u) => u.username === username && u.hash === hashedPassword,
    );

    if (user) {
      login(); // Updates global state
      onLogin();
    } else {
      setError("Invalid username or password");
      setIsLoggingIn(false); // Re-enable form if login fails
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
          <NavLink to="/contact#top">reach out</NavLink> to me directly.
        </p>
        <p>Thank you for your understanding!</p>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.sameRow}>
            <label htmlFor="username">
              <div>Username:</div>
              <input
                type="text"
                placeholder=""
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoggingIn}
                autoComplete="username"
                required
              />
            </label>
            <label htmlFor="password">
              <div>Password:</div>
              <input
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                autoComplete="password"
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
              <span className={"statusMessage"}>Logging in...</span>
            ) : error ? (
              <span className={"errorMessage"}>{error}</span>
            ) : (
              <>&nbsp;</> // Prevent layout shift when neither message is shown
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
