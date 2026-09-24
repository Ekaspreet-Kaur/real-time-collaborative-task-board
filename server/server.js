import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import taskRoutes from "./routes/tasks.js";
import activityRoutes from "./routes/activity.js";
import { errorHandler } from "./middleware/error.js";
import { setupSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  }
});

app.set("io", io);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/boards", activityRoutes);

app.use(errorHandler);

setupSocket(io);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
