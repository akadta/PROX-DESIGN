// src/controllers/design/ai/aiController.js
//
// Free + fast AI features for the book editor, powered by Groq
// (https://console.groq.com — free API key, LPU inference, very low latency).
//
// Two endpoints:
//   POST /api/ai/generate  -> plain content generation (any topic/language)
//   POST /api/ai/command   -> natural-language "edit/delete/add" commands,
//                             returned as structured JSON actions the
//                             frontend already knows how to execute.
//
// No SDK needed - Groq exposes an OpenAI-compatible REST API, so a plain
// fetch call is enough and keeps this dependency-free.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // fast, free-tier, good multilingual quality

async function callGroq({ messages, response_format, temperature = 0.7 }) {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error("GROQ_API_KEY is not set in the environment");
    err.status = 500;
    throw err;
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: 1024,
      ...(response_format ? { response_format } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Groq API error (${res.status}): ${text}`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ---------------------------------------------------------------------
// POST /api/ai/generate
// body: { topic, language, tone, length }
// returns: { text }
// ---------------------------------------------------------------------
exports.generateContent = async (req, res) => {
  try {
    const { topic, language = "English", tone = "neutral", length = "short" } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "topic is required" });
    }

    const lengthGuide = {
      short: "1 short paragraph (2-4 sentences)",
      medium: "2-3 paragraphs",
      long: "4-6 paragraphs",
    }[length] || "1 short paragraph (2-4 sentences)";

    const messages = [
      {
        role: "system",
        content:
          "You are a concise content writer for a book/page-design app. " +
          "Write only the requested content itself - no preamble, no headings, " +
          "no quotation marks, no explanations, no markdown formatting. " +
          "Write the ENTIRE response in the requested language and its native script.",
      },
      {
        role: "user",
        content: `Write ${lengthGuide} about "${topic}". Language: ${language}. Tone: ${tone}.`,
      },
    ];

    const text = await callGroq({ messages, temperature: 0.8 });
    res.json({ text: text.trim().replace(/<br\s*\/?>/gi, "\n") });
  } catch (err) {
    console.error("AI generate failed:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to generate content" });
  }
};

// ---------------------------------------------------------------------
// POST /api/ai/command
// body: { instruction, elements }   // elements = current page's element array
// returns: { actions: [ { action, targetIndex, changes? } ] }
//
// Supported actions the frontend can execute directly against its existing
// functions: "update" -> updateElement(idx, {...el, ...changes})
//            "delete"  -> deleteLayer(idx)
//            "add"     -> commit([...elements, newElement])
//            "none"    -> could not confidently map the instruction
// ---------------------------------------------------------------------
exports.runCommand = async (req, res) => {
  try {
    const { instruction, elements = [] } = req.body;
    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ error: "instruction is required" });
    }

    // Compact summary so we don't blow the context window / leak huge blobs
    // (image src, group children) into the prompt unnecessarily.
    const summary = elements.map((el, idx) => ({
      idx,
      type: el.type,
      shapeType: el.shapeType,
      text: el.type === "text" ? (el.text || "").slice(0, 60) : undefined,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontSize: el.fontSize,
      fill: el.fill,
      hidden: el.hidden,
    }));

    const messages = [
      {
        role: "system",
        content:
          `You control a canvas editor. You receive a list of elements (with index "idx") ` +
          `currently on the page, and a user instruction in plain language (any language). ` +
          `Decide the single best action and respond with ONLY a JSON object, no other text, ` +
          `matching exactly this shape:\n` +
          `{"action":"update"|"delete"|"add"|"none","targetIndex":<number|null>,"changes":<object|null>,"newElement":<object|null>,"reason":"<short reason>"}\n\n` +
          `Rules:\n` +
          `- "update": set targetIndex to the element to change, and "changes" to only the ` +
          `fields to merge in (e.g. {"fontSize":48} or {"fill":"#ff0000"} or {"hidden":true}).\n` +
          `- "delete": set targetIndex to the element to remove.\n` +
          `- "add": set "newElement" to a new element object following the same schema as ` +
          `existing elements (type: "text"|"shape"|"image"; for text include x,y,text,fontSize,fill,fontFamily,width,align).\n` +
          `- "none": if the instruction is too ambiguous to map safely - explain why in "reason".\n` +
          `- Never invent an idx that isn't in the provided list.\n` +
          `- Respond with raw JSON only - no markdown code fences, no commentary.`,
      },
      {
        role: "user",
        content: `Elements on page:\n${JSON.stringify(summary)}\n\nInstruction: "${instruction}"`,
      },
    ];

    const raw = await callGroq({
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: "AI returned invalid JSON", raw });
    }

    res.json(parsed);
  } catch (err) {
    console.error("AI command failed:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to run command" });
  }
};


// ---------------------------------------------------------------------
// POST /api/ai/translate
// body: { text, targetLanguage }
// returns: { text }
// ---------------------------------------------------------------------
exports.translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }
    if (!targetLanguage || !targetLanguage.trim()) {
      return res.status(400).json({ error: "targetLanguage is required" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a precise translation engine. Translate the user's text into the requested " +
          "target language and its native script. Output ONLY the translated text - no quotes, " +
          "no explanations, no preamble, no markdown.",
      },
      {
        role: "user",
        content: `Translate this text into ${targetLanguage}:\n\n"${text}"`,
      },
    ];

    const translated = await callGroq({ messages, temperature: 0.3 });
    res.json({ text: translated.trim() });
  } catch (err) {
    console.error("AI translate failed:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to translate" });
  }
};