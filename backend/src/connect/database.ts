import mongoose from "mongoose";

// Function to connect to the MongoDB database
const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    const connect = await mongoose.connect(process.env.MONGO_URI as string);

    // Log a message when the connection is successful
    console.log(`MongoDB Connected: ${connect.connection.host}`);
  } catch (err) {
    // Log an error message if the connection fails and exit the process
    console.error(err);
    process.exit(1);
  }
};

// Function to disconnect from the MongoDB database
const disconnectDB = async () => {
  try {
    // Disconnect from MongoDB
    await mongoose.disconnect();

    // Log a message when the disconnection is successful
    console.log("MongoDB Disconnected");
  } catch (err) {
    // Log an error message if the disconnection fails
    console.error("Error disconnecting from MongoDB:", err);
  }
};

export { connectDB, disconnectDB };
