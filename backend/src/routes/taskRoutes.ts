import express from "express";
import {
  getTasks,
  setTask,
  updateTask,
  deleteTask,
} from "controllers/taskController";
import protect from "middleware/authMiddleware";

const expressRouter = express.Router();

// Route to get all tasks for the authenticated user
// GET /api/tasks/ - Protected route that requires authentication; calls the getTasks controller
expressRouter.get("/", protect, getTasks);

// Route to create a new task for the authenticated user
// POST /api/tasks/ - Protected route that requires authentication; calls the setTask controller
expressRouter.post("/", protect, setTask);

// Route to update a specific task for the authenticated user
// PUT /api/tasks/:id - Protected route that requires authentication; calls the updateTask controller
expressRouter.put("/:id", protect, updateTask);

// Route to delete a specific task for the authenticated user
// DELETE /api/tasks/:id - Protected route that requires authentication; calls the deleteTask controller
expressRouter.delete("/:id", protect, deleteTask);

export default expressRouter;
