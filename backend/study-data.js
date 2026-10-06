import { Router } from "express";
import { getDatabase } from "./db.js";
import { requireAuth } from "./auth.js";

const router = Router();
const DEFAULT_STATS = {
  streak: 1,
  lastActiveDate: new Date().toISOString().split("T")[0],
  questionsAsked: 0,
  quizzesCompleted: 0,
  topicsLearned: 0,
  learnedTopicSet: []
};
const DEFAULT_SETTINGS = { defaultLevel: "beginner", soundEnabled: true };

function isValidConversation(conversation, expectedId) {
  return conversation &&
    typeof conversation === "object" &&
    typeof conversation.id === "string" &&
    conversation.id === expectedId &&
    conversation.id.length <= 100 &&
    (conversation.createdAt === undefined || Number.isFinite(conversation.createdAt)) &&
    (conversation.updatedAt === undefined || Number.isFinite(conversation.updatedAt)) &&
    typeof conversation.title === "string" &&
    conversation.title.length <= 500 &&
    Array.isArray(conversation.messages) &&
    conversation.messages.length <= 500 &&
    conversation.messages.every(message =>
      message &&
      typeof message === "object" &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string" &&
      message.content.length <= 20000
    );
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const database = getDatabase();
    const [user, conversations] = await Promise.all([
      database.collection("users").findOne({ _id: req.userId }),
      database.collection("conversations")
        .find({ userId: req.userId })
        .sort({ updatedAt: -1 })
        .toArray()
    ]);
    if (!user) {
      return res.status(401).json({ error: "Account not found. Please sign in again." });
    }
    return res.json({
      conversations: conversations.map(({ _id, userId, ...conversation }) => conversation),
      stats: user.stats || DEFAULT_STATS,
      settings: user.settings || DEFAULT_SETTINGS
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/conversations/:id", async (req, res, next) => {
  try {
    const conversation = req.body;
    if (!isValidConversation(conversation, req.params.id)) {
      return res.status(400).json({ error: "Study session data is invalid." });
    }
    const now = Date.now();
    await getDatabase().collection("conversations").updateOne(
      { userId: req.userId, id: conversation.id },
      {
        $set: {
          id: conversation.id,
          title: conversation.title,
          messages: conversation.messages,
          userId: req.userId,
          updatedAt: now
        },
        $setOnInsert: { createdAt: conversation.createdAt || now }
      },
      { upsert: true }
    );
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.delete("/conversations/:id", async (req, res, next) => {
  try {
    await getDatabase().collection("conversations").deleteOne({
      userId: req.userId,
      id: req.params.id
    });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.delete("/conversations", async (req, res, next) => {
  try {
    await getDatabase().collection("conversations").deleteMany({ userId: req.userId });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.put("/stats", async (req, res, next) => {
  try {
    const stats = req.body;
    const valid = stats && typeof stats === "object" &&
      ["streak", "questionsAsked", "quizzesCompleted", "topicsLearned"]
        .every(key => Number.isSafeInteger(stats[key]) && stats[key] >= 0) &&
      typeof stats.lastActiveDate === "string" &&
      Array.isArray(stats.learnedTopicSet) &&
      stats.learnedTopicSet.length <= 1000 &&
      stats.learnedTopicSet.every(topic => typeof topic === "string" && topic.length <= 200);
    if (!valid) {
      return res.status(400).json({ error: "Study statistics are invalid." });
    }
    const savedStats = {
      streak: stats.streak,
      lastActiveDate: stats.lastActiveDate,
      questionsAsked: stats.questionsAsked,
      quizzesCompleted: stats.quizzesCompleted,
      topicsLearned: stats.topicsLearned,
      learnedTopicSet: stats.learnedTopicSet
    };
    await getDatabase().collection("users").updateOne(
      { _id: req.userId },
      { $set: { stats: savedStats } }
    );
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    const settings = req.body;
    if (
      !settings ||
      !["beginner", "intermediate", "exam"].includes(settings.defaultLevel) ||
      typeof settings.soundEnabled !== "boolean"
    ) {
      return res.status(400).json({ error: "Study settings are invalid." });
    }
    await getDatabase().collection("users").updateOne(
      { _id: req.userId },
      {
        $set: {
          settings: {
            defaultLevel: settings.defaultLevel,
            soundEnabled: settings.soundEnabled
          }
        }
      }
    );
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.delete("/", async (req, res, next) => {
  try {
    const database = getDatabase();
    await Promise.all([
      database.collection("conversations").deleteMany({ userId: req.userId }),
      database.collection("users").updateOne(
        { _id: req.userId },
        { $set: { stats: DEFAULT_STATS } }
      )
    ]);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
