import type { Handler } from '@netlify/functions';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const jsonResponse = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return jsonResponse(
        {
          reply: 'Please type a message for the AI assistant.',
          error: "Missing 'message' in request body",
        },
        400
      );
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
    const OPENAI_KEY = process.env.Open_AI_Api_key || process.env.OPENAI_API_KEY || '';

    // 1) Try Gemini first
    if (GEMINI_KEY) {
      const geminiReply = await tryGemini(message, GEMINI_KEY);
      if (geminiReply.ok) {
        return jsonResponse({ reply: geminiReply.text, provider: 'gemini' });
      } else {
        console.error('Gemini failed, will try OpenAI fallback:', geminiReply.error);
      }
    }

    // 2) Fallback to OpenAI
    if (OPENAI_KEY) {
      const openAIReply = await tryOpenAI(message, OPENAI_KEY);
      if (openAIReply.ok) {
        return jsonResponse({ reply: openAIReply.text, provider: 'openai' });
      } else {
        console.error('OpenAI failed:', openAIReply.error);
      }
    }

    // 3) Both failed or missing keys
    return jsonResponse(
      {
        reply: 'Sorry, the AI assistant is temporarily unavailable. Please try again later.',
        error: 'No working AI provider (Gemini/OpenAI). Check server logs and API keys.',
      },
      502
    );
  } catch (err: any) {
    console.error('gemini function top-level error', err);
    return jsonResponse(
      {
        reply: 'Sorry, something went wrong with the AI assistant.',
        error: String(err?.message || err),
      },
      500
    );
  }
};

async function tryGemini(
  message: string,
  apiKey: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
      }),
    });

    const raw = await res.text();

    if (!res.ok) {
      console.error('Gemini API error', res.status, raw);
      return { ok: false, error: raw || `status ${res.status}` };
    }

    const json = raw ? JSON.parse(raw) : {};
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      return { ok: false, error: 'Empty Gemini reply' };
    }

    return { ok: true, text };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function tryOpenAI(
  message: string,
  apiKey: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are the AI Assistant for Carpool Network. Help users with their rides, bookings, profiles, and app questions. Be concise and friendly.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    const raw = await res.text();

    if (!res.ok) {
      console.error('OpenAI API error', res.status, raw);
      return { ok: false, error: raw || `status ${res.status}` };
    }

    const json = raw ? JSON.parse(raw) : {};
    const text: string | undefined = json?.choices?.[0]?.message?.content;

    if (!text) {
      return { ok: false, error: 'Empty OpenAI reply' };
    }

    return { ok: true, text };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err) };
  }
}
