export const RELEASE = '5.9.1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Never store query strings, route identifiers, credentials or submitted fields in automatic reports.
export function safeRoute(input='') {
  let path; try {path=new URL(String(input),'https://carpool.invalid').pathname;} catch{return '/unknown';}
  if(!path.startsWith('/api/')) return ['/','/app.js','/diagnostics.js','/sw.js','/styles.css','/privacy.html','/safety.html','/scheduled'].includes(path)?path:'/page';
  const known=new Set('api health stats rides search profile logout logout-others recovery-key recover session adopt feed posts cancel-ride matches options comments reactions ride-request-options ride-requests quick mine rating users support tickets messages report admin status unlock lock dashboard moderate remove integrity notifications read push public-key subscribe unsubscribe live diagnostics issues'.split(' '));
  return path.split('/').map(s=>!s||known.has(s)?s:':id').join('/').slice(0,160);
}
export function safeFrames(error) {return String(error?.stack||'').split('\n').slice(1,7).map(s=>s.match(/(?:index|reliability|app|diagnostics|sw)\.js:\d+:\d+/)?.[0]).filter(Boolean).join('\n');}
export function redactManual(value) {return String(value||'').trim().slice(0,1800).replace(/CN-[A-Z0-9-]{10,}/gi,'[recovery code removed]').replace(/Bearer\s+\S+/gi,'[credential removed]').replace(/[0-9a-f]{8}-[0-9a-f-]{27}[0-9a-f]{8}-[0-9a-f-]{27}/gi,'[credential removed]').replace(/\b(?:token|password|code|secret)\s*[:=]\s*\S+/gi,'[credential removed]');}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function recordIssue(env,{source,code,route,detail='',reporter=null,id='',release=RELEASE}) {
  route=safeRoute(route);code=String(code).replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,80)||'UNKNOWN';
  const manual=source==='manual', fingerprint=manual?`manual:${id}`:await hash([source,code,route,release,detail].join('|')), issueId=manual?id:fingerprint.slice(0,32);
  if(manual) await env.DB.prepare(`INSERT INTO diagnostic_issues(id,fingerprint,source,code,route,release,detail,reporter_id) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(fingerprint) DO NOTHING`).bind(issueId,fingerprint,source,code,route,release,redactManual(detail),reporter).run();
  else await env.DB.prepare(`INSERT INTO diagnostic_issues(id,fingerprint,source,code,route,release,detail) VALUES(?,?,?,?,?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET occurrences=occurrences+1,last_seen=CURRENT_TIMESTAMP,status=CASE WHEN diagnostic_issues.status='resolved' THEN 'open' ELSE diagnostic_issues.status END`).bind(issueId,fingerprint,source,code,route,release,String(detail).slice(0,500)).run();
  return issueId;
}
export async function captureFailure(env,error,route,requestId,source='server') {
  const code=['TypeError','SyntaxError','RangeError','AbortError'].includes(error?.name)?error.name:'SERVER_ERROR';
  console.error(JSON.stringify({event:'application_failure',code,route:safeRoute(route),requestId,release:RELEASE,frames:safeFrames(error)}));
  try {await recordIssue(env,{source,code,route,detail:safeFrames(error)});} catch{console.error(JSON.stringify({event:'diagnostic_storage_failed',requestId,release:RELEASE}));}
}
export async function guardRequest(request,reply) {
  const mutation=!['GET','HEAD','OPTIONS'].includes(request.method),ws=request.headers.get('upgrade')?.toLowerCase()==='websocket',origin=request.headers.get('origin');
  if((mutation||ws)&&((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')) return reply('Open this action from Carpool Network itself.',403);
  if(!mutation||!request.body)return request;
  if(Number(request.headers.get('content-length'))>16384)return reply('This request is too large.',413);
  const reader=request.body.getReader(),chunks=[];let total=0;
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>16384){await reader.cancel();return reply('This request is too large.',413);}chunks.push(value);}
  if(total === 0) return new Request(request,{body:null});
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return reply('Send this request as JSON.',415);
  const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{const parsed=JSON.parse(new TextDecoder().decode(bytes));if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();}catch{return reply('The request could not be read. Please try again.',400);}
  return new Request(request,{body:bytes});
}
export function validPushEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
export async function diagnosticRoutes(request,env,{json,fail,rateLimitOrFail,currentUser,requireAdmin,adminAudit}) {
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/diagnostics'&&request.method==='POST'){
    const data=await request.json(),manual=data.source==='manual';
    const limited=await rateLimitOrFail(request,env,manual?'bug-report':'browser-diagnostic',manual?6:30,3600);if(limited)return limited;
    if(manual&&(!UUID.test(data.id||'')||String(data.description||'').trim().length<10))return fail('Describe the problem in at least 10 characters.');
    if(data.website)return fail('The report could not be accepted.',400);
    const codes=new Set(['JS_ERROR','UNHANDLED_REJECTION','RESOURCE_ERROR','API_5XX','API_NETWORK','API_TIMEOUT','API_INVALID_RESPONSE','SERVICE_WORKER_ERROR','BOOT_ERROR']);
    if(!manual&&!codes.has(data.code))return fail('Unknown diagnostic type.');
    const user=manual?await currentUser(request,env,false):null;
    const detail=manual?data.description:String(data.frames||'').split('\n').filter(s=>/^(app|diagnostics|sw)\.js:\d+:\d+$/.test(s)).slice(0,5).join('\n');
    const id=await recordIssue(env,{source:manual?'manual':'browser',code:manual?'USER_REPORT':data.code,route:data.route,detail,reporter:user?.id||null,id:data.id});
    return json({ok:true,reference:id},201);
  }
  if(path==='/api/admin/issues'&&request.method==='GET'){
    const auth=await requireAdmin(request,env);if(auth.error)return auth.error;
    const status=url.searchParams.get('status')||'open';if(!['open','investigating','resolved','ignored','all'].includes(status))return fail('Invalid issue filter.');
    const rows=await env.DB.prepare(`SELECT * FROM diagnostic_issues WHERE (?='all' OR status=?) ORDER BY last_seen DESC LIMIT 100`).bind(status,status).all();
    const counts=await env.DB.prepare('SELECT status,COUNT(*) count FROM diagnostic_issues GROUP BY status').all();
    return json({ok:true,issues:rows.results||[],counts:counts.results||[]});
  }
  const issue=path.match(/^\/api\/admin\/issues\/([a-f0-9-]+)$/);
  if(issue&&request.method==='PATCH'){
    const auth=await requireAdmin(request,env);if(auth.error)return auth.error;
    const data=await request.json();if(!['open','investigating','resolved','ignored'].includes(data.status))return fail('Invalid issue status.');
    const resolution=redactManual(data.resolution).slice(0,600);if(data.status==='resolved'&&resolution.length<5)return fail('Add a short resolution note.');
    const result=await env.DB.prepare(`UPDATE diagnostic_issues SET status=?,resolution=?,resolved_at=CASE WHEN ?='resolved' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?`).bind(data.status,resolution,data.status,issue[1]).run();
    if(!result.meta.changes)return fail('Issue not found.',404);
    await adminAudit(env,auth.user.id,'diagnostic_status','issue',issue[1],'',{status:data.status});return json({ok:true});
  }
  return null;
}
