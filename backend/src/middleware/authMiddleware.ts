import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import User from "models/userModel";

// Define the protect middleware to protect routes by verifying JWT
export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Check if the authorization header exists and starts with "Bearer"
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Extract the token from the authorization header
        const token = req.headers.authorization.split(" ")[1];

        // Check if the JWT secret is defined in environment variables
        if (!process.env.JWT_SECRET) {
          throw new Error(
            "JWT_SECRET is not defined in environment variables.",
          );
        }

        // Verify the JWT token and extract the user ID from the payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
          id: string;
        };

        // Find the user in the database by the ID from the token, excluding the password
        const user = await User.findById(decoded.id).select("-password");

        // If user is not found, set the response to 401 (Unauthorized) and throw an error
        if (!user) {
          res.status(401);
          throw new Error("User not found");
        }

        // Attach user data to the request object (excluding password) for further use in protected routes
        req.user = {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        };

        // Move to the next middleware or route handler
        next();
      } catch (error) {
        console.log(error); // Log the error for debugging
        res.status(401); // Set response status to 401 (Unauthorized)
        throw new Error("You are not authorized"); // Throw an error if JWT verification fails
      }
    } else {
      // If the authorization header is missing, set response status to 401 and throw an error
      res.status(401);
      throw new Error("Authorization header is missing");
    }
  },
);

export default protect;
