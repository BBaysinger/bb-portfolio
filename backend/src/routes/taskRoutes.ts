import express from "express";
import {
  getProjects,
  setProject,
  updateProject,
  deleteProject,
} from "controllers/projectController";
import protect from "middleware/authMiddleware";

const expressRouter = express.Router();

// Route to get all projects for the authenticated user
// GET /api/projects/ - Protected route that requires authentication; calls the getProjects controller
expressRouter.get("/", protect, getProjects);

// Route to create a new project for the authenticated user
// POST /api/projects/ - Protected route that requires authentication; calls the setProject controller
expressRouter.post("/", protect, setProject);

// Route to update a specific project for the authenticated user
// PUT /api/projects/:id - Protected route that requires authentication; calls the updateProject controller
expressRouter.put("/:id", protect, updateProject);

// Route to delete a specific project for the authenticated user
// DELETE /api/projects/:id - Protected route that requires authentication; calls the deleteProject controller
expressRouter.delete("/:id", protect, deleteProject);

export default expressRouter;
