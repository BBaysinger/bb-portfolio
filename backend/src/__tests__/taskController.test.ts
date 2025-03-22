import request from "supertest";
import app from "./app.test";
import Task from "models/taskModel";
import User from "models/userModel";

// Mock the Task and User models
jest.mock("models/taskModel");
jest.mock("models/userModel");

describe("Task Controller (with SuperTest)", () => {
  // Clear all mock data after each test to prevent interference
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test case for fetching tasks for an authenticated user
  test("should get tasks for a user", async () => {
    const tasks = [
      { _id: "task-id-1", text: "Task 1", user: "user-id" },
      { _id: "task-id-2", text: "Task 2", user: "user-id" },
    ];

    // Mock the Task.find method to return the mock tasks
    jest.spyOn(Task, "find").mockReturnValue({
      exec: jest.fn().mockResolvedValue(tasks),
    } as any);

    // Simulate a GET request to the /api/tasks endpoint
    await request(app)
      .get("/api/tasks")
      .set("Authorization", "Bearer mock-token") // Mock JWT if needed
      .expect(200) // Expect a 200 (OK) response
      .expect((res) => {
        // Check if the response body matches the mock tasks
        expect(res.body).toEqual(tasks);
      });
  });

  // Test case for creating a new task for an authenticated user
  test("should set a new task for a user", async () => {
    const task = { _id: "new-task-id", text: "New Task", user: "user-id" };

    // Mock the Task.save method to return the mock task
    jest.spyOn(Task.prototype, "save").mockResolvedValue(task);

    // Simulate a POST request to the /api/tasks endpoint
    await request(app)
      .post("/api/tasks")
      .send({ text: "New Task" }) // Send a task with text
      .set("Authorization", "Bearer mock-token")
      .expect(201) // Expect a 201 (Created) response
      .expect((res) => {
        // Check if the response body matches the mock task
        expect(res.body).toEqual(task);
      });
  });

  // Test case for handling missing task text during creation
  test("should return a 400 error for missing task text", async () => {
    // Simulate a POST request to the /api/tasks endpoint with missing text
    await request(app)
      .post("/api/tasks")
      .send({})
      .set("Authorization", "Bearer mock-token")
      .expect(400) // Expect a 400 (Bad Request) response
      .expect((res) => {
        // Check if the response body contains the correct error message
        expect(res.body.message).toBe("Please enter a task");
      });
  });

  // Test case for handling a missing user during task update
  test("should return a 401 error if user is not found", async () => {
    // Mock the User.findById method to return null (user not found)
    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    } as any);

    // Simulate a PUT request to update a task
    await request(app)
      .put("/api/tasks/task-id-1")
      .send({ text: "Updated Task" })
      .set("Authorization", "Bearer mock-token")
      .expect(401) // Expect a 401 (Unauthorized) response
      .expect((res) => {
        // Check if the response body contains the correct error message
        expect(res.body.message).toBe("No such user found");
      });
  });

  // Test case for handling unauthorized task update
  test("should return a 401 error if user is not authorized to update the task", async () => {
    const taskToUpdate = {
      _id: "task-id-1",
      text: "Original Task",
      user: "user-id-1",
    };

    // Mock the Task.findById method to return a task with a different user ID
    jest.spyOn(Task, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(taskToUpdate),
    } as any);

    // Mock the User.findById method to return a different user
    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "user-id-2" }),
    } as any);

    // Simulate a PUT request to update a task
    await request(app)
      .put("/api/tasks/task-id-1")
      .send({ text: "Updated Task" })
      .set("Authorization", "Bearer mock-token")
      .expect(401) // Expect a 401 (Unauthorized) response
      .expect((res) => {
        // Check if the response body contains the correct error message
        expect(res.body.message).toBe("User is not authorized to update");
      });
  });
});
