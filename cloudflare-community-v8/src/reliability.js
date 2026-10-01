export const RELEASE = '8.0.1-feedback';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Never store query strings, route identifiers, credentials or submitted fields in automatic reports.
export function safeRoute(input='') {
  let path; try {path=new URL(String(input),'https://carpool.invalid').pathname;} catch{return '/unknown';}
  if(/^\/views\/(home|find|trips|account|me|inbox|chat|community|businesses|post|alerts|support|admin|issues)$/.test(path)) return path;
  if(!path.startsWith('/api/')) return ['/','/app.js','/diagnostics.js','/sw.js','/styles.css','/privacy.html','/safety.html','/welcome.html','/attribution.html','/release.css','/social.css','/focus.css','/polish.css','/diagnostics.css','/social.js','/email-ui.js','/icon.svg','/community-cover-hd.webp','/scheduled'].includes(path)?path:'/page';
  const known=new Set('api auth email start verify capabilities social rooms communities direct block security passkeys sessions health stats rides search profile logout logout-others recovery-key recover session adopt feed posts cancel-ride matches options comments reactions ride-request-options ride-requests quick mine rating users support tickets messages report admin status unlock lock dashboard moderate remove integrity notifications read push public-key subscribe unsubscribe live diagnostics issues member-details contact-details photos vehicles trips commutes config'.split(' '));
  return path.split('/').map(s=>!s||known.has(s)?s:':id').join('/').slice(0,160);
}
export function safeFrames(error) {return String(error?.stack||'').split('\n').slice(1,7).map(s=>s.match(/(?:index|email-auth|reliability|app|social|email-ui|diagnostics|sw)\.js:\d+:\d+/)?.[0]).filter(Boolean).join('\n');}
export function redactManual(value,limit=1800) {return String(value||'').trim().slice(0,limit).replace(/CN-[A-Z0-9-]{10,}/gi,'[recovery code removed]').replace(/Bearer\s+\S+/gi,'[credential removed]').replace(/[0-9a-f]{8}-[0-9a-f-]{27}[0-9a-f]{8}-[0-9a-f-]{27}/gi,'[credential removed]').replace(/\b(?:token|password|code|secret)\s*[:=]\s*\S+/gi,'[credential removed]');}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function recordIssue(env,{source,code,route,detail='',reporter=null,id='',release=RELEASE}) {
  route=safeRoute(route);code=String(code).replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,80)||'UNKNOWN';
  const manual=source==='manual', fingerprint=manual?`manual:${id}`:await hash([source,code,route,release,detail].join('|')), issueId=manual?id:fingerprint.slice(0,32);
  if(manual) await env.DB.prepare(`INSERT INTO diagnostic_issues(id,fingerprint,source,code,route,release,detail,reporter_id) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(fingerprint) DO NOTHING`).bind(issueId,fingerprint,source,code,route,release,redactManual(detail,2200),reporter).run();
  else await env.DB.prepare(`INSERT INTO diagnostic_issues(id,fingerprint,source,code,route,release,detail) VALUES(?,?,?,?,?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET occurrences=occurrences+1,last_seen=CURRENT_TIMESTAMP,resolved_at=CASE WHEN diagnostic_issues.status='resolved' THEN NULL ELSE diagnostic_issues.resolved_at END,status=CASE WHEN diagnostic_issues.status='resolved' THEN 'open' ELSE diagnostic_issues.status END`).bind(issueId,fingerprint,source,code,route,release,String(detail).slice(0,500)).run();
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
    if(manual&&(!UUID.test(data.id||'')||typeof data.description!=='string'||data.description.trim().length<10||data.description.length>1800))return fail('Please write between 10 and 1,800 characters.');
    const kind=data.kind||'bug';
    if(manual&&!['bug','feedback','idea'].includes(kind))return fail('Choose bug, feedback or improvement.');
    if(data.website)return fail('The report could not be accepted.',400);
    const codes=new Set(['JS_ERROR','UNHANDLED_REJECTION','RESOURCE_ERROR','API_5XX','API_NETWORK','API_TIMEOUT','API_INVALID_RESPONSE','SERVICE_WORKER_ERROR','BOOT_ERROR']);
    if(!manual&&!codes.has(data.code))return fail('Unknown diagnostic type.');
    const user=manual?await currentUser(request,env,false):null;
    const context=manual&&kind==='bug'&&codes.has(data.context?.code)?`Detected error: ${data.context.code}\nAffected service: ${safeRoute(data.context.route)}\n\n`:'';
    const frames=String(data.frames||'').split('\n').filter(s=>/^(app|social|email-ui|diagnostics|sw|passkeys|locations|member-details|profile-photo|contact-details|live-trip|commutes|town-map)\.js:\d+:\d+$/.test(s)).slice(0,5).join('\n');
    const detail=manual?context+redactManual(data.description):(data.page?`Page: ${safeRoute(data.page)}\n`:'')+frames;
    const clientRelease=[RELEASE,'8.0.0'].includes(data.release)?data.release:RELEASE;
    const id=await recordIssue(env,{source:manual?'manual':'browser',code:manual?({bug:'USER_REPORT',feedback:'USER_FEEDBACK',idea:'USER_IDEA'}[kind]):data.code,route:data.route,detail,reporter:user?.id||null,id:data.id,release:clientRelease});
    return json({ok:true,reference:id},201);
  }
  if(path==='/api/admin/issues'&&request.method==='GET'){
    const auth=await requireAdmin(request,env);if(auth.error)return auth.error;
    const status=url.searchParams.get('status')||'open';if(!['open','investigating','resolved','ignored','all'].includes(status))return fail('Invalid issue filter.');
    const kind=url.searchParams.get('kind')||'all',offset=Number(url.searchParams.get('offset')||0),limit=50;
    if(!['all','bug','feedback','idea','automatic'].includes(kind)||!Number.isSafeInteger(offset)||offset<0||offset>100000)return fail('Invalid report filter.');
    const where=`(?1='all' OR (?1='automatic' AND source!='manual') OR (?1='bug' AND code='USER_REPORT') OR (?1='feedback' AND code='USER_FEEDBACK') OR (?1='idea' AND code='USER_IDEA'))`;
    const rows=await env.DB.prepare(`SELECT * FROM diagnostic_issues WHERE ${where} AND (?2='all' OR status=?2) ORDER BY last_seen DESC,id DESC LIMIT ?3 OFFSET ?4`).bind(kind,status,limit,offset).all();
    const counts=await env.DB.prepare(`SELECT status,COUNT(*) count FROM diagnostic_issues WHERE ${where} GROUP BY status`).bind(kind).all();
    const total=(counts.results||[]).filter(c=>status==='all'||c.status===status).reduce((n,c)=>n+Number(c.count),0);
    return json({ok:true,issues:rows.results||[],counts:counts.results||[],total,offset,limit});
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
