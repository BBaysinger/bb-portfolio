import { useState } from "react";

import styles from "./Login.module.scss";

// Yes, I know this is not secure. It doesn't need to be.
const users = [
  {
    username: "admin",
    hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  }, // password: "password"
  { username: "Bradley", hash: "5f4dcc3b5aa765d61d8327deb882cf99" },
];

const hashPassword = (password: string) => {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(password))
    .then((hashBuffer) => {
      const retVal = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      console.log(retVal);
      return retVal;
    });
};

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const hashedPassword = await hashPassword(password);
    const user = users.find(
      (u) => u.username === username && u.hash === hashedPassword,
    );

    if (user) {
      sessionStorage.setItem("isLoggedIn", "true");
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  // useEffect(() => {
  //   console.log("App component mounted");
  // }, []);

  return (
    <div className={styles["login"]}>
      <form className={styles[""]} onSubmit={handleLogin}>
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
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" type="submit">
            Login
          </button>
        </div>
        <p className={styles["error"]}>{error}</p>
      </form>
    </div>
  );
};

export default Login;
