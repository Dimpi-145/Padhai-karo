import React from "react";
import { Menu, Sparkles, BookOpen, Layers, Award } from "lucide-react";

export default function Header({
  learningLevel,
  setLearningLevel,
  onToggleSidebar,
  sessionTitle
}) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <div className="header-title-wrap">
          <h2 className="header-title">
            {sessionTitle || "StudyMate AI"}
          </h2>
        </div>
      </div>

      {/* Learning Level Selector */}
      <div className="header-center">
        <div className="level-selector-pill" role="radiogroup" aria-label="Learning Level">
          <button
            type="button"
            className={`level-btn ${learningLevel === "beginner" ? "active" : ""}`}
            onClick={() => setLearningLevel("beginner")}
            title="Beginner: Simple terms, analogies, intuitive explanations"
          >
            <BookOpen size={13} />
            <span>Beginner</span>
          </button>

          <button
            type="button"
            className={`level-btn ${learningLevel === "intermediate" ? "active" : ""}`}
            onClick={() => setLearningLevel("intermediate")}
            title="Intermediate: Clear technical depth, practical context"
          >
            <Layers size={13} />
            <span>Intermediate</span>
          </button>

          <button
            type="button"
            className={`level-btn exam ${learningLevel === "exam" ? "active" : ""}`}
            onClick={() => setLearningLevel("exam")}
            title="Exam Mode: Definitions, high-scoring points, sample exam questions"
          >
            <Award size={13} />
            <span>Exam Mode</span>
          </button>
        </div>
      </div>

      {/* AI Status Indicator */}
      <div className="header-right">
        <div className="ai-status-badge" title="Tries local Gemma first, then Gemini if needed">
          <span className="status-dot"></span>
          <span>Gemma + Gemini</span>
        </div>
      </div>
    </header>
  );
}
