import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { wrapRouter } from "oaf-react-router";
import App from "./App";

// Create the router
const router = createBrowserRouter([{ path: "*", element: <App /> }]);

// Wrap the router with `oaf-react-router`
wrapRouter(router, {
  announcePageNavigation: true, // Enable screen reader announcements
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
