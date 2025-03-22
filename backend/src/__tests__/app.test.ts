import express, { Application } from "express";
import errorHandler from "middleware/errorMiddleware";
import cors from "cors";
import taskRoutes from "routes/taskRoutes";
import userRoutes from "routes/userRoutes";

const app: Application = express();

// Use middleware to parse incoming JSON requests
app.use(express.json());

// Use middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: false }));

// Enable CORS for cross-origin resource sharing
app.use(cors());

// Mount task-related routes under the /api/tasks endpoint
app.use("/api/tasks", taskRoutes);

// Mount user-related routes under the /api/users endpoint
app.use("/api/users", userRoutes);

// Use the custom error-handling middleware to handle errors globally
app.use(errorHandler);

export default app;
