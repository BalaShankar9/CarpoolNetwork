import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash,randomInt} from 'node:crypto';
import WebSocket from 'ws';
import {authenticator} from './passkey-fixture.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const base='http://127.0.0.1:8788';
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const db=walk(join(root,'.wrangler/state/v3/d1')).find(p=>p.endsWith('.sqlite')&&!p.endsWith('metadata.sqlite'));
const sql=(query,args=[])=>JSON.parse(execFileSync('python3',['-c','import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1],timeout=15);c.row_factory=sqlite3.Row\nr=c.execute(sys.argv[2],json.loads(sys.argv[3]));v=[dict(x) for x in r.fetchall()];c.commit();print(json.dumps(v))',db,query,JSON.stringify(args)],{encoding:'utf8'}));
const hash=value=>createHash('sha256').update(value).digest('hex');
const id=randomUUID().slice(0,8);
let ip=10; const testNetwork=randomInt(1,255);
async function api(path,{user,method='GET',body,headers={},raw}={}){
 const r=await fetch(base+path,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(user?{cookie:user.cookie}:{}),'CF-Connecting-IP':`198.18.${testNetwork}.${user?.ip||++ip}`,...headers},body:raw??(body!==undefined?JSON.stringify(body):undefined),signal:AbortSignal.timeout(10000)});
 const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};
}
const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.data));assert.equal(r.data.ok,true);return r.data;};
async function start(email,extra={}){
 const before=new Set(walk(join(root,'.wrangler/tmp/email')).filter(p=>p.includes('/email-text/')));
 const r=await api('/api/auth/email/start',{method:'POST',body:{email,name:'Local test member',area:'Cardiff',adult:true,whatsapp:'+12025550123',shareBookings:true,...extra}});ok(r);
 let files=[], match;
 for(let i=0;i<40&&!match;i++){
   files=walk(join(root,'.wrangler/tmp/email')).filter(p=>p.includes('/email-text/')&&!before.has(p));
   if(files.length===1)match=readFileSync(files[0],'utf8').match(/code is ([0-9]{6})/);
   if(!match)await new Promise(r=>setTimeout(r,50));
 }
 assert.equal(files.length,1,'Local email simulator must record exactly one delivery');
 assert.ok(match,'Wait for the simulator to finish writing the email');
 const code=match[1];
 return {challengeId:r.data.challengeId,code};
}
async function member(name){const email=`${name.toLowerCase()}-${id}@example.invalid`,challenge=await start(email,{name});const r=await api('/api/auth/email/verify',{method:'POST',body:challenge});ok(r);assert.match(r.headers.get('set-cookie'),/HttpOnly/);return {...r.data.profile,cookie:r.cookie,email,ip:++ip};}
const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const offer=(user,extra={})=>api('/api/posts',{user,method:'POST',body:{category:'ride_offer',origin:'Cardiff',destination:'Bristol',journeyDate:date,journeyTime:'10:00',seats:1,...extra}});
const message=(user,room,body,clientId=randomUUID())=>api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,{user,method:'POST',body:{body,clientId,chatOnly:true}});
const sockets=new Set();
function socket(user,room){
 const ws=new WebSocket(base.replace('http','ws')+`/api/social/rooms/${encodeURIComponent(room)}/live`,{headers:{cookie:user.cookie,origin:base}});sockets.add(ws);const events=[];ws.on('message',raw=>events.push(JSON.parse(String(raw))));return {ws,events,opened:new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);})};
}
async function until(fn){for(let i=0;i<50;i++){if(fn())return;await new Promise(r=>setTimeout(r,100));}assert.fail('Expected realtime event did not arrive');}
await test('Focused community candidate: real Worker, D1 and WebSocket journeys',async t=>{
 t.after(()=>{for(const ws of sockets)ws.terminate();});
 let driver,rider,third,ride,booking,room,dm;
 await t.test('health, security headers and honest capabilities',async()=>{const r=await api('/api/health');ok(r);assert.equal(r.data.version,'8.0.0-preview');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.ok(r.headers.get('x-request-id'));const c=ok(await api('/api/config'));assert.equal(c.preview,true);assert.equal(c.emailAvailable,true);});
 await t.test('email sign-up produces a verified session; code cannot be reused',async()=>{driver=await member('Driver');rider=await member('Rider');third=await member('Third');ok(await api('/api/profile',{user:driver}));assert.equal(ok(await api('/api/auth/email/status',{user:driver})).email,driver.email);const c=await start(`replay-${id}@example.invalid`);ok(await api('/api/auth/email/verify',{method:'POST',body:c}));assert.equal((await api('/api/auth/email/verify',{method:'POST',body:c})).status,403);});
 await t.test('expired and repeatedly incorrect codes cannot sign in',async()=>{const c=await start(`expired-${id}@example.invalid`);sql("UPDATE email_challenges SET expires_at=datetime('now','-1 minute') WHERE id=?",[c.challengeId]);assert.equal((await api('/api/auth/email/verify',{method:'POST',body:c})).status,403);const d=await start(`attempts-${id}@example.invalid`);for(let i=0;i<5;i++)assert.equal((await api('/api/auth/email/verify',{method:'POST',body:{...d,code:d.code==='000000'?'999999':'000000'}})).status,403);assert.equal((await api('/api/auth/email/verify',{method:'POST',body:d})).status,403);});
 await t.test('WhatsApp onboarding validates numbers, requires consent and keeps contacts out of public views',async()=>{
  assert.equal((await api('/api/contact-details')).status,401);
  assert.equal(ok(await api('/api/contact-details',{user:driver})).number,'+12025550123');
  assert.equal((await api('/api/contact-details',{user:driver,method:'POST',body:{number:'+44123',shareBookings:true}})).status,400);
  assert.equal((await api('/api/contact-details',{user:driver,method:'POST',body:{number:'+12025550124',shareBookings:false}})).status,400);
  sql('DELETE FROM member_contacts WHERE user_id=?',[driver.id]);
  assert.equal((await message(driver,'lounge','Must finish onboarding')).status,428);
  ok(await api('/api/contact-details',{user:driver,method:'POST',body:{number:'+1 (202) 555-0124',shareBookings:true}}));
  assert.equal(ok(await api('/api/contact-details',{user:driver})).number,'+12025550124');
  assert.equal(ok(await api('/api/member-details/'+driver.id,{user:rider})).whatsapp,null);
  assert.ok(!JSON.stringify(ok(await api('/api/feed'))).includes('12025550124'));
 });
 await t.test('routine email login preserves passkeys and other sessions',async()=>{sql("INSERT INTO passkeys(id,user_id,public_key,counter,transports,label) VALUES(?,?,?,0,'[]','Test only')",[`test-key-${id}`,driver.id,'AA==']);const c=await start(driver.email);const r=await api('/api/auth/email/verify',{method:'POST',body:c});ok(r);assert.equal(r.data.profile.id,driver.id);assert.equal(sql('SELECT COUNT(*) n FROM passkeys WHERE user_id=?',[driver.id])[0].n,1);ok(await api('/api/profile',{user:driver}));driver.secondCookie=r.cookie;});
 await t.test('malformed, oversized and cross-origin requests fail safely',async()=>{assert.equal((await api('/api/profile',{method:'POST',raw:'{',headers:{'content-type':'application/json'}})).status,400);assert.equal((await api('/api/profile',{method:'POST',body:{x:'x'.repeat(20000)}})).status,413);assert.equal((await api('/api/profile',{method:'POST',body:{},headers:{origin:'https://attacker.invalid'}})).status,403);assert.equal((await api('/api/social/overview')).status,401);});
 await t.test('unverified accounts cannot message or request a booking',async()=>{const p=ok(await offer(driver),201);ride=p.post;const r=await api('/api/profile',{method:'POST',body:{name:'Unverified test',phone:'+44770090'+String(Date.now()).slice(-4),pin:'475839',area:'Cardiff'}});ok(r,201);const u={cookie:r.cookie,ip:++ip};assert.equal((await message(u,'lounge','This must not be sent')).status,403);assert.equal((await api('/api/ride-requests/quick',{user:u,method:'POST',body:{rideOfferPostId:ride.id}})).status,403);});
 await t.test('search and booking acceptance prevent overselling the final seat',async()=>{const search=ok(await api(`/api/rides/search?from=Cardiff&to=Bristol&date=${date}&time=10:00&seats=1`));assert.ok(search.rides.some(r=>r.id===ride.id));assert.ok(!JSON.stringify(search).includes(driver.email));const requests=[];for(const u of [rider,third])requests.push(ok(await api('/api/ride-requests/quick',{user:u,method:'POST',body:{rideOfferPostId:ride.id}}),201));assert.equal(ok(await api(`/api/ride-requests/${requests[0].id}/contact`,{user:rider})).contact,null);assert.equal((await api(`/api/ride-requests/${requests[0].id}/contact`,{user:third})).status,404);const results=await Promise.all(requests.map(r=>api(`/api/ride-requests/${r.id}`,{user:driver,method:'PATCH',body:{status:'accepted'}})));assert.equal(results.filter(r=>r.status===200).length,1);const index=results.findIndex(r=>r.status===200);booking=requests[index].id;if(index===1)[rider,third]=[third,rider];room=`booking:${booking}`;});
 await t.test('WhatsApp contact is shared only with accepted ride partners and removed by blocking',async()=>{
  const contact=ok(await api(`/api/ride-requests/${booking}/contact`,{user:rider})).contact;
  assert.equal(contact.number,'+12025550124');assert.match(contact.url,/^https:\/\/wa.me\/12025550124\?text=/);
  assert.equal(ok(await api('/api/member-details/'+driver.id,{user:rider})).whatsapp.number,contact.number);
  assert.equal(ok(await api('/api/member-details/'+driver.id,{user:third})).whatsapp,null);
  const own=ok(await api('/api/ride-requests/mine',{user:rider})).requests.find(r=>r.id===booking);assert.equal(own.contact_url,contact.url);
  const options=ok(await api('/api/ride-request-options?offerPostId='+ride.id,{user:rider})).options;assert.equal(options.find(o=>o.requestId===booking).contactUrl,contact.url);
  sql('INSERT INTO member_blocks(blocker_id,blocked_id) VALUES(?,?)',[rider.id,driver.id]);
  assert.equal(ok(await api(`/api/ride-requests/${booking}/contact`,{user:rider})).contact,null);
  assert.equal(ok(await api('/api/ride-requests/mine',{user:rider})).requests.find(r=>r.id===booking).contact_url,'');
  assert.equal(ok(await api('/api/ride-request-options?offerPostId='+ride.id,{user:rider})).options.find(o=>o.requestId===booking).contactUrl,'');
  sql('DELETE FROM member_blocks WHERE blocker_id=? AND blocked_id=?',[rider.id,driver.id]);
 });
 await t.test('encoded booking conversation works and rejects an unrelated member',async()=>{ok(await message(driver,room,'Meet outside the station entrance.'),201);const messages=ok(await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,{user:rider}));assert.equal(messages.messages.at(-1).body,'Meet outside the station entrance.');assert.equal((await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,{user:third})).status,403);});
 await t.test('message retry is idempotent and editing requires authorship',async()=>{const key=randomUUID();const a=ok(await message(driver,'lounge','Local test message',key),201);const b=ok(await message(driver,'lounge','Local test message',key));assert.equal(a.message.id,b.message.id);assert.equal((await api(`/api/social/messages/${a.message.id}/edit`,{user:rider,method:'POST',body:{body:'Forged edit'}})).status,403);assert.equal(sql('SELECT COUNT(*) n FROM chat_messages WHERE client_id=?',[key])[0].n,1);});
 await t.test('realtime presence counts people once and messages reach the other member',async()=>{const a=socket(driver,'lounge'),a2=socket(driver,'lounge'),b=socket(rider,'lounge');try{await Promise.all([a.opened,a2.opened,b.opened]);for(const s of [a,a2,b])s.ws.send(JSON.stringify({type:'presence',visible:true}));await until(()=>b.events.some(e=>e.type==='presence'&&e.online===2));ok(await message(driver,'lounge','Realtime persistence check'),201);await until(()=>b.events.some(e=>e.type==='message'));assert.ok(ok(await api('/api/social/rooms/lounge/messages',{user:rider})).messages.some(m=>m.body==='Realtime persistence check'));}finally{a.ws.close();a2.ws.close();b.ws.close();}});
 await t.test('direct messages require consent, stay private and respect blocks',async()=>{dm=ok(await api('/api/social/direct',{user:driver,method:'POST',body:{userId:third.id}}),201).id;assert.equal((await message(driver,dm,'Before acceptance')).status,403);ok(await api(`/api/social/rooms/${dm}/respond`,{user:third,method:'POST',body:{status:'active'}}));ok(await message(driver,dm,'Private test message'),201);assert.equal((await api(`/api/social/rooms/${dm}/messages`,{user:rider})).status,403);ok(await api('/api/social/block',{user:third,method:'POST',body:{userId:driver.id}}));assert.equal((await message(driver,dm,'Must be blocked')).status,403);});
 await t.test('cancelling a confirmed booking restores its seat',async()=>{ok(await api(`/api/ride-requests/${booking}`,{user:rider,method:'PATCH',body:{status:'cancelled'}}));assert.equal(ok(await api(`/api/ride-requests/${booking}/contact`,{user:rider})).contact,null);assert.equal(sql('SELECT status FROM posts WHERE id=?',[ride.id])[0].status,'active');assert.equal(sql("SELECT COUNT(*) n FROM ride_requests WHERE ride_offer_post_id=? AND status='accepted'",[ride.id])[0].n,0);});
 await t.test('reports are durable and private; automatic metadata is scrubbed',async()=>{const ref=randomUUID();ok(await api('/api/diagnostics',{method:'POST',body:{id:ref,source:'manual',route:'/?token=private',description:'This local test is checking a report with password=secretvalue.'}}),201);const row=sql('SELECT * FROM diagnostic_issues WHERE id=?',[ref])[0];assert.equal(row.route,'/');assert.ok(!row.detail.includes('secretvalue'));assert.equal((await api('/api/admin/issues',{user:rider})).status,403);assert.equal((await api('/api/admin/issues')).status,401);});
 await t.test('automatic error reports deduplicate and reject sensitive stack content',async()=>{
  const body={source:'browser',code:'JS_ERROR',route:'/api/social/rooms/private-room/messages?token=secret',frames:'https://secret.invalid/password=oops\napp.js:40:2\nsocial.js:20:3'};
  for(let i=0;i<2;i++)ok(await api('/api/diagnostics',{method:'POST',body}),201);
  const row=sql("SELECT * FROM diagnostic_issues WHERE source='browser' AND code='JS_ERROR' ORDER BY last_seen DESC LIMIT 1")[0];
  assert.equal(row.route,'/api/social/rooms/:id/messages');assert.ok(row.occurrences>=2);assert.equal(row.detail,'app.js:40:2\nsocial.js:20:3');
 });
 await t.test('email-only profiles save without a phone; passkey challenges reject forged responses',async()=>{
  ok(await api('/api/profile',{user:driver,method:'PATCH',body:{name:'Driver',area:'Cardiff',bio:'Local account test',travelRole:'driver'}}));
  const d=ok(await api('/api/auth/passkey/register/options',{user:driver,method:'POST',body:{}}));assert.equal(d.options.rp.id,'127.0.0.1');assert.ok(d.options.challenge);
  const bad=await api('/api/auth/passkey/register/verify',{user:driver,method:'POST',body:{id:d.id,response:{id:'forged'}}});assert.equal(bad.status,400);
  assert.equal((await api('/api/auth/passkey/register/verify',{user:driver,method:'POST',body:{id:d.id,response:{id:'forged'}}})).status,403);
 });
 await t.test('signed passkey registration and sign-in work; replay and wrong origin fail',async()=>{
  const device=authenticator(base);
  const registration=ok(await api('/api/auth/passkey/register/options',{user:driver,method:'POST',body:{}}));
  const response=device.register(registration.options.challenge);
  ok(await api('/api/auth/passkey/register/verify',{user:driver,method:'POST',body:{id:registration.id,response,label:'Synthetic local authenticator'}}));
  const challenge=ok(await api('/api/auth/passkey/login/options',{method:'POST',body:{}}));
  const assertion={id:challenge.id,response:device.login(challenge.options.challenge,driver.id)};
  const signed=ok(await api('/api/auth/passkey/login/verify',{method:'POST',body:assertion}));assert.equal(signed.profile.id,driver.id);
  assert.equal((await api('/api/auth/passkey/login/verify',{method:'POST',body:assertion})).status,403);
  const other=ok(await api('/api/auth/passkey/login/options',{method:'POST',body:{}}));
  assert.equal((await api('/api/auth/passkey/login/verify',{method:'POST',body:{id:other.id,response:device.login(other.options.challenge,driver.id,2,'https://wrong.invalid')}})).status,403);
 });
 await t.test('service-worker startup failures enter the private diagnostic queue',async()=>{
  ok(await api('/api/diagnostics',{method:'POST',body:{source:'browser',code:'SERVICE_WORKER_ERROR',route:'/sw.js'}}),201);
  assert.ok(sql("SELECT id FROM diagnostic_issues WHERE code='SERVICE_WORKER_ERROR' AND route='/sw.js'").length);
 });
 await t.test('city and radius search excludes remote pickup towns and mismatched destinations',async()=>{
  const q=new URLSearchParams({from:'Cardiff, Wales',to:'Bristol',date,time:'10:00',seats:'1',radiusMiles:'5'});
  const local=ok(await api('/api/rides/search?'+q));assert.ok(local.rides.some(p=>p.id===ride.id));
  q.set('from','London, England');assert.ok(!ok(await api('/api/rides/search?'+q)).rides.some(p=>p.id===ride.id));
  q.set('from','Cardiff');q.set('to','Manchester');assert.ok(!ok(await api('/api/rides/search?'+q)).rides.some(p=>p.id===ride.id));
  q.set('from','Not a known town');assert.equal((await api('/api/rides/search?'+q)).status,400);
  assert.ok(ok(await api('/api/places?q=Cardiff')).places.some(p=>p.name==='Cardiff'));
 });
 await t.test('social profile links require a session; missing DVLA setup never reports verification',async()=>{
  assert.equal((await api('/api/member-details')).status,401);
  ok(await api('/api/member-details/links',{user:driver,method:'POST',body:{instagram:'https://www.instagram.com/local-test/'}}));
  assert.equal(ok(await api('/api/member-details',{user:driver})).links.instagram,'https://www.instagram.com/local-test/');
  assert.equal((await api('/api/member-details/vehicle',{user:driver,method:'POST',body:{registration:'AB12CDE',passengerSeats:4,authorised:true}})).status,503);
  assert.equal(ok(await api('/api/member-details',{user:driver})).vehicle,null);
 });
 await t.test('profile photos remain private until moderator approval; stale reviews and member approvals fail',async()=>{
  const jpeg=readFileSync(join(root,'test/fixtures/photo-placeholder.jpg')).toString('base64');
  ok(await api('/api/profile-photo',{user:driver,method:'POST',body:{jpeg,publicProfile:true}}),201);
  assert.equal(ok(await api('/api/profile-photo',{user:driver})).photo.status,'pending');
  assert.equal((await fetch(base+'/api/profile-photo/'+driver.id)).status,404);
  assert.equal((await api('/api/admin/profile-photos',{user:rider})).status,403);
  const code=randomUUID().toUpperCase();
  sql("INSERT INTO user_roles(user_id,role) VALUES(?,'admin')",[rider.id]);sql('INSERT INTO admin_credentials(user_id,code_hash) VALUES(?,?)',[rider.id,hash(code)]);
  try{
    const admin=ok(await api('/api/admin/unlock',{user:rider,method:'POST',body:{code}})).adminToken,headers={'x-admin-token':admin};
    const image=ok(await api('/api/admin/profile-photos/'+driver.id,{user:rider,headers}));assert.match(image.image,/^data:image\/jpeg;base64,/);
    assert.equal((await api('/api/admin/profile-photos/'+driver.id,{user:rider,headers,method:'POST',body:{key:'stale',status:'approved'}})).status,409);
    // Approval here is a synthetic authorization/storage test, not a claim that
    // this deliberately blank fixture contains a face.
    ok(await api('/api/admin/profile-photos/'+driver.id,{user:rider,headers,method:'POST',body:{key:image.key,status:'approved',note:'Synthetic local test fixture only'}}));
    const photo=await fetch(base+'/api/profile-photo/'+driver.id);assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/jpeg');
    assert.equal(ok(await api('/api/profile',{user:driver})).profile.photo_approved,1);
  }finally{sql('DELETE FROM admin_sessions WHERE user_id=?',[rider.id]);sql('DELETE FROM admin_credentials WHERE user_id=?',[rider.id]);sql('DELETE FROM user_roles WHERE user_id=?',[rider.id]);}
 });
 await t.test('support conversations are private to their member',async()=>{
  const created=ok(await api('/api/support/tickets',{user:driver,method:'POST',body:{category:'technical',subject:'Local support privacy check',message:'This is a synthetic support request for automated tests.'}}),201);
  const tickets=ok(await api('/api/support/tickets',{user:driver})).tickets;assert.ok(tickets.length);
  const tid=tickets[0].id;ok(await api(`/api/support/tickets/${tid}/messages`,{user:driver}));assert.ok([403,404].includes((await api(`/api/support/tickets/${tid}/messages`,{user:third})).status));
 });
 await t.test('logout revokes the session and terminates chat access',async()=>{const a=socket(rider,'lounge');await a.opened;let closed=false;a.ws.on('close',()=>{closed=true;});ok(await api('/api/profile/logout',{user:rider,method:'POST'}));assert.equal((await api('/api/profile',{user:rider})).status,401);await until(()=>a.events.some(e=>e.type==='session_ended'));a.ws.close();assert.notEqual(a.ws.readyState,WebSocket.OPEN);});
 await t.test('sign out other devices preserves the current device',async()=>{ok(await api('/api/profile/logout-others',{user:driver,method:'POST'}));assert.equal((await api('/api/profile',{user:{...driver,cookie:driver.secondCookie}})).status,401);ok(await api('/api/profile',{user:driver}));});
});
