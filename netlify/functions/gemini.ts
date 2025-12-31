import type { Handler } from '@netlify/functions';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey =
    process.env.AI_Acsess ||
    process.env.AI_Access ||
    process.env.AI_Acess ||
    '';
  const hasApiKey = Boolean(apiKey);
  console.info('Gemini API key present:', hasApiKey);
  if (!apiKey) {
    console.error('Missing AI_Acsess env var');
    return {
      statusCode: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reply: 'Sorry, I encountered an error processing your request.', error: 'Missing AI_Acsess env var' }),
    };
  }

  let payload: any = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    console.error('Invalid JSON body for /gemini');
    return {
      statusCode: 400,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reply: 'Sorry, I encountered an error processing your request.', error: 'Invalid JSON body' }),
    };
  }

  const promptSource = typeof payload?.prompt === 'string'
    ? payload.prompt
    : typeof payload?.message === 'string'
      ? payload.message
      : '';
  const prompt = promptSource.trim();
  if (!prompt) {
    console.error('Missing prompt/message for /gemini');
    return {
      statusCode: 400,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reply: 'Sorry, I encountered an error processing your request.', error: 'Prompt is required' }),
    };
  }

  try {
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      const snippet = errorBody ? errorBody.slice(0, 500) : '';
      console.error('Gemini API error', {
        status: geminiResponse.status,
        bodySnippet: snippet,
      });
      return {
        statusCode: geminiResponse.status >= 500 ? 502 : geminiResponse.status,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reply: 'Sorry, I encountered an error processing your request.',
          error: `Gemini request failed (status ${geminiResponse.status})`,
        }),
      };
    }

    const geminiData = await geminiResponse.json();
    const parts = geminiData?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join('');

    if (!text) {
      console.error('Gemini response missing text');
      return {
        statusCode: 502,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reply: 'Sorry, I encountered an error processing your request.',
          error: 'Empty response from Gemini',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reply: text }),
    };
  } catch (error) {
    console.error('Unexpected error contacting Gemini', error);
    return {
      statusCode: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply: 'Sorry, I encountered an error processing your request.',
        error: 'Unexpected error contacting AI service',
      }),
    };
  }
};
