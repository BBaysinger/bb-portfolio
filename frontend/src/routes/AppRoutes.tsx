import { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "pages/LoginPage";
import HomePage from "pages/HomePage";
import ProjectPage from "pages/ProjectPage";
import CurriculumVitae from "pages/CurriculumVitae";
// import ProtectedRoute from "./ProtectedRoute";
import ContactPage from "pages/ContactPage";
import { useSetMainHeight } from "context/MainHeightContext";
const AppRoutes = ({ onLogin }: { onLogin: () => void }) => {
  const heightRef = useRef<HTMLDivElement>(null);

  const setHeight = useSetMainHeight();

  useEffect(() => {
    const node = heightRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [setHeight]);

  return (
    <div ref={heightRef}>
      <Routes>
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/contact" element={<ContactPage />} />
        {/* Protected routes */}
        {/* <Route element={<ProtectedRoute />}> */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/portfolio" element={<HomePage />} />
        <Route path="/portfolio/:projectId" element={<ProjectPage />} />
        <Route path="/cv" element={<CurriculumVitae />} />
        {/* </Route> */}
      </Routes>
    </div>
  );
};

export default AppRoutes;
