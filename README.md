# 🎓 StudyMate AI — Personalized AI Study Buddy

> **"Learn anything. Understand everything."**  
> An AI-powered student learning companion built for hackathons, powered by Google's latest **Gemini 3.8 Flash** model via the official `@google/genai` SDK.

---

## 📌 Problem Statement

Students frequently encounter complex academic concepts in programming, computer science, and STEM subjects that traditional textbooks or generic AI chatbots explain poorly. 

Generic chatbots typically provide dense paragraphs, overwhelming technical jargon, or pure code dumps with zero pedagogical structure. Students don't just need answers; they need:
1. **Intuitive explanations** tailored to their current knowledge level.
2. **Relatable real-world analogies** that bridge abstract theory into concrete understanding.
3. **Structured revision points** for quick retention.
4. **Active recall testing** to verify they actually grasped the material instead of passively reading.

---

## 💡 Solution

**StudyMate AI** is designed specifically as an **AI Study Buddy and Personalized Tutor**. Rather than behaving like an open-ended assistant, StudyMate AI implements an educational loop:

$$\text{LEARN} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{PRACTICE}$$

- **Adaptive Learning Levels**: Switch between **Beginner** (plain English & intuitive analogies), **Intermediate** (balanced technical depth), and **Exam Mode** (definitions, high-scoring points, likely exam questions).
- **Structured Explanations**: Responses are automatically segmented into *Simple Explanation*, *Real-Life Example*, *Key Points*, *Practical Code/Illustration*, and a *Quick Check*.
- **Instant AI Action Buttons**: Refine any answer on-demand with `[Explain Simpler]`, `[Give Example]`, `[Summarize]`, and `[Generate Quiz]`.
- **Dynamic 3-Question MCQ Quizzes**: Test knowledge with real-time AI-generated quizzes complete with instant feedback, scoring, and per-question rationale.
- **Local Persistence & Motivation**: Stores study history, question counts, and a daily **Study Streak (🔥)** right in the browser via `localStorage`—no complex databases required.

---

## 🔄 The Central Flow: Learn → Understand → Practice

```
               +--------------------------------------------------+
               |                  1. LEARN                        |
               |  Student asks doubt or picks suggested topic     |
               |  Gemini 3.8 Flash delivers structured tutor view |
               +--------------------------------------------------+
                                        |
                                        v
               +--------------------------------------------------+
               |                2. UNDERSTAND                     |
               |  Student clicks [Explain Simpler]                |
               |  or requests [Give Example] / [Summarize]        |
               +--------------------------------------------------+
                                        |
                                        v
               +--------------------------------------------------+
               |                 3. PRACTICE                      |
               |  Student clicks [Generate Quiz]                  |
               |  Interactive 3-question MCQ with explanations    |
               +--------------------------------------------------+
```

---

## ✨ Key Features

- **Personalized AI Tutor**: System instructions train Gemini 3.8 Flash to be patient, encouraging, and pedagogically sound.
- **Answer Structure**:
  - 🧠 **Simple Explanation**: Clear, level-adapted breakdown.
  - 💡 **Real-Life Example**: Everyday analogy that makes the concept click.
  - 📌 **Key Points**: 3–5 bullet points for rapid memorization.
  - 💻 **Example**: Clean, commented code snippet or practical demonstration.
  - ❓ **Quick Check**: A comprehension question to test retention.
- **One-Click AI Actions**:
  - `Explain Simpler`: Rewrites the concept in simpler terms with a friendlier analogy.
  - `Give Example`: Generates practical real-world scenarios.
  - `Summarize`: Distills the core message into high-yield exam points.
  - `Generate Quiz`: Creates a dynamic 3-question MCQ quiz on the topic.
- **Interactive Quiz Module**:
  - Custom MCQ cards with A, B, C, D choices.
  - Immediate visual feedback (green for correct, red for incorrect).
  - Detailed explanation for each answer.
  - Confetti celebration animation on high scores.
- **Study Streak & Progress Counter**:
  - 🔥 Daily Study Streak tracker.
  - Total doubts asked, quizzes completed, and topics mastered.
- **Local Session Management**:
  - Automatic conversation titles generated from the student's first question.
  - Full history browsing, searching, resuming, and deletion.
- **Dark Mode SaaS Dashboard**:
  - Sleek, modern slate theme with subtle glassmorphism.
  - Responsive mobile drawer navigation.
  - Code syntax blocks with one-click copy.
  - Non-intrusive toast notifications.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, JavaScript (ES Modules), CSS3 Variables |
| **Icons & UI** | `lucide-react`, `canvas-confetti`, `react-markdown` |
| **Backend** | Node.js (v22+), Express.js, CORS, Dotenv |
| **AI Engine** | Google Gemini API (`gemini-3.8-flash`) |
| **AI SDK** | Google Official `@google/genai` (Node.js SDK) |
| **Storage** | Browser `localStorage` (Privacy-preserving, zero database setup) |

---

## 🏗 Architecture & Security

```
┌──────────────────────────────────────────────┐
│             React Frontend (Vite)            │
│  - Educational Dashboard & Level Selector    │
│  - Chat Stream, Markdown, Quiz Modal         │
│  - LocalStorage (History, Streak, Stats)     │
└──────────────────────┬───────────────────────┘
                       │ HTTP REST (Proxy /api)
                       ▼
┌──────────────────────────────────────────────┐
│           Express.js Backend Server          │
│  - POST /api/ask                             │
│  - POST /api/explain                         │
│  - POST /api/quiz                            │
│  - GET  /api/health                          │
│  - Error Handling & Input Validation         │
└──────────────────────┬───────────────────────┘
                       │ Official @google/genai SDK
                       ▼
┌──────────────────────────────────────────────┐
│           Google Gemini 3.8 Flash            │
│  - System Prompt: Patient & Friendly Tutor   │
│  - Structured Educational JSON Quizzes       │
└──────────────────────────────────────────────┘
```

### 🔒 Security Principles
- **No Frontend Exposure**: `GEMINI_API_KEY` is kept strictly on the Express server in `backend/.env`.
- **No `VITE_GEMINI_API_KEY`**: Client code never talks directly to Google AI endpoints.
- **Error Obfuscation**: Upstream API errors or sensitive tokens are never passed back to the client; user-friendly error banners are shown instead.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended; v22 supported)
- npm (v9 or higher)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

---

### 1. Clone & Setup Repository

```bash
cd hacktober
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` (or copy from `backend/.env.example`):

```bash
cp .env.example .env
```

Add your Gemini API key in `backend/.env`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=5000
```

Start the backend:

```bash
# Development mode (auto-restart)
npm run dev

# Or production start
npm start
```

Backend will be running at `http://localhost:5000`.

### 3. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be running at `http://localhost:3000` (or `http://localhost:5173`).

---

## 📡 API Endpoints

### 1. `POST /api/ask`
Ask an academic question with conversational context.
- **Request Body**:
  ```json
  {
    "question": "What is recursion?",
    "level": "beginner",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "answer": "🧠 Simple Explanation\n..."
  }
  ```

### 2. `POST /api/explain`
Request dynamic simplification, real-world examples, or a high-level summary.
- **Request Body**:
  ```json
  {
    "question": "What is recursion?",
    "previousAnswer": "...",
    "action": "simpler" 
  }
  ```
  *(Supported actions: `"simpler"`, `"example"`, `"summarize"`)*
- **Response**:
  ```json
  {
    "answer": "..."
  }
  ```

### 3. `POST /api/quiz`
Generate a dynamic 3-question MCQ quiz on any topic.
- **Request Body**:
  ```json
  {
    "topic": "JavaScript Promises",
    "level": "intermediate"
  }
  ```
- **Response**:
  ```json
  {
    "quiz": [
      {
        "question": "What are the three states of a JavaScript Promise?",
        "options": [
          "A. Pending, Fulfilled, Rejected",
          "B. Start, Running, Stopped",
          "C. True, False, Null",
          "D. Try, Catch, Finally"
        ],
        "correctIndex": 0,
        "explanation": "A Promise is always in one of three states: pending, fulfilled, or rejected."
      }
    ]
  }
  ```

---

## 🔮 Future Improvements

1. **Voice Tutor Mode**: Audio output using `gemini-3.8-flash-tts` for conversational auditory learning.
2. **Flashcard Deck Generator**: Export topic key points directly into downloadable spaced-repetition flashcards (Anki / Quizlet format).
3. **Diagram Generation**: Interactive SVG flowchart generation for algorithm tracing and biology pathways.
4. **Subject Cheat Sheets**: Instant one-page PDF cheat sheet export before exams.

---

## 📄 License
MIT License. Created for Hackathon 2026.
