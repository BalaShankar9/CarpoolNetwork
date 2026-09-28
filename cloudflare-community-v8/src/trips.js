import {participationIssue,rideEligibility} from './eligibility.js';
export function londonInstant(date,time){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return null;
  const raw=Date.parse(date+'T'+time+':00Z');if(!Number.isFinite(raw))return null;
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const candidates=[raw,raw-3600000].filter(ms=>{const p=Object.fromEntries(format.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`===date&&`${p.hour}:${p.minute}`===time;});
  return candidates.length===1?candidates[0]:null;
}
const activeSql="COALESCE(m.status,'active')<>'banned' AND (COALESCE(m.status,'active')<>'suspended' OR (m.until_at<>'' AND m.until_at<=CURRENT_TIMESTAMP)) AND u.phone NOT LIKE 'deleted:%'";
export async function tripContext(env,offerId,userId,sessionHash){
  if(sessionHash&&!await env.DB.prepare("SELECT user_id FROM user_sessions WHERE user_id=? AND token_hash=? AND created_at>datetime('now','-365 days')").bind(userId,sessionHash).first())return null;
  const offer=await env.DB.prepare(`SELECT p.*,t.status trip_status,t.started_at,t.expires_at,t.finished_at FROM posts p
    JOIN users u ON u.id=p.author_id LEFT JOIN user_moderation m ON m.user_id=u.id
    LEFT JOIN trip_sessions t ON t.offer_id=p.id WHERE p.id=? AND p.category='ride_offer' AND p.status<>'deleted' AND ${activeSql}`).bind(offerId).first();
  if(!offer)return null;
  const people=(await env.DB.prepare(`SELECT DISTINCT u.id,u.name FROM users u LEFT JOIN user_moderation m ON m.user_id=u.id
    WHERE ${activeSql} AND (u.id=? OR EXISTS(SELECT 1 FROM ride_requests r WHERE r.ride_offer_post_id=? AND r.rider_id=u.id AND (r.status='accepted' OR (r.status='completed' AND ?<>'active'))))`)
    .bind(offer.author_id,offerId,offer.trip_status||'').all()).results;
  if(!people.some(p=>p.id===userId))return null;
  if(await env.DB.prepare('SELECT 1 FROM member_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').bind(userId,offer.author_id,offer.author_id,userId).first())return null;
  const audience=await env.DB.prepare(`SELECT c.id,c.kind,m.status,co.status community_status FROM post_audiences a JOIN conversations c ON c.id=a.conversation_id LEFT JOIN communities co ON co.id=c.community_id
    LEFT JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=? WHERE a.post_id=?`).bind(userId,offerId).first();
  if(audience&&audience.kind!=='lounge'&&(audience.status!=='active'||audience.kind==='community'&&audience.community_status!=='approved'))return null;
  const audienceMembers=audience&&audience.kind!=='lounge'?new Set((await env.DB.prepare("SELECT user_id FROM conversation_members WHERE conversation_id=? AND status='active'").bind(audience.id).all()).results.map(p=>p.user_id)):null;
  const blocks=(await env.DB.prepare('SELECT blocker_id,blocked_id FROM member_blocks WHERE blocker_id=? OR blocked_id=?').bind(userId,userId).all()).results;
  const visible=people.filter(p=>(!audienceMembers||audienceMembers.has(p.id))&&!blocks.some(b=>b.blocker_id===p.id||b.blocked_id===p.id));
  const live=offer.trip_status==='active'&&Date.parse(offer.expires_at.replace(' ','T')+'Z')>Date.now();
  return {offer,people:visible,live,role:offer.author_id===userId?'driver':'rider'};
}
export function prunePositions(points,now=Date.now()){
  for(const [id,p] of points)if(p.expiresAt<=now)points.delete(id);
  if(points.grants)for(const [id,g] of points.grants)if(g.expiresAt<=now)points.grants.delete(id);
}
// Coordinates are deliberately ephemeral. They are never written to D1, DO
// storage, logs or notifications. Eviction loses the point until the next update.
export async function tripPointOperation(env,points,input){
  prunePositions(points);points.grants ||= new Map();
  const {offerId,userId,sessionHash,action}=input;
  if(action==='clear'){points.clear();points.grants.clear();return {ok:true};}
  if(action==='stop'){if(input.shareId&&points.grants.get(userId)?.id!==input.shareId)return {ok:true};points.delete(userId);points.grants.delete(userId);return {ok:true};}
  if(!sessionHash)return {ok:false,status:401,error:'Reconnect your account.'};
  const context=await tripContext(env,offerId,userId,sessionHash);
  if(!context)return {ok:false,status:403,error:'This trip is no longer available to you.'};
  if(!context.live){points.clear();points.grants.clear();return {ok:true,active:false,positions:[]};}
  if(action==='begin'){
    if(input.consent!==true)return {ok:false,status:400,error:'Confirm who may view your location.'};
    const issue=await participationIssue(env,userId);if(issue)return issue;
    const id=crypto.randomUUID();points.grants.set(userId,{id,expiresAt:Date.now()+43200000});points.delete(userId);
    return {ok:true,active:true,shareId:id};
  }
  if(action==='put'){
    if(!input.shareId||points.grants.get(userId)?.id!==input.shareId)return {ok:false,status:409,error:'Location sharing has stopped. Start sharing again if you want to continue.'};
    const p=input.position,now=Date.now();
    if(input.consent!==true||!p||![p.lat,p.lon,p.accuracy,p.capturedAt].every(Number.isFinite)||p.lat<-90||p.lat>90||p.lon<-180||p.lon>180||p.accuracy<0||p.accuracy>2000||p.capturedAt<now-30000||p.capturedAt>now+10000)return {ok:false,status:400,error:'Use a recent, accurate device location and confirm sharing.'};
    const issue=await participationIssue(env,userId);if(issue)return issue;
    const previous=points.get(userId);
    if(previous&&now-previous.receivedAt<4000)return {ok:false,status:429,error:'Wait a few seconds between location updates.'};
    points.set(userId,{lat:p.lat,lon:p.lon,accuracy:p.accuracy,capturedAt:p.capturedAt,receivedAt:now,expiresAt:now+90000});
    return {ok:true,active:true,expiresInSeconds:90};
  }
  // Only a current accepted participant may receive points, including after a block.
  const accepted=new Set((await env.DB.prepare("SELECT rider_id FROM ride_requests WHERE ride_offer_post_id=? AND status='accepted'").bind(offerId).all()).results.map(r=>r.rider_id));accepted.add(context.offer.author_id);
  const positions=context.people.filter(p=>accepted.has(p.id)&&points.has(p.id)).map(p=>({userId:p.id,name:p.name,...points.get(p.id)}));
  return {ok:true,active:true,positions};
}
export async function tripRoutes(request,env,h){
  const match=new URL(request.url).pathname.match(/^\/api\/trips\/([^/]+)(?:\/(start|finish|location))?$/);if(!match)return null;
  const auth=await h.requireUser(request,env);if(auth.error)return auth.error;
  const [_,offerId,action]=match,uid=auth.user.id;
  if(!env.CHAT_ROOMS)return h.fail('Live trip tools are temporarily unavailable.',503);
  const stub=env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName('trip:'+offerId));
  if(action==='location'&&request.method==='DELETE'){const body=await request.json().catch(()=>({}));await stub.tripPoints({action:'stop',userId:uid,shareId:typeof body.shareId==='string'?body.shareId:undefined});return h.json({ok:true});}
  const context=await tripContext(env,offerId,uid);if(!context)return h.fail('Trip not found.',404);
  const offer=context.offer;
  if(!action&&request.method==='GET')return h.json({ok:true,trip:{offerId,origin:offer.origin,destination:offer.destination,role:context.role,status:context.live?'active':offer.trip_status==='active'?'expired':offer.trip_status||'not_started',startedAt:offer.started_at||null,expiresAt:offer.expires_at||null,participants:context.people,sharingWindowSeconds:90}});
  if(action==='start'&&request.method==='POST'){
    if(context.role!=='driver')return h.fail('Only the driver can start this trip.',403);
    if(context.live)return h.json({ok:true,idempotent:true});
    if(offer.trip_status)return h.fail('This trip was already started or finished.',409);
    const departure=londonInstant(offer.journey_date,offer.journey_time);
    if(departure===null||Date.now()<departure-7200000||Date.now()>departure+43200000)return h.fail('Start the trip within two hours before, or twelve hours after, its departure. Ambiguous clock-change times need a new time.',409);
    const issue=await rideEligibility(env,uid,'ride_offer',offer.journey_date,Number(offer.seats));if(issue)return h.json(issue,issue.status);
    if(!await env.DB.prepare("SELECT id FROM ride_requests WHERE ride_offer_post_id=? AND status='accepted'").bind(offerId).first())return h.fail('This trip needs at least one accepted booking.',409);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO trip_sessions(offer_id,status,expires_at) VALUES(?,'active',datetime('now','+12 hours')) ON CONFLICT(offer_id) DO NOTHING").bind(offerId),
      env.DB.prepare("UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(offerId)
    ]);
    return h.json({ok:true});
  }
  if(action==='finish'&&request.method==='POST'){
    if(context.role!=='driver')return h.fail('Only the driver can finish this trip. You can stop your own location sharing at any time.',403);
    if(!offer.trip_status)return h.fail('Start the trip before finishing it.',409);
    if(offer.trip_status==='completed')return h.json({ok:true,idempotent:true});
    const data=await request.json();if(data.confirm!==true)return h.fail('Confirm the trip has finished.');
    await env.DB.batch([
      env.DB.prepare("UPDATE trip_sessions SET status='completed',finished_at=CURRENT_TIMESTAMP WHERE offer_id=? AND status='active'").bind(offerId),
      env.DB.prepare("UPDATE ride_requests SET status='completed',updated_at=CURRENT_TIMESTAMP WHERE ride_offer_post_id=? AND status='accepted'").bind(offerId)
    ]);
    await stub.tripPoints({action:'clear'});
    return h.json({ok:true});
  }
  if(action==='location'&&['GET','POST'].includes(request.method)){
    const body=request.method==='POST'?await request.json():{};
    const result=await stub.tripPoints({offerId,userId:uid,sessionHash:await h.sha256(auth.sessionToken),action:request.method==='GET'?'get':body.begin===true?'begin':'put',shareId:body.shareId,consent:body.consent===true,position:body.position});
    return h.json(result,result.status||200);
  }
  return h.fail('Not found.',404);
}
