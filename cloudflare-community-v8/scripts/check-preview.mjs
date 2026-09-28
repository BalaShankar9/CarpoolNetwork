// Targets only the isolated preview or release rehearsal, never production.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import WebSocket from 'ws';
const local=process.env.CARPOOL_LOCAL_CHECK==='1';
const rehearsal=process.env.CARPOOL_REHEARSAL_CHECK==='1';
const base=local?'http://127.0.0.1:8788':rehearsal?'https://carpool-network-release-check.balashankarbollineni4.workers.dev':'https://carpool-community-design.balashankarbollineni4.workers.dev';
const cookieName='__Host-cn_session';
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const localDb=local?walk('.wrangler/state/v3/d1').find(p=>p.endsWith('.sqlite')&&!p.endsWith('metadata.sqlite')):null;
const account='b7d80aea8a0938fe6d92342fa1ac7ea6', database=rehearsal?'46d0e693-595e-4975-b261-ef82ec387fbc':'317cc2b1-51c9-4c8d-b3e0-aaa8621f36f2';
const oauth=local?'':execFileSync('python3',['-c','import tomllib,sys;print(tomllib.load(open(sys.argv[1],"rb"))["oauth_token"])',`${homedir()}/.wrangler/config/default.toml`],{encoding:'utf8'}).trim();
const hash=s=>createHash('sha256').update(s).digest('hex');
const users=['Driver','Rider','Third'].map(name=>({id:randomUUID(),name:`Preview test ${name}`,token:randomUUID()+randomUUID()}));
const sockets=[];
async function sql(query,params=[]){if(local)return JSON.parse(execFileSync('python3',['-c','import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1],timeout=15);c.row_factory=sqlite3.Row\nr=c.execute(sys.argv[2],json.loads(sys.argv[3]));v=[dict(x) for x in r.fetchall()];c.commit();print(json.dumps(v))',localDb,query,JSON.stringify(params)],{encoding:'utf8'}));const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{method:'POST',headers:{authorization:`Bearer ${oauth}`,'content-type':'application/json'},body:JSON.stringify({sql:query,params})});const d=await r.json();assert.equal(d.success,true,JSON.stringify(d.errors));return d.result[0].results;}
async function api(path,user,method='GET',body,admin){const r=await fetch(base+path,{method,headers:{...(user?{cookie:`${cookieName}=${user.token}`} :{}),...(body?{'content-type':'application/json'}:{}),...(admin?{'x-admin-token':admin}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json(),headers:r.headers};}
function ok(r,status=200){assert.equal(r.status,status,JSON.stringify(r.data));assert.equal(r.data.ok,true);return r.data;}
async function waitFor(fn){for(let i=0;i<70;i++){if(fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Realtime event did not arrive');}
function connect(user,room){const events=[];const ws=new WebSocket(base.replace(/^http/,'ws')+`/api/social/rooms/${encodeURIComponent(room)}/live`,{headers:{cookie:`${cookieName}=${user.token}`,origin:base}});sockets.push(ws);ws.on('message',m=>events.push(JSON.parse(m.toString())));return {ws,events,ready:new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);})};}
const adminCode=randomUUID().toUpperCase();
try{
  console.log('Target: '+base);
  const config=ok(await api('/api/config'));assert.equal(config.preview,true);assert.equal(config.phoneVerificationRequired,false);assert.equal(config.whatsappRequired,true);
  assert.equal(ok(await api('/api/health')).database,'ok');
  for(const u of users){
    await sql('INSERT INTO users(id,token_hash,name,phone,area) VALUES(?,?,?,?,?)',[u.id,hash(randomUUID()),u.name,`email:${u.id}`,'Preview test only']);
    await sql('INSERT INTO user_sessions(token_hash,user_id) VALUES(?,?)',[hash(u.token),u.id]);
    await sql('INSERT INTO member_emails(user_id,email) VALUES(?,?)',[u.id,`${u.id}@example.invalid`]);
    await sql("INSERT INTO user_moderation(user_id,status) VALUES(?,'active')",[u.id]);
    await sql('INSERT INTO member_contacts(user_id,whatsapp_number) VALUES(?,?)',[u.id,'+1202555012'+(3+users.indexOf(u))]);
  }
  const [driver,rider,third]=users;
  const sample={category:'ride_offer',origin:'Cardiff',destination:'Bristol',journeyDate:new Date(Date.now()+5*86400000).toISOString().slice(0,10),journeyTime:'12:00',seats:1};
  const phone=ok(await api('/api/auth/phone/status',driver));assert.equal(phone.required,false);assert.equal(phone.available,false);assert.equal(phone.verified,false);
  assert.equal((await api('/api/auth/phone/start',driver,'POST',{number:'+12025550123',shareBookings:true})).status,503);
  ok(await api('/api/contact-details',driver,'POST',{number:'+12025550123',shareBookings:true}));
  assert.equal(ok(await api('/api/auth/phone/status',driver)).verified,false);
  await sql('DELETE FROM member_contacts WHERE user_id=?',[driver.id]);
  assert.equal((await api('/api/posts',driver,'POST',sample)).data.code,'CONTACT_REQUIRED');
  ok(await api('/api/contact-details',driver,'POST',{number:'+12025550123',shareBookings:true}));
  assert.equal((await api('/api/posts',driver,'POST',sample)).data.code,'PHOTO_REQUIRED');
  for(const u of users)await sql("INSERT INTO profile_photos(user_id,object_key,approved_key,status) VALUES(?,? ,?,'approved')",[u.id,'synthetic-'+u.id,'synthetic-'+u.id]);
  assert.equal((await api('/api/posts',driver,'POST',sample)).data.code,'VEHICLE_REQUIRED');
  await sql("INSERT INTO member_vehicles(user_id,registration,make,colour,mot_status,mot_expiry,tax_status,tax_due,passenger_seats,keeper_confirmed_at) VALUES(?,'TEST001','Synthetic fixture','Red','Valid',date('now','+180 days'),'Taxed',date('now','+180 days'),7,CURRENT_TIMESTAMP)",[driver.id]);
  console.log('PASS email-and-WhatsApp launch mode, required contact/photo/vehicle gates and disabled SMS. Synthetic photo and vehicle fixtures only.');
  assert.equal((await api('/api/account-status')).status,401);
  const status=ok(await api('/api/account-status',driver)).account;
  const {ok:contactOK,...ownContact}=ok(await api('/api/contact-details',driver));
  assert.deepEqual(status.contact,ownContact);assert.equal(status.contact.shareBookings,true);assert.equal(status.canOfferToday,true);
  assert.equal(status.email.verified,true);assert.equal(status.photo.hasApprovedPhoto,true);assert.equal(status.vehicle.passenger_seats,7);
  assert.ok(!JSON.stringify(status).includes('synthetic-'+driver.id));assert.ok(!JSON.stringify(status).includes('TEST001'));
  ok(await api('/api/profile',driver,'PATCH',{name:driver.name,area:'Preview test only',travelRole:'both'}));
  assert.equal(ok(await api('/api/account-status',driver)).account.contact.number,'+12025550123');
  console.log('PASS canonical saved contact, consent, private account status and profile edits preserve contact.');

  const date=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
  const ride=ok(await api('/api/posts',driver,'POST',{category:'ride_offer',origin:'Preview test Cardiff',destination:'Preview test Bristol',journeyDate:date,journeyTime:'12:00',seats:1,body:'Automated preview test. Not a real journey.'}),201).post;
  const requests=[];for(const u of [rider,third])requests.push(ok(await api('/api/ride-requests/quick',u,'POST',{rideOfferPostId:ride.id}),201));
  assert.equal(ok(await api(`/api/ride-requests/${requests[0].id}/contact`,rider)).contact,null);
  assert.equal((await api(`/api/ride-requests/${requests[0].id}/contact`,third)).status,404);
  assert.equal((await api('/api/contact-details')).status,401);
  if(!local)assert.equal(ok(await api('/api/member-details',driver)).vehicleChecksAvailable,true);
  const results=await Promise.all(requests.map(r=>api(`/api/ride-requests/${r.id}`,driver,'PATCH',{status:'accepted'})));
  assert.equal(results.filter(r=>r.status===200).length,1);
  const winner=results.findIndex(r=>r.status===200),traveller=[rider,third][winner],outsider=[rider,third][1-winner],booking=requests[winner].id,room=`booking:${booking}`;
  console.log('PASS concurrent last-seat acceptance');
  const contact=ok(await api(`/api/ride-requests/${booking}/contact`,traveller)).contact;
  assert.equal(contact.phoneVerified,false);assert.match(contact.verification,/not verified/);
  assert.equal(contact.number,'+12025550123');assert.match(contact.url,/^https:\/\/wa.me\/12025550123\?text=/);
  assert.equal(ok(await api('/api/member-details/'+driver.id,outsider)).whatsapp,null);
  assert.equal(ok(await api('/api/ride-request-options?offerPostId='+ride.id,traveller)).options.find(o=>o.requestId===booking).contactUrl,contact.url);
  await sql('INSERT INTO member_blocks(blocker_id,blocked_id) VALUES(?,?)',[traveller.id,driver.id]);
  assert.equal(ok(await api(`/api/ride-requests/${booking}/contact`,traveller)).contact,null);
  assert.equal(ok(await api('/api/ride-request-options?offerPostId='+ride.id,traveller)).options.find(o=>o.requestId===booking).contactUrl,'');
  await sql('DELETE FROM member_blocks WHERE blocker_id=? AND blocked_id=?',[traveller.id,driver.id]);
  console.log('PASS WhatsApp acceptance, unrelated-member and block privacy; DVLA binding configured');
  const a=connect(driver,room),b=connect(traveller,room);await Promise.all([a.ready,b.ready]);
  a.ws.send(JSON.stringify({type:'presence',visible:true}));b.ws.send(JSON.stringify({type:'presence',visible:true}));await waitFor(()=>b.events.some(e=>e.type==='presence'&&e.online===2));
  ok(await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,driver,'POST',{body:'Preview test: booking conversation persistence.',clientId:randomUUID(),chatOnly:true}),201);
  await waitFor(()=>b.events.some(e=>e.type==='message'));
  assert.ok(ok(await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,traveller)).messages.length);
  assert.equal((await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,outsider)).status,403);
  console.log('PASS chat persistence, realtime presence and membership privacy');
  const issue=ok(await api('/api/diagnostics',null,'POST',{source:'manual',id:randomUUID(),description:'Automated preview report. Verifying private report handling.',route:'/'}),201);
  await sql("INSERT INTO user_roles(user_id,role) VALUES(?,'admin')",[driver.id]);
  await sql('INSERT INTO admin_credentials(user_id,code_hash) VALUES(?,?)',[driver.id,hash(adminCode)]);
  const admin=ok(await api('/api/admin/unlock',driver,'POST',{code:adminCode})).adminToken;
  assert.ok(ok(await api('/api/admin/issues',driver,'GET',undefined,admin)).issues.some(i=>i.id===issue.reference));
  ok(await api(`/api/admin/issues/${issue.reference}`,driver,'PATCH',{status:'resolved',resolution:'Automated hosted reporting check completed.'},admin));
  assert.equal((await api('/api/admin/issues',traveller)).status,403);
  console.log('PASS reporting, admin unlock and issue resolution');
  ok(await api(`/api/ride-requests/${booking}`,traveller,'PATCH',{status:'cancelled'}));
  assert.equal(ok(await api(`/api/ride-requests/${booking}/contact`,traveller)).contact,null);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(Date.now()+1800000)).map(p=>[p.type,p.value]));
  const trip=ok(await api('/api/posts',driver,'POST',{...sample,journeyDate:`${parts.year}-${parts.month}-${parts.day}`,journeyTime:`${parts.hour}:${parts.minute}`,seats:4}),201).post;
  const seat=ok(await api('/api/ride-requests/quick',traveller,'POST',{rideOfferPostId:trip.id}),201);
  await sql('DELETE FROM member_emails WHERE user_id=?',[traveller.id]);
  const unmet=await api(`/api/ride-requests/${seat.id}`,driver,'PATCH',{status:'accepted'});assert.equal(unmet.status,428);assert.equal(unmet.data.code,'PARTNER_REQUIREMENTS');
  await sql('INSERT INTO member_emails(user_id,email) VALUES(?,?)',[traveller.id,`${traveller.id}@example.invalid`]);
  ok(await api(`/api/ride-requests/${seat.id}`,driver,'PATCH',{status:'accepted'}));
  assert.equal((await api(`/api/trips/${trip.id}/start`,traveller,'POST',{})).status,403);
  ok(await api(`/api/trips/${trip.id}/start`,driver,'POST',{}));
  assert.equal((await api(`/api/trips/${trip.id}`,outsider)).status,404);
  const share=ok(await api(`/api/trips/${trip.id}/location`,traveller,'POST',{begin:true,consent:true}));
  const point={lat:51.481,lon:-3.18,accuracy:12,capturedAt:Date.now()};
  ok(await api(`/api/trips/${trip.id}/location`,traveller,'POST',{shareId:share.shareId,consent:true,position:point,userId:driver.id,action:'clear'}));
  const points=ok(await api(`/api/trips/${trip.id}/location`,driver)).positions;assert.equal(points.length,1);assert.equal(points[0].userId,traveller.id);
  ok(await api(`/api/trips/${trip.id}/location`,traveller,'DELETE'));
  assert.equal(ok(await api(`/api/trips/${trip.id}/location`,driver)).positions.length,0);
  assert.equal((await api(`/api/trips/${trip.id}/location`,traveller,'POST',{shareId:share.shareId,consent:true,position:point})).status,409);
  const nextShare=ok(await api(`/api/trips/${trip.id}/location`,traveller,'POST',{begin:true,consent:true}));
  ok(await api(`/api/trips/${trip.id}/location`,traveller,'DELETE',{shareId:share.shareId}));
  ok(await api(`/api/trips/${trip.id}/location`,traveller,'POST',{shareId:nextShare.shareId,consent:true,position:{...point,capturedAt:Date.now()}}));
  ok(await api(`/api/trips/${trip.id}/finish`,driver,'POST',{confirm:true}));
  assert.equal(ok(await api(`/api/trips/${trip.id}`,driver)).trip.status,'completed');
  console.log('PASS live Worker trip start, strict acceptance, Durable Object sharing grants, outsider rejection, stop/replay and completion using synthetic coordinates.');
  const after=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10),key=randomUUID();
  const groupBody={clientId:key,name:'Preview test regular shift',origin:'Cardiff',destination:'Bristol',time:'08:00',startDate:after(6),endDate:after(33),weekdays:[0,1,2,3,4,5,6],seats:4,invitees:[traveller.id]};
  const group=ok(await api('/api/commutes',driver,'POST',groupBody),201);assert.equal(group.occurrences,28);assert.equal(ok(await api('/api/commutes',driver,'POST',groupBody)).id,group.id);
  assert.equal((await api('/api/commutes/'+group.id,outsider)).status,404);
  ok(await api(`/api/commutes/${group.id}/join`,traveller,'POST',{accept:true}));
  assert.equal(ok(await api(`/api/commutes/${group.id}/request`,traveller,'POST',{dates:[after(6),after(7)]})).requested,2);
  const series=ok(await api('/api/commutes/'+group.id,traveller));assert.equal(series.occurrences.filter(o=>o.my_status==='pending').length,2);
  assert.equal((await api('/api/posts/'+series.occurrences[0].offer_id,outsider)).status,404);
  ok(await api(`/api/social/rooms/${encodeURIComponent(series.series.conversation_id)}/messages`,traveller,'POST',{body:'Synthetic commute check',clientId:randomUUID(),chatOnly:true}),201);
  ok(await api(`/api/commutes/${group.id}/leave`,traveller,'POST',{confirm:true}));
  assert.equal((await api(`/api/social/rooms/${encodeURIComponent(series.series.conversation_id)}/messages`,traveller)).status,403);
  ok(await api(`/api/commutes/${group.id}/cancel`,driver,'POST',{confirm:true}));
  console.log('PASS private recurring group, retry, invitations, per-date requests, private listings/chat, leaving and cancellation.');
  await sql('UPDATE users SET area=? WHERE id=?',['Cardiff',driver.id]);
  const publicRide=ok(await api('/api/posts',driver,'POST',{...sample,journeyDate:after(10)}),201).post;
  const wanted=ok(await api('/api/posts',outsider,'POST',{category:'ride_wanted',origin:'Bristol',destination:'London',journeyDate:after(10),journeyTime:'09:00',seats:1,body:'Synthetic preview search fixture.'}),201).post;
  assert.ok(ok(await api('/api/feed?category=ride_offer&from=Cardiff&localDrivers=true',traveller)).posts.some(p=>p.id===publicRide.id));
  assert.ok(!ok(await api('/api/feed?category=ride_offer&from=Bristol',traveller)).posts.some(p=>p.id===publicRide.id));
  const nearby='/api/rides/search?kind=wanted&from=Cardiff&to=London&date='+after(10)+'&time=09:00&seats=4';
  assert.ok(ok(await api(nearby+'&radiusMiles=50',driver)).rides.some(p=>p.id===wanted.id));
  assert.ok(!ok(await api(nearby+'&radiusMiles=0',driver)).rides.some(p=>p.id===wanted.id));
  assert.equal(ok(await api(nearby+'&radiusMiles=50&page=100000',driver)).nextPage,null);
  console.log('PASS city-first feed, passenger discovery, pickup radius and bounded search pagination.');

  // Group removal earlier can already revoke older chat sockets. Establish
  // a fresh, authorized socket so this assertion measures logout specifically.
  const logoutSocket=connect(traveller,room);await logoutSocket.ready;
  await waitFor(()=>logoutSocket.events.some(e=>e.type==='connected'));
  ok(await api('/api/profile/logout',traveller,'POST'));
  assert.equal((await api('/api/profile',traveller)).status,401);
  await waitFor(()=>logoutSocket.events.some(e=>e.type==='session_ended'));
  console.log('PASS booking cancellation and logout revocation');
} finally {
  for(const s of sockets)s.terminate();
  for(const u of users){
    await sql("UPDATE posts SET status='deleted',updated_at=CURRENT_TIMESTAMP WHERE author_id=?",[u.id]);
    await sql("UPDATE user_moderation SET status='banned',reason='Preview test fixture retired' WHERE user_id=?",[u.id]);
    await sql('DELETE FROM user_sessions WHERE user_id=?',[u.id]);
    await sql('DELETE FROM admin_sessions WHERE user_id=?',[u.id]);
    await sql('DELETE FROM admin_credentials WHERE user_id=?',[u.id]);
    await sql('DELETE FROM user_roles WHERE user_id=?',[u.id]);
    await sql('DELETE FROM phone_verifications WHERE user_id=?',[u.id]);
    await sql('DELETE FROM profile_photos WHERE user_id=?',[u.id]);
    await sql("UPDATE commute_series SET status='cancelled' WHERE owner_id=?",[u.id]);
  }
  console.log('Preview fixtures retired; public test listings hidden and test access revoked.');
}
