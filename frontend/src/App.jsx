import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import WelcomeDashboard from "./components/WelcomeDashboard";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import QuizModal from "./components/QuizModal";
import HistoryModal from "./components/HistoryModal";
import SettingsModal from "./components/SettingsModal";
import Toast from "./components/Toast";
import { askQuestion, requestExplanation, fetchQuiz } from "./services/api";
import { 
  getSavedConversations, 
  saveConversation, 
  deleteConversation, 
  clearAllConversations,
  generateChatTitle,
  getStudyStats,
  incrementQuestionsAsked,
  getUserSettings,
  saveUserSettings
} from "./services/storage";
import "./App.css";

export default function App() {
  // App state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentTab, setCurrentTab] = useState("chat");
  const [learningLevel, setLearningLevel] = useState("beginner");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studyStats, setStudyStats] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Modals state
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizInitialData, setQuizInitialData] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const chatEndRef = useRef(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const saved = getSavedConversations();
    setConversations(saved);

    const stats = getStudyStats();
    setStudyStats(stats);

    const settings = getUserSettings();
    if (settings.defaultLevel) {
      setLearningLevel(settings.defaultLevel);
    }

    if (saved.length > 0) {
      setActiveConversationId(saved[0].id);
    }
  }, []);

  // Save settings when learning level changes
  useEffect(() => {
    saveUserSettings({ defaultLevel: learningLevel });
  }, [learningLevel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations, activeConversationId, isLoading]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  const messages = activeConversation ? activeConversation.messages || [] : [];

  // Helper to add toast
  const addToast = (message, type = "info") => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Start a new chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setInput("");
    setCurrentTab("chat");
  };

  // Select existing conversation
  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setCurrentTab("chat");
  };

  // Delete conversation
  const handleDeleteConversation = (id) => {
    const updated = deleteConversation(id);
    setConversations(updated);
    if (activeConversationId === id) {
      setActiveConversationId(updated.length > 0 ? updated[0].id : null);
    }
    addToast("Study session deleted", "info");
  };

  // Clear all data
  const handleClearAllData = () => {
    clearAllConversations();
    setConversations([]);
    setActiveConversationId(null);
    setStudyStats(getStudyStats());
    addToast("All study history has been reset", "info");
  };

  // Send message
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput("");
    setIsLoading(true);

    const userMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: query,
      timestamp: Date.now()
    };

    let targetConv = activeConversation;
    let isNew = false;

    if (!targetConv) {
      isNew = true;
      const newTitle = generateChatTitle(query);
      targetConv = {
        id: "conv_" + Date.now(),
        title: newTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage]
      };
      setActiveConversationId(targetConv.id);
    } else {
      targetConv = {
        ...targetConv,
        updatedAt: Date.now(),
        messages: [...(targetConv.messages || []), userMessage]
      };
    }

    // Optimistically update conversation state
    setConversations(prev => {
      if (isNew) return [targetConv, ...prev];
      return prev.map(c => c.id === targetConv.id ? targetConv : c);
    });

    try {
      // Prepare history payload (last 6 messages)
      const historyPayload = (targetConv.messages || []).slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call backend /api/ask
      const aiResponse = await askQuestion(query, learningLevel, historyPayload);

      const aiMessage = {
        id: "msg_ai_" + Date.now(),
        role: "assistant",
        content: aiResponse,
        timestamp: Date.now(),
        level: learningLevel
      };

      const finalConv = {
        ...targetConv,
        updatedAt: Date.now(),
        messages: [...targetConv.messages, aiMessage]
      };

      saveConversation(finalConv);
      setConversations(prev => prev.map(c => c.id === finalConv.id ? finalConv : c));

      // Update study stats
      const updatedStats = incrementQuestionsAsked(targetConv.title);
      if (updatedStats) setStudyStats(updatedStats);

    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content: "⚠️ Something went wrong while connecting to StudyMate AI. Please try again.",
        timestamp: Date.now(),
        level: learningLevel
      };

      const finalConv = {
        ...targetConv,
        updatedAt: Date.now(),
        messages: [...targetConv.messages, errorMessage]
      };

      saveConversation(finalConv);
      setConversations(prev => prev.map(c => c.id === finalConv.id ? finalConv : c));
      addToast(err.message || "Failed to reach AI Tutor", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up: Explain Simpler
  const handleExplainSimpler = async (aiMsg) => {
    if (isLoading) return;
    const currentConv = activeConversation;
    if (!currentConv) return;

    // Find previous user question
    const msgIndex = currentConv.messages.findIndex(m => m.id === aiMsg.id);
    let originalQuestion = currentConv.title;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (currentConv.messages[i].role === "user") {
        originalQuestion = currentConv.messages[i].content;
        break;
      }
    }

    setIsLoading(true);
    const userPromptMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      content: "Explain simpler with an easier analogy please!",
      timestamp: Date.now()
    };

    const updatedConvWithUser = {
      ...currentConv,
      messages: [...currentConv.messages, userPromptMsg]
    };
    setConversations(prev => prev.map(c => c.id === currentConv.id ? updatedConvWithUser : c));

    try {
      const response = await requestExplanation(originalQuestion, aiMsg.content, "simpler");
      const simplerAiMsg = {
        id: "msg_ai_" + Date.now(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
        level: learningLevel
      };

      const completedConv = {
        ...updatedConvWithUser,
        messages: [...updatedConvWithUser.messages, simplerAiMsg]
      };
      saveConversation(completedConv);
      setConversations(prev => prev.map(c => c.id === currentConv.id ? completedConv : c));
      addToast("Simplified explanation generated!", "success");
    } catch (err) {
      addToast("Failed to simplify explanation", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up: Give Example
  const handleGiveExample = async (aiMsg) => {
    if (isLoading) return;
    const currentConv = activeConversation;
    if (!currentConv) return;

    const msgIndex = currentConv.messages.findIndex(m => m.id === aiMsg.id);
    let originalQuestion = currentConv.title;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (currentConv.messages[i].role === "user") {
        originalQuestion = currentConv.messages[i].content;
        break;
      }
    }

    setIsLoading(true);
    const userPromptMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      content: "Can you give another relatable real-world example?",
      timestamp: Date.now()
    };

    const updatedConvWithUser = {
      ...currentConv,
      messages: [...currentConv.messages, userPromptMsg]
    };
    setConversations(prev => prev.map(c => c.id === currentConv.id ? updatedConvWithUser : c));

    try {
      const response = await requestExplanation(originalQuestion, aiMsg.content, "example");
      const exampleAiMsg = {
        id: "msg_ai_" + Date.now(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
        level: learningLevel
      };

      const completedConv = {
        ...updatedConvWithUser,
        messages: [...updatedConvWithUser.messages, exampleAiMsg]
      };
      saveConversation(completedConv);
      setConversations(prev => prev.map(c => c.id === currentConv.id ? completedConv : c));
      addToast("Real-world example added!", "success");
    } catch (err) {
      addToast("Failed to get example", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up: Summarize
  const handleSummarize = async (aiMsg) => {
    if (isLoading) return;
    const currentConv = activeConversation;
    if (!currentConv) return;

    const msgIndex = currentConv.messages.findIndex(m => m.id === aiMsg.id);
    let originalQuestion = currentConv.title;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (currentConv.messages[i].role === "user") {
        originalQuestion = currentConv.messages[i].content;
        break;
      }
    }

    setIsLoading(true);
    const userPromptMsg = {
      id: "msg_" + Date.now(),
      role: "user",
      content: "Summarize this into 3-5 key takeaways.",
      timestamp: Date.now()
    };

    const updatedConvWithUser = {
      ...currentConv,
      messages: [...currentConv.messages, userPromptMsg]
    };
    setConversations(prev => prev.map(c => c.id === currentConv.id ? updatedConvWithUser : c));

    try {
      const response = await requestExplanation(originalQuestion, aiMsg.content, "summarize");
      const summaryAiMsg = {
        id: "msg_ai_" + Date.now(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
        level: learningLevel
      };

      const completedConv = {
        ...updatedConvWithUser,
        messages: [...updatedConvWithUser.messages, summaryAiMsg]
      };
      saveConversation(completedConv);
      setConversations(prev => prev.map(c => c.id === currentConv.id ? completedConv : c));
      addToast("Summary ready!", "success");
    } catch (err) {
      addToast("Failed to generate summary", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up: Generate Quiz
  const handleGenerateQuiz = (aiMsg) => {
    const topic = activeConversation?.title || "Academic Concepts";
    setQuizTopic(topic);
    setQuizInitialData(null);
    setQuizModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        studyStats={studyStats}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenQuizModal={() => {
          setQuizTopic(activeConversation?.title || "Science & Technology");
          setQuizInitialData(null);
          setQuizModalOpen(true);
        }}
        onOpenHistoryModal={() => setHistoryModalOpen(true)}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
      />

      {/* Main Area */}
      <div className="main-wrapper">
        <Header
          learningLevel={learningLevel}
          setLearningLevel={setLearningLevel}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          sessionTitle={activeConversation?.title}
        />

        <main className="content-body">
          {messages.length === 0 ? (
            <WelcomeDashboard
              onSelectQuestion={(q) => handleSendMessage(q)}
            />
          ) : (
            <div className="chat-stream">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onExplainSimpler={handleExplainSimpler}
                  onGiveExample={handleGiveExample}
                  onSummarize={handleSummarize}
                  onGenerateQuiz={handleGenerateQuiz}
                  isLoading={isLoading}
                />
              ))}

              {/* StudyMate is thinking indicator */}
              {isLoading && (
                <div className="thinking-row">
                  <div className="thinking-card">
                    <span>StudyMate is thinking...</span>
                    <div className="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} style={{ height: "20px" }} />
            </div>
          )}
        </main>

        {/* Bottom Chat Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          isLoading={isLoading}
        />
      </div>

      {/* Practice Quiz Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        initialTopic={quizTopic}
        learningLevel={learningLevel}
        initialQuiz={quizInitialData}
        onQuizCompleted={() => setStudyStats(getStudyStats())}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAllData}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        learningLevel={learningLevel}
        setLearningLevel={setLearningLevel}
        conversationsCount={conversations.length}
        onClearData={handleClearAllData}
      />

      {/* Toasts */}
      <Toast toasts={toasts} onCloseToast={removeToast} />
    </div>
  );
}
