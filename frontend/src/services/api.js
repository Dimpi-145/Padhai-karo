/**
 * StudyMate AI API Service
 * Connects frontend to Express backend (which interfaces with Gemini and local Gemma)
 */

const API_BASE = ""; // Uses Vite proxy to http://localhost:5000 in dev or relative in prod

const DEFAULT_ERROR = "Something went wrong while connecting to StudyMate AI. Please try again.";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(data?.error || DEFAULT_ERROR);
  }
  return data;
}

export async function registerAccount(email, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function loginAccount(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
  if (response.status === 401) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || DEFAULT_ERROR);
  return data.user;
}

export async function logoutAccount() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function fetchStudyData() {
  return request("/api/study-data");
}

export async function saveStudyConversation(conversation) {
  return request(`/api/study-data/conversations/${encodeURIComponent(conversation.id)}`, {
    method: "PUT",
    body: JSON.stringify(conversation)
  });
}

export async function removeStudyConversation(id) {
  return request(`/api/study-data/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function clearStudyData() {
  return request("/api/study-data", { method: "DELETE" });
}

export async function saveStudyStats(stats) {
  return request("/api/study-data/stats", {
    method: "PUT",
    body: JSON.stringify(stats)
  });
}

export async function saveStudySettings(settings) {
  return request("/api/study-data/settings", {
    method: "PUT",
    body: JSON.stringify(settings)
  });
}

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
 * Check backend health & AI provider status
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
