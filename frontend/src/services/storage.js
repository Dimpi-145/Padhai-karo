import {
  clearStudyData,
  fetchStudyData,
  removeStudyConversation,
  saveStudyConversation,
  saveStudySettings,
  saveStudyStats
} from "./api";

const STORAGE_KEYS = {
  CONVERSATIONS: "studymate_conversations_v1",
  CURRENT_CONV_ID: "studymate_current_conv_id",
  STATS: "studymate_study_stats_v1",
  SETTINGS: "studymate_user_settings_v1",
  ACCOUNT_OWNER: "studymate_account_owner_v1"
};

const DEFAULT_STATS = () => ({
  streak: 1,
  lastActiveDate: new Date().toISOString().split("T")[0],
  questionsAsked: 0,
  quizzesCompleted: 0,
  topicsLearned: 0,
  learnedTopicSet: []
});
const DEFAULT_SETTINGS = { defaultLevel: "beginner", soundEnabled: true };
let remoteWriteQueue = Promise.resolve();
let lastRemoteWriteError = null;

function reportStorageError(error) {
  console.error("[StudyMate storage] Could not sync study data:", error);
  window.dispatchEvent(new CustomEvent("studymate:error", {
    detail: error?.message || "Could not sync your study data to your account."
  }));
}

function queueRemoteWrite(write) {
  remoteWriteQueue = remoteWriteQueue.then(async () => {
    try {
      await write();
      lastRemoteWriteError = null;
    } catch (error) {
      lastRemoteWriteError = error;
      reportStorageError(error);
    }
  });
}

export async function flushRemoteWrites() {
  await remoteWriteQueue;
  if (lastRemoteWriteError) {
    throw lastRemoteWriteError;
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`[StudyMate storage] Could not read ${key}:`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    reportStorageError(error);
  }
}

function cacheAccountStudyData(data, accountEmail) {
  writeJson(STORAGE_KEYS.CONVERSATIONS, data.conversations || []);
  writeJson(STORAGE_KEYS.STATS, data.stats || DEFAULT_STATS());
  writeJson(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...data.settings });
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_OWNER, accountEmail);
  } catch (error) {
    reportStorageError(error);
  }
}

export async function loadAccountStudyData(importLegacy = false, accountEmail) {
  let hasAccountCache = false;
  try {
    hasAccountCache = Boolean(localStorage.getItem(STORAGE_KEYS.ACCOUNT_OWNER));
  } catch (error) {
    reportStorageError(error);
  }
  const legacy = importLegacy && !hasAccountCache
    ? {
        conversations: getSavedConversations(),
        stats: getStudyStats(),
        settings: getUserSettings()
      }
    : null;
  let data = await fetchStudyData();

  if (legacy && data.conversations.length === 0) {
    await Promise.all([
      ...legacy.conversations.map(saveStudyConversation),
      saveStudyStats(legacy.stats),
      saveStudySettings(legacy.settings)
    ]);
    data = await fetchStudyData();
  }

  cacheAccountStudyData(data, accountEmail);
  return data;
}

export function clearLocalAccountCache() {
  try {
    [
      STORAGE_KEYS.CONVERSATIONS,
      STORAGE_KEYS.CURRENT_CONV_ID,
      STORAGE_KEYS.STATS,
      STORAGE_KEYS.SETTINGS
    ].forEach(key => localStorage.removeItem(key));
  } catch (error) {
    reportStorageError(error);
  }
}

export function generateChatTitle(firstQuestion) {
  if (!firstQuestion) return "New Study Session";
  const cleaned = firstQuestion.trim().replace(/^(what is|explain|what are|how does|how to|tell me about)\s+/i, "");
  const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return formatted.length > 32 ? formatted.slice(0, 32) + "..." : formatted;
}

export function getSavedConversations() {
  return readJson(STORAGE_KEYS.CONVERSATIONS, []);
}

export function saveConversation(conversation) {
  const conversations = getSavedConversations();
  const updatedConversation = {
    ...conversation,
    updatedAt: Date.now(),
    createdAt: conversation.createdAt || Date.now()
  };
  const existingIndex = conversations.findIndex(item => item.id === conversation.id);
  if (existingIndex >= 0) conversations[existingIndex] = updatedConversation;
  else conversations.unshift(updatedConversation);
  writeJson(STORAGE_KEYS.CONVERSATIONS, conversations);
  queueRemoteWrite(() => saveStudyConversation(updatedConversation));
  return conversations;
}

export function deleteConversation(conversationId) {
  const conversations = getSavedConversations().filter(item => item.id !== conversationId);
  writeJson(STORAGE_KEYS.CONVERSATIONS, conversations);
  queueRemoteWrite(() => removeStudyConversation(conversationId));
  return conversations;
}

export function clearAllConversations() {
  const conversations = [];
  writeJson(STORAGE_KEYS.CONVERSATIONS, conversations);
  writeJson(STORAGE_KEYS.STATS, DEFAULT_STATS());
  queueRemoteWrite(() => clearStudyData());
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CONV_ID);
  } catch (error) {
    reportStorageError(error);
  }
  return conversations;
}

export function getStudyStats() {
  const stats = readJson(STORAGE_KEYS.STATS, DEFAULT_STATS());
  const today = new Date().toISOString().split("T")[0];
  if (stats.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    stats.streak = stats.lastActiveDate === yesterday ? (stats.streak || 0) + 1 : 1;
    stats.lastActiveDate = today;
    writeJson(STORAGE_KEYS.STATS, stats);
    queueRemoteWrite(() => saveStudyStats(stats));
  }
  return stats;
}

export function incrementQuestionsAsked(topicTitle) {
  const stats = getStudyStats();
  stats.questionsAsked = (stats.questionsAsked || 0) + 1;
  if (topicTitle && typeof topicTitle === "string") {
    const topics = stats.learnedTopicSet || [];
    const normalized = topicTitle.trim().toLowerCase();
    if (!topics.includes(normalized)) {
      topics.push(normalized);
      stats.learnedTopicSet = topics;
      stats.topicsLearned = topics.length;
    }
  }
  writeJson(STORAGE_KEYS.STATS, stats);
  queueRemoteWrite(() => saveStudyStats(stats));
  return stats;
}

export function incrementQuizzesCompleted() {
  const stats = getStudyStats();
  stats.quizzesCompleted = (stats.quizzesCompleted || 0) + 1;
  writeJson(STORAGE_KEYS.STATS, stats);
  queueRemoteWrite(() => saveStudyStats(stats));
  return stats;
}

export function getUserSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.SETTINGS, {}) };
}

export function saveUserSettings(settings) {
  const mergedSettings = { ...getUserSettings(), ...settings };
  writeJson(STORAGE_KEYS.SETTINGS, mergedSettings);
  queueRemoteWrite(() => saveStudySettings(mergedSettings));
}
