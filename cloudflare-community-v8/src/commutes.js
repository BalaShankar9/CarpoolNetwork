import {participationIssue,rideEligibility} from './eligibility.js';
import {londonInstant} from './trips.js';
const clean=(s,n=120)=>String(s||'').trim().slice(0,n);
export function occurrenceDates(start,end,weekdays,excluded=[]){
  const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  if(!valid(start)||!valid(end))throw Error('Choose valid start and end dates.');
  const first=Date.parse(start+'T12:00:00Z'),last=Date.parse(end+'T12:00:00Z');
  if(last<first||last-first>27*86400000)throw Error('Schedule up to four weeks at a time.');
  if(!Array.isArray(weekdays)||!weekdays.length||weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||!Array.isArray(excluded)||excluded.length>28)throw Error('Select the weekdays you travel.');
  if(excluded.some(date=>!valid(date)||date<start||date>end))throw Error('Choose days off within the schedule dates.');
  const dates=[];for(let t=first;t<=last;t+=86400000){const d=new Date(t),date=d.toISOString().slice(0,10);if(weekdays.includes(d.getUTCDay())&&!excluded.includes(date))dates.push(date);}
  if(!dates.length)throw Error('No journeys remain after weekdays and days off.');return dates;
}
async function connected(env,a,b){return !!await env.DB.prepare(`SELECT 1 FROM ride_requests WHERE status IN ('accepted','completed')
  AND ((rider_id=? AND driver_id=?) OR (rider_id=? AND driver_id=?))
  AND NOT EXISTS(SELECT 1 FROM member_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)) AND NOT EXISTS(SELECT 1 FROM users u LEFT JOIN user_moderation m ON m.user_id=u.id WHERE u.id IN (?,?) AND (u.phone LIKE 'deleted:%' OR m.status='banned' OR (m.status='suspended' AND (m.until_at='' OR m.until_at>CURRENT_TIMESTAMP))))`).bind(a,b,b,a,a,b,b,a,a,b).first();}
async function futureOccurrences(env,id){return (await env.DB.prepare(`SELECT o.*,p.journey_time FROM commute_occurrences o JOIN posts p ON p.id=o.offer_id
  WHERE o.series_id=? AND o.local_date>=date('now','-1 day') AND NOT EXISTS(SELECT 1 FROM trip_sessions t WHERE t.offer_id=o.offer_id) ORDER BY o.local_date`).bind(id).all()).results.filter(o=>(londonInstant(o.local_date,o.journey_time)||0)>Date.now());}
function cancelStatements(env,occurrences,riderId){
  const statements=[];
  for(const o of occurrences){
    statements.push(env.DB.prepare(`UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE ride_offer_post_id=? AND status IN ('pending','accepted') AND NOT EXISTS(SELECT 1 FROM trip_sessions t WHERE t.offer_id=ride_requests.ride_offer_post_id)${riderId?' AND rider_id=?':''}`).bind(...(riderId?[o.offer_id,riderId]:[o.offer_id])));
    if(!riderId)statements.push(env.DB.prepare("UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND NOT EXISTS(SELECT 1 FROM trip_sessions t WHERE t.offer_id=posts.id)").bind(o.offer_id));
  }
  return statements;
}
export async function commuteRoutes(request,env,h){
  const path=new URL(request.url).pathname;if(!path.startsWith('/api/commutes'))return null;
  const auth=await h.requireUser(request,env);if(auth.error)return auth.error;const uid=auth.user.id,method=request.method;
  if(path==='/api/commutes/partners'&&method==='GET'){
    const rows=(await env.DB.prepare(`SELECT DISTINCT u.id,u.name FROM users u JOIN ride_requests r ON ((r.rider_id=u.id AND r.driver_id=?) OR (r.driver_id=u.id AND r.rider_id=?))
      WHERE r.status IN ('accepted','completed') AND u.phone NOT LIKE 'deleted:%' LIMIT 50`).bind(uid,uid).all()).results;
    const partners=[];for(const p of rows)if(await connected(env,uid,p.id))partners.push(p);return h.json({ok:true,partners});
  }
  if(path==='/api/commutes'&&method==='GET')return h.json({ok:true,series:(await env.DB.prepare(`SELECT s.*,m.status membership,u.name driver_name FROM commute_series s
    JOIN commute_members m ON m.series_id=s.id AND m.user_id=? JOIN users u ON u.id=s.owner_id WHERE m.status IN ('active','invited') ORDER BY s.created_at DESC LIMIT 30`).bind(uid).all()).results});
  if(path==='/api/commutes'&&method==='POST'){
    const data=await request.json();if(!/^[0-9a-f-]{36}$/i.test(data.clientId||''))return h.fail('Reload the form before trying again.');
    const existing=await env.DB.prepare('SELECT id FROM commute_series WHERE owner_id=? AND client_id=?').bind(uid,data.clientId).first();if(existing)return h.json({ok:true,id:existing.id,idempotent:true});
    const limited=await h.rateLimitOrFail(request,env,'commute-create',3,86400,uid,true);if(limited)return limited;
    const origin=h.resolvePlace(data.origin),destination=h.resolvePlace(data.destination),seats=Number(data.seats),time=clean(data.time,5),name=clean(data.name,80);
    if(!origin||!destination||origin.id===destination.id||name.length<3||!Number.isInteger(seats)||seats<1||seats>7)return h.fail('Choose two different suggested towns, a group name and 1 to 7 passenger seats.');
    let dates;try{dates=occurrenceDates(data.startDate,data.endDate,data.weekdays,data.excludedDates||[]);}catch(e){return h.fail(e.message);}
    if(dates.some(date=>{const t=londonInstant(date,time);return t===null||t<=Date.now()||t>Date.now()+90*86400000;}))return h.fail('Choose future departures within 90 days. Clock-change times that are missing or ambiguous need a different time.');
    const issue=await rideEligibility(env,uid,'ride_offer',dates.at(-1),seats);if(issue)return h.json(issue,issue.status);
    if(data.invitees!==undefined&&!Array.isArray(data.invitees))return h.fail('Choose members from the connection list.');
    const invitees=[...new Set(data.invitees||[])];if(invitees.length>7||invitees.some(id=>typeof id!=='string'||id===uid))return h.fail('Invite up to seven connected ride partners.');
    for(const id of invitees)if(!await connected(env,uid,id))return h.fail('Invite a member you have an accepted ride connection with.',403);
    const id=crypto.randomUUID(),community=crypto.randomUUID(),room='commute:'+id;
    const label=p=>p.label||`${p.name}, ${p.region}`;
    const statements=[
      env.DB.prepare("INSERT INTO communities(id,owner_id,name,description,access,status) VALUES(?,?,?,?,'invite','approved')").bind(community,uid,name,'Private regular commute group. A group place is not a confirmed seat.'),
      env.DB.prepare("INSERT INTO conversations(id,kind,community_id,title) VALUES(?,'community',?,?)").bind(room,community,name),
      env.DB.prepare("INSERT INTO conversation_members(conversation_id,user_id,role,status) VALUES(?,?,'owner','active')").bind(room,uid),
      env.DB.prepare(`INSERT INTO commute_series(id,owner_id,conversation_id,community_id,client_id,name,origin,destination,origin_id,destination_id,departure_time,weekdays_json,start_date,end_date,seats)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,uid,room,community,data.clientId,name,label(origin),label(destination),String(origin.id),String(destination.id),time,JSON.stringify(data.weekdays),data.startDate,data.endDate,seats),
      env.DB.prepare("INSERT INTO commute_members(series_id,user_id,status) VALUES(?,?,'active')").bind(id,uid)
    ];
    for(const person of invitees){statements.push(env.DB.prepare("INSERT INTO commute_members(series_id,user_id,status) VALUES(?,?,'invited')").bind(id,person));}
    for(const date of dates){const offer=crypto.randomUUID();statements.push(
      env.DB.prepare(`INSERT INTO posts(id,author_id,category,title,body,location,origin,destination,journey_date,journey_time,seats) VALUES(?,?,'ride_offer',?,'Regular commute — request and confirm a seat for each date.',?,?,?,?,?,?)`).bind(offer,uid,name,label(origin),label(origin),label(destination),date,time,seats),
      env.DB.prepare('INSERT INTO post_audiences(post_id,conversation_id) VALUES(?,?)').bind(offer,room),
      env.DB.prepare('INSERT INTO commute_occurrences(series_id,local_date,offer_id) VALUES(?,?,?)').bind(id,date,offer));}
    await env.DB.batch(statements);
    for(const person of invitees)await h.notify(env,person,'commute','Regular commute invitation',`${auth.user.name} invited you to ${name}. Review it in Regular commutes.`,'');
    return h.json({ok:true,id,occurrences:dates.length},201);
  }
  const match=path.match(/^\/api\/commutes\/([^/]+)(?:\/(join|leave|invite|remove|request|cancel|cancel-date))?$/);if(!match)return h.fail('Not found.',404);
  const [,id,action]=match;
  const series=await env.DB.prepare(`SELECT s.*,m.status membership FROM commute_series s JOIN communities c ON c.id=s.community_id AND c.status='approved' JOIN commute_members m ON m.series_id=s.id AND m.user_id=? WHERE s.id=? AND m.status IN ('active','invited')`).bind(uid,id).first();if(!series)return h.fail('Group not found.',404);
  const owner=series.owner_id===uid;
  if(!owner&&!await connected(env,uid,series.owner_id))return h.fail('This connection is no longer available.',403);
  if(!action&&method==='GET'){
    const members=series.membership==='active'?(await env.DB.prepare('SELECT m.user_id,m.status,u.name FROM commute_members m JOIN users u ON u.id=m.user_id WHERE m.series_id=?').bind(id).all()).results:[];
    const occurrences=(await env.DB.prepare(`SELECT o.local_date,o.offer_id,p.status,p.journey_time,p.seats,
      (SELECT COALESCE(SUM(r.seats_requested),0) FROM ride_requests r WHERE r.ride_offer_post_id=p.id AND r.status IN ('accepted','completed')) booked,
      (SELECT r.status FROM ride_requests r WHERE r.ride_offer_post_id=p.id AND r.rider_id=? AND r.status IN ('pending','accepted','completed')) my_status
      FROM commute_occurrences o JOIN posts p ON p.id=o.offer_id WHERE o.series_id=? ORDER BY o.local_date`).bind(uid,id).all()).results;
    return h.json({ok:true,series,members,occurrences});
  }
  if(method!=='POST')return h.fail('Not found.',404);const data=await request.json();
  if(action==='join'){
    if(series.status!=='active'||series.membership!=='invited')return h.fail('This invitation is no longer pending.',409);
    if(data.accept!==true)return h.fail('Confirm you want to join this private group.');
    const issue=await participationIssue(env,uid);if(issue)return h.json(issue,issue.status);
    await env.DB.batch([env.DB.prepare("UPDATE commute_members SET status='active' WHERE series_id=? AND user_id=? AND status='invited'").bind(id,uid),env.DB.prepare("INSERT INTO conversation_members(conversation_id,user_id,status) SELECT ?,user_id,'active' FROM commute_members WHERE series_id=? AND user_id=? AND status='active' ON CONFLICT(conversation_id,user_id) DO UPDATE SET status='active'").bind(series.conversation_id,id,uid)]);
    return h.json({ok:true});
  }
  if(action==='invite'){
    if(!owner||series.status!=='active')return h.fail('Only the driver can invite members to an active group.',403);
    const target=clean(data.userId,80);if(target===uid||!await connected(env,uid,target))return h.fail('Choose an accepted ride connection.',400);
    const count=await env.DB.prepare("SELECT COUNT(*) n FROM commute_members WHERE series_id=? AND user_id<>? AND status IN ('active','invited')").bind(id,uid).first();if(count.n>=7)return h.fail('This group already has seven passengers or invitations.',409);
    await env.DB.prepare("INSERT INTO commute_members(series_id,user_id,status) VALUES(?,?,'invited') ON CONFLICT(series_id,user_id) DO UPDATE SET status='invited' WHERE commute_members.status IN ('left','removed')").bind(id,target).run();
    await h.notify(env,target,'commute','Regular commute invitation',`You have an invitation to ${series.name}. Review it in Regular commutes.`,'');return h.json({ok:true});
  }
  if(action==='leave'||action==='remove'){
    const target=action==='leave'?uid:clean(data.userId,80);if(target===series.owner_id||action==='remove'&&!owner)return h.fail('The driver can cancel the group; only the driver can remove another member.',403);
    if(data.confirm!==true)return h.fail('Confirm removal and cancellation of this member’s future seats.');
    const cancellations=cancelStatements(env,await futureOccurrences(env,id),target);
    await env.DB.batch([...cancellations,env.DB.prepare("UPDATE commute_members SET status=? WHERE series_id=? AND user_id=?").bind(action==='leave'?'left':'removed',id,target),env.DB.prepare("UPDATE conversation_members SET status='removed' WHERE conversation_id=? AND user_id=?").bind(series.conversation_id,target)]);
    await h.disconnect(env,target);await h.notify(env,owner?target:series.owner_id,'commute','Regular commute membership changed','Future seats for the removed member were cancelled. Completed journeys remain in history.','');return h.json({ok:true});
  }
  if(series.membership!=='active'||series.status!=='active')return h.fail('Join an active group first.',409);
  if(action==='request'){
    if(owner)return h.fail('Drivers accept passenger requests from My bookings.');
    const issue=await participationIssue(env,uid);if(issue)return h.json(issue,issue.status);
    if(!Array.isArray(data.dates)||data.dates.length<1||data.dates.length>28)return h.fail('Select the dates you want to travel.');
    const wantedDates=[...new Set(data.dates)],occurrences=(await futureOccurrences(env,id)).filter(o=>wantedDates.includes(o.local_date));if(occurrences.length!==wantedDates.length)return h.fail('Some dates have passed or are unavailable. Refresh the group.',409);
    const driverIssue=await rideEligibility(env,series.owner_id,'ride_offer',occurrences.at(-1).local_date,series.seats);if(driverIssue)return h.json({ok:false,error:'The driver must update their account or vehicle checks before new seats can be requested.',code:'PARTNER_REQUIREMENTS'},428);
    const statements=[];
    for(const o of occurrences){
      const existing=await env.DB.prepare("SELECT id FROM ride_requests WHERE ride_offer_post_id=? AND rider_id=? AND status IN ('pending','accepted','completed')").bind(o.offer_id,uid).first();if(existing)continue;
      const offer=await env.DB.prepare("SELECT status FROM posts WHERE id=?").bind(o.offer_id).first();if(offer.status!=='active')return h.fail('One of those rides is full or closed. Choose the remaining dates.',409);
      const wanted=crypto.randomUUID(),booking=crypto.randomUUID();statements.push(
        env.DB.prepare("INSERT INTO posts(id,author_id,category,title,location,origin,destination,journey_date,journey_time,seats) VALUES(?,?,'ride_wanted',?,?,?,?,?,?,1)").bind(wanted,uid,series.name,series.origin,series.origin,series.destination,o.local_date,series.departure_time),
        env.DB.prepare('INSERT INTO post_audiences(post_id,conversation_id) VALUES(?,?)').bind(wanted,series.conversation_id),
        env.DB.prepare('INSERT INTO ride_requests(id,ride_offer_post_id,ride_wanted_post_id,rider_id,driver_id,seats_requested) VALUES(?,?,?,?,?,1)').bind(booking,o.offer_id,wanted,uid,series.owner_id));
    }
    if(statements.length){await env.DB.batch(statements);await h.notify(env,series.owner_id,'commute','Regular commute seat requests',`${auth.user.name} requested seats in ${series.name}. Accept individual dates in My bookings.`,'');}
    return h.json({ok:true,requested:statements.length/3});
  }
  if(action==='cancel'||action==='cancel-date'){
    if(!owner)return h.fail('Only the driver can cancel group journeys.',403);
    if(data.confirm!==true)return h.fail('Confirm cancellation; affected members will be notified.');
    let occurrences=await futureOccurrences(env,id);if(action==='cancel-date'){occurrences=occurrences.filter(o=>o.local_date===data.date);if(!occurrences.length)return h.fail('This date has passed or started.',409);}
    const cancellations=cancelStatements(env,occurrences);
    if(action==='cancel')cancellations.push(env.DB.prepare("UPDATE commute_series SET status='cancelled' WHERE id=?").bind(id));
    if(cancellations.length)await env.DB.batch(cancellations);
    const members=(await env.DB.prepare("SELECT user_id FROM commute_members WHERE series_id=? AND user_id<>? AND status='active'").bind(id,uid).all()).results;
    for(const member of members)await h.notify(env,member.user_id,'commute','Regular commute changed',action==='cancel'?'Future journeys in this group were cancelled.':`The group journey on ${data.date} was cancelled.`,'');
    return h.json({ok:true,cancelled:occurrences.length});
  }
  return h.fail('Not found.',404);
}
