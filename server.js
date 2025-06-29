import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.routes.js";

// Load environment variables
dotenv.config();

const app = express();
// const corsOptions = {
//   origin: "*", // Allow all origins (for testing only)
//   methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
//   credentials: false, // Must be false when using "*" origin
// };

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://server-ai-conversation-zeo.vercel.app",
    "https://zeo-conversation-ai.vercel.app",
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/ai", aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
