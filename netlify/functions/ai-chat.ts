import type { Handler } from '@netlify/functions';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const DEFAULT_REPLY = 'Sorry, I encountered an error processing your request. Please try again later.';
const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const buildErrorResponse = () => ({
  statusCode: 200,
  headers: RESPONSE_HEADERS,
  body: JSON.stringify({ reply: DEFAULT_REPLY }),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return buildErrorResponse();
  }

  // Requires Netlify env var: GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return buildErrorResponse();
  }

  let payload: any = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    console.error('Invalid JSON body for ai-chat', error);
    return buildErrorResponse();
  }

  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    console.error('Missing message for ai-chat');
    return buildErrorResponse();
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const snippet = errorBody ? errorBody.slice(0, 500) : '';
      console.error('Gemini API error', {
        status: response.status,
        bodySnippet: snippet,
      });
      return buildErrorResponse();
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const reply = parts
      .map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join('');

    if (!reply) {
      console.error('Gemini response missing text');
      return buildErrorResponse();
    }

    return {
      statusCode: 200,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    console.error('Gemini request failed', error);
    return buildErrorResponse();
  }
};
