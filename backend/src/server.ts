import app from "app";

// Define the server's port, using the environment variable or defaulting to 5000
const PORT = process.env.PORT || 5000;

// Start the server and listen on the specified port
app.listen(PORT, () => {
  // Log a message indicating the server is running and the URL to access it
  console.log(`Server is running on http://localhost:${PORT}`);
});
