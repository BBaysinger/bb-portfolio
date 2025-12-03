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
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement;
              const nav = target.dataset.nav;
              if (nav) {
                setActiveId(nav);
              }
              break;
            }
          }
        },
        {
          rootMargin: "-50% 0px -49% 0px",
          threshold: 0,
        },
      );

      const sections = document.querySelectorAll("[data-nav]");
      sections.forEach((section) => observer.observe(section));

      return () => observer.disconnect();
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
