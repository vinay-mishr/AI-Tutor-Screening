require("dotenv").config({ path: "./.env" });

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

// If Node < 18, uncomment:
// const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "2mb" }));

// ✅ CORS FIX (dev + production)
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? true
        : "http://localhost:3000",
    credentials: true,
  })
);

// ✅ Rate limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Try again later." },
});

// 🔥 SYSTEM PROMPT (same as yours)
const SYSTEM_PROMPT = `You are Aria, a warm and professional AI interviewer for Cuemath — a leading math tutoring platform. You are conducting a screening interview to assess whether a candidate would make a great tutor for children aged 6–16.

Your goal: assess soft skills — not math ability. Specifically:
1. Communication clarity
2. Patience and empathy
3. Ability to simplify concepts
4. Warmth and child-friendliness
5. English fluency and articulation

Interview flow:
- Ask exactly 5 questions total
- Start with a warm welcome, then ask Q1
- After each answer: acknowledge briefly (1 sentence max), then ask the next question
- If an answer is too short or vague (under 10 words), ask a follow-up
- Keep responses SHORT (2–4 sentences max)

Questions:
Q1: Tell me about yourself and what draws you to teaching children.
Q2: Explain a fraction to a 9-year-old.
Q3: Student stuck for 5 minutes — what do you do?
Q4: What makes a great math tutor?
Q5: Tell me about a surprising student moment.

After Q5 → give goodbye + output ASSESSMENT_JSON.`;

// =====================================================
// ✅ SERVE FRONTEND (PRODUCTION)
// =====================================================
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(process.cwd(), "client/build");

  console.log("Serving static from:", buildPath);

  app.use(express.static(buildPath));
}

// =====================================================
// ✅ API ROUTES
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/interview", aiLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key not set" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(500).json({ error: "Gemini API failed" });
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join(" ") || "No response";

    res.json({ text });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// =====================================================
// ✅ CATCH-ALL (REACT ROUTING)
// =====================================================
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(process.cwd(), "client/build");

  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// =====================================================
// ✅ START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});