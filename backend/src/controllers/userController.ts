import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import User, { IUser } from "models/userModel";

// Controller to handle user registration
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  // Destructure name, email, and password from request body
  const { name, email, password } = req.body;

  // Check if all fields are provided
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }

  // Check if the user already exists in the database
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User Exists");
  }

  // Generate a salt and hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create a new user in the database with the hashed password
  const user: IUser = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // If user is created successfully, send a response with user details and a token
  if (user) {
    res.status(201).json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      token: generateJWTtoken(user._id), // Generate JWT token
    });
  } else {
    // If user creation fails, throw an error
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// Controller to handle user login
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  // Destructure email and password from request body
  const { email, password } = req.body;

  // Find the user by email in the database
  const user = await User.findOne({ email });

  // If user is found and the password matches, send user details and a token
  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      token: generateJWTtoken(user._id), // Generate JWT token
    });
  } else {
    // If login fails, throw an error
    res.status(400);
    throw new Error("Invalid data");
  }
});

// Controller to get the current logged-in user's details
const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  // Find the user by ID in the database
  const user: IUser | null = await User.findById(req.user?._id);

  // If user is not found, send a 404 response
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  // Destructure user details and send a response
  const { _id, firstName, lastName, email } = user;
  res.status(200).json({ id: _id, firstName, lastName, email });
});

// Helper function to generate a JWT token for the user
const generateJWTtoken = (id: string): string => {
  // Check if JWT_SECRET is defined in environment variables
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  // Sign the JWT token with user ID and set an expiration time
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "5d" });
};

export { registerUser, loginUser, getCurrentUser };
