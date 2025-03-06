import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  // Not secure this way. Doesn't need to be.
  const isAuthenticated = sessionStorage.getItem("isLoggedIn") === "true";

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
