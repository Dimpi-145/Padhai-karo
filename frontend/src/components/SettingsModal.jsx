import React from "react";
import { Settings, X, Cpu, ShieldCheck, Sparkles, Database, BookOpen, Layers, Award } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  learningLevel,
  setLearningLevel,
  conversationsCount,
  onClearData
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="generic-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Settings size={20} color="#818cf8" />
            <h3 className="modal-title">StudyMate Settings</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Default Learning Mode */}
          <div>
            <label style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" }}>
              Active Learning Level
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              <button
                type="button"
                className={`level-btn ${learningLevel === "beginner" ? "active" : ""}`}
                style={{ justifyContent: "center", padding: "10px" }}
                onClick={() => setLearningLevel("beginner")}
              >
                <BookOpen size={14} />
                <span>Beginner</span>
              </button>
              <button
                type="button"
                className={`level-btn ${learningLevel === "intermediate" ? "active" : ""}`}
                style={{ justifyContent: "center", padding: "10px" }}
                onClick={() => setLearningLevel("intermediate")}
              >
                <Layers size={14} />
                <span>Intermediate</span>
              </button>
              <button
                type="button"
                className={`level-btn exam ${learningLevel === "exam" ? "active" : ""}`}
                style={{ justifyContent: "center", padding: "10px" }}
                onClick={() => setLearningLevel("exam")}
              >
                <Award size={14} />
                <span>Exam Mode</span>
              </button>
            </div>
          </div>

          {/* AI Engine Info */}
          <div style={{
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "0.88rem", color: "#a5b4fc", marginBottom: "6px" }}>
              <Cpu size={16} />
              <span>AI Engine: Google Gemini 3.8 Flash</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5 }}>
              Powered by Google's official <code>@google/genai</code> SDK using the flagship <code>gemini-3.8-flash</code> model for lightning-fast explanations and dynamically structured student quizzes.
            </p>
          </div>

          {/* Security & Privacy */}
          <div style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "10px",
            padding: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "0.88rem", color: "#34d399", marginBottom: "4px" }}>
              <ShieldCheck size={16} />
              <span>Zero Frontend Key Exposure</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5 }}>
              All Gemini API requests are safely mediated through your secure Express.js backend. No API keys are ever stored or exposed in client-side code.
            </p>
          </div>

          {/* Local Storage Stats */}
          <div style={{
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={16} color="#818cf8" />
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#fff" }}>
                  Local Storage
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {conversationsCount} saved study sessions
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm("Clear all local conversations and study stats?")) {
                  onClearData();
                  onClose();
                }
              }}
              style={{
                fontSize: "0.78rem",
                color: "#f87171",
                padding: "6px 10px",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                borderRadius: "6px"
              }}
            >
              Reset Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
