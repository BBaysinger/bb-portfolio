import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Project from "models/projectModel";
import User from "models/userModel";

// Controller to get all projects for the authenticated user
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  // Find projects in the database associated with the logged-in user
  const projects = await Project.find({ user: req.user?._id });

  // Return the found projects in the response
  res.status(200).json(projects);
});

// Controller to create a new project for the authenticated user
export const setProject = asyncHandler(async (req: Request, res: Response) => {
  // Check if the project text is provided in the request body
  if (!req.body.text) {
    res.status(400);
    throw new Error("Please enter a project");
  }

  // Create a new project with the provided text and associate it with the user
  const project = await Project.create({ text: req.body.text, user: req.user?._id });

  // Return the created project in the response
  res.status(200).json(project);
});

// Controller to update a specific project for the authenticated user
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  // Find the project by ID from the request parameters
  const project = await Project.findById(req.params.id);

  // If the project is not found, throw an error
  if (!project) {
    res.status(400);
    throw new Error("Project not found");
  }

  // Find the user by ID from the request
  const user = await User.findById(req.user?._id);

  // If the user is not found, throw an error
  if (!user) {
    res.status(401);
    throw new Error("No such user found");
  }

  // Check if the logged-in user is authorized to update the project
  if (project.user.toString() !== user.id) {
    res.status(401);
    throw new Error("User is not authorized to update");
  }

  // Update the project with the new data from the request body
  const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated project
  });

  // Return the updated project in the response
  res.status(200).json(updatedProject);
});

// Controller to delete a specific project for the authenticated user
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  // Find the project by ID from the request parameters
  const project = await Project.findById(req.params.id);

  // If the project is not found, throw an error
  if (!project) {
    res.status(400);
    throw new Error("Project not found");
  }

  // Find the user by ID from the request
  const user = await User.findById(req.user?._id);

  // If the user is not found, throw an error
  if (!user) {
    res.status(401);
    throw new Error("No such user found");
  }

  // Check if the logged-in user is authorized to delete the project
  if (project.user.toString() !== user.id) {
    res.status(401);
    throw new Error("User is not authorized to delete");
  }

  // Delete the project from the database
  await Project.findByIdAndDelete(req.params.id);

  // Return the ID of the deleted project in the response
  res.status(200).json({ id: req.params.id });
});
