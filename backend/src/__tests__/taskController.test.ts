import request from "supertest";
import app from "./app.test";
import Project from "models/projectModel";
import User from "models/userModel";

// Mock the Project and User models
jest.mock("models/projectModel");
jest.mock("models/userModel");

describe("Project Controller (with SuperTest)", () => {
  // Clear all mock data after each test to prevent interference
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test case for fetching projects for an authenticated user
  test("should get projects for a user", async () => {
    const projects = [
      { _id: "project-id-1", text: "Project 1", user: "user-id" },
      { _id: "project-id-2", text: "Project 2", user: "user-id" },
    ];

    // Mock the Project.find method to return the mock projects
    jest.spyOn(Project, "find").mockReturnValue({
      exec: jest.fn().mockResolvedValue(projects),
    } as any);

    // Simulate a GET request to the /api/projects endpoint
    await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer mock-token") // Mock JWT if needed
      .expect(200) // Expect a 200 (OK) response
      .expect((res) => {
        // Check if the response body matches the mock projects
        expect(res.body).toEqual(projects);
      });
  });

  // Test case for creating a new project for an authenticated user
  test("should set a new project for a user", async () => {
    const project = { _id: "new-project-id", text: "New Project", user: "user-id" };

    // Mock the Project.save method to return the mock project
    jest.spyOn(Project.prototype, "save").mockResolvedValue(project);

    // Simulate a POST request to the /api/projects endpoint
    await request(app)
      .post("/api/projects")
      .send({ text: "New Project" }) // Send a project with text
      .set("Authorization", "Bearer mock-token")
      .expect(201) // Expect a 201 (Created) response
      .expect((res) => {
        // Check if the response body matches the mock project
        expect(res.body).toEqual(project);
      });
  });

  // Test case for handling missing project text during creation
  test("should return a 400 error for missing project text", async () => {
    // Simulate a POST request to the /api/projects endpoint with missing text
    await request(app)
      .post("/api/projects")
      .send({})
      .set("Authorization", "Bearer mock-token")
      .expect(400) // Expect a 400 (Bad Request) response
      .expect((res) => {
        // Check if the response body contains the correct error message
        expect(res.body.message).toBe("Please enter a project");
      });
  });

  // Test case for handling a missing user during project update
  test("should return a 401 error if user is not found", async () => {
    // Mock the User.findById method to return null (user not found)
    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    } as any);

    // Simulate a PUT request to update a project
    await request(app)
      .put("/api/projects/project-id-1")
      .send({ text: "Updated Project" })
      .set("Authorization", "Bearer mock-token")
      .expect(401) // Expect a 401 (Unauthorized) response
      .expect((res) => {
        // Check if the response body contains the correct error message
        expect(res.body.message).toBe("No such user found");
      });
  });

  // Test case for handling unauthorized project update
  test("should return a 401 error if user is not authorized to update the project", async () => {
    const projectToUpdate = {
      _id: "project-id-1",
      text: "Original Project",
      user: "user-id-1",
    };

    // Mock the Project.findById method to return a project with a different user ID
    jest.spyOn(Project, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(projectToUpdate),
    } as any);

    // Mock the User.findById method to return a different user
    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "user-id-2" }),
    } as any);

    // Simulate a PUT request to update a project
    await request(app)
      .put("/api/projects/project-id-1")
      .send({ text: "Updated Project" })
      .set("Authorization", "Bearer mock-token")
      .expect(401) // Expect a 401 (Unauthorized) response
      .expect((res) => {
        // Check if the response body contains the correct error message
        expect(res.body.message).toBe("User is not authorized to update");
      });
  });
});
