// Short, single-use email codes. The opaque challenge ID binds each code to one
// request; attempts, expiry and consumption are enforced by the database.
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value, length) => String(value || '').trim().slice(0, length);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const same = (a, b) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
};
function code() {
  // Rejection sampling avoids modulo bias.
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= 4294000000);
  return String(values[0] % 1000000).padStart(6, '0');
}

export async function emailAuth(request, data, env, h, login) {
  const path = new URL(request.url).pathname;
  if (request.method !== 'POST' || !['/api/auth/email/start','/api/auth/email/verify'].includes(path)) return null;
  const fail = (message, status = 400) => h.json({ok:false,error:message},status);
  if (path.endsWith('/start')) {
    if (!env.EMAIL || !env.EMAIL_FROM) return fail('Email sign-in is being set up. Existing members can use their PIN or recovery code.',503);
    const email = clean(data.email,254).toLowerCase();
    if (!validEmail.test(email)) return fail('Enter a valid email address.');
    const limited = await h.rateLimitOrFail(request,env,'email_send',3,900,email,true) || await h.rateLimitOrFail(request,env,'email_ip',8,3600);
    if (limited) return limited;
    const existing = await one(env,'SELECT user_id FROM member_emails WHERE email=?',email);
    const session = await h.requireUser(request,env);
    const purpose = data.purpose === 'link' ? 'link' : existing ? 'signin' : 'signup';
    if (purpose === 'link' && session.error) return session.error;
    if (purpose === 'link' && existing && existing.user_id !== session.user.id) return fail('This email is already linked to another account.',409);
    if (purpose === 'signup' && (data.adult !== true || clean(data.name,60).length < 2 || clean(data.area,100).length < 2)) return fail('For a new account, add your name and town and confirm you are 18 or older.');
    const month = new Date().toISOString().slice(0,7);
    const limit = Math.max(1,Math.min(2000,Number(env.EMAIL_MONTHLY_LIMIT)||2000));
    const quota = await one(env,`INSERT INTO app_settings(key,value) VALUES(?, '1')
      ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1 WHERE CAST(value AS INTEGER)<? RETURNING value`, `email_count_${month}`,limit);
    if (!quota) return fail('Email sign-in is temporarily at capacity. Please contact support or use your existing PIN or passkey.',503);
    const id = crypto.randomUUID(), otp = code();
    const userId = purpose === 'link' ? session.user.id : existing?.user_id || null;
    await run(env,`INSERT INTO email_challenges(id,code_hash,user_id,purpose,payload,expires_at) VALUES(?,?,?,?,?,datetime('now','+10 minutes'))`,id,await h.sha256(`${id}:${otp}`),userId,purpose,JSON.stringify({email,name:clean(data.name,60),area:clean(data.area,100)}));
    try {
      await env.EMAIL.send({from:env.EMAIL_FROM,to:email,subject:'Your Carpool Network sign-in code',text:`Your Carpool Network code is ${otp}.\n\nIt expires in 10 minutes and can be used once. Never share this code. If you did not request it, you can ignore this email.`,html:`<div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:32px;color:#1d2c55"><h1 style="font-size:22px">Continue to Carpool Network</h1><p>Your single-use code:</p><p style="font-size:36px;letter-spacing:8px;font-weight:bold">${otp}</p><p>Expires in 10 minutes. Never share this code.</p><p>If you did not request this, you can ignore this email.</p></div>`});
    } catch {
      await run(env,'DELETE FROM email_challenges WHERE id=?',id);
      return fail('We could not send your code. Please try again later. Your account has not changed.',503);
    }
    return h.json({ok:true,sent:true,challengeId:id,expiresIn:600});
  }

  const limited = await h.rateLimitOrFail(request,env,'email_verify',20,900);
  if (limited) return limited;
  const id = clean(data.challengeId,80), otp = clean(data.code,6);
  if (!/^[0-9]{6}$/.test(otp) || !/^[0-9a-f-]{36}$/.test(id)) return fail('Enter the six-digit code from your email.');
  const challenge = await one(env,`UPDATE email_challenges SET attempts=attempts+1 WHERE id=? AND attempts<5 AND expires_at>CURRENT_TIMESTAMP RETURNING *`,id);
  if (!challenge || !same(challenge.code_hash,await h.sha256(`${id}:${otp}`))) return fail('That code has expired or did not match. Check it or request a new code.',403);
  if (challenge.purpose === 'link') {
    const session = await h.requireUser(request,env);
    if (session.error) return session.error;
    if (session.user.id !== challenge.user_id) return fail('Use the account that requested this code.',403);
  }
  const consumed = await one(env,'DELETE FROM email_challenges WHERE id=? RETURNING id',id);
  if (!consumed) return fail('This code has already been used. Request a new one.',409);
  const payload = JSON.parse(challenge.payload);
  let userId = challenge.user_id;
  if (challenge.purpose === 'signup') {
    userId = crypto.randomUUID();
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users(id,token_hash,name,phone,area) VALUES(?,?,?,?,?)').bind(userId,await h.sha256(crypto.randomUUID()),payload.name,`email:${userId}`,payload.area),
        env.DB.prepare('INSERT INTO member_emails(user_id,email) VALUES(?,?)').bind(userId,payload.email),
        env.DB.prepare('INSERT INTO user_profile_details(user_id) VALUES(?)').bind(userId),
        env.DB.prepare("INSERT INTO user_moderation(user_id,status) VALUES(?,'active')").bind(userId)
      ]);
    } catch(error) {
      if(String(error).includes('UNIQUE')) return fail('This email is already registered. Request a new sign-in code.',409);
      throw error;
    }
  } else if(challenge.purpose === 'link') {
    try { await run(env,'INSERT INTO member_emails(user_id,email) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified_at=CURRENT_TIMESTAMP',userId,payload.email); }
    catch(error) { if(String(error).includes('UNIQUE')) return fail('This email is already linked to an account.',409);throw error; }
  }
  // A routine email login must not delete the member's PIN, passkeys or recovery
  // method. Explicit device revocation remains available in Account.
  return login(userId);
}
