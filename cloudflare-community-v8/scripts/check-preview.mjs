// Explicitly targets the isolated design preview. Never use production data.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import WebSocket from 'ws';
const base='https://carpool-community-design.balashankarbollineni4.workers.dev';
const account='b7d80aea8a0938fe6d92342fa1ac7ea6', database='317cc2b1-51c9-4c8d-b3e0-aaa8621f36f2';
const oauth=execFileSync('python3',['-c','import tomllib,sys;print(tomllib.load(open(sys.argv[1],"rb"))["oauth_token"])',`${homedir()}/.wrangler/config/default.toml`],{encoding:'utf8'}).trim();
const hash=s=>createHash('sha256').update(s).digest('hex');
const users=['Driver','Rider','Third'].map(name=>({id:randomUUID(),name:`Preview test ${name}`,token:randomUUID()+randomUUID()}));
const sockets=[];
async function sql(query,params=[]){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{method:'POST',headers:{authorization:`Bearer ${oauth}`,'content-type':'application/json'},body:JSON.stringify({sql:query,params})});const d=await r.json();assert.equal(d.success,true,JSON.stringify(d.errors));return d.result[0].results;}
async function api(path,user,method='GET',body,admin){const r=await fetch(base+path,{method,headers:{...(user?{cookie:`__Host-cn_session=${user.token}`} :{}),...(body?{'content-type':'application/json'}:{}),...(admin?{'x-admin-token':admin}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json(),headers:r.headers};}
function ok(r,status=200){assert.equal(r.status,status,JSON.stringify(r.data));assert.equal(r.data.ok,true);return r.data;}
async function waitFor(fn){for(let i=0;i<70;i++){if(fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Realtime event did not arrive');}
function connect(user,room){const events=[];const ws=new WebSocket(base.replace('https:','wss:')+`/api/social/rooms/${encodeURIComponent(room)}/live`,{headers:{cookie:`__Host-cn_session=${user.token}`,origin:base}});sockets.push(ws);ws.on('message',m=>events.push(JSON.parse(m.toString())));return {ws,events,ready:new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);})};}
const adminCode=randomUUID().toUpperCase();
try{
  assert.equal(ok(await api('/api/config')).preview,true);
  assert.equal(ok(await api('/api/health')).database,'ok');
  for(const u of users){
    await sql('INSERT INTO users(id,token_hash,name,phone,area) VALUES(?,?,?,?,?)',[u.id,hash(randomUUID()),u.name,`email:${u.id}`,'Preview test only']);
    await sql('INSERT INTO user_sessions(token_hash,user_id) VALUES(?,?)',[hash(u.token),u.id]);
    await sql('INSERT INTO member_emails(user_id,email) VALUES(?,?)',[u.id,`${u.id}@example.invalid`]);
    await sql("INSERT INTO user_moderation(user_id,status) VALUES(?,'active')",[u.id]);
  }
  const [driver,rider,third]=users;
  const date=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
  const ride=ok(await api('/api/posts',driver,'POST',{category:'ride_offer',origin:'Preview test Cardiff',destination:'Preview test Bristol',journeyDate:date,journeyTime:'12:00',seats:1,body:'Automated preview test. Not a real journey.'}),201).post;
  const requests=[];for(const u of [rider,third])requests.push(ok(await api('/api/ride-requests/quick',u,'POST',{rideOfferPostId:ride.id}),201));
  const results=await Promise.all(requests.map(r=>api(`/api/ride-requests/${r.id}`,driver,'PATCH',{status:'accepted'})));
  assert.equal(results.filter(r=>r.status===200).length,1);
  const winner=results.findIndex(r=>r.status===200),traveller=[rider,third][winner],outsider=[rider,third][1-winner],booking=requests[winner].id,room=`booking:${booking}`;
  console.log('PASS hosted concurrent last-seat acceptance');
  const a=connect(driver,room),b=connect(traveller,room);await Promise.all([a.ready,b.ready]);
  a.ws.send(JSON.stringify({type:'presence',visible:true}));b.ws.send(JSON.stringify({type:'presence',visible:true}));await waitFor(()=>b.events.some(e=>e.type==='presence'&&e.online===2));
  ok(await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,driver,'POST',{body:'Preview test: booking conversation persistence.',clientId:randomUUID(),chatOnly:true}),201);
  await waitFor(()=>b.events.some(e=>e.type==='message'));
  assert.ok(ok(await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,traveller)).messages.length);
  assert.equal((await api(`/api/social/rooms/${encodeURIComponent(room)}/messages`,outsider)).status,403);
  console.log('PASS hosted chat persistence, realtime presence and membership privacy');
  const issue=ok(await api('/api/diagnostics',null,'POST',{source:'manual',id:randomUUID(),description:'Automated preview report. Verifying private report handling.',route:'/'}),201);
  await sql("INSERT INTO user_roles(user_id,role) VALUES(?,'admin')",[driver.id]);
  await sql('INSERT INTO admin_credentials(user_id,code_hash) VALUES(?,?)',[driver.id,hash(adminCode)]);
  const admin=ok(await api('/api/admin/unlock',driver,'POST',{code:adminCode})).adminToken;
  assert.ok(ok(await api('/api/admin/issues',driver,'GET',undefined,admin)).issues.some(i=>i.id===issue.reference));
  ok(await api(`/api/admin/issues/${issue.reference}`,driver,'PATCH',{status:'resolved',resolution:'Automated hosted reporting check completed.'},admin));
  assert.equal((await api('/api/admin/issues',traveller)).status,403);
  console.log('PASS hosted reporting, admin unlock and issue resolution');
  ok(await api(`/api/ride-requests/${booking}`,traveller,'PATCH',{status:'cancelled'}));
  ok(await api('/api/profile/logout',traveller,'POST'));
  assert.equal((await api('/api/profile',traveller)).status,401);
  await waitFor(()=>b.events.some(e=>e.type==='session_ended'));
  console.log('PASS hosted booking cancellation and logout revocation');
} finally {
  for(const s of sockets)s.terminate();
  for(const u of users){
    await sql("UPDATE posts SET status='deleted',updated_at=CURRENT_TIMESTAMP WHERE author_id=?",[u.id]);
    await sql("UPDATE user_moderation SET status='banned',reason='Preview test fixture retired' WHERE user_id=?",[u.id]);
    await sql('DELETE FROM user_sessions WHERE user_id=?',[u.id]);
    await sql('DELETE FROM admin_sessions WHERE user_id=?',[u.id]);
    await sql('DELETE FROM admin_credentials WHERE user_id=?',[u.id]);
    await sql('DELETE FROM user_roles WHERE user_id=?',[u.id]);
  }
  console.log('Preview fixtures retired; public test listings hidden and test access revoked.');
}
