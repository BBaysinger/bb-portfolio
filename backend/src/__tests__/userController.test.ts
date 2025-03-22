import request from "supertest";
import app from "./app.test";

// Mock the user model to simulate database operations
jest.mock("models/userModel", () => {
  const mockUser = {
    _id: "user-id",
    name: "John Doe",
    email: "johndoe@example.com",
  };

  // Mock the findOne and create methods for user registration
  return {
    findOne: jest.fn().mockResolvedValue(null), // Simulate no existing user
    create: jest.fn().mockResolvedValue(mockUser), // Simulate user creation
  };
});

// Mock the JWT library to simulate token generation
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-token"), // Return a mock token
}));

// Mock bcrypt functions to simulate password hashing
const bcrypt = require("bcryptjs");
bcrypt.genSalt = jest.fn().mockResolvedValue("mock-salt"); // Mock salt generation
bcrypt.hash = jest.fn().mockResolvedValue("mock-hashed-password"); // Mock password hashing

// Test suite for the User Registration API
describe("User Registration API", () => {
  // Test case to register a new user
  test("should register a new user", async () => {
    const response = await request(app)
      .post("/api/users/register") // Simulate POST request to register endpoint
      .send({
        name: "John Doe",
        email: "johndoe@example.com",
        password: "password",
      });

    // Check if the response status is 201 (Created)
    expect(response.status).toBe(201);

    // Check if the response body contains user details
    expect(response.body).toHaveProperty("name", "John Doe");
    expect(response.body).toHaveProperty("email", "johndoe@example.com");
  });

  // Test case to handle missing fields during registration
  test("should return a 400 error if any field is missing", async () => {
    const response = await request(app)
      .post("/api/users/register") // Simulate POST request to register endpoint
      .send({
        name: "John Doe",
        email: "", // Missing email field
        password: "password",
      });

    // Check if the response status is 400 (Bad Request)
    expect(response.status).toBe(400);

    // Check if the response body contains the correct error message
    expect(response.body.message).toBe("All fields are mandatory");
  });
});
