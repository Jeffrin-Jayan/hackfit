import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRouter from "./routes/auth.js";
import sessionRouter from "./routes/session.js";
import evaluationRouter from "./routes/evaluation.js";
import audioRouter from "./routes/audio.js";
import compileRoutes from "./routes/compile.js"

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/evaluate", evaluationRouter);
app.use("/api/v1/audio", audioRouter);

// coding assessment routes
import questionRouter from "./routes/question.js";
import compileRouter from "./routes/compile.js";
app.use("/api/v1/question", questionRouter);
app.use("/api/v1/compile", compileRouter);
app.use("/api/v1/compile", compileRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "SkillBridge API",
    status: "healthy",
    version: "1.0.0",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.json({
    status: "healthy",
    services: {
      api: true,
      gemini: !!process.env.GEMINI_API_KEY,
      mongodb: dbConnected,
    },
  });
});

// MongoDB connection
const mongodbUrl =
  process.env.MONGODB_URL || "mongodb://localhost:27017/skillbridge";

mongoose
  .connect(mongodbUrl)
  .then(() => {
    console.log(`Connected to MongoDB`);
    console.log(`Database URL: ${mongodbUrl}`);

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });