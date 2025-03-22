import express, { Application } from "express";
import errorHandler from "middleware/errorMiddleware";
import cors from "cors";

import taskRoutes from "routes/taskRoutes";
import userRoutes from "routes/userRoutes";

// Create the Express app
const app: Application = express();

// Configure the Express app
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Attach routes
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

// Global error handling middleware
app.use(errorHandler);

export default app;
