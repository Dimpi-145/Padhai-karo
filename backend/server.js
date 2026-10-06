import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { askDoubt, explainAction, generateQuiz } from "./gemini.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "5mb" }));

// Standard user-facing error message
const CLIENT_ERROR_MESSAGE = "Something went wrong while connecting to StudyMate AI. Please try again.";

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "StudyMate AI Backend",
    model: "gemini-3.8-flash",
    apiKeyConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
  });
});

/**
 * POST /api/ask
 * Body: { question, level, history }
 * Response: { answer }
 */
app.post("/api/ask", async (req, res) => {
  try {
    const { question, level = "beginner", history = [] } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Please enter a question to continue." });
    }

    const answer = await askDoubt({
      question: question.trim(),
      level: level || "beginner",
      history: Array.isArray(history) ? history : []
    });

    return res.json({ answer });
  } catch (error) {
    console.error("[POST /api/ask Error]:", error?.message || error);
    return res.status(500).json({ error: CLIENT_ERROR_MESSAGE });
  }
});

/**
 * POST /api/explain
 * Body: { question, previousAnswer, action }
 * Supported actions: simpler | example | summarize
 * Response: { answer }
 */
app.post("/api/explain", async (req, res) => {
  try {
    const { question, previousAnswer, action = "simpler" } = req.body || {};

    const validActions = ["simpler", "example", "summarize"];
    const safeAction = validActions.includes(action) ? action : "simpler";

    if (!question && !previousAnswer) {
      return res.status(400).json({ error: "Question or previous answer is required." });
    }

    const answer = await explainAction({
      question: question ? question.trim() : "",
      previousAnswer: previousAnswer ? previousAnswer.trim() : "",
      action: safeAction
    });

    return res.json({ answer });
  } catch (error) {
    console.error("[POST /api/explain Error]:", error?.message || error);
    return res.status(500).json({ error: CLIENT_ERROR_MESSAGE });
  }
});

/**
 * POST /api/quiz
 * Body: { topic, level }
 * Response: { quiz: [...] }
 */
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, level = "beginner" } = req.body || {};

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate a quiz." });
    }

    const quiz = await generateQuiz({
      topic: topic.trim(),
      level: level || "beginner"
    });

    return res.json({ quiz });
  } catch (error) {
    console.error("[POST /api/quiz Error]:", error?.message || error);
    return res.status(500).json({ error: CLIENT_ERROR_MESSAGE });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`[StudyMate AI Backend] Server running on http://localhost:${PORT}`);
  console.log(`[StudyMate AI Backend] Gemini Model: gemini-3.8-flash`);
  if (!process.env.GEMINI_API_KEY) {
    console.log(`[StudyMate AI Backend] Notice: GEMINI_API_KEY is not set in backend/.env. Using smart fallback for smooth demo testing.`);
  } else {
    console.log(`[StudyMate AI Backend] Gemini API Key is configured and ready.`);
  }
});
