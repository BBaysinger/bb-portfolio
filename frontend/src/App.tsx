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
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const isHeroInView = useSelector((state: RootState) => state.ui.isHeroInView);

  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  const handleLogin = () => {
    sessionStorage.setItem("isLoggedIn", "true");
    window.location.href = "/"; // Redirect to homepage after login
  };

  return (
    <AuthProvider>
      <div
        className={[
          isHeroInView ? "heroVisible" : "",
          isMenuOpen ? `isMobileNavExpanded ${styles.isMobileNavExpanded}` : "",
        ].join(" ")}
      >
        <Nav variant={NavVariant.SLIDE_OUT} />
        <div id="top" style={{ position: "absolute", top: "0px" }}></div>

        <div className={styles.underlay} />

        <div id={styles.main}>
          <Nav variant={NavVariant.TOP_BAR} />
          <ScrollToHash />
          <AppRoutes onLogin={handleLogin} />
          <Footer />
        </div>
      </div>
    </AuthProvider>
  );
};

export default App;
