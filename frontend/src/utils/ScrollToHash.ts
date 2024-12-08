import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToHash = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        console.log("Scrolling to hash", hash);
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [hash]);

  return null;
};

export default ScrollToHash;
