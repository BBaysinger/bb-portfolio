import { NextFunction } from "express";

import { getProjects, setProject, updateProject } from "controllers/projectController";
import Project from "models/projectModel";
import User from "models/userModel";
import createMockRequest from "./createMockRequest";
import createMockResponse from "./createMockResponse";

jest.mock("models/projectModel");
jest.mock("models/userModel");

describe("Project Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should get projects for a user", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const projects = [
      { _id: "project-id-1", text: "Project 1", user: "user-id" },
      { _id: "project-id-2", text: "Project 2", user: "user-id" },
    ];

    jest.spyOn(Project, "find").mockReturnValue({
      exec: jest.fn().mockResolvedValue(projects),
    } as any);

    const next: NextFunction = jest.fn();

    await getProjects(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(projects);
  });

  test("should set a new project for a user", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const project = { _id: "new-project-id", text: "New Project", user: "user-id" };

    jest.spyOn(Project.prototype, "save").mockResolvedValue(project);

    const next: NextFunction = jest.fn();

    await setProject(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(project);
  });

  test("should return a 400 error for missing project text", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const next: NextFunction = jest.fn();

    await expect(setProject(req, res, next)).rejects.toThrow(
      "Please enter a project",
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("should return a 401 error if user is not found", async () => {
    const projectId = "project-id-1";
    const userId = "non-existent-user-id";
    const req = createMockRequest();

    const projectToUpdate = {
      _id: projectId,
      text: "Original Project",
      user: "user-id",
    };

    jest.spyOn(Project, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(projectToUpdate),
    } as any);

    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    } as any);

    const res = createMockResponse();
    const next: NextFunction = jest.fn();

    await expect(updateProject(req, res, next)).rejects.toThrow(
      "No such user found",
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return a 401 error if user is not authorized to update the project", async () => {
    const projectId = "project-id-1";
    const userId = "user-id-2"; // Different user ID from the project owner
    const req = createMockRequest();

    const projectToUpdate = {
      _id: projectId,
      text: "Original Project",
      user: "user-id-1",
    };

    jest.spyOn(Project, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(projectToUpdate),
    } as any);

    jest.spyOn(User, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: userId }),
    } as any);

    const res = createMockResponse();
    const next: NextFunction = jest.fn();

    await expect(updateProject(req, res, next)).rejects.toThrow(
      "User is not authorized to update",
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
