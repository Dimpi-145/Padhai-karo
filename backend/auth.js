import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDatabase } from "./db.js";

const router = Router();
const COOKIE_NAME = "studymate_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes. Configure a private secret in backend/.env.");
  }
  return secret;
}

function setSessionCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_MS,
    path: "/"
  });
}

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }

    const payload = jwt.verify(token, getJwtSecret());
    if (typeof payload !== "object" || typeof payload.sub !== "string" || !ObjectId.isValid(payload.sub)) {
      return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
    }

    req.userId = new ObjectId(payload.sub);
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    return next(error);
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
    }

    const database = getDatabase();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      email,
      passwordHash,
      createdAt: new Date(),
      stats: {
        streak: 1,
        lastActiveDate: new Date().toISOString().split("T")[0],
        questionsAsked: 0,
        quizzesCompleted: 0,
        topicsLearned: 0,
        learnedTopicSet: []
      },
      settings: { defaultLevel: "beginner", soundEnabled: true }
    };

    try {
      const { insertedId } = await database.collection("users").insertOne(user);
      setSessionCookie(res, insertedId.toString());
      return res.status(201).json({
        user: { email },
        newAccount: true
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    const user = await getDatabase().collection("users").findOne({ email });
    if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    setSessionCookie(res, user._id.toString());
    return res.json({ user: { email: user.email }, newAccount: false });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getDatabase().collection("users").findOne(
      { _id: req.userId },
      { projection: { email: 1 } }
    );
    if (!user) {
      res.clearCookie(COOKIE_NAME, { path: "/", sameSite: "strict" });
      return res.status(401).json({ error: "Account not found. Please sign in again." });
    }
    return res.json({ user: { email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
  return res.status(204).end();
});

export default router;
