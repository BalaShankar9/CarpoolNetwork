import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {visiblePostIds} from '../src/post-visibility.js';
import {fixture} from './sqlite-fixture.js';
import {commuteRoutes,occurrenceDates} from '../src/commutes.js';
import {tripRoutes,tripContext,tripPointOperation,prunePositions,londonInstant} from '../src/trips.js';
const after=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const localParts=ms=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
function setup(){
 const f=fixture();let phone=123;
 f.ready=id=>{f.member(id,'+12025550'+phone++);f.db.prepare("INSERT INTO phone_verifications(user_id,phone_number,expires_at,provider) SELECT user_id,whatsapp_number,datetime('now','+180 days'),'twilio_verify_sms' FROM member_contacts WHERE user_id=?").run(id);f.db.prepare("INSERT INTO profile_photos(user_id,object_key,approved_key,status) VALUES(?,'synthetic','synthetic','approved')").run(id);f.db.prepare('INSERT INTO user_sessions(user_id,token_hash) VALUES(?,?)').run(id,'session-'+id);};
 for(const id of ['driver','rider','other'])f.ready(id);
 f.db.prepare("INSERT INTO member_vehicles(user_id,registration,make,colour,mot_status,mot_expiry,tax_status,tax_due,passenger_seats,keeper_confirmed_at) VALUES('driver','TEST001','Synthetic','Red','Valid',?,'Taxed',?,7,CURRENT_TIMESTAMP)").run(after(180),after(180));
 f.h.requireUser=async r=>{const id=r.headers.get('x-test-user');return id&&f.db.prepare('SELECT id FROM users WHERE id=?').get(id)?{user:{id,name:id},sessionToken:'session-'+id}:{error:Response.json({ok:false},{status:401})};};
 f.h.resolvePlace=name=>['Cardiff','Bristol'].includes(name)?{id:name,name,region:'UK',label:name}:null;
 f.h.notify=async()=>{};f.h.disconnect=async()=>{};f.h.sha256=async s=>s;
 const maps=new Map();f.points=maps;
 f.env.CHAT_ROOMS={idFromName:n=>n,get:n=>({tripPoints:input=>{if(!maps.has(n))maps.set(n,new Map());return tripPointOperation(f.env,maps.get(n),input);}})};
 f.api=async(user,path,body,method=body?'POST':'GET')=>{const req=new Request('https://carpool.test/api/'+path,{method,headers:{'x-test-user':user,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const r=path.startsWith('trips/')?await tripRoutes(req,f.env,f.h):await commuteRoutes(req,f.env,f.h);return {status:r.status,data:await r.json()};};
 f.offer=(id='offer',date=after(2),time='09:00')=>f.db.prepare("INSERT INTO posts(id,author_id,category,title,origin,destination,journey_date,journey_time,seats) VALUES(?,'driver','ride_offer','Synthetic test','Cardiff','Bristol',?,?,7)").run(id,date,time);
 f.book=(rider='rider',offer='offer',id=randomUUID(),accepted=true)=>{const p=f.db.prepare('SELECT journey_date,journey_time FROM posts WHERE id=?').get(offer);f.db.prepare("INSERT INTO posts(id,author_id,category,title,origin,destination,journey_date,journey_time,seats) VALUES(?,?,'ride_wanted','Synthetic test','Cardiff','Bristol',?,?,1)").run('wanted-'+id,rider,p.journey_date,p.journey_time);f.db.prepare("INSERT INTO ride_requests(id,ride_offer_post_id,ride_wanted_post_id,rider_id,driver_id,seats_requested) VALUES(?,?,?,?,'driver',1)").run(id,offer,'wanted-'+id,rider);if(accepted)f.db.prepare("UPDATE ride_requests SET status='accepted' WHERE id=?").run(id);return id;};
 f.series=async(extra={})=>f.api('driver','commutes',{clientId:randomUUID(),name:'Test shift',origin:'Cardiff',destination:'Bristol',time:'08:00',startDate:after(4),endDate:after(6),weekdays:[0,1,2,3,4,5,6],seats:4,invitees:['rider'],...extra});
 return f;
}
test('commute dates enforce valid dates, four-week limit, days off and London DST',()=>{
 assert.deepEqual(occurrenceDates('2026-10-01','2026-10-07',[1,2,3,4,5],['2026-10-02']),['2026-10-01','2026-10-05','2026-10-06','2026-10-07']);
 assert.throws(()=>occurrenceDates('2026-02-30','2026-03-01',[0]));assert.throws(()=>occurrenceDates('2026-10-01','2026-11-01',[1]));
 assert.equal(londonInstant('2026-03-29','01:30'),null);assert.equal(londonInstant('2026-10-25','01:30'),null);assert.equal(londonInstant('2026-10-25','02:30'),Date.parse('2026-10-25T02:30Z'));
});
test('private commute invitations, date-specific requests and membership removal are transactional',async()=>{
 const f=setup();f.offer();f.book();const key=randomUUID(),created=await f.series({clientId:key});assert.equal(created.status,201,JSON.stringify(created));assert.equal(created.data.occurrences,3);const id=created.data.id;
 assert.equal((await f.series({clientId:key})).data.id,id);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM commute_series').get().n,1);
 assert.equal((await f.api('other','commutes/'+id)).status,404);const invitation=await f.api('rider','commutes/'+id);assert.equal(invitation.data.members.length,0);
 assert.equal((await f.api('rider',`commutes/${id}/request`,{dates:[after(4)]})).status,409);
 assert.equal((await f.api('rider',`commutes/${id}/join`,{accept:true})).status,200);
 assert.equal((await f.api('rider',`commutes/${id}/request`,{dates:[after(4),after(5)]})).data.requested,2);
 assert.equal((await f.api('rider',`commutes/${id}/request`,{dates:[after(4)]})).data.requested,0);
 const rows=f.db.prepare('SELECT r.id FROM ride_requests r JOIN commute_occurrences o ON o.offer_id=r.ride_offer_post_id WHERE o.series_id=?').all(id);assert.equal(rows.length,2);
 for(const row of rows)f.db.prepare("UPDATE ride_requests SET status='accepted' WHERE id=?").run(row.id);
 assert.equal((await f.api('rider',`commutes/${id}/leave`,{confirm:true})).status,200);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ride_requests r JOIN commute_occurrences o ON o.offer_id=r.ride_offer_post_id WHERE o.series_id=? AND r.status='cancelled'").get(id).n,2);
 assert.equal((await f.api('rider','commutes/'+id)).status,404);f.db.close();
});
test('commute creation rolls back overlapping rides and rejects banned connections; group passenger cap is database-enforced',async()=>{
 const f=setup();f.offer();f.book();f.offer('conflict',after(5),'08:30');await assert.rejects(()=>f.series(),/DRIVER_DUPLICATE_OFFER/);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM commute_series').get().n,0);f.db.prepare("UPDATE posts SET status='closed' WHERE id='conflict'").run();
 f.db.prepare("INSERT INTO user_moderation(user_id,status) VALUES('rider','banned')").run();assert.equal((await f.series()).status,403);f.db.prepare("UPDATE user_moderation SET status='active'").run();
 const id=(await f.series()).data.id;for(let i=0;i<7;i++){const uid='extra'+i;f.ready(uid);if(i<6)f.db.prepare("INSERT INTO commute_members(series_id,user_id,status) VALUES(?,?,'invited')").run(id,uid);else assert.throws(()=>f.db.prepare("INSERT INTO commute_members(series_id,user_id,status) VALUES(?,?,'invited')").run(id,uid),/COMMUTE_MEMBER_LIMIT/);}
 f.db.close();
});
test('only accepted trip participants can share recent consented locations; stops, expiry, block and logout revoke access',async()=>{
 const f=setup(),p=localParts(Date.now()+1800000),date=`${p.year}-${p.month}-${p.day}`,time=`${p.hour}:${p.minute}`;f.offer('trip',date,time);f.book('rider','trip');f.book('other','trip',randomUUID(),false);
 assert.equal((await f.api('rider','trips/trip/start',{})).status,403);assert.equal((await f.api('driver','trips/trip/start',{})).status,200);
 assert.equal((await f.api('other','trips/trip')).status,404);
 const shareId=(await f.api('rider','trips/trip/location',{begin:true,consent:true})).data.shareId;
 const point={lat:51.481,lon:-3.18,accuracy:10,capturedAt:Date.now()};assert.equal((await f.api('rider','trips/trip/location',{shareId,position:point})).status,400);
 assert.equal((await f.api('rider','trips/trip/location',{shareId,consent:true,position:{...point,capturedAt:Date.now()-60000}})).status,400);
 assert.equal((await f.api('rider','trips/trip/location',{shareId,consent:true,position:point,userId:'driver',action:'clear',sessionHash:'session-driver'})).status,200);
 let points=(await f.api('driver','trips/trip/location')).data.positions;assert.equal(points.length,1);assert.equal(points[0].userId,'rider');
 assert.equal((await f.api('rider','trips/trip/location',{shareId,consent:true,position:point})).status,429);
 f.db.prepare("INSERT INTO member_blocks(blocker_id,blocked_id) VALUES('driver','rider')").run();assert.equal((await f.api('driver','trips/trip/location')).data.positions.length,0);assert.equal((await f.api('rider','trips/trip/location')).status,404);f.db.prepare('DELETE FROM member_blocks').run();
 f.db.prepare("DELETE FROM user_sessions WHERE user_id='rider'").run();assert.equal((await f.api('rider','trips/trip/location')).status,403);
 await f.api('rider','trips/trip/location',undefined,'DELETE');assert.equal((await f.api('driver','trips/trip/location')).data.positions.length,0);
 f.db.prepare('INSERT INTO user_sessions(user_id,token_hash) VALUES(?,?)').run('rider','session-rider');assert.equal((await f.api('rider','trips/trip/location',{shareId,consent:true,position:point})).status,409);
 const map=f.points.get('trip:trip');map.set('rider',{...point,expiresAt:Date.now()-1});prunePositions(map);assert.equal(map.size,0);
 assert.throws(()=>f.db.prepare("UPDATE ride_requests SET status='accepted' WHERE rider_id='other'").run(),/JOURNEY_UNAVAILABLE/);
 assert.equal((await f.api('driver','trips/trip/finish',{confirm:true})).status,200);assert.equal((await f.api('driver','trips/trip')).data.trip.status,'completed');assert.equal(f.db.prepare("SELECT status FROM ride_requests WHERE rider_id='rider'").get().status,'completed');assert.equal((await f.api('driver','trips/trip/location')).data.active,false);
 f.db.close();
});
test('a removed private-group member loses location access even if a ride has already begun',async()=>{
 const f=setup();f.offer();f.book();const created=await f.series(),id=created.data.id;await f.api('rider',`commutes/${id}/join`,{accept:true});await f.api('rider',`commutes/${id}/request`,{dates:[after(4)]});
 const o=f.db.prepare('SELECT offer_id FROM commute_occurrences WHERE series_id=? ORDER BY local_date LIMIT 1').get(id).offer_id;f.db.prepare("UPDATE ride_requests SET status='accepted' WHERE ride_offer_post_id=?").run(o);f.db.prepare("INSERT INTO trip_sessions(offer_id,status,expires_at) VALUES(?,'active',datetime('now','+1 hour'))").run(o);
 assert.ok(await tripContext(f.env,o,'rider'));await f.api('driver',`commutes/${id}/remove`,{userId:'rider',confirm:true});assert.equal(await tripContext(f.env,o,'rider'),null);f.db.close();
});

test('batched listing visibility excludes anonymous private journeys, invitations, removed members, blocked authors and banned accounts',async()=>{
 const f=setup();f.offer();f.book();const id=(await f.series()).data.id;const ids=f.db.prepare('SELECT offer_id FROM commute_occurrences WHERE series_id=?').all(id).map(o=>o.offer_id);ids.push('offer');
 assert.deepEqual([...await visiblePostIds(f.env,ids,'')],['offer']);assert.deepEqual([...await visiblePostIds(f.env,ids,'rider')],['offer']);
 await f.api('rider',`commutes/${id}/join`,{accept:true});assert.equal((await visiblePostIds(f.env,ids,'rider')).size,4);
 f.db.prepare("INSERT INTO member_blocks(blocker_id,blocked_id) VALUES('rider','driver')").run();assert.equal((await visiblePostIds(f.env,ids,'rider')).size,0);f.db.prepare('DELETE FROM member_blocks').run();
 f.db.prepare("INSERT INTO user_moderation(user_id,status) VALUES('driver','banned')").run();assert.equal((await visiblePostIds(f.env,ids,'rider')).size,0);f.db.close();
});
