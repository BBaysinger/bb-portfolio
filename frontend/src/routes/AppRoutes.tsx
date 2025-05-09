import { Routes, Route, Navigate } from "react-router-dom";

import Login from "pages/LoginPage";
import HomePage from "pages/HomePage";
import ProjectPage from "pages/ProjectPage";
import CurriculumVitae from "pages/CurriculumVitae";
// import ProtectedRoute from "./ProtectedRoute";
import ContactPage from "pages/ContactPage";

const AppRoutes = ({ onLogin }: { onLogin: () => void }) => {
  return (
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
  );
};

export default AppRoutes;
