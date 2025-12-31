import type { Handler } from '@netlify/functions';

const MODEL_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return jsonResponse(
        {
          reply: 'The AI assistant is not configured yet.',
          error: 'Missing GEMINI_API_KEY',
        },
        500
      );
    }

    let message: unknown;
    try {
      const parsed = event.body ? JSON.parse(event.body) : {};
      message = (parsed as any)?.message;
    } catch (error) {
      console.error('Gemini payload parse error', error);
      return jsonResponse(
        { reply: 'Please send a message.', error: 'Invalid payload' },
        400
      );
    }

    if (!message || typeof message !== 'string') {
      return jsonResponse(
        { reply: 'Please send a message.', error: 'Invalid payload' },
        400
      );
    }

    const url = `${MODEL_URL}?key=${apiKey}`;
    const geminiRes = await fetch(url, {
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

    const rawText = await geminiRes.text();

    if (!geminiRes.ok) {
      console.error('Gemini API error', geminiRes.status, rawText);
      return jsonResponse(
        {
          reply: 'Sorry, I encountered an error talking to Gemini. Please try again later.',
          error: rawText || `HTTP ${geminiRes.status}`,
        },
        502
      );
    }

    let json: any = {};
    try {
      json = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      console.error('Gemini JSON parse error', error, rawText);
    }

    const replyText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I couldn’t generate a reply.';

    return jsonResponse({ reply: replyText }, 200);
  } catch (error) {
    console.error('Gemini function error', error);
    return jsonResponse(
      {
        reply: 'Sorry, I encountered an error processing your request. Please try again later.',
        error: 'Unexpected error',
      },
      500
    );
  }
};
