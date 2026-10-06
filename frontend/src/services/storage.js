/**
 * StudyMate AI Local Storage Service
 * Handles persistence for conversations, learning stats, and study streaks
 */

const STORAGE_KEYS = {
  CONVERSATIONS: "studymate_conversations_v1",
  CURRENT_CONV_ID: "studymate_current_conv_id",
  STATS: "studymate_study_stats_v1",
  SETTINGS: "studymate_user_settings_v1",
};

/**
 * Generate a clean title from the user's first question
 */
export function generateChatTitle(firstQuestion) {
  if (!firstQuestion) return "New Study Session";
  const cleaned = firstQuestion.trim().replace(/^(what is|explain|what are|how does|how to|tell me about)\s+/i, "");
  // Capitalize first letter
  const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return formatted.length > 32 ? formatted.slice(0, 32) + "..." : formatted;
}

/**
 * Get all saved conversations
 */
export function getSavedConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse conversations from localStorage:", e);
    return [];
  }
}

/**
 * Save a conversation
 */
export function saveConversation(conversation) {
  try {
    const conversations = getSavedConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = {
        ...conversations[existingIndex],
        ...conversation,
        updatedAt: Date.now()
      };
    } else {
      conversations.unshift({
        ...conversation,
        createdAt: conversation.createdAt || Date.now(),
        updatedAt: Date.now()
      });
    }

    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    return conversations;
  } catch (e) {
    console.error("Failed to save conversation to localStorage:", e);
    return [];
  }
}

/**
 * Delete a conversation
 */
export function deleteConversation(convId) {
  try {
    const conversations = getSavedConversations();
    const filtered = conversations.filter(c => c.id !== convId);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error("Failed to delete conversation:", e);
    return [];
  }
}

/**
 * Clear all conversations
 */
export function clearAllConversations() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CONV_ID);
    return [];
  } catch (e) {
    console.error("Failed to clear conversations:", e);
    return [];
  }
}

/**
 * Get study stats and streak
 */
export function getStudyStats() {
  const defaultStats = {
    streak: 1,
    lastActiveDate: new Date().toISOString().split("T")[0],
    questionsAsked: 0,
    quizzesCompleted: 0,
    topicsLearned: 0,
    learnedTopicSet: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(defaultStats));
      return defaultStats;
    }

    const stats = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    const lastActive = stats.lastActiveDate;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (lastActive === yesterday) {
        stats.streak = (stats.streak || 0) + 1;
      } else {
        // missed more than 1 day
        stats.streak = 1;
      }
      stats.lastActiveDate = today;
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }

    return stats;
  } catch (e) {
    return defaultStats;
  }
}

/**
 * Record a question asked
 */
export function incrementQuestionsAsked(topicTitle) {
  try {
    const stats = getStudyStats();
    stats.questionsAsked = (stats.questionsAsked || 0) + 1;
    
    if (topicTitle && typeof topicTitle === "string") {
      const set = stats.learnedTopicSet || [];
      const normalized = topicTitle.trim().toLowerCase();
      if (!set.includes(normalized)) {
        set.push(normalized);
        stats.learnedTopicSet = set;
        stats.topicsLearned = set.length;
      }
    }

    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return stats;
  } catch (e) {
    console.error("Failed to increment questions asked:", e);
  }
}

/**
 * Record a quiz completed
 */
export function incrementQuizzesCompleted() {
  try {
    const stats = getStudyStats();
    stats.quizzesCompleted = (stats.quizzesCompleted || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return stats;
  } catch (e) {
    console.error("Failed to increment quizzes completed:", e);
  }
}

/**
 * Settings storage
 */
export function getUserSettings() {
  const defaultSettings = {
    defaultLevel: "beginner",
    soundEnabled: true,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

export function saveUserSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save user settings:", e);
  }
}
