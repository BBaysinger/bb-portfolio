import { Request, Response, NextFunction } from "express";

// Define an error-handling middleware function
const errorHandler = (
  err: Error, // Error object
  req: Request, // Express request object
  res: Response, // Express response object
  next: NextFunction, // Next middleware function
) => {
  // Set the status code to the response's status code if it exists, otherwise default to 500 (Internal Server Error)
  const statusCode: number = res.statusCode ? res.statusCode : 500;

  // Set the response status to the determined status code
  res.status(statusCode);

  // Send a JSON response with the error message
  res.json({ message: err.message });
};

export default errorHandler;
