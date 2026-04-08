import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Define how routes map to nav link targets
const routeToNavMap: Record<string, string> = {
  "/hero": "hero",
  "/hello": "hello",
  "/projects-list": "projects-list",
  "/project": "projects",
  "/cv": "cv",
  "/contact": "contact",
  "/login": "login",
};

export function useNavHighlight() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/") {
      let frame = 0;

      const updateActiveSection = () => {
        frame = 0;

        const focusY = window.innerHeight * 0.5;
        const footer = document.querySelector("footer");
        if (footer instanceof HTMLElement) {
          const footerRect = footer.getBoundingClientRect();
          if (footerRect.top <= focusY) {
            setActiveId(null);
            return;
          }
        }

        const sections = Array.from(
          document.querySelectorAll<HTMLElement>("[data-nav]"),
        );

        const activeSection = sections.find((section) => {
          const rect = section.getBoundingClientRect();
          return rect.top <= focusY && rect.bottom > focusY;
        });

        setActiveId(activeSection?.dataset.nav ?? null);
      };

      const requestUpdate = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(updateActiveSection);
      };

      requestUpdate();
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);

      return () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
        }
        window.removeEventListener("scroll", requestUpdate);
        window.removeEventListener("resize", requestUpdate);
      };
    } else {
      const match = Object.entries(routeToNavMap).find(([prefix]) =>
        pathname.startsWith(prefix),
      );

      const frame = requestAnimationFrame(() => {
        if (match) {
          setActiveId(match[1]);
        } else {
          setActiveId(null); // fallback or unknown route
        }
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [pathname]);

  return activeId;
}
