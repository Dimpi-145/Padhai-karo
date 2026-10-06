import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
const GEMMA_MODEL_NAME = process.env.GEMMA_MODEL?.trim() || "gemma3:4b";
const GEMMA_API_URL = (process.env.GEMMA_API_URL?.trim() || "http://localhost:11434").replace(/\/+$/, "");
const AI_PROVIDER = (process.env.AI_PROVIDER?.trim() || "auto").toLowerCase();
const parsedGemmaTimeoutMs = Number(process.env.GEMMA_TIMEOUT_MS || 120000);
const GEMMA_TIMEOUT_MS = Number.isFinite(parsedGemmaTimeoutMs) && parsedGemmaTimeoutMs > 0
  ? parsedGemmaTimeoutMs
  : 120000;
const MAX_GEMINI_RETRIES = 2;
const TEMPORARY_UNAVAILABLE_NOTICE =
  "AI generation is unavailable right now. Here's a basic study fallback. Check that Ollama is running or that your Gemini API quota is available.";

const SYSTEM_INSTRUCTION = `You are StudyMate AI, a friendly, patient and highly effective AI tutor.

Your goal is to help students UNDERSTAND concepts rather than simply giving answers.

Always adapt your explanation to the student's selected learning level.

Use simple language, practical examples and analogies.

Break difficult concepts into smaller steps.

If the student asks a programming question, provide a beginner-friendly code example when useful.

If the student seems confused, simplify the explanation instead of adding more complexity.

Never shame the student for asking basic questions.

For academic questions, prioritize correctness and clarity.

For exam mode, focus on definitions, important points, examples and likely exam questions.`;

/**
 * Helper to get the GoogleGenAI client instance.
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export function getAiProviderStatus() {
  return {
    provider: AI_PROVIDER,
    primaryModel: AI_PROVIDER === "gemini" ? GEMINI_MODEL_NAME : GEMMA_MODEL_NAME,
    gemini: {
      configured: !!process.env.GEMINI_API_KEY?.trim(),
      model: GEMINI_MODEL_NAME
    },
    gemma: {
      configured: !!(GEMMA_API_URL && GEMMA_MODEL_NAME),
      model: GEMMA_MODEL_NAME,
      apiUrl: GEMMA_API_URL
    }
  };
}

function isTransientGeminiError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return error?.name === "APIConnectionError" ||
    status === 408 || status === 429 || (status >= 500 && status < 600) ||
    /\b(?:408|429|5\d{2})\b|overloaded|high demand|temporarily unavailable|try again later|fetch failed|network|unusable/i
      .test(error?.message || "");
}

function shouldRetryGeminiError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  const message = error?.message || "";
  if (status === 429 && /quota|RESOURCE_EXHAUSTED|retry in/i.test(message)) {
    return false;
  }
  return isTransientGeminiError(error);
}

function isRecoverableAiError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return isTransientGeminiError(error) ||
    error?.name === "AbortError" ||
    status === 404 ||
    /ollama|gemma|model.*not found|connection|connect|econnrefused|timeout|terminated|not configured|No AI provider/i.test(error?.message || "");
}

function getSafeProviderErrorMessage(error) {
  const message = String(error?.message || error);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? message.replaceAll(apiKey, "[redacted]") : message;
}

async function generateGeminiText(client, {
  contents,
  systemInstruction,
  temperature = 0.7,
  responseMimeType,
  responseJsonSchema
}) {
  const config = { temperature };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (responseMimeType) config.responseMimeType = responseMimeType;
  if (responseJsonSchema) config.responseJsonSchema = responseJsonSchema;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents,
        config
      });
      const output = response.text?.trim();
      if (!output) {
        throw new Error("Empty response from Gemini API");
      }
      return output;
    } catch (error) {
      if (!shouldRetryGeminiError(error) || attempt >= MAX_GEMINI_RETRIES) {
        throw error;
      }

      const delayMs = 500 * (2 ** attempt);
      console.warn(
        `[StudyMate AI] Gemini temporarily unavailable; retrying in ${delayMs}ms (${attempt + 1}/${MAX_GEMINI_RETRIES}).`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function generateGemmaText({
  contents,
  systemInstruction,
  temperature = 0.7,
  responseMimeType,
  responseJsonSchema
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMMA_TIMEOUT_MS);

  try {
    const body = {
      model: GEMMA_MODEL_NAME,
      prompt: contents,
      stream: false,
      options: { temperature }
    };
    if (systemInstruction) body.system = systemInstruction;
    if (responseJsonSchema) {
      body.format = responseJsonSchema;
    } else if (responseMimeType === "application/json") {
      body.format = "json";
    }

    const response = await fetch(`${GEMMA_API_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Ollama request failed with status ${response.status}`);
    }

    const output = data?.response?.trim();
    if (!output) {
      throw new Error("Empty response from Gemma/Ollama");
    }
    return output;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAiText(request) {
  const provider = ["auto", "gemini", "gemma"].includes(AI_PROVIDER) ? AI_PROVIDER : "auto";
  const providerErrors = [];

  if (provider !== "gemini") {
    try {
      return await generateGemmaText(request);
    } catch (error) {
      providerErrors.push(`Gemma: ${error.message || error}`);
      console.warn(`[StudyMate AI] Gemma/Ollama request failed: ${getSafeProviderErrorMessage(error)}`);
      if (provider === "gemma" && !isRecoverableAiError(error)) {
        throw error;
      }
      if (provider === "gemma") {
        console.warn("[StudyMate AI] Gemma/Ollama unavailable; using study fallback when needed.");
      } else {
        console.warn("[StudyMate AI] Gemma/Ollama unavailable; trying Gemini fallback.");
      }
    }
  }

  if (provider !== "gemma") {
    const geminiClient = getGeminiClient();
    if (geminiClient) {
      try {
        return await generateGeminiText(geminiClient, request);
      } catch (error) {
        providerErrors.push(`Gemini: ${error.message || error}`);
        console.warn(`[StudyMate AI] Gemini request failed: ${getSafeProviderErrorMessage(error)}`);
        if (provider === "gemini" || !isRecoverableAiError(error)) {
          throw error;
        }
        console.warn(
          "[StudyMate AI] Gemini unavailable; using study fallback when needed."
        );
      }
    } else if (provider === "gemini") {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
  }

  throw new Error(providerErrors.join(" | ") || "No AI provider is configured.");
}

/**
 * Builds learning level instructions
 */
function getLevelPrompt(level = "beginner") {
  const normalized = level.toLowerCase();
  if (normalized === "exam" || normalized === "exam mode") {
    return `LEARNING LEVEL: EXAM MODE.
Give:
- Formal Definition
- Important High-Scoring Points
- Examples
- Common Exam Questions & Model Answers
- Short Exam-Oriented Summary for quick revision.`;
  } else if (normalized === "intermediate") {
    return `LEARNING LEVEL: INTERMEDIATE.
Give clear explanations with moderate technical depth. Include appropriate technical terminology where useful, with clear context.`;
  } else {
    return `LEARNING LEVEL: BEGINNER.
Use very simple student-friendly language. Avoid unnecessary technical terminology. Use intuitive everyday analogies. Explain as if teaching someone with zero background.`;
  }
}

/**
 * Standard structured answer format prompt
 */
const FORMAT_INSTRUCTION = `
Please format your response strictly using these Markdown sections:

🧠 Simple Explanation
[Clear explanation adapted to the requested level]

💡 Real-Life Example
[Relatable real-world analogy or practical scenario]

📌 Key Points
• [Point 1]
• [Point 2]
• [Point 3]
• [Point 4 (optional)]
• [Point 5 (optional)]

💻 Example
[If the topic is programming or technical, provide a concise, clean code or technical snippet with beginner-friendly comments. If the topic is non-technical, provide a practical demonstration or omit this heading.]

❓ Quick Check
[One short, engaging question to test whether the student understood the concept.]
`;

/**
 * Fallback generator when no API key is supplied, allowing testing and offline development
 */
function getFallbackAnswer(question, level = "beginner") {
  const qLower = question.toLowerCase();
  let topic = "This Academic Concept";
  if (qLower.includes("recursion")) topic = "Recursion";
  else if (qLower.includes("api")) topic = "APIs (Application Programming Interfaces)";
  else if (qLower.includes("dbms") || qLower.includes("database")) topic = "DBMS (Database Management Systems)";
  else if (qLower.includes("photosynthesis")) topic = "Photosynthesis";
  else if (qLower.includes("promise")) topic = "JavaScript Promises";
  else if (qLower.includes("machine learning")) topic = "Machine Learning";

  return `🧠 Simple Explanation
${topic} is a fundamental concept designed to solve problems efficiently. At the ${level} level, think of it as a set of rules or tools that work together predictably. Instead of memorizing abstract terms, understand that every part has a specific responsibility to keep things organized and functioning properly.

💡 Real-Life Example
Imagine Russian Matryoshka nesting dolls or a restaurant kitchen. When you order a meal, you don't cook it yourself—you ask the waiter (an interface), who hands the order to the chef, who returns the dish. Each layer handles one task cleanly!

📌 Key Points
• Breaks complex systems into manageable, structured pieces.
• Reduces redundancy and ensures predictable, repeatable behavior.
• Crucial for scaling software and understanding how modern systems interact.
• Easily tested and debugged once individual rules are identified.

💻 Example
\`\`\`javascript
// Practical illustration of ${topic}
function demonstrateConcept(input) {
  if (!input) return "Base case reached!";
  console.log("Processing step:", input);
  return demonstrateConcept(input.slice(0, -1));
}
\`\`\`

❓ Quick Check
What is the primary benefit of breaking a complex process down into smaller, defined steps?
(A) It eliminates the need for any logic
(B) It makes the system easier to test, understand, and debug
(C) It runs infinitely without stopping`;
}

/**
 * Fallback quiz generator when no API key is supplied
 */
function getFallbackQuiz(topic = "General Science & Tech", level = "beginner") {
  return [
    {
      question: `What is the core purpose of ${topic}?`,
      options: [
        "A. To solve problems systematically by breaking them down into manageable parts",
        "B. To make computers run slower and use extra memory",
        "C. To prevent students from writing clean code",
        "D. To replace all hardware with paper"
      ],
      correctIndex: 0,
      explanation: `${topic} is designed to organize logic, streamline problem-solving, and simplify complex workflows.`
    },
    {
      question: `Which scenario best illustrates how ${topic} functions in everyday life?`,
      options: [
        "A. A traffic light that turns random colors every millisecond",
        "B. A structured assembly line where each station performs a distinct task",
        "C. Leaving a door unlocked with no key",
        "D. Reading a book backwards with closed eyes"
      ],
      correctIndex: 1,
      explanation: "A structured process or assembly line demonstrates orderly progression and clear division of responsibilities."
    },
    {
      question: `When studying ${topic} for an exam or interview, what should you focus on first?`,
      options: [
        "A. Memorizing random numbers",
        "B. Understanding foundational definitions, key trade-offs, and practical examples",
        "C. Skipping the basics and guessing",
        "D. Deleting the source code"
      ],
      correctIndex: 1,
      explanation: "Mastering foundational principles and relatable examples allows you to tackle any variation of question."
    }
  ];
}

function getFallbackExplanation(action) {
  if (action === "summarize") {
    return `📌 Summary & Key Takeaways

• Core Concept: Break complex topics into simpler, self-contained building blocks.
• Real-World Rule: Analogy helps bridge abstract theory into concrete understanding.
• Best Practice: Practice with small examples before tackling large problems.
• Exam Tip: Always state the definition, a real-world example, and key trade-offs.`;
  }
  if (action === "example") {
    return `💡 Additional Real-Life Example

Imagine you are building a Lego castle. Instead of manufacturing plastic bricks from scratch, you use pre-molded standard bricks that connect seamlessly. Each brick does one job reliably, and when stacked together, they create something grand!`;
  }
  return `🧠 Explained Even Simpler

Let's strip away all technical jargon!

Imagine explaining this to a 10-year-old:
Think of it like following a simple recipe for baking cookies. Step 1: Mix ingredients. Step 2: Bake in oven. Step 3: Enjoy. You don't need to know the molecular physics of heat—you just need to know the steps to get the right outcome!`;
}

/**
 * Ask doubt endpoint handler
 */
export async function askDoubt({ question, level = "beginner", history = [] }) {
  if (!question || typeof question !== "string" || !question.trim()) {
    throw new Error("Question cannot be empty");
  }

  const levelPrompt = getLevelPrompt(level);
  
  // Format recent history (limit to last 6 messages to stay token efficient)
  let contextBlock = "";
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    contextBlock = "Recent conversation context:\n" +
      recent.map(msg => `${msg.role === "user" ? "Student" : "StudyMate"}: ${msg.content}`).join("\n\n") +
      "\n\n";
  }

  const fullPrompt = `${contextBlock}${levelPrompt}

Student Doubt:
"${question.trim()}"

${FORMAT_INSTRUCTION}`;

  try {
    return await generateAiText({
      contents: fullPrompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7
    });
  } catch (error) {
    if (isRecoverableAiError(error)) {
      console.warn("[StudyMate AI] AI providers remained unavailable; returning the educational fallback.");
      return `${TEMPORARY_UNAVAILABLE_NOTICE}\n\n${getFallbackAnswer(question, level)}`;
    }
    console.error("[StudyMate AI] Error in askDoubt:", error.message || error);
    throw error;
  }
}

/**
 * Follow-up action: simpler, example, summarize
 */
export async function explainAction({ question, previousAnswer, action = "simpler" }) {
  if (!question && !previousAnswer) {
    throw new Error("Either question or previous answer must be provided");
  }

  let actionInstruction = "";
  if (action === "simpler") {
    actionInstruction = `ACTION: EXPLAIN SIMPLER
Explain the concept using even simpler, student-friendly language and an easier everyday analogy. Break it into bite-sized ideas. Avoid intimidating jargon.`;
  } else if (action === "example") {
    actionInstruction = `ACTION: GIVE REAL-LIFE EXAMPLES
Provide 2-3 intuitive, practical real-life examples and analogies that illustrate this concept clearly in everyday scenarios.`;
  } else if (action === "summarize") {
    actionInstruction = `ACTION: SUMMARIZE
Provide a concise, punchy summary of the topic in 3 to 5 high-impact bullet points, followed by a one-sentence takeaway.`;
  } else {
    actionInstruction = `ACTION: CLARIFY AND EXPAND
Provide a clearer perspective on this topic with focused guidance.`;
  }

  const prompt = `Student Question:
"${question || 'Explain the concept discussed'}"

Previous Explanation:
"${previousAnswer ? previousAnswer.slice(0, 1500) : ''}"

${actionInstruction}

Format your response cleanly with clear headings, bullet points, and markdown formatting.`;

  try {
    return await generateAiText({
      contents: prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7
    });
  } catch (error) {
    if (isRecoverableAiError(error)) {
      console.warn("[StudyMate AI] AI providers remained unavailable; returning the study-action fallback.");
      return `${TEMPORARY_UNAVAILABLE_NOTICE}\n\n${getFallbackExplanation(action)}`;
    }
    console.error("[StudyMate AI] Error in explainAction:", error.message || error);
    throw error;
  }
}

/**
 * Generate 3-question MCQ quiz
 */
export async function generateQuiz({ topic, level = "beginner" }) {
  if (!topic || typeof topic !== "string" || !topic.trim()) {
    throw new Error("Topic cannot be empty");
  }

  const quizJsonSchema = {
    type: "object",
    properties: {
      quiz: {
        type: "array",
        description: "List of exactly 3 multiple-choice questions",
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "The quiz question" },
            options: {
              type: "array",
              description: "Array of 4 options (e.g. ['A. ...', 'B. ...', 'C. ...', 'D. ...'])",
              items: { type: "string" }
            },
            correctIndex: {
              type: "integer",
              description: "0-based index of the correct option (0 for A, 1 for B, 2 for C, 3 for D)"
            },
            explanation: {
              type: "string",
              description: "Clear explanation for why this choice is correct"
            }
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      }
    },
    required: ["quiz"]
  };

  const prompt = `Create a 3-question multiple choice quiz on the topic: "${topic.trim()}" at the "${level}" learning level.
Make sure there are exactly 3 questions.
Each question must have exactly 4 choices (A, B, C, D).
Specify correctIndex as 0, 1, 2, or 3.
Provide a clear educational explanation for each answer.
Respond only with valid JSON that matches the requested quiz shape.`;

  try {
    const output = await generateAiText({
      contents: prompt,
      systemInstruction: "You are an expert educational examiner who designs accurate, helpful multiple-choice quizzes to test student understanding.",
      temperature: 0.4,
      responseMimeType: "application/json",
      responseJsonSchema: quizJsonSchema
    });

    const parsed = JSON.parse(output);
    if (parsed && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
      return parsed.quiz.slice(0, 3);
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3);
    }
    return getFallbackQuiz(topic, level);
  } catch (error) {
    if (isRecoverableAiError(error)) {
      console.warn("[StudyMate AI] AI providers remained unavailable; returning the quiz fallback.");
    } else {
      console.error("[StudyMate AI] Error in generateQuiz:", error.message || error);
    }
    // If JSON parsing or model generation failed, fallback gracefully to structured quiz
    return getFallbackQuiz(topic, level);
  }
}
