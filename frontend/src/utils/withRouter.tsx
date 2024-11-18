import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Custom withRouter HOC
const withRouter = <P extends object>(Component: React.ComponentType<P>) => {
  return function WithRouter(props: P) {
    const navigate = useNavigate();
    const location = useLocation();
    return <Component {...props} navigate={navigate} location={location} />;
  };
};

export default withRouter;
