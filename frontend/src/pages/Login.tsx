import { useState } from "react";
// import CryptoJS from "crypto-js";

import styles from "./Login.module.scss";

// This is not secure. It doesn't need to be for now.
const users = [
  {
    username: "admin",
    hash: "713bfda78870bf9d1b261f565286f85e97ee614efe5f0faf7c34e7ca4f65baca",
  }, // password: "adminpass"
];

const hashPassword = async (password: string) => {
  if (!window.crypto?.subtle) {
    // return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    // An error throws when testing in Safari for iOS over local network.
    // Use CryptoJS.SHA256 for testing, but beware that it bloats the bundle size.
    alert("crypto.subtle is not supported in this browser.");
    console.error("crypto.subtle is not supported in this browser.");
    return null;
  }

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  const retVal = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return retVal;
};

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoggingIn(true); // Disable form while processing

    const hashedPassword = await hashPassword(password);
    const user = users.find(
      (u) => u.username === username && u.hash === hashedPassword,
    );

    if (user) {
      sessionStorage.setItem("isLoggedIn", "true");
      onLogin();
    } else {
      setError("Invalid username or password");
      setIsLoggingIn(false); // Re-enable form if login fails
    }
  };

  return (
    <div className={styles["login"]}>
      <div>
        <h1>Login</h1>
        <p>
          Some of my work is protected under non-disclosure agreements (NDAs).
          To respect these agreements and ensure confidentiality, access to my
          portfolio requires authentication.
        </p>
        <p>
          If you have been provided login credentials, please enter them below
          to proceed. If you need access, feel free to reach out to me directly.
        </p>
        <p>Thank you for your understanding!</p>

        <form className={styles["form"]} onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoggingIn}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoggingIn}
          />
          <button className="btn" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
          <p className={styles["error"]}>{error}</p>
        </form>
      </div>
    </div>
  );
};

export default Login;
