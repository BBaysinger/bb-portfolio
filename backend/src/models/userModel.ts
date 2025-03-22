import mongoose, { Schema, Document } from "mongoose";

// Define an interface for the User document to enforce type safety
export interface IUser extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Define the User schema with the appropriate fields and validation
const userSchema: Schema<IUser> = new Schema(
  {
    // User ID: String, required field
    _id: {
      type: String,
      required: [true, "_id is required"],
    },
    // First name of the user: String, required field
    firstName: {
      type: String,
      required: [true, "firstName is required"],
    },
    // Last name of the user: String, required field
    lastName: {
      type: String,
      required: [true, "lastName is required"],
    },
    // Email address: String, required and must be unique
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    // Password: String, required field
    password: {
      type: String,
      required: [true, "Password is required"],
    },
  },
  // Add timestamps to track created and updated times
  { timestamps: true },
);

// Export the User model based on the schema
export default mongoose.model<IUser>("User", userSchema);
