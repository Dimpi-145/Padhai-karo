import React from "react";
import { 
  GraduationCap, 
  Plus, 
  MessageSquare, 
  HelpCircle, 
  History, 
  Settings, 
  Trash2, 
  Flame, 
  Sparkles,
  X
} from "lucide-react";

export default function Sidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  currentTab,
  setCurrentTab,
  studyStats,
  isOpen,
  onClose,
  onOpenQuizModal,
  onOpenHistoryModal,
  onOpenSettingsModal
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="logo-icon-box">
              <GraduationCap size={22} />
            </div>
            <div className="brand-text">
              <div className="brand-name">
                StudyMate <span className="brand-badge">AI</span>
              </div>
              <span className="brand-tagline">Your AI Study Buddy</span>
            </div>
          </div>
          {isOpen && (
            <button 
              className="modal-close-btn"
              onClick={onClose}
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <div className="new-chat-btn-container">
          <button 
            className="new-chat-btn"
            onClick={() => {
              onNewChat();
              if (window.innerWidth <= 868) onClose();
            }}
          >
            <Plus size={18} />
            <span>New Study Session</span>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentTab === "chat" ? "active" : ""}`}
            onClick={() => {
              setCurrentTab("chat");
              if (window.innerWidth <= 868) onClose();
            }}
          >
            <MessageSquare size={17} />
            <span>AI Tutor</span>
          </button>

          <button 
            className="nav-item"
            onClick={() => {
              onOpenQuizModal();
              if (window.innerWidth <= 868) onClose();
            }}
          >
            <HelpCircle size={17} />
            <span>Practice Quiz</span>
          </button>

          <button 
            className="nav-item"
            onClick={() => {
              onOpenHistoryModal();
              if (window.innerWidth <= 868) onClose();
            }}
          >
            <History size={17} />
            <span>Study History</span>
          </button>

          <button 
            className="nav-item"
            onClick={() => {
              onOpenSettingsModal();
              if (window.innerWidth <= 868) onClose();
            }}
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Previous Conversations Section */}
        <div className="sidebar-history-section">
          <div className="history-header">
            <span>Recent Sessions</span>
            <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>
              {conversations.length} saved
            </span>
          </div>

          <div className="history-list">
            {conversations.length === 0 ? (
              <div className="empty-history-hint">
                No past sessions yet.<br />Ask a doubt to start learning!
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    className={`history-item-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      if (window.innerWidth <= 868) onClose();
                    }}
                  >
                    <span className="history-title" title={conv.title}>
                      {conv.title || "Untitled Session"}
                    </span>
                    <span
                      className="history-delete-btn"
                      title="Delete session"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Study Streak & Stats Footer */}
        <div className="sidebar-footer">
          <div className="streak-card">
            <div className="streak-card-top">
              <div className="streak-title-badge">
                <Flame size={18} className="streak-flame-icon" />
                <span>{studyStats?.streak || 1} Day Streak</span>
              </div>
              <Sparkles size={14} color="#f59e0b" />
            </div>

            <div className="streak-stats-row">
              <div className="streak-stat-item">
                <span className="streak-stat-val">
                  {studyStats?.questionsAsked || 0}
                </span>
                <span className="streak-stat-lbl">Doubts</span>
              </div>
              <div className="streak-stat-item">
                <span className="streak-stat-val">
                  {studyStats?.quizzesCompleted || 0}
                </span>
                <span className="streak-stat-lbl">Quizzes</span>
              </div>
              <div className="streak-stat-item">
                <span className="streak-stat-val">
                  {studyStats?.topicsLearned || 0}
                </span>
                <span className="streak-stat-lbl">Mastered</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
