import {whatsappNumber} from './contact-number.js';

const required=e=>e.REQUIRE_PHONE_VERIFICATION==='true';
export function phoneProviderAvailable(env){
  return /^SK[0-9a-f]{32}$/i.test(env.TWILIO_API_KEY_SID||'') &&
    /^VA[0-9a-f]{32}$/i.test(env.TWILIO_VERIFY_SERVICE_SID||'') &&
    String(env.TWILIO_API_KEY_SECRET||'').length>=20 && Number.isSafeInteger(Number(env.SMS_DAILY_LIMIT)) && Number(env.SMS_DAILY_LIMIT)>0 && Number.isSafeInteger(Number(env.SMS_MONTHLY_LIMIT)) && Number(env.SMS_MONTHLY_LIMIT)>0;
}
export async function hasVerifiedPhone(env,userId){
  return !!await env.DB.prepare(`SELECT v.user_id FROM phone_verifications v JOIN member_contacts c ON c.user_id=v.user_id
    WHERE v.user_id=? AND v.phone_number=c.whatsapp_number AND v.expires_at>CURRENT_TIMESTAMP`).bind(userId).first();
}
export async function phoneState(env,userId){
  const row=await env.DB.prepare(`SELECT v.verified_at,v.expires_at FROM phone_verifications v JOIN member_contacts c ON c.user_id=v.user_id
    WHERE v.user_id=? AND v.phone_number=c.whatsapp_number AND v.expires_at>CURRENT_TIMESTAMP`).bind(userId).first();
  return {required:required(env),available:phoneProviderAvailable(env),verified:!!row,verifiedAt:row?.verified_at||null,expiresAt:row?.expires_at||null};
}
const providerError=(message,status=503)=>Object.assign(Error(message),{status});
export async function twilioVerify(env,action,data,requestFetch=fetch){
  if(!phoneProviderAvailable(env))throw providerError('Phone verification is not available yet. Please try again later.');
  const endpoint=action==='send'?'Verifications':'VerificationCheck';
  const payload=action==='send'?{To:data.number,Channel:'sms',Locale:'en'}:{VerificationSid:data.sid,Code:data.code};
  let response;
  try{response=await requestFetch(`https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/${endpoint}`,{
    method:'POST',headers:{authorization:'Basic '+btoa(env.TWILIO_API_KEY_SID+':'+env.TWILIO_API_KEY_SECRET),'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(payload).toString(),redirect:'error',signal:AbortSignal.timeout(12000)
  });}catch{throw providerError('The verification service did not respond. Wait a minute before trying again.');}
  if(response.status===429)throw providerError('Too many verification attempts. Please wait before trying again.',429);
  if(action==='check'&&response.status===404)throw providerError('That code has expired or was already used. Request a new code.',400);
  if(!response.ok)throw providerError('The verification service could not complete this request. Your saved number has not changed.');
  let result;try{result=await response.json();}catch{throw providerError('The verification service returned an incomplete response.');}
  if(result.service_sid!==env.TWILIO_VERIFY_SERVICE_SID || result.to!==data.number || result.channel!=='sms' || !/^VE[0-9a-f]{32}$/i.test(result.sid||''))throw providerError('The verification response could not be confirmed.');
  if(action==='check'&&result.sid!==data.sid)throw providerError('The verification response could not be confirmed.');
  return action==='send'?{sid:result.sid,pending:result.status==='pending'}:{approved:result.status==='approved'&&result.valid===true};
}
async function reserveSend(env){
  const now=new Date().toISOString();
  for(const [period,limit] of [[now.slice(0,10),Number(env.SMS_DAILY_LIMIT)],[now.slice(0,7),Number(env.SMS_MONTHLY_LIMIT)]]){
    if(!Number.isInteger(limit)||limit<1||limit>10000)return false;
    const row=await env.DB.prepare(`INSERT INTO phone_send_usage(period,attempts) VALUES(?,1)
      ON CONFLICT(period) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING attempts`).bind(period,limit).first();
    if(!row)return false;
  }
  return true;
}
export async function phoneRoutes(request,env,h,provider=twilioVerify){
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/auth/phone/'))return null;
  const auth=await h.requireUser(request,env);if(auth.error)return auth.error;
  const uid=auth.user.id;
  if(path==='/api/auth/phone/status'&&request.method==='GET')return h.json({ok:true,...await phoneState(env,uid)});
  if(request.method!=='POST'||!['/api/auth/phone/start','/api/auth/phone/check'].includes(path))return h.fail('Not found.',404);
  if(!await h.verified(env,uid))return h.fail('Verify your email before verifying your phone.',403);
  if(!phoneProviderAvailable(env))return h.fail('Phone verification is being set up. You can browse and use Support in the meantime.',503);
  const data=await request.json();
  if(path.endsWith('/start')){
    let number;try{number=whatsappNumber(data.number);}catch(e){return h.fail(e.message);}
    if(data.shareBookings!==true)return h.fail('Confirm that this is your number and that accepted ride partners may contact you.');
    for(const [name,limit,seconds,key] of [['phone-send-member',5,86400,uid],['phone-send-number',5,3600,number],['phone-send-network',20,3600,'']]){
      const limited=await h.rateLimitOrFail(request,env,name,limit,seconds,key,true);if(limited)return limited;
    }
    const owned=await env.DB.prepare('SELECT user_id FROM phone_verifications WHERE phone_number=?').bind(number).first();
    if(owned&&owned.user_id!==uid)return h.fail('This number cannot be linked to this account. Use Support if you need help.',409);
    const current=await env.DB.prepare('SELECT phone_number FROM phone_verifications WHERE user_id=? AND expires_at>CURRENT_TIMESTAMP').bind(uid).first();
    if(current?.phone_number===number&&await hasVerifiedPhone(env,uid))return h.json({ok:true,alreadyVerified:true});
    const id=crypto.randomUUID();
    const row=await env.DB.prepare(`INSERT INTO phone_challenges(id,user_id,phone_number,status,expires_at) VALUES(?,?,?,'sending',datetime('now','+10 minutes'))
      ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,phone_number=excluded.phone_number,provider_sid='',status='sending',attempts=0,created_at=CURRENT_TIMESTAMP,expires_at=excluded.expires_at
      WHERE phone_challenges.created_at<=datetime('now','-60 seconds') AND (phone_challenges.status<>'checking' OR phone_challenges.expires_at<=CURRENT_TIMESTAMP) RETURNING id`).bind(id,uid,number).first();
    if(!row)return h.fail('Wait one minute before requesting another code.',429);
    if(!await reserveSend(env)){await env.DB.prepare("UPDATE phone_challenges SET status='failed' WHERE id=?").bind(id).run();return h.fail('Verification is temporarily at capacity. Please try again later.',503);}
    try{
      const sent=await provider(env,'send',{number});if(!sent.pending)throw providerError('A new code could not be sent. Please try again later.');
      const saved=await env.DB.prepare("UPDATE phone_challenges SET provider_sid=?,status='pending' WHERE id=? AND status='sending' RETURNING id").bind(sent.sid,id).first();
      if(!saved)return h.fail('The verification request changed. Request another code.',409);
      return h.json({ok:true,challengeId:id,maskedNumber:'•••• '+number.slice(-4),expiresInSeconds:600,resendAfterSeconds:60});
    }catch(e){await env.DB.prepare("UPDATE phone_challenges SET status='failed' WHERE id=?").bind(id).run();return h.fail(e.message,e.status||503);}
  }
  const limited=await h.rateLimitOrFail(request,env,'phone-check-member',15,3600,uid,true);if(limited)return limited;
  if(!/^[0-9]{6}$/.test(String(data.code||'')))return h.fail('Enter the six-digit code from your text message.');
  const challenge=await env.DB.prepare(`UPDATE phone_challenges SET attempts=attempts+1,status='checking'
    WHERE id=? AND user_id=? AND status='pending' AND attempts<5 AND expires_at>CURRENT_TIMESTAMP RETURNING *`).bind(String(data.challengeId||''),uid).first();
  if(!challenge)return h.fail('This code has expired, was used, or is being checked. Request a new code if needed.',409);
  try{
    const result=await provider(env,'check',{sid:challenge.provider_sid,number:challenge.phone_number,code:data.code});
    if(!result.approved){await env.DB.prepare("UPDATE phone_challenges SET status=CASE WHEN attempts>=5 THEN 'exhausted' ELSE 'pending' END WHERE id=? AND status='checking'").bind(challenge.id).run();return h.fail('That code did not match. Check your text message and try again.',400);}
    // All writes derive from the still-current locked challenge, in one transaction.
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO phone_verifications(user_id,phone_number,expires_at,provider)
        SELECT user_id,phone_number,datetime('now','+180 days'),'twilio_verify_sms' FROM phone_challenges WHERE id=? AND user_id=? AND status='checking' AND expires_at>CURRENT_TIMESTAMP
        ON CONFLICT(user_id) DO UPDATE SET phone_number=excluded.phone_number,verified_at=CURRENT_TIMESTAMP,expires_at=excluded.expires_at,provider=excluded.provider`).bind(challenge.id,uid),
      env.DB.prepare(`INSERT INTO member_contacts(user_id,whatsapp_number,share_bookings)
        SELECT c.user_id,c.phone_number,1 FROM phone_challenges c JOIN phone_verifications v ON v.user_id=c.user_id AND v.phone_number=c.phone_number
        WHERE c.id=? AND c.user_id=? AND c.status='checking' AND c.expires_at>CURRENT_TIMESTAMP
        ON CONFLICT(user_id) DO UPDATE SET whatsapp_number=excluded.whatsapp_number,share_bookings=1,confirmed_at=CURRENT_TIMESTAMP`).bind(challenge.id,uid),
      env.DB.prepare("UPDATE phone_challenges SET status='consumed' WHERE id=? AND user_id=? AND status='checking' AND expires_at>CURRENT_TIMESTAMP").bind(challenge.id,uid)
    ]);
    const saved=await env.DB.prepare("SELECT id FROM phone_challenges WHERE id=? AND user_id=? AND status='consumed'").bind(challenge.id,uid).first();
    if(!saved)return h.fail('The code expired while being checked. Request a new code.',409);
    return h.json({ok:true,verified:true});
  }catch(e){
    await env.DB.prepare("UPDATE phone_challenges SET status=CASE WHEN attempts>=5 THEN 'exhausted' ELSE 'pending' END WHERE id=? AND status='checking'").bind(challenge.id).run();
    if(String(e).includes('UNIQUE'))return h.fail('This number cannot be linked to this account. Contact Support.',409);
    return h.fail(e.status?e.message:'Phone verification could not be saved. Request a new code.',e.status||503);
  }
}
