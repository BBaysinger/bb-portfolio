import { Request } from "express";
import { UserDocument } from "models/userModel";

// Extend the global Express namespace to add custom properties to the Request interface
declare global {
  namespace Express {
    // Extend the existing Request interface to include a 'user' property
    interface Request {
      user?: UserDocument; // Optional 'user' property of type UserDocument
    }
  }
}
