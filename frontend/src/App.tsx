import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import ExecutionEnvironment from "exenv";

import AppRoutes from "routes/AppRoutes";
import { closeMenu } from "store/menuSlice";
import Nav, { NavVariant } from "components/layout/Nav";
import Footer from "components/layout/Footer";
import ScrollToHash from "utils/ScrollToHash";
import { RootState } from "store/store";
import { AuthProvider } from "context/AuthContext";
import styles from "./App.module.scss";
import "@/styles/styles.scss";

const App: React.FC = () => {
  const isMenuOpen = useSelector((state: RootState) => state.menu.isOpen);
  const dispatch = useDispatch();

  const handleScrollOrResize = () => {
    if (isMenuOpen) {
      dispatch(closeMenu());
    }
  };

  useEffect(() => {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("scroll", handleScrollOrResize);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [dispatch, isMenuOpen]);

  const handleLogin = () => {
    sessionStorage.setItem("isLoggedIn", "true");
    window.location.href = "/"; // Redirect to homepage after login
  };

  return (
    <AuthProvider>
      <Nav variant={NavVariant.SLIDE_OUT} />
      <div id="top" style={{ position: "absolute", top: "0px" }}></div>
      <div
        className={`${styles["underlay"]} ${isMenuOpen ? styles["expanded"] : ""}`}
      />
      <div id={styles.main} className={isMenuOpen ? styles["expanded"] : ""}>
        <Nav variant={NavVariant.TOP_BAR} />
        <ScrollToHash />
        <AppRoutes onLogin={handleLogin} />
        <Footer />
      </div>
    </AuthProvider>
  );
};

export default App;
