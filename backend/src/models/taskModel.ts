import mongoose, { Schema, Document } from "mongoose";

// Define an interface for the Task document to enforce type safety
interface ITask extends Document {
  text: string;
  user: mongoose.Schema.Types.ObjectId;
}

// Define the Task schema with the appropriate fields and validation
const taskSchema: Schema<ITask> = new Schema(
  {
    // Task text: String, required field
    text: {
      type: String,
      required: [true, "Please add a text value"],
    },
    // User ID: ObjectId, required field, references the User model
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  // Add timestamps to track created and updated times
  {
    timestamps: true,
  },
);

// Export the Task model based on the schema
export default mongoose.model<ITask>("Task", taskSchema);
