import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type UserRole = 'guest' | 'user' | 'admin';

const json = (statusCode: number, data: any) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const supabaseFromToken = (token: string) => {
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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    }
  );
  const raw = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter((t: any) => typeof t === 'string').join(' ') ||
    '';
  return text.trim();
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI engineer helping triage bugs for CarpoolNetwork (carpooling app). Respond ONLY with JSON: {"analysis": "...", "fix": "..."}',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

const parseAi = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return {
      analysis: parsed.analysis || raw,
      fix: parsed.fix || parsed.ai_fix_suggestion || '',
    };
  } catch {
    return { analysis: raw, fix: '' };
  }
};

const logError = async (supabase: ReturnType<typeof createClient> | null, label: string, error: unknown, meta?: any) => {
  if (!supabase) return;
  try {
    await supabase.rpc('log_error', {
      p_error_type: label,
      p_error_message: error instanceof Error ? error.message : String(error),
      p_error_stack: error instanceof Error ? error.stack || null : null,
      p_severity: 'error',
      p_endpoint: '/.netlify/functions/ai-bug-triage',
      p_metadata: meta || {},
    });
  } catch (e) {
    console.error('Failed to log error', e);
  }
};

export const handler: Handler = async (event) => {
  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json(401, { error: 'NO_AUTH' });

    supabase = supabaseFromToken(token);

    const { data: userRes } = await supabase.auth.getUser(token);
    const { data: profileRow } = await supabase.from('profiles').select('is_admin').eq('id', userRes?.user?.id).maybeSingle();
    const userRole: UserRole = profileRow?.is_admin ? 'admin' : 'user';
    if (userRole !== 'admin') {
      return json(403, { error: 'FORBIDDEN' });
    }

    let body: any = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return json(400, { error: 'BAD_JSON' });
    }
    const bugId = typeof body?.bugId === 'string' ? body.bugId : '';
    if (!bugId) return json(400, { error: 'MISSING_BUG_ID' });

    const { data: bug, error: bugErr } = await supabase
      .from('bug_reports')
      .select('id,summary,details,route,error_id,metadata,status,created_at')
      .eq('id', bugId)
      .single();
    if (bugErr || !bug) {
      return json(404, { error: 'BUG_NOT_FOUND' });
    }

    const prompt = [
      'CarpoolNetwork is a community carpooling app: users add vehicles, post rides, book rides, manage profiles and notifications. Admins view analytics and bug reports.',
      'Provide a short analysis and a concrete suggested fix for the following bug. Respond ONLY with JSON: {"analysis": "...", "fix": "..."}',
      `Bug ID: ${bug.id}`,
      `Summary: ${bug.summary}`,
      `Details: ${bug.details}`,
      `Route: ${bug.route || 'unknown'}`,
      `Error ID: ${bug.error_id || 'n/a'}`,
      `Metadata: ${JSON.stringify(bug.metadata || {})}`,
    ].join('\n');

    const geminiKey = process.env.GEMINI_API_KEY || '';
    const openAIKey = process.env.Open_AI_Api_key || process.env.OPENAI_API_KEY || '';
    if (!geminiKey && !openAIKey) {
      return json(500, { error: 'NO_KEYS' });
    }

    let raw = '';
    let parsed;
    if (geminiKey) {
      try {
        raw = await callGemini(prompt, geminiKey);
        parsed = parseAi(raw);
      } catch (err) {
        await logError(supabase, 'ai-bug-triage', err, { bugId, provider: 'gemini' });
      }
    }
    if ((!parsed || !parsed.analysis) && openAIKey) {
      try {
        raw = await callOpenAI(prompt, openAIKey);
        parsed = parseAi(raw);
      } catch (err) {
        await logError(supabase, 'ai-bug-triage', err, { bugId, provider: 'openai' });
      }
    }

    if (!parsed) {
      return json(502, { error: 'LLM_FAILED' });
    }

    const { error: updateErr } = await supabase
      .from('bug_reports')
      .update({
        ai_analysis: parsed.analysis,
        ai_fix_suggestion: parsed.fix || parsed.analysis,
        status: bug.status === 'new' ? 'triaged' : bug.status,
      })
      .eq('id', bugId);
    if (updateErr) throw updateErr;

    return json(200, { success: true, ai_analysis: parsed.analysis, ai_fix_suggestion: parsed.fix || parsed.analysis });
  } catch (error) {
    await logError(supabase, 'ai-bug-triage-fatal', error, {});
    return json(500, { error: 'SERVER_ERROR', message: (error as Error)?.message });
  }
};
