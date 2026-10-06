import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { 
  HelpCircle, 
  X, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Sparkles, 
  Loader2, 
  Award,
  BookOpen
} from "lucide-react";
import { fetchQuiz } from "../services/api";
import { incrementQuizzesCompleted } from "../services/storage";

export default function QuizModal({
  isOpen,
  onClose,
  initialTopic = "",
  learningLevel = "beginner",
  initialQuiz = null,
  onQuizCompleted
}) {
  const [topic, setTopic] = useState(initialTopic || "");
  const [quizQuestions, setQuizQuestions] = useState(initialQuiz || []);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
    if (initialQuiz && initialQuiz.length > 0) {
      setQuizQuestions(initialQuiz);
      setSelectedAnswers({});
      setIsSubmitted(false);
      setError("");
    } else if (initialTopic && isOpen && (!quizQuestions || quizQuestions.length === 0)) {
      handleGenerateQuiz(initialTopic);
    }
  }, [initialTopic, initialQuiz, isOpen]);

  const handleGenerateQuiz = async (customTopic) => {
    const targetTopic = customTopic || topic;
    if (!targetTopic.trim()) {
      setError("Please specify a topic to test your knowledge.");
      return;
    }

    setIsLoading(true);
    setError("");
    setIsSubmitted(false);
    setSelectedAnswers({});

    try {
      const questions = await fetchQuiz(targetTopic, learningLevel);
      if (!questions || questions.length === 0) {
        throw new Error("Could not generate quiz questions. Please try again.");
      }
      setQuizQuestions(questions);
    } catch (err) {
      console.error("Quiz generation error:", err);
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: optIdx
    }));
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(selectedAnswers).length < quizQuestions.length) {
      setError("Please select an answer for all 3 questions before submitting.");
      return;
    }

    setError("");
    setIsSubmitted(true);

    // Calculate score
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });

    // Increment user stats
    incrementQuizzesCompleted();
    if (onQuizCompleted) onQuizCompleted();

    // Trigger celebratory confetti if score is >= 2
    if (score >= 2) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setError("");
  };

  if (!isOpen) return null;

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });
    return score;
  };

  const score = calculateScore();
  const allAnswered = quizQuestions.length > 0 && Object.keys(selectedAnswers).length === quizQuestions.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="quiz-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="quiz-modal-header">
          <div className="quiz-title-wrap">
            <div className="quiz-icon-badge">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="quiz-header-title">
                StudyMate Practice Quiz
              </h3>
              <p className="quiz-header-sub">
                {topic ? `Topic: ${topic}` : "Instant Knowledge Check"} • {learningLevel.toUpperCase()}
              </p>
            </div>
          </div>
          <button 
            className="modal-close-btn"
            onClick={onClose}
            title="Close Quiz"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="quiz-modal-body">
          {/* Topic input if no quiz loaded yet */}
          {(!quizQuestions || quizQuestions.length === 0) && !isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                Enter any subject or concept you want to test yourself on:
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="e.g. Recursion, Photosynthesis, SQL Joins..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: "0.9rem"
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGenerateQuiz();
                  }}
                />
                <button
                  className="quiz-submit-btn"
                  onClick={() => handleGenerateQuiz()}
                  disabled={!topic.trim()}
                >
                  Generate
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              padding: "40px 20px",
              gap: "14px",
              color: "#a5b4fc"
            }}>
              <Loader2 size={36} className="spin-animate" style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ fontWeight: 500 }}>
                StudyMate AI is drafting 3 personalized questions for "{topic}"...
              </p>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "0.85rem"
            }}>
              {error}
            </div>
          )}

          {/* Results Banner when Submitted */}
          {isSubmitted && (
            <div className="quiz-results-banner">
              <div className="quiz-score-badge">
                {score} / {quizQuestions.length}
              </div>
              <div className="quiz-score-sub">
                {score === 3 ? "🎉 Outstanding! You completely mastered this topic!" : 
                 score === 2 ? "👏 Good job! Review the explanations below to perfect it." :
                 "💡 Keep practicing! Understanding comes with review."}
              </div>
            </div>
          )}

          {/* Question Cards */}
          {!isLoading && quizQuestions && quizQuestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {quizQuestions.map((q, qIdx) => {
                const selectedOpt = selectedAnswers[qIdx];
                return (
                  <div key={qIdx} className="quiz-question-card">
                    <div className="question-number-badge">
                      Question {qIdx + 1} of {quizQuestions.length}
                    </div>
                    <div className="question-text">
                      {q.question}
                    </div>

                    <div className="quiz-options-list">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedOpt === optIdx;
                        const isCorrect = optIdx === q.correctIndex;
                        let optionClass = "quiz-option-btn";

                        if (isSubmitted) {
                          optionClass += " locked";
                          if (isCorrect) {
                            optionClass += " correct-highlight";
                          } else if (isSelected && !isCorrect) {
                            optionClass += " wrong-highlight";
                          }
                        } else if (isSelected) {
                          optionClass += " selected";
                        }

                        const optionLetters = ["A", "B", "C", "D"];
                        // Strip leading "A.", "B.", etc. if present for clean display
                        const cleanOpt = opt.replace(/^[A-D][\.\:\)]\s*/i, "");

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={optionClass}
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                          >
                            <span className="option-marker">
                              {optionLetters[optIdx]}
                            </span>
                            <span style={{ flex: 1 }}>{cleanOpt}</span>
                            {isSubmitted && isCorrect && (
                              <CheckCircle2 size={18} color="#34d399" />
                            )}
                            {isSubmitted && isSelected && !isCorrect && (
                              <XCircle size={18} color="#f43f5e" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation after submission */}
                    {isSubmitted && q.explanation && (
                      <div className="question-explanation-card">
                        <strong>Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {quizQuestions.length > 0 && (
          <div className="quiz-modal-footer">
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {!isSubmitted ? (
                `${Object.keys(selectedAnswers).length} of ${quizQuestions.length} answered`
              ) : (
                `Score: ${score}/${quizQuestions.length}`
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {isSubmitted ? (
                <>
                  <button
                    className="ai-action-btn"
                    onClick={handleResetQuiz}
                    style={{ padding: "8px 16px" }}
                  >
                    <RotateCcw size={14} />
                    <span>Try Again</span>
                  </button>
                  <button
                    className="quiz-submit-btn"
                    onClick={() => handleGenerateQuiz()}
                  >
                    <Sparkles size={14} />
                    <span>New Quiz</span>
                  </button>
                </>
              ) : (
                <button
                  className="quiz-submit-btn"
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || isLoading}
                >
                  Submit Answers
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
