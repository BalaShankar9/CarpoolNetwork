import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdirSync, readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('These tests are restricted to a local disposable database.');
function files(p){return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]);}
const dbfile=files(join(root,'.wrangler/state/v3/d1')).find(p=>p.endsWith('.sqlite') && !p.endsWith('metadata.sqlite'));
assert.ok(dbfile);
function sql(query,args=[]){return JSON.parse(execFileSync('/usr/bin/python3',['-c',`import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1],timeout=15);c.row_factory=sqlite3.Row\nr=c.execute(sys.argv[2],json.loads(sys.argv[3]));v=[dict(x) for x in r.fetchall()];c.commit();print(json.dumps(v))`,dbfile,query,JSON.stringify(args)],{encoding:'utf8'}));}
async function api(path,{user,method='GET',body,headers={},raw}={}){
 const res=await fetch(base+path,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(user?{authorization:'Bearer '+user.token}:{}),...headers},body:raw!==undefined?raw:body!==undefined?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const data=await res.json();return {status:res.status,data,headers:res.headers};
}
function ok(res,status=200){assert.equal(res.status,status,JSON.stringify(res.data));assert.equal(res.data.ok,true);return res.data;}
const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const tomorrow=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
const hash=v=>createHash('sha256').update(v).digest('hex');
let people=[],offer,request,winner,adminToken,community,bugRef;
async function post(user,extra={}){return ok(await api('/api/posts',{user,method:'POST',body:{category:'ride_offer',origin:'Cardiff',destination:'Bristol',journeyDate:date,journeyTime:'10:00',seats:1,...extra}}),201).post;}
async function requestRide(user,id,extra={}){return api('/api/ride-requests/quick',{user,method:'POST',body:{rideOfferPostId:id,...extra}});}
// Reset only our local database between runs by recreating it with the setup command.
await test('Carpool release: end-to-end API and persistence',async t=>{
 await t.test('health and security headers',async()=>{const r=await api('/api/health');ok(r);assert.equal(r.data.version,'5.9.0');assert.equal(r.data.database,'ok');assert.ok(r.headers.get('x-request-id'));assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);});
 await t.test('signup, duplicate protection, anonymous and authenticated access',async()=>{
  for(let i=0;i<7;i++){const d=ok(await api('/api/profile',{method:'POST',body:{name:`Release Test ${i}`,phone:`+44770090000${i}`,area:'Cardiff'}}),201);people.push({...d.profile,recoveryCode:d.recoveryCode});}
  ok(await api('/api/profile',{user:people[0]}));assert.equal((await api('/api/profile')).status,401);
  assert.equal((await api('/api/profile',{method:'POST',body:{name:'Duplicate',phone:people[0].phone,area:'Cardiff'}})).status,409);
  assert.equal((await api('/api/profile',{method:'POST',body:{name:'Bad',phone:'+123456789012345678',area:'Cardiff'}})).status,400);
 });
 await t.test('JSON body bounds, malformed JSON and cross-site actions are rejected',async()=>{
  assert.equal((await api('/api/profile',{method:'POST',body:{a:'x'.repeat(17000)}})).status,413);
  assert.equal((await api('/api/profile',{method:'POST',raw:'{',headers:{'content-type':'application/json'}})).status,400);
  assert.equal((await api('/api/profile',{method:'POST',body:{},headers:{origin:'https://evil.invalid'}})).status,403);
  assert.equal((await api('/api/profile',{method:'POST',raw:'name=test',headers:{'content-type':'application/x-www-form-urlencoded'}})).status,415);
 });
 await t.test('real date validation, offer creation, search and contact privacy',async()=>{
  assert.equal((await api('/api/posts',{user:people[0],method:'POST',body:{category:'ride_offer',origin:'Cardiff',destination:'Bristol',journeyDate:'2027-02-30',journeyTime:'10:00'}})).status,400);
  offer=await post(people[0]);assert.ok(offer.id);
  const search=ok(await api(`/api/rides/search?from=Cardiff&to=Bristol&date=${date}&time=10:00&seats=1`));assert.ok(search.rides.some(r=>r.id===offer.id));
  assert.ok(!JSON.stringify(search).includes(people[0].phone));
  assert.equal((await api(`/api/posts/${offer.id}`,{user:people[1],method:'PATCH',body:{status:'closed'}})).status,404);
 });
 await t.test('requests cannot book own ride and contact stays private before acceptance',async()=>{
  assert.equal((await requestRide(people[0],offer.id)).status,400);
  request=ok(await requestRide(people[4],offer.id),201);assert.ok(request.id);
  const repeated=ok(await requestRide(people[4],offer.id));assert.equal(repeated.id,request.id);
  const own=ok(await api('/api/ride-requests/mine',{user:people[4]}));assert.equal(own.requests.find(r=>r.id===request.id).contact_url,'');
  assert.equal((await api(`/api/ride-requests/${request.id}`,{user:people[5],method:'PATCH',body:{status:'accepted'}})).status,403);
 });
 await t.test('simultaneous acceptance never oversells the final seat',async()=>{
  const r2=ok(await requestRide(people[5],offer.id),201);
  const results=await Promise.all([request.id,r2.id].map(id=>api(`/api/ride-requests/${id}`,{user:people[0],method:'PATCH',body:{status:'accepted'}})));
  assert.equal(results.filter(x=>x.status===200).length,1,JSON.stringify(results.map(x=>x.data)));
  const bookings=sql("SELECT * FROM ride_requests WHERE ride_offer_post_id=? AND status='accepted'",[offer.id]);assert.equal(bookings.length,1);winner=bookings[0];
  assert.equal(sql("SELECT status FROM posts WHERE id=?",[offer.id])[0].status,'closed');
  const rider=people.find(p=>p.id===winner.rider_id);const trips=ok(await api('/api/ride-requests/mine',{user:rider}));assert.match(trips.requests.find(r=>r.id===winner.id).contact_url,/^https:\/\/wa.me\//);
  const notifications=ok(await api('/api/notifications',{user:rider}));assert.ok(notifications.unread>0);
 });
 await t.test('accepted cancellation restores seats, pending withdrawal and idempotent cancellation',async()=>{
  const rider=people.find(p=>p.id===winner.rider_id);
  ok(await api(`/api/ride-requests/${winner.id}`,{user:rider,method:'PATCH',body:{status:'cancelled'}}));
  ok(await api(`/api/ride-requests/${winner.id}`,{user:rider,method:'PATCH',body:{status:'cancelled'}}));
  assert.equal(sql('SELECT status FROM posts WHERE id=?',[offer.id])[0].status,'active');
  const next=ok(await requestRide(people[6],offer.id),201);
  ok(await api(`/api/ride-requests/${next.id}`,{user:people[6],method:'PATCH',body:{status:'cancelled'}}));
  assert.equal(sql('SELECT status FROM ride_requests WHERE id=?',[next.id])[0].status,'cancelled');
 });
 await t.test('concurrent pending requests and reopening cannot bypass three-request limit',async()=>{
  const offers=[];for(let i=0;i<4;i++)offers.push(await post(people[i],{journeyDate:tomorrow}));
  const results=await Promise.all(offers.map(o=>requestRide(people[6],o.id)));
  assert.equal(results.filter(r=>r.status===201).length,3,JSON.stringify(results.map(x=>x.data)));
  assert.equal(results.filter(r=>r.status===409).length,1);
  const pending=sql("SELECT * FROM ride_requests WHERE rider_id=? AND status='pending'",[people[6].id]);assert.equal(pending.length,3);
  ok(await api(`/api/ride-requests/${pending[0].id}`,{user:people[6],method:'PATCH',body:{status:'cancelled'}}));
  const rejected=offers[results.findIndex(r=>r.status===409)];ok(await requestRide(people[6],rejected.id),201);
  assert.equal((await requestRide(people[6],pending[0].ride_offer_post_id)).status,409);
 });
 await t.test('community, comments, reactions, private support and reports',async()=>{
  community=await post(people[0],{category:'community',title:'Release test community post',body:'Synthetic local test only.'});
  ok(await api(`/api/posts/${community.id}/comments`,{user:people[4],method:'POST',body:{body:'Helpful local test comment'}}),201);
  ok(await api(`/api/posts/${community.id}/reaction`,{user:people[4],method:'POST'}));
  const comments=ok(await api(`/api/posts/${community.id}/comments`));assert.ok(comments.comments.length);
  const ticket=ok(await api('/api/support/tickets',{user:people[4],method:'POST',body:{category:'technical',subject:'Local test',message:'Testing the support flow locally.'}}),201);
  const tickets=ok(await api('/api/support/tickets',{user:people[4]}));const id=ticket.id||tickets.tickets[0].id;
  assert.equal((await api(`/api/support/tickets/${id}/messages`,{user:people[5]})).status,404);
  ok(await api(`/api/support/tickets/${id}/messages`,{user:people[4],method:'POST',body:{message:'Local follow-up'}}),201);
  ok(await api('/api/report',{user:people[4],method:'POST',body:{postId:community.id,reason:'Local report test only'}}));
 });
 await t.test('guest bug report is idempotent and credentials are redacted',async()=>{
  const payload={id:randomUUID(),source:'manual',route:'/?post=secret&token=private',description:'The test button failed. CN-ABCDE-ABCDE-ABCDE-ABCDE password=hunter2'};
  const response=ok(await api('/api/diagnostics',{method:'POST',body:payload}),201);bugRef=response.reference;
  ok(await api('/api/diagnostics',{method:'POST',body:payload}),201);
  const rows=sql('SELECT * FROM diagnostic_issues WHERE id=?',[bugRef]);assert.equal(rows.length,1);assert.equal(rows[0].occurrences,1);assert.equal(rows[0].route,'/');assert.ok(!rows[0].detail.includes('hunter2'));assert.ok(!rows[0].detail.includes('ABCDE'));
  assert.equal((await api('/api/admin/issues',{user:people[4]})).status,403);
  assert.equal((await api('/api/admin/issues')).status,401);
 });
 await t.test('automatic errors aggregate without submitted fields or query parameters',async()=>{
  const payload={source:'browser',code:'JS_ERROR',route:'/api/posts/private-person?phone=123',frames:'app.js:10:2\nsecret-token',message:'private text',phone:'123'};
  const a=ok(await api('/api/diagnostics',{method:'POST',body:payload}),201);ok(await api('/api/diagnostics',{method:'POST',body:payload}),201);
  const row=sql('SELECT * FROM diagnostic_issues WHERE id=?',[a.reference])[0];assert.equal(row.occurrences,2);assert.equal(row.route,'/api/posts/:id');assert.equal(row.detail,'app.js:10:2');
 });
 await t.test('protected admin issue inbox, resolution, reopen on recurrence and audit record',async()=>{
  sql("INSERT INTO user_roles(user_id,role) VALUES(?,'superadmin')",[people[0].id]);sql('INSERT INTO admin_credentials(user_id,code_hash) VALUES(?,?)',[people[0].id,hash('LOCAL-TEST-CODE')]);
  const admin=ok(await api('/api/admin/unlock',{user:people[0],method:'POST',body:{code:'LOCAL-TEST-CODE'}}));adminToken=admin.adminToken;
  const headers={'x-admin-token':adminToken};const inbox=ok(await api('/api/admin/issues',{user:people[0],headers}));assert.ok(inbox.issues.some(i=>i.id===bugRef));
  const issue=inbox.issues.find(i=>i.source==='browser');ok(await api(`/api/admin/issues/${issue.id}`,{user:people[0],headers,method:'PATCH',body:{status:'resolved',resolution:'Verified local test fix'}}));
  ok(await api('/api/diagnostics',{method:'POST',body:{source:'browser',code:'JS_ERROR',route:'/api/posts/another-id',frames:'app.js:10:2'}}),201);
  assert.equal(sql('SELECT status FROM diagnostic_issues WHERE id=?',[issue.id])[0].status,'open');assert.ok(sql("SELECT id FROM admin_audit_log WHERE action='diagnostic_status'").length);
 });
 await t.test('automatic server failure capture with correlation reference',async()=>{
  sql("CREATE TRIGGER test_failure BEFORE INSERT ON comments BEGIN SELECT RAISE(ABORT,'synthetic private input'); END");
  try{const r=await api(`/api/posts/${community.id}/comments`,{user:people[4],method:'POST',body:{body:'Synthetic failing comment'}});assert.equal(r.status,500);assert.ok(r.data.reference);assert.ok(!JSON.stringify(r.data).includes('synthetic private'));}
  finally{sql('DROP TRIGGER test_failure');}
  for(let i=0;i<20&&!sql("SELECT id FROM diagnostic_issues WHERE source='server'").length;i++)await new Promise(r=>setTimeout(r,100));
  assert.ok(sql("SELECT id FROM diagnostic_issues WHERE source='server'").length);
 });
 await t.test('notification persistence failures are recorded without undoing a saved action',async()=>{
  sql("CREATE TRIGGER test_notify_failure BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT,'synthetic notification failure'); END");
  try{ok(await api(`/api/posts/${community.id}/comments`,{user:people[4],method:'POST',body:{body:'Saved despite synthetic notification failure'}}),201);}
  finally{sql('DROP TRIGGER test_notify_failure');}
  assert.ok(sql("SELECT id FROM diagnostic_issues WHERE source='server' AND route='/api/notifications'").length);
 });
 await t.test('untrusted push destinations are rejected',async()=>{
  for(const endpoint of ['https://127.0.0.1/internal','https://example.com/push','https://fcm.googleapis.com.evil.invalid/push','http://fcm.googleapis.com/push'])assert.equal((await api('/api/push/subscribe',{user:people[4],method:'POST',body:{endpoint}})).status,400);
 });
 await t.test('completed journeys cannot be cancelled and ratings are sealed and immutable',async()=>{
  const p=await post(people[1],{journeyDate:date,journeyTime:'18:00'});
  const booking=ok(await requestRide(people[4],p.id),201);ok(await api(`/api/ride-requests/${booking.id}`,{user:people[1],method:'PATCH',body:{status:'accepted'}}));
  sql("UPDATE posts SET journey_date=date('now','-1 day') WHERE id=?",[p.id]);
  sql("INSERT OR IGNORE INTO integrity_head(singleton) VALUES(1)");
  assert.equal((await api(`/api/ride-requests/${booking.id}`,{user:people[4],method:'PATCH',body:{status:'cancelled'}})).status,409);
  assert.equal((await api(`/api/ride-requests/${booking.id}/rating`,{user:people[4],method:'POST',body:{score:6}})).status,400);
  ok(await api(`/api/ride-requests/${booking.id}/rating`,{user:people[4],method:'POST',body:{score:5,comment:'Local test rating'}}));
  assert.equal((await api(`/api/ride-requests/${booking.id}/rating`,{user:people[4],method:'POST',body:{score:4}})).status,409);
  const rating=sql('SELECT id FROM ratings WHERE ride_request_id=?',[booking.id])[0];const proof=ok(await api(`/api/integrity/ratings/${rating.id}`));assert.equal(proof.integrity.signatureValid,true);
 });
 await t.test('overlapping journeys across midnight are rejected atomically',async()=>{
  const a=new Date(Date.now()+6*86400000).toISOString().slice(0,10),b=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const first=await post(people[1],{journeyDate:a,journeyTime:'23:30'}),second=await post(people[2],{journeyDate:b,journeyTime:'00:30'});
  const one=ok(await requestRide(people[4],first.id),201),two=ok(await requestRide(people[4],second.id),201);
  ok(await api(`/api/ride-requests/${one.id}`,{user:people[1],method:'PATCH',body:{status:'accepted'}}));
  assert.equal((await api(`/api/ride-requests/${two.id}`,{user:people[2],method:'PATCH',body:{status:'accepted'}})).status,409);
 });
 await t.test('scheduled cleanup completes past confirmed journeys',async()=>{
  const response=await fetch(base+'/cdn-cgi/local/scheduled');assert.equal(response.status,200);await response.text();
  assert.ok(sql("SELECT id FROM ride_requests WHERE status='completed'").length);
 });
 await t.test('recovery preserves identity, revokes old sessions and logout cannot resurrect them',async()=>{
  const old=people[5];const recovered=ok(await api('/api/profile/recover',{method:'POST',body:{phone:old.phone,recoveryCode:old.recoveryCode}}));assert.equal(recovered.profile.id,old.id);
  assert.equal((await api('/api/profile',{user:old})).status,401);ok(await api('/api/profile',{user:recovered.profile}));
  ok(await api('/api/profile/logout',{user:recovered.profile,method:'POST'}));assert.equal((await api('/api/profile',{user:recovered.profile})).status,401);
 });
});
