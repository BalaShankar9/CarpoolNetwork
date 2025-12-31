import type { Handler } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const MAX_REQUESTS_PER_MINUTE = 10;

type RateState = { windowStart: number; count: number };
const rateLimiter = new Map<string, RateState>();

type ToolName =
  | 'get_my_bookings'
  | 'get_my_rides'
  | 'find_rides'
  | 'cancel_booking'
  | 'update_profile'
  | 'get_my_vehicles'
  | 'add_vehicle';

interface ToolCall {
  tool: ToolName;
  params: Record<string, any>;
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
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const rateLimit = (userId: string) => {
  const now = Date.now();
  const state = rateLimiter.get(userId) || { windowStart: now, count: 0 };
  const windowMs = 60_000;
  if (now - state.windowStart > windowMs) {
    rateLimiter.set(userId, { windowStart: now, count: 1 });
    return false;
  }
  if (state.count >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }
  state.count += 1;
  rateLimiter.set(userId, state);
  return false;
};

const SYSTEM_PROMPT = `You are the CEO Assistant for Carpool Network. Help users with concise answers and use tools when needed.

You can use these tools by responding ONLY with a JSON object:
{ "tool": "<tool_name>", "params": { ... } }
Otherwise, reply with:
{ "reply": "<message>" }

Tools:
- get_my_bookings: Fetch the user's bookings.
- get_my_rides: Fetch rides the user is offering.
- find_rides: Search active rides. Params: origin (string), destination (string), date (optional ISO date).
- cancel_booking: Cancel a booking for the user. Params: booking_id (string), confirm (boolean). Require confirm=true to proceed.
- update_profile: Update profile fields. Params: key-value pairs (e.g., phone, full_name, preferences).
- get_my_vehicles: List the user's vehicles.
- add_vehicle: Add a vehicle. Params: make (string), model (string), year (number), color (string), license_plate (string), capacity (number), fuel_type (optional string), vehicle_type (optional string).

Rules:
- Keep responses short and clear.
- Never include secrets.
- Only one tool per request.
- If a tool returns data, summarize it for the user.
- If role=admin you may reference admin functions; otherwise, keep to the user's own data.`;

const buildContextPrefix = (context: UserContextPayload) => {
  const lines = [
    `User ID: ${context.userId || 'unknown'}`,
    `Name/Email: ${context.displayName || 'unknown'}`,
    `Role: ${context.role}`,
    `Current route: ${context.currentRoute || 'unknown'}`,
  ];
  if (context.vehicleCount !== undefined) lines.push(`Vehicle count: ${context.vehicleCount}`);
  if (context.upcomingRidesCount !== undefined) lines.push(`Upcoming rides: ${context.upcomingRidesCount}`);
  if (context.unreadNotificationsCount !== undefined)
    lines.push(`Unread notifications: ${context.unreadNotificationsCount}`);
  return lines.join('\\n');
};

const callGemini = async (message: string, apiKey: string, context: UserContextPayload): Promise<string> => {
  const contextText = buildContextPrefix(context);
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: `Context:\\n${contextText}\\n\\nUser message:\\n${message}` }] },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${raw}`);
  }
  const data = raw ? JSON.parse(raw) : {};
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter((t: any) => typeof t === 'string')
      .join(' ')
      .trim() || '';

  return text;
};

const callOpenAI = async (message: string, apiKey: string, context: UserContextPayload): Promise<string> => {
  const url = 'https://api.openai.com/v1/chat/completions';
  const contextText = buildContextPrefix(context);
  const res = await fetch(url, {
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
            'You are the AI Assistant for Carpool Network. Help users with rides, bookings, and profile questions. Be concise.',
        },
        { role: 'user', content: `Context:\\n${contextText}\\n\\nUser message:\\n${message}` },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${raw}`);
  }
  const data = raw ? JSON.parse(raw) : {};
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('Empty OpenAI reply');
  }
  return text;
};

const parseModelResponse = (text: string): { reply?: string; toolCall?: ToolCall } => {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      if (parsed.tool && parsed.params) {
        return { toolCall: parsed as ToolCall };
      }
      if (parsed.reply) {
        return { reply: String(parsed.reply) };
      }
    }
  } catch {
    // fallthrough
  }
  return { reply: text || 'Sorry, I could not understand the response.' };
};

const getUser = async (supabase: SupabaseClient, token: string) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error('Invalid or expired token');
  }
  return data.user;
};

const logAudit = async (
  supabase: SupabaseClient,
  userId: string,
  action: string,
  conversationId?: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase.from('ai_audit_logs').insert({
      user_id: userId,
      conversation_id: conversationId || null,
      action,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Audit log failed', error);
  }
};

async function tool_get_my_bookings(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('ride_bookings')
    .select(
      'id,status,pickup_location,dropoff_location,seats_requested,created_at,ride:rides(origin,destination,departure_time)'
    )
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

async function tool_get_my_rides(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('rides')
    .select('id,origin,destination,departure_time,available_seats,status')
    .eq('driver_id', userId)
    .order('departure_time', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data || [];
}

async function tool_get_my_vehicles(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id,make,model,year,color,license_plate,capacity,fuel_type,vehicle_type,is_active')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}

async function tool_find_rides(
  supabase: SupabaseClient,
  params: { origin?: string; destination?: string; date?: string }
) {
  let query = supabase
    .from('rides')
    .select('id,origin,destination,departure_time,available_seats,status')
    .eq('status', 'active')
    .gt('departure_time', new Date().toISOString())
    .order('departure_time', { ascending: true })
    .limit(10);

  if (params.origin) {
    query = query.ilike('origin', `%${params.origin}%`);
  }
  if (params.destination) {
    query = query.ilike('destination', `%${params.destination}%`);
  }
  if (params.date) {
    query = query.gte('departure_time', params.date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function tool_cancel_booking(
  supabase: SupabaseClient,
  params: { booking_id?: string; confirm?: boolean }
) {
  if (!params.booking_id) {
    throw new Error('booking_id is required');
  }
  if (!params.confirm) {
    return { message: 'Please confirm cancellation by setting confirm=true.' };
  }
  const { error } = await supabase.rpc('cancel_booking', {
    p_booking_id: params.booking_id,
    p_reason: 'Cancelled by user via AI assistant',
  });
  if (error) throw error;
  return { message: `Booking ${params.booking_id} cancelled.` };
}

async function tool_update_profile(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, any>
) {
  if (!Object.keys(params || {}).length) {
    throw new Error('No profile fields provided');
  }
  const { data, error } = await supabase
    .from('profiles')
    .update(params)
    .eq('id', userId)
    .select('id,full_name,phone,updated_at')
    .single();
  if (error) throw error;
  return data;
}

async function tool_add_vehicle(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, any>
) {
  const required = ['make', 'model', 'year', 'color', 'license_plate'];
  for (const key of required) {
    if (!params[key]) throw new Error(`Missing required vehicle field: ${key}`);
  }
  const payload: Record<string, any> = {
    user_id: userId,
    make: String(params.make),
    model: String(params.model),
    year: Number(params.year) || new Date().getFullYear(),
    color: String(params.color),
    license_plate: String(params.license_plate).toUpperCase(),
    capacity: params.capacity ? Number(params.capacity) : 4,
    is_active: true,
  };
  if (params.fuel_type) payload.fuel_type = String(params.fuel_type);
  if (params.vehicle_type) payload.vehicle_type = String(params.vehicle_type);

  const { data, error } = await supabase.from('vehicles').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  toolCall: ToolCall
) {
  switch (toolCall.tool) {
    case 'get_my_bookings': {
      const result = await tool_get_my_bookings(supabase, userId);
      await logAudit(supabase, userId, 'get_my_bookings', conversationId, { count: result.length });
      return result;
    }
    case 'get_my_rides': {
      const result = await tool_get_my_rides(supabase, userId);
      await logAudit(supabase, userId, 'get_my_rides', conversationId, { count: result.length });
      return result;
    }
    case 'find_rides': {
      const result = await tool_find_rides(supabase, toolCall.params || {});
      await logAudit(supabase, userId, 'find_rides', conversationId, { count: result.length });
      return result;
    }
    case 'get_my_vehicles': {
      const result = await tool_get_my_vehicles(supabase, userId);
      await logAudit(supabase, userId, 'get_my_vehicles', conversationId, { count: result.length });
      return result;
    }
    case 'cancel_booking': {
      const result = await tool_cancel_booking(supabase, toolCall.params || {});
      await logAudit(supabase, userId, 'cancel_booking', conversationId, { booking: toolCall.params?.booking_id });
      return result;
    }
    case 'update_profile': {
      const result = await tool_update_profile(supabase, userId, toolCall.params || {});
      await logAudit(supabase, userId, 'update_profile', conversationId, {
        fields: Object.keys(toolCall.params || {}),
      });
      return result;
    }
    case 'add_vehicle': {
      const result = await tool_add_vehicle(supabase, userId, toolCall.params || {});
      await logAudit(supabase, userId, 'add_vehicle', conversationId, { vehicle: result?.id });
      return result;
    }
    default:
      throw new Error(`Unsupported tool: ${toolCall.tool}`);
  }
}

const summarizeToolResult = (tool: ToolName, result: any): string => {
  switch (tool) {
    case 'get_my_bookings': {
      if (!Array.isArray(result) || result.length === 0) return 'You have no bookings.';
      const summary = result
        .map(
          (b: any) =>
            `- ${b.id}: ${b.ride?.origin || ''} to ${b.ride?.destination || ''} on ${b.ride?.departure_time || ''} (${b.status})`
        )
        .join('\n');
      return `You have ${result.length} booking(s):\n${summary}`;
    }
    case 'get_my_rides': {
      if (!Array.isArray(result) || result.length === 0) return 'You are not offering any rides.';
      const summary = result
        .map(
          (r: any) =>
            `- ${r.id}: ${r.origin} -> ${r.destination} at ${r.departure_time} (seats ${r.available_seats}, ${r.status})`
        )
        .join('\n');
      return `Your rides (${result.length}):\n${summary}`;
    }
    case 'find_rides': {
      if (!Array.isArray(result) || result.length === 0) return 'No matching rides found.';
      const summary = result
        .map((r: any) => `- ${r.id}: ${r.origin} -> ${r.destination} at ${r.departure_time} (seats ${r.available_seats})`)
        .join('\n');
      return `Found ${result.length} ride option(s):\n${summary}`;
    }
    case 'get_my_vehicles': {
      if (!Array.isArray(result) || result.length === 0) return 'You have no vehicles on file.';
      const summary = result
        .map(
          (v: any) =>
            `- ${v.id}: ${v.make} ${v.model} (${v.year}) ${v.color}, plate ${v.license_plate}, seats ${v.capacity}${
              v.is_active === false ? ' (inactive)' : ''
            }`
        )
        .join('\n');
      return `Your vehicles (${result.length}):\n${summary}`;
    }
    case 'cancel_booking':
      return typeof result?.message === 'string' ? result.message : 'Cancellation processed.';
    case 'update_profile':
      return 'Profile updated successfully.';
    case 'add_vehicle':
      return 'Vehicle added successfully.';
    default:
      return 'Completed.';
  }
};

const buildToolFollowup = async (
  userMessage: string,
  tool: ToolName,
  toolResult: any,
  context: UserContextPayload,
  apiKey: string
) => {
  const prompt = [
    'Tool execution finished. Summarize succinctly for the user.',
    `User message: ${userMessage}`,
    `Tool used: ${tool}`,
    `Tool result: ${JSON.stringify(toolResult)}`,
  ].join('\n');
  return callGemini(prompt, apiKey, context);
};

export const handler: Handler = async (event) => {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return json(401, { reply: 'Please sign in to use the assistant.', error: 'NO_AUTH' });
    }

    let payload: any = {};
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch {
      return json(400, { reply: 'Invalid JSON body.', error: 'BAD_JSON' });
    }

    const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
    const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : undefined;
    const incomingContext: UserContextPayload = {
      userId: payload?.userContext?.userId ?? null,
      displayName: payload?.userContext?.displayName ?? null,
      role: payload?.userContext?.role ?? 'user',
      currentRoute: payload?.userContext?.currentRoute ?? 'unknown',
      vehicleCount: payload?.userContext?.vehicleCount,
      upcomingRidesCount: payload?.userContext?.upcomingRidesCount,
      unreadNotificationsCount: payload?.userContext?.unreadNotificationsCount,
    };

    if (!message) {
      return json(400, { reply: 'Please type a message for the assistant.', error: 'NO_MESSAGE' });
    }

    const supabase = supabaseFromToken(token);
    const user = await getUser(supabase, token);

    if (rateLimit(user.id)) {
      return json(429, {
        reply: 'You are sending messages too quickly. Please wait a moment and try again.',
        error: 'RATE_LIMIT',
      });
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name,is_admin')
      .eq('id', user.id)
      .maybeSingle();

    const resolvedContext: UserContextPayload = {
      ...incomingContext,
      userId: user.id,
      displayName: profileRow?.full_name || incomingContext.displayName,
      role: profileRow?.is_admin ? 'admin' : incomingContext.role || 'user',
    };

    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_Access || '';
    const openAIKey = process.env.Open_AI_Api_key || process.env.OPENAI_API_KEY || '';

    if (!geminiKey && !openAIKey) {
      return json(500, {
        reply: 'AI is not configured yet. Please contact support.',
        error: 'NO_KEYS',
      });
    }

    // First Gemini call: decide if tool or direct reply
    let geminiRaw = '';
    let parsed: { reply?: string; toolCall?: ToolCall } = {};
    let geminiFailed: Error | null = null;
    if (geminiKey) {
      try {
        geminiRaw = await callGemini(message, geminiKey, resolvedContext);
        parsed = parseModelResponse(geminiRaw);
      } catch (err: any) {
        geminiFailed = err instanceof Error ? err : new Error(String(err));
        console.error('Gemini failed, will attempt OpenAI fallback if available:', geminiFailed.message);
      }
    }

    if (!parsed.toolCall && !parsed.reply && openAIKey && (!geminiKey || geminiFailed)) {
      try {
        const openAiRaw = await callOpenAI(message, openAIKey, resolvedContext);
        parsed = parseModelResponse(openAiRaw);
        geminiRaw = openAiRaw;
      } catch (openErr: any) {
        console.error('OpenAI fallback failed:', openErr);
      }
    }

    if (!parsed.toolCall) {
      await logAudit(supabase, user.id, 'direct_reply', conversationId, { message });
      return json(200, { reply: parsed.reply || geminiRaw, provider: parsed.reply ? 'gemini' : 'openai' });
    }

    // Execute tool
    const toolResult = await executeTool(supabase, user.id, conversationId, parsed.toolCall);
    const toolSummary = summarizeToolResult(parsed.toolCall.tool, toolResult);

    // Second Gemini call with tool result
    const followUpRaw = await buildToolFollowup(
      message,
      parsed.toolCall.tool,
      toolSummary,
      resolvedContext,
      geminiKey || openAIKey || ''
    );
    const followParsed = parseModelResponse(followUpRaw);

    await logAudit(supabase, user.id, parsed.toolCall.tool, conversationId, { toolResult });

    return json(200, {
      reply: followParsed.reply || followUpRaw,
      provider: 'gemini',
      tool: parsed.toolCall.tool,
      toolResult,
    });
  } catch (error: any) {
    console.error('AI assistant fatal error', error);
    return json(500, {
      reply: 'Sorry, something went wrong with the AI assistant.',
      error: String(error?.message || error),
    });
  }
};
