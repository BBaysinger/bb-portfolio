import dotenv from "dotenv";
import { connectDB } from "connect/database";

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

// Import the server to start it
import "./server";
