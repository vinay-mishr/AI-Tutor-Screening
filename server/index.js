require("dotenv").config({ path: "./.env" });

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// If Node < 18, uncomment below:
// const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Try again later." },
});

// 🔥 Your SYSTEM PROMPT (unchanged)
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
- If an answer is too short or vague (under 10 words), ask a follow-up: "Could you expand on that a bit?"
- If someone is rambling off-topic, gently redirect
- Keep your messages SHORT — this is a spoken conversation, aim for 2-4 sentences max per turn
- After Q5 is answered, give a warm goodbye (2 sentences), then output the assessment JSON

Questions (ask in order, adapt phrasing naturally):
Q1: "Tell me a bit about yourself and what draws you to teaching children."
Q2: "Can you explain what a fraction is to a 9-year-old who has never heard the word before? Go ahead, imagine I'm the student."
Q3: "A student has been staring at the same problem for 5 minutes and says 'I just don't get it.' What do you do?"
Q4: "What's one thing you believe makes a great math tutor — something you yourself try to do?"
Q5: "Tell me about a time a student surprised you, either by struggling more than expected or by doing better. How did you handle it?"

IMPORTANT: After Q5 is answered and you've said goodbye, append this exact block at the end of your message:
ASSESSMENT_JSON:{"overall":85,"verdict":"pass","dimensions":{"clarity":{"score":82,"note":"Brief observation about clarity","quote":"short direct quote from candidate"},"warmth":{"score":88,"note":"Brief observation about warmth","quote":"short direct quote"},"simplicity":{"score":80,"note":"Brief observation about simplification ability","quote":"short direct quote"},"patience":{"score":85,"note":"Brief observation about patience and empathy","quote":"short direct quote"},"fluency":{"score":83,"note":"Brief observation about English fluency","quote":"short direct quote"}},"summary":"2-3 sentence narrative about the candidate overall","recommendation":"Specific actionable recommendation for the hiring team"}

Score rules: verdict = "pass" if overall >= 80, "maybe" if 60-79, "fail" if below 60.`;

// ✅ Health route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ Interview route
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    // 🔴 Handle API errors
    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(500).json({ error: "Gemini API failed" });
    }

    const data = await response.json();

    // 🔍 Debug (keep during testing)
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));

    // ✅ Extract text safely
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

const path = require("path");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});