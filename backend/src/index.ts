import express from "express";
import payload from "payload";
import dotenv from "dotenv";
import payloadConfig from "./payload.config"; // Import your full config

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const start = async () => {
  await payload.init({
    // express: app,
    config: payloadConfig, // ✅ Use your config file directly
    onInit: () => {
      payload.logger.info("Payload is ready.");
    },
  });

  app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
  });
};

start();
