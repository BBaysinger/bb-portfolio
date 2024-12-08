import ReactDOM from "react-dom/client";
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
// import { wrapRouter } from "oaf-react-router";

import App from "./App";

const routes = [{ path: "*", element: <App /> }];
const router = createBrowserRouter(routes);

// wrapRouter(router); // Ensure `oaf-react-router` wraps this correctly.

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
