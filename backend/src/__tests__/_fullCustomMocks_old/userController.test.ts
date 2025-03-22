import { NextFunction } from "express";

import { registerUser } from "controllers/userController";
import createMockRequest from "./createMockRequest";
import createMockResponse from "./createMockResponse";

// Mock User model functions
jest.mock("models/userModel", () => {
  // Mock User model
  const mockUser = {
    _id: "user-id",
    name: "John Doe",
    email: "johndoe@example.com",
  };

  return {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockUser),
  };
});
// Mock JWT and bcrypt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-token"),
}));
const bcrypt = require("bcryptjs");
bcrypt.genSalt = jest.fn().mockResolvedValue("mock-salt");
bcrypt.hash = jest.fn().mockResolvedValue("mock-hashed-password");

// Test
test("should register a new user", async () => {
  const req = createMockRequest();
  // const req = {
  //   body: {
  //     name: "John Doe",
  //     email: "johndoe@example.com",
  //     password: "password",
  //   },
  // };

  const res = createMockResponse();

  const next: NextFunction = jest.fn();

  await registerUser(req, res, next);
  expect(res.status).toHaveBeenCalledWith(201);
});

test("should return a 400 error if any field is missing", async () => {
  const req = createMockRequest();
  // const req = {
  //   body: {
  //     name: "John Doe",
  //     email: "", // Missing email field intentionally
  //     password: "password",
  //   },
  // };

  const res = createMockResponse();

  const next: NextFunction = jest.fn();

  await expect(registerUser(req, res, next)).rejects.toThrow(
    "All fields are mandatory",
  );
  expect(res.status).toHaveBeenCalledWith(400);
});
