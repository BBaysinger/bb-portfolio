import { configureStore } from "@reduxjs/toolkit";
import {
  createRouterReducer,
  createRouterMiddleware,
  createRouterReducerMapObject,
} from "@lagunovsky/redux-react-router";
import { createBrowserHistory } from "history";
import { rootReducer } from "./reducers"; // Your root reducer

// Create a browser history instance
const history = createBrowserHistory();

// Create router middleware
const routerMiddleware = createRouterMiddleware(history);

// Combine your reducers with the router reducers
const store = configureStore({
  reducer: {
    ...rootReducer,
    ...createRouterReducerMapObject(history),
    router: createRouterReducer(history), // Add the router reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(routerMiddleware),
});

export { store, history };
