import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Bot, 
  User, 
  HelpCircle, 
  Copy, 
  Check, 
  BookOpen, 
  Lightbulb, 
  ListOrdered, 
  BrainCircuit 
} from "lucide-react";

export default function ChatMessage({
  message,
  onExplainSimpler,
  onGiveExample,
  onSummarize,
  onGenerateQuiz,
  isLoading
}) {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const isAI = message.role === "assistant" || message.role === "model";

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isAI) {
    return (
      <div className="message-row user">
        <div className="user-bubble">
          <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
          <div className="user-bubble-footer">
            <span>{formatTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-row ai">
      <div className="ai-avatar">
        <Bot size={20} />
      </div>

      <div className="ai-content-card">
        <div className="ai-card-header">
          <div className="ai-author-tag">
            <span>StudyMate AI</span>
            {message.level && (
              <span className="ai-level-badge">{message.level}</span>
            )}
          </div>
          <span className="ai-timestamp">{formatTime(message.timestamp)}</span>
        </div>

        <div className="ai-markdown-body">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");
                if (!inline && match) {
                  return (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => handleCopy(codeString, codeString)}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "rgba(255, 255, 255, 0.1)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          color: "#94a3b8",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}
                        title="Copy code"
                      >
                        {copiedCodeIndex === codeString ? (
                          <>
                            <Check size={12} color="#34d399" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <pre>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* AI Action Buttons */}
        <div className="ai-actions-bar">
          <button
            className="ai-action-btn"
            disabled={isLoading}
            onClick={() => onExplainSimpler(message)}
            title="Explain this concept with simpler words and easier analogy"
          >
            <BrainCircuit size={13} />
            <span>Explain Simpler</span>
          </button>

          <button
            className="ai-action-btn"
            disabled={isLoading}
            onClick={() => onGiveExample(message)}
            title="Get another practical real-world example"
          >
            <Lightbulb size={13} />
            <span>Give Example</span>
          </button>

          <button
            className="ai-action-btn"
            disabled={isLoading}
            onClick={() => onSummarize(message)}
            title="Summarize into 3-5 high-yield key points"
          >
            <ListOrdered size={13} />
            <span>Summarize</span>
          </button>

          <button
            className="ai-action-btn quiz-btn"
            disabled={isLoading}
            onClick={() => onGenerateQuiz(message)}
            title="Generate a 3-question MCQ quiz to test yourself"
          >
            <HelpCircle size={13} />
            <span>Generate Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
}
