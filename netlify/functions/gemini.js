// netlify/functions/gemini.js
// Gemini-first with OpenAI fallback

const GEMINI_MODEL = "gemini-1.5-flash";
const OPENAI_MODEL = "gpt-4.1-mini";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

exports.handler = async function (event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return json(400, { reply: "Invalid JSON body.", error: "BAD_JSON" });
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return json(400, {
        reply: "Please type a message for the assistant.",
        error: "NO_MESSAGE",
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY || "";
    const openAIKey =
      process.env.Open_AI_Api_key || process.env.OPENAI_API_KEY || "";

    const tried = [];

    // 1) Try Gemini
    if (geminiKey) {
      const r = await callGemini(message, geminiKey);
      if (r.ok) {
        return json(200, { reply: r.text, provider: "gemini" });
      }
      tried.push({ provider: "gemini", error: r.error });
      console.error("Gemini failed:", r.error);
    }

    // 2) Try OpenAI fallback
    if (openAIKey) {
      const r = await callOpenAI(message, openAIKey);
      if (r.ok) {
        return json(200, { reply: r.text, provider: "openai" });
      }
      tried.push({ provider: "openai", error: r.error });
      console.error("OpenAI failed:", r.error);
    }

    // 3) Neither provider worked
    return json(502, {
      reply:
        "Sorry, the AI assistant is temporarily unavailable. Please try again later.",
      error: "NO_PROVIDER",
      details: tried,
    });
  } catch (err) {
    console.error("AI assistant fatal error", err);
    return json(500, {
      reply: "Sorry, something went wrong with the AI assistant.",
      error: String((err && err.message) || err),
    });
  }
};

async function callGemini(message, apiKey) {
  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      `${GEMINI_MODEL}:generateContent?key=` +
      encodeURIComponent(apiKey);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: message }] }],
      }),
    });

    const raw = await res.text();

    if (!res.ok) {
      console.error("Gemini API error", res.status, raw);
      return { ok: false, error: raw || `status ${res.status}` };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Invalid JSON from Gemini" };
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return { ok: false, error: "Empty Gemini reply" };
    }

    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

async function callOpenAI(message, apiKey) {
  try {
    const url = "https://api.openai.com/v1/chat/completions";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are the AI Assistant for Carpool Network. Help users manage rides, bookings, and their profile. Answer clearly and briefly.",
          },
          { role: "user", content: message },
        ],
      }),
    });

    const raw = await res.text();

    if (!res.ok) {
      console.error("OpenAI API error", res.status, raw);
      return { ok: false, error: raw || `status ${res.status}` };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Invalid JSON from OpenAI" };
    }

    const text = data?.choices?.[0]?.message?.content || "";

    if (!text) {
      return { ok: false, error: "Empty OpenAI reply" };
    }

    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}
