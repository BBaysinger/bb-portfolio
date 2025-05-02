import { useSelector } from "react-redux";

import { RootState } from "store/store";
import AppRoutes from "routes/AppRoutes";
import Nav, { NavVariant } from "components/layout/Nav";
import Footer from "components/layout/Footer";
import ScrollToHash from "utils/ScrollToHash";
import { AuthProvider } from "context/AuthContext";

import { useTrackHeroInView } from "hooks/useTrackHeroInView";
import { useAutoCloseMobileNavOnScroll } from "hooks/useAutoCloseMobileNavOnScroll";

import styles from "./App.module.scss";
import "@/styles/styles.scss";

const App: React.FC = () => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavOpen
  );

  const isHeroInView = useSelector(
    (state: RootState) => state.ui.isHeroInView
  );

  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  const handleLogin = () => {
    sessionStorage.setItem("isLoggedIn", "true");
    window.location.href = "/"; // Redirect to homepage after login
  };

  return (
    <AuthProvider>
      <Nav variant={NavVariant.SLIDE_OUT} />
      <div id="top" style={{ position: "absolute", top: "0px" }}></div>

      <div
        className={`${styles.underlay} ${isMenuOpen ? styles.expanded : ""}`}
      />

      <div
        id={styles.main}
        className={[
          isMenuOpen ? styles.expanded : "",
          isHeroInView ? styles.heroVisible : "",
        ].join(" ")}
      >
        <Nav variant={NavVariant.TOP_BAR} />
        <ScrollToHash />
        <AppRoutes onLogin={handleLogin} />
        <Footer />
      </div>
    </AuthProvider>
  );
};

export default App;
