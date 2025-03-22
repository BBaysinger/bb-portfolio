import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Task from "models/taskModel";
import User from "models/userModel";

// Controller to get all tasks for the authenticated user
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  // Find tasks in the database associated with the logged-in user
  const tasks = await Task.find({ user: req.user?._id });

  // Return the found tasks in the response
  res.status(200).json(tasks);
});

// Controller to create a new task for the authenticated user
export const setTask = asyncHandler(async (req: Request, res: Response) => {
  // Check if the task text is provided in the request body
  if (!req.body.text) {
    res.status(400);
    throw new Error("Please enter a task");
  }

  // Create a new task with the provided text and associate it with the user
  const task = await Task.create({ text: req.body.text, user: req.user?._id });

  // Return the created task in the response
  res.status(200).json(task);
});

// Controller to update a specific task for the authenticated user
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  // Find the task by ID from the request parameters
  const task = await Task.findById(req.params.id);

  // If the task is not found, throw an error
  if (!task) {
    res.status(400);
    throw new Error("Task not found");
  }

  // Find the user by ID from the request
  const user = await User.findById(req.user?._id);

  // If the user is not found, throw an error
  if (!user) {
    res.status(401);
    throw new Error("No such user found");
  }

  // Check if the logged-in user is authorized to update the task
  if (task.user.toString() !== user.id) {
    res.status(401);
    throw new Error("User is not authorized to update");
  }

  // Update the task with the new data from the request body
  const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated task
  });

  // Return the updated task in the response
  res.status(200).json(updatedTask);
});

// Controller to delete a specific task for the authenticated user
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  // Find the task by ID from the request parameters
  const task = await Task.findById(req.params.id);

  // If the task is not found, throw an error
  if (!task) {
    res.status(400);
    throw new Error("Task not found");
  }

  // Find the user by ID from the request
  const user = await User.findById(req.user?._id);

  // If the user is not found, throw an error
  if (!user) {
    res.status(401);
    throw new Error("No such user found");
  }

  // Check if the logged-in user is authorized to delete the task
  if (task.user.toString() !== user.id) {
    res.status(401);
    throw new Error("User is not authorized to delete");
  }

  // Delete the task from the database
  await Task.findByIdAndDelete(req.params.id);

  // Return the ID of the deleted task in the response
  res.status(200).json({ id: req.params.id });
});
