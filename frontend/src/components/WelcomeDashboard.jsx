import React from "react";
import { Brain, Lightbulb, Target, ArrowRight, Sparkles } from "lucide-react";

export default function WelcomeDashboard({ onSelectQuestion }) {
  const suggestedQuestions = [
    "Explain recursion in simple words",
    "What is an API?",
    "Explain DBMS",
    "What is photosynthesis?",
    "Explain JavaScript promises",
    "What is machine learning?"
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-badge">
        <Sparkles size={14} />
        <span>Personalized AI Tutor</span>
      </div>

      <h1 className="welcome-title">
        Hi, I'm StudyMate AI 👋
      </h1>
      <p className="welcome-subtitle">
        Your personal AI study companion.
      </p>
      <p className="welcome-prompt">
        Ask me anything and I'll help you understand it.
      </p>

      {/* Feature Cards: LEARN → UNDERSTAND → PRACTICE */}
      <div className="feature-cards-grid">
        <div className="feature-card learn">
          <div className="card-icon-wrap">
            <Brain size={22} />
          </div>
          <h3 className="card-title">
            🧠 LEARN
          </h3>
          <p className="card-desc">
            Ask your doubt and get an AI explanation adapted directly to your level.
          </p>
        </div>

        <div className="feature-card understand">
          <div className="card-icon-wrap">
            <Lightbulb size={22} />
          </div>
          <h3 className="card-title">
            💡 UNDERSTAND
          </h3>
          <p className="card-desc">
            Get simpler explanations, relatable real-life analogies, and crisp summaries.
          </p>
        </div>

        <div className="feature-card practice">
          <div className="card-icon-wrap">
            <Target size={22} />
          </div>
          <h3 className="card-title">
            🎯 PRACTICE
          </h3>
          <p className="card-desc">
            Generate an instant 3-question AI quiz to test and lock in your knowledge.
          </p>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="suggested-section">
        <div className="suggested-header">
          <Sparkles size={14} />
          <span>Try asking a question to get started:</span>
        </div>

        <div className="suggested-grid">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              className="suggested-chip"
              onClick={() => onSelectQuestion(q)}
            >
              <span>{q}</span>
              <ArrowRight size={14} className="chip-arrow" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
