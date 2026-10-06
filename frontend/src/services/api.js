/**
 * StudyMate AI API Service
 * Connects frontend to Express backend (which interfaces with Gemini 3.8 Flash)
 */

const API_BASE = ""; // Uses Vite proxy to http://localhost:5000 in dev or relative in prod

const DEFAULT_ERROR = "Something went wrong while connecting to StudyMate AI. Please try again.";

/**
 * Ask an academic doubt
 */
export async function askQuestion(question, level = "beginner", history = []) {
  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, level, history })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || DEFAULT_ERROR);
    }
    return data.answer;
  } catch (err) {
    console.error("[API askQuestion Error]:", err);
    throw new Error(err.message || DEFAULT_ERROR);
  }
}

/**
 * Perform a follow-up action: simpler, example, or summarize
 */
export async function requestExplanation(question, previousAnswer, action = "simpler") {
  try {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, previousAnswer, action })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || DEFAULT_ERROR);
    }
    return data.answer;
  } catch (err) {
    console.error("[API requestExplanation Error]:", err);
    throw new Error(err.message || DEFAULT_ERROR);
  }
}

/**
 * Generate a 3-question MCQ quiz for a topic
 */
export async function fetchQuiz(topic, level = "beginner") {
  try {
    const res = await fetch(`${API_BASE}/api/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, level })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || DEFAULT_ERROR);
    }
    return data.quiz || [];
  } catch (err) {
    console.error("[API fetchQuiz Error]:", err);
    throw new Error(err.message || DEFAULT_ERROR);
  }
}

/**
 * Check backend health & Gemini status
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false };
  }
}
