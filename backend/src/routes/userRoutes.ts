import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "controllers/userController";
import { protect } from "middleware/authMiddleware";

const router = express.Router();

// Route to handle user registration
// POST /api/users/ - Calls the registerUser controller to create a new user
router.post("/", registerUser);

// Route to handle user login
// POST /api/users/login - Calls the loginUser controller to authenticate the user
router.post("/login", loginUser);

// Route to get the current logged-in user's data
// GET /api/users/current - Protected route that requires authentication; calls the getCurrentUser controller
router.get("/current", protect, getCurrentUser);

export default router;
