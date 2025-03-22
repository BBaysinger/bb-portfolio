import { NextFunction } from "express";

import { getTasks, setTask, updateTask } from "controllers/taskController";
import Task from "models/taskModel";
import User from "models/userModel";
import createMockRequest from "./createMockRequest";
import createMockResponse from "./createMockResponse";

jest.mock("models/taskModel");
jest.mock("models/userModel");

describe("Task Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should get tasks for a user", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const tasks = [
      { _id: "task-id-1", text: "Task 1", user: "user-id" },
      { _id: "task-id-2", text: "Task 2", user: "user-id" },
    ];

    jest.spyOn(Task, "find").mockReturnValue({
      exec: jest.fn().mockResolvedValue(tasks),
    } as any);

    const next: NextFunction = jest.fn();

    await getTasks(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(tasks);
  });

  test("should set a new task for a user", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const task = { _id: "new-task-id", text: "New Task", user: "user-id" };

    jest.spyOn(Task.prototype, "save").mockResolvedValue(task);

    const next: NextFunction = jest.fn();

    await setTask(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(task);
  });

  test("should return a 400 error for missing task text", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const next: NextFunction = jest.fn();

    await expect(setTask(req, res, next)).rejects.toThrow(
      "Please enter a task",
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("should return a 401 error if user is not found", async () => {
    const taskId = "task-id-1";
    const userId = "non-existent-user-id";
    const req = createMockRequest();

    const taskToUpdate = {
      _id: taskId,
      text: "Original Task",
      user: "user-id",
    };

    jest.spyOn(Task, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(taskToUpdate),
    } as any);

    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    } as any);

    const res = createMockResponse();
    const next: NextFunction = jest.fn();

    await expect(updateTask(req, res, next)).rejects.toThrow(
      "No such user found",
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return a 401 error if user is not authorized to update the task", async () => {
    const taskId = "task-id-1";
    const userId = "user-id-2"; // Different user ID from the task owner
    const req = createMockRequest();

    const taskToUpdate = {
      _id: taskId,
      text: "Original Task",
      user: "user-id-1",
    };

    jest.spyOn(Task, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(taskToUpdate),
    } as any);

    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: userId }),
    } as any);

    const res = createMockResponse();
    const next: NextFunction = jest.fn();

    await expect(updateTask(req, res, next)).rejects.toThrow(
      "User is not authorized to update",
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
