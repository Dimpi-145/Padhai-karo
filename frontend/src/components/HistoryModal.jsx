import React, { useState } from "react";
import { History, X, Search, Trash2, MessageSquare, ArrowRight } from "lucide-react";

export default function HistoryModal({
  isOpen,
  onClose,
  conversations = [],
  onSelectConversation,
  onDeleteConversation,
  onClearAll
}) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filtered = conversations.filter(c => 
    (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.messages || []).some(m => (m.content || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="generic-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <History size={20} color="#818cf8" />
            <h3 className="modal-title">Study History</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Search bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "8px 12px"
          }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search previous study sessions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: "0.88rem"
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ color: "#64748b" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* List of sessions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748b", fontSize: "0.88rem" }}>
                {searchQuery ? "No matching study sessions found." : "No study sessions recorded yet."}
              </div>
            ) : (
              filtered.map(conv => (
                <div
                  key={conv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "rgba(30, 41, 59, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: "#f8fafc", 
                      fontSize: "0.9rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {conv.title || "Untitled Session"}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "3px" }}>
                      {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString()} • {conv.messages?.length || 0} messages
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      className="ai-action-btn"
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                      }}
                      style={{ padding: "6px 12px" }}
                      title="Open this session"
                    >
                      <span>Resume</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteConversation(conv.id)}
                      style={{
                        padding: "6px",
                        color: "#ef4444",
                        borderRadius: "6px"
                      }}
                      title="Delete session"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clear all footer */}
          {conversations.length > 0 && (
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              paddingTop: "10px", 
              borderTop: "1px solid rgba(255, 255, 255, 0.08)" 
            }}>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete all study history? This cannot be undone.")) {
                    onClearAll();
                    onClose();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.8rem",
                  color: "#f87171"
                }}
              >
                <Trash2 size={14} />
                <span>Clear All Sessions</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
