import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { askDoubt, explainAction, generateQuiz, getAiProviderStatus } from "./gemini.js";
import authRouter from "./auth.js";
import studyDataRouter from "./study-data.js";
import { closeDatabase, connectToDatabase } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "5mb" }));
app.use((req, _res, next) => {
  const cookies = req.headers.cookie || "";
  req.cookies = Object.fromEntries(
    cookies.split(";").filter(Boolean).map(cookie => {
      const separator = cookie.indexOf("=");
      const name = cookie.slice(0, separator).trim();
      const value = cookie.slice(separator + 1).trim();
      return [name, decodeURIComponent(value)];
    })
  );
  next();
});
app.use("/api/auth", authRouter);
app.use("/api/study-data", studyDataRouter);

// Standard user-facing error message
const CLIENT_ERROR_MESSAGE = "Something went wrong while connecting to StudyMate AI. Please try again.";

// Health check endpoint
app.get("/api/health", (req, res) => {
  const aiProvider = getAiProviderStatus();
  res.json({
    status: "ok",
    service: "StudyMate AI Backend",
    aiProvider: aiProvider.provider,
    model: aiProvider.primaryModel,
    models: {
      gemini: aiProvider.gemini.model,
      gemma: aiProvider.gemma.model
    },
    apiKeyConfigured: aiProvider.gemini.configured,
    geminiConfigured: aiProvider.gemini.configured,
    gemmaConfigured: aiProvider.gemma.configured
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

app.use((error, _req, res, _next) => {
  console.error("[StudyMate AI Backend] Request failed:", error?.message || error);
  return res.status(500).json({ error: "The request could not be completed. Please try again." });
});

if (!process.env.JWT_SECRET?.trim() || Buffer.byteLength(process.env.JWT_SECRET.trim()) < 32) {
  throw new Error("JWT_SECRET must contain at least 32 bytes. Add a private secret to backend/.env.");
}

await connectToDatabase();

const server = app.listen(PORT, () => {
  const aiProvider = getAiProviderStatus();
  console.log(`[StudyMate AI Backend] Server running on http://localhost:${PORT}`);
  console.log(`[StudyMate AI Backend] AI Provider: ${aiProvider.provider}`);
  console.log(`[StudyMate AI Backend] Gemini Model: ${aiProvider.gemini.model}`);
  console.log(`[StudyMate AI Backend] Gemma Model: ${aiProvider.gemma.model} via ${aiProvider.gemma.apiUrl}`);
  if (!aiProvider.gemini.configured) {
    console.log("[StudyMate AI Backend] Notice: GEMINI_API_KEY is not set. Ensure Ollama is running with the configured Gemma model.");
  } else {
    console.log("[StudyMate AI Backend] Gemini API Key is configured and ready.");
  }
});

async function shutdown() {
  server.close(async error => {
    if (error) {
      console.error("[StudyMate AI Backend] Error closing server:", error);
      process.exitCode = 1;
    }
    await closeDatabase();
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
