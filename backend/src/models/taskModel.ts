import mongoose, { Schema, Document } from "mongoose";

// Define an interface for the Project document to enforce type safety
interface IProject extends Document {
  text: string;
  user: mongoose.Schema.Types.ObjectId;
}

// Define the Project schema with the appropriate fields and validation
const projectSchema: Schema<IProject> = new Schema(
  {
    // Project text: String, required field
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

// Export the Project model based on the schema
export default mongoose.model<IProject>("Project", projectSchema);
