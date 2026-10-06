import React, { useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  placeholder = "Ask any academic doubt (e.g. 'Explain recursion in simple words')..."
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-box">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          rows={1}
          placeholder={placeholder}
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="send-btn"
          disabled={isLoading || !input.trim()}
          onClick={() => {
            if (!isLoading && input.trim()) {
              onSend();
            }
          }}
          aria-label="Send question"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
