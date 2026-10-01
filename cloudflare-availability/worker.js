const HOSTS=['carpoolnetwork.co.uk','www.carpoolnetwork.co.uk'];
const POLICY={ 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','strict-transport-security':'max-age=31536000','x-content-type-options':'nosniff' };
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function probe(url,kind,fetcher=fetch){
  const started=Date.now();
  try{
    const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'user-agent':'CarpoolAvailability/1.0','cache-control':'no-cache'}});
    let problem=null,maintenance;
    if(kind==='redirect'){if(![301,308].includes(r.status)||r.headers.get('location')!==url.replace('http:','https:'))problem='HTTPS redirect failed';}
    else if(kind==='private'){if(r.status!==401)problem='Private endpoint access check failed';}
    else if(kind==='missing'){if(r.status!==404)problem='Missing-page response failed';}
    else if(r.status!==200)problem='Service unavailable';
    else if(kind==='health'){
      const data=await r.json();maintenance=data.maintenance?.status||'unknown';
      if(!data.ok||data.database!=='ok')problem='Database check failed';
      else if(['failed','stale','unknown'].includes(maintenance))problem='Daily maintenance needs attention';
    }else if(kind==='home'&&!r.headers.get('strict-transport-security'))problem='HTTPS policy missing';
    // Never retain page bodies, response headers or member data.
    if(r.body&&!r.bodyUsed)await r.body.cancel();
    return {url,kind,ok:!problem,status:r.status,durationMs:Date.now()-started,...(problem?{problem}:{}),...(maintenance?{maintenance}:{})};
  }catch{return {url,kind,ok:false,problem:'Connection failed or timed out',durationMs:Date.now()-started};}
}
export async function runChecks(env,fetcher=fetch){
  const checks=[];
  for(const host of HOSTS){
    for(const [path,kind] of [['/','home'],['/api/health','health'],['/help','page'],['/api/admin/issues','private'],['/availability-monitor-missing-page','missing']]){
      let result=await probe('https://'+host+path,kind,fetcher);if(!result.ok)result=await probe('https://'+host+path,kind,fetcher);checks.push(result);
    }
    checks.push(await probe('http://'+host+'/','redirect',fetcher));
  }
  const report={checkedAt:new Date().toISOString(),ok:checks.every(c=>c.ok),checks};
  await env.STATE.put('latest',JSON.stringify(report));
  // Unique keys avoid read-modify-write races and retain a bounded 7-day history.
  await env.STATE.put('check:'+report.checkedAt,JSON.stringify(report),{expirationTtl:7*86400});
  if(!report.ok)await env.STATE.put('last-failure',JSON.stringify(report),{expirationTtl:30*86400});
  console.log(JSON.stringify({event:'availability_check',ok:report.ok,failed:checks.filter(c=>!c.ok).map(c=>({url:c.url,problem:c.problem}))}));
  return report;
}
export function serviceState(report,now=Date.now()){
  if(!report)return 'Waiting for the first check';
  const time=Date.parse(report.checkedAt);
  if(!Number.isFinite(time)||now-time>40*60000)return 'Monitoring is overdue';
  return report.ok?'Checks passing':'Needs attention';
}
export default {
  async scheduled(controller,env){await runChecks(env);},
  async fetch(request,env){
    const url=new URL(request.url);if(url.protocol==='http:'){url.protocol='https:';return Response.redirect(url.href,308);}
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...POLICY,allow:'GET, HEAD'}});
    if(!['/','/status.json'].includes(url.pathname))return new Response('Not found',{status:404,headers:POLICY});
    const [report,failure]=await Promise.all([env.STATE.get('latest','json'),env.STATE.get('last-failure','json')]);
    const state=serviceState(report);
    if(url.pathname==='/status.json')return Response.json({...report,state,ok:state==='Checks passing',lastFailureAt:failure?.checkedAt||null},{headers:POLICY});
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Service checks · Carpool Network</title><meta name="robots" content="noindex"><style>body{margin:0;background:#f6f8fb;color:#23334b;font:16px/1.6 system-ui}main{max-width:940px;margin:40px auto;padding:28px}h1{font-size:38px;line-height:1.2;color:#1d2c55}.card{padding:24px;background:white;border:1px solid #dce4ed;border-radius:18px;margin:20px 0}h2{color:${state==='Checks passing'?'#166534':'#a51f2b'}}a{color:#a51f2b}table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:10px;text-align:left;border-bottom:1px solid #e2e8f0;overflow-wrap:anywhere}.table{overflow:auto}small{color:#526177}@media(max-width:600px){main{margin:0;padding:20px}h1{font-size:30px}.card{padding:18px}}</style></head><body><main><a href="https://carpoolnetwork.co.uk/">← Carpool Network</a><h1>Service checks</h1><section class="card"><h2>${esc(state)}</h2><p>Last completed check: ${esc(report?.checkedAt||'not yet recorded')} (UTC)</p><p>Checks run every 15 minutes. Results describe the tested pages and database response; they do not confirm an individual booking or every app feature.</p>${failure?`<p>Last recorded failure: ${esc(failure.checkedAt)} (UTC)</p>`:''}</section><section class="card table"><h2>Latest results</h2><table><thead><tr><th scope="col">Check</th><th scope="col">Result</th><th scope="col">Response</th></tr></thead><tbody>${(report?.checks||[]).map(c=>`<tr><td>${esc(c.url)}<br><small>${esc(c.kind)}</small></td><td>${c.ok?'Pass':esc(c.problem)}${c.maintenance?`<br><small>Maintenance: ${esc(c.maintenance)}</small>`:''}</td><td>${esc(c.status??'unavailable')} · ${esc(c.durationMs)} ms</td></tr>`).join('')}</tbody></table></section><p><a href="https://carpoolnetwork.co.uk/help">Get help or report a problem</a> · <a href="/status.json">Status data</a></p><small>This monitor and the app both use Cloudflare. A wider Cloudflare outage can affect both. Check receipts are kept for seven days; the most recent failure is retained for 30 days. This page is not an emergency service.</small></main></body></html>`,{headers:{...POLICY,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
  }
};
