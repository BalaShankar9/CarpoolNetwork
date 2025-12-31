import type { Handler } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type UserRole = 'guest' | 'user' | 'admin';

type AiActionType =
  | 'NAVIGATE'
  | 'SHOW_HELP'
  | 'LIST_VEHICLES'
  | 'LIST_MY_RIDES'
  | 'LIST_MY_BOOKINGS'
  | 'SHOW_TODAY_ACTIVITY'
  | 'START_ADD_VEHICLE'
  | 'START_POST_RIDE'
  | 'SUGGEST_RIDE_PLAN'
  | 'ADMIN_OVERVIEW'
  | 'ADMIN_RECENT_BUG_REPORTS'
  | 'ADMIN_RECENT_ERRORS'
  | 'ADMIN_USER_SUMMARY';

interface AiAction {
  type: AiActionType;
  params?: Record<string, unknown>;
  note?: string;
}

interface AiMessage {
  id: string;
  author: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface AiClientContext {
  userId?: string | null;
  displayName?: string | null;
  role: UserRole;
  currentRoute: string;
  locale?: string;
  counters?: {
    vehiclesCount?: number;
    offeredRidesCount?: number;
    takenRidesCount?: number;
    upcomingBookingsCount?: number;
  };
}

interface AiRouterRequest {
  message: string;
  threadId?: string | null;
  history?: AiMessage[];
  context?: AiClientContext;
}

interface AiRouterResponse {
  reply: string;
  actions?: AiAction[];
  debug?: Record<string, unknown>;
}

const json = (statusCode: number, data: any) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const supabaseFromToken = (token: string): SupabaseClient => {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase env vars missing');
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const ALLOWED_ACTIONS: AiActionType[] = [
  'NAVIGATE',
  'SHOW_HELP',
  'LIST_VEHICLES',
  'LIST_MY_RIDES',
  'LIST_MY_BOOKINGS',
  'SHOW_TODAY_ACTIVITY',
  'START_ADD_VEHICLE',
  'START_POST_RIDE',
  'SUGGEST_RIDE_PLAN',
  'ADMIN_OVERVIEW',
  'ADMIN_RECENT_BUG_REPORTS',
  'ADMIN_RECENT_ERRORS',
  'ADMIN_USER_SUMMARY',
];

const isActionAllowedForRole = (role: UserRole, action: AiActionType) => {
  if (role === 'admin') return true;
  if (role === 'guest') {
    return action === 'NAVIGATE' || action === 'SHOW_HELP' || action === 'SUGGEST_RIDE_PLAN';
  }
  return !action.startsWith('ADMIN_');
};

const buildSystemPrompt = (context: AiClientContext) => {
  const capabilities = `
CarpoolNetwork is a community carpooling app. Users can add vehicles, post rides as drivers, find/request/book rides as riders, view/cancel bookings, update profile and preferences, and view notifications. Admins can view analytics, bug reports, diagnostics, and manage users/verifications.

You are an in-app CEO assistant. Be concise, transparent, and helpful. Provide a friendly reply AND a list of structured actions where useful.

Actions schema (TypeScript):
type AiActionType =
  "NAVIGATE" | "SHOW_HELP" | "LIST_VEHICLES" | "LIST_MY_RIDES" | "LIST_MY_BOOKINGS" | "SHOW_TODAY_ACTIVITY" | "START_ADD_VEHICLE" | "START_POST_RIDE" | "SUGGEST_RIDE_PLAN" | "ADMIN_OVERVIEW" | "ADMIN_RECENT_BUG_REPORTS" | "ADMIN_RECENT_ERRORS" | "ADMIN_USER_SUMMARY";

type AiAction = { type: AiActionType; params?: Record<string, unknown>; note?: string; };

Respond with a single JSON object:
{
  "reply": "<helpful concise answer>",
  "actions": [AiAction, ...]
}

Role rules:
- role="user": only their own data, non-destructive guidance. Use LIST_* and NAVIGATE/START_* to help.
- role="admin": may use ADMIN_* actions and analytics references; still avoid destructive steps.
- role="guest": read-only guidance; encourage sign in; only NAVIGATE/SHOW_HELP/SUGGEST_RIDE_PLAN.

If unsure, default to SHOW_HELP and a clear reply. Never include Markdown, only JSON.
`;

  const contextLines = [
    `User: ${context.displayName || context.userId || 'unknown'}`,
    `Role: ${context.role}`,
    `Route: ${context.currentRoute}`,
  ];
  if (context.counters) {
    const c = context.counters;
    if (c.vehiclesCount !== undefined) contextLines.push(`Vehicles: ${c.vehiclesCount}`);
    if (c.offeredRidesCount !== undefined) contextLines.push(`Offered rides: ${c.offeredRidesCount}`);
    if (c.takenRidesCount !== undefined) contextLines.push(`Taken rides: ${c.takenRidesCount}`);
    if (c.upcomingBookingsCount !== undefined) contextLines.push(`Upcoming bookings: ${c.upcomingBookingsCount}`);
  }

  return `${capabilities}\nContext:\n${contextLines.join('\n')}`;
};

const callGemini = async (prompt: string, apiKey: string): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter((t: any) => typeof t === 'string')
      .join(' ')
      .trim() || '';
  return text;
};

const callOpenAI = async (prompt: string, apiKey: string): Promise<string> => {
  const url = 'https://api.openai.com/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are the AI Assistant for Carpool Network. Keep replies concise and include structured actions when helpful. Respond with pure JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return text;
};

const parseModelResponse = (raw: string): AiRouterResponse => {
  try {
    const parsed = JSON.parse(raw);
    const reply = typeof parsed?.reply === 'string' && parsed.reply.trim() ? parsed.reply : raw;
    const actions = Array.isArray(parsed?.actions)
      ? parsed.actions.filter(
          (a: any) => a && typeof a === 'object' && ALLOWED_ACTIONS.includes(a.type)
        )
      : [];
    return { reply, actions };
  } catch (err) {
    return {
      reply: `I had trouble understanding my own output. Here's what I can say: ${raw}`,
      actions: [],
      debug: { parseError: String((err as Error)?.message || err) },
    };
  }
};

const logApiError = async (
  supabase: SupabaseClient | null,
  label: string,
  error: unknown,
  context?: Record<string, unknown>
) => {
  console.error(label, error);
  if (!supabase) return;
  try {
    await supabase.rpc('log_error', {
      p_error_type: label,
      p_error_message: error instanceof Error ? error.message : String(error),
      p_error_stack: error instanceof Error ? error.stack || null : null,
      p_severity: 'error',
      p_endpoint: context?.route || null,
      p_metadata: context || {},
    });
  } catch {
    // best effort
  }
};

const saveHistory = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: string | undefined,
  userMessage: string,
  assistantReply: string
) => {
  try {
    await supabase.from('ai_chat_history').insert([
      {
        user_id: userId,
        session_id: sessionId || 'default',
        role: 'user',
        message: userMessage,
      },
      {
        user_id: userId,
        session_id: sessionId || 'default',
        role: 'assistant',
        message: assistantReply,
      },
    ]);
  } catch (err) {
    console.error('Failed to persist chat history', err);
  }
};

export const handler: Handler = async (event) => {
  let supabase: SupabaseClient | null = null;
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return json(401, { reply: 'Please sign in to use the assistant.', error: 'NO_AUTH' });
    }

    let payload: AiRouterRequest = { message: '', history: [], threadId: null, context: undefined };
    try {
      payload = event.body ? JSON.parse(event.body) : payload;
    } catch {
      return json(400, { reply: 'Invalid JSON body.', error: 'BAD_JSON' });
    }

    const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
    if (!message) {
      return json(400, { reply: 'Please type a message for the assistant.', error: 'NO_MESSAGE' });
    }

    supabase = supabaseFromToken(token);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json(401, { reply: 'Session expired. Please sign in again.', error: 'NO_USER' });
    }
    const userId = userData.user.id;

    const { data: profile } = await supabase.from('profiles').select('full_name,is_admin').eq('id', userId).maybeSingle();

    const context: AiClientContext = {
      userId,
      displayName: profile?.full_name || payload?.context?.displayName || null,
      role: profile?.is_admin ? 'admin' : payload?.context?.role || 'user',
      currentRoute: payload?.context?.currentRoute || 'unknown',
      locale: payload?.context?.locale,
      counters: payload?.context?.counters,
    };

    const promptParts = [
      buildSystemPrompt(context),
      `User message: ${message}`,
      payload.history && payload.history.length
        ? `Recent history:\n${payload.history
            .slice(-6)
            .map((m) => `${m.author}: ${m.content}`)
            .join('\n')}`
        : '',
    ];
    const finalPrompt = promptParts.filter(Boolean).join('\n\n');

    const geminiKey = process.env.GEMINI_API_KEY || '';
    const openAIKey = process.env.Open_AI_Api_key || process.env.OPENAI_API_KEY || '';
    if (!geminiKey && !openAIKey) {
      return json(500, { reply: 'AI is not configured yet. Please contact support.', error: 'NO_KEYS' });
    }

    let raw = '';
    let parsed: AiRouterResponse | null = null;
    if (geminiKey) {
      try {
        raw = await callGemini(finalPrompt, geminiKey);
        parsed = parseModelResponse(raw);
      } catch (err) {
        await logApiError(supabase, 'ai-router-llm', err, { provider: 'gemini', route: context.currentRoute, userId });
      }
    }

    if ((!parsed || !parsed.reply) && openAIKey) {
      try {
        raw = await callOpenAI(finalPrompt, openAIKey);
        parsed = parseModelResponse(raw);
      } catch (err) {
        await logApiError(supabase, 'ai-router-llm', err, { provider: 'openai', route: context.currentRoute, userId });
      }
    }

    if (!parsed) {
      return json(502, {
        reply: 'Sorry, the AI assistant is temporarily unavailable. Please try again later.',
        error: 'LLM_FAILED',
      });
    }

    const actions =
      parsed.actions?.filter(
        (a) => a && typeof a === 'object' && ALLOWED_ACTIONS.includes(a.type) && isActionAllowedForRole(context.role, a.type)
      ) || [];

    await saveHistory(supabase, userId, payload.threadId || undefined, message, parsed.reply);

    return json(200, {
      reply: parsed.reply,
      actions,
      debug: parsed.debug,
    } as AiRouterResponse);
  } catch (err: any) {
    await logApiError(supabase, 'ai-router-fatal', err, {});
    return json(500, {
      reply: 'Sorry, something went wrong with the AI assistant.',
      error: String(err?.message || err),
    });
  }
};
