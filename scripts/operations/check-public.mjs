// Anonymous, read-only checks. Never submit a booking, report, email or account change.
import {writeFile} from 'node:fs/promises';
import {connect} from 'node:tls';
const allowed = new Set(['https://carpoolnetwork.co.uk','https://www.carpoolnetwork.co.uk','http://127.0.0.1:8788','https://carpool-network-release-check.balashankarbollineni4.workers.dev']);
const requested = process.argv.find(x=>x.startsWith('--base='))?.slice(7);
if(requested && !allowed.has(requested))throw Error('Use a configured Carpool environment.');
const bases=requested?[requested]:['https://carpoolnetwork.co.uk','https://www.carpoolnetwork.co.uk'];
const results=[];
async function checkCertificate(base){
  const host=new URL(base).hostname;
  const result=await new Promise(resolve=>{
    const socket=connect({host,port:443,servername:host,rejectUnauthorized:true});
    const finish=result=>{socket.destroy();resolve(result);};
    socket.setTimeout(12000,()=>finish({ok:false,problem:'TLS check timed out'}));
    socket.once('error',()=>finish({ok:false,problem:'TLS certificate or connection failed'}));
    socket.once('secureConnect',()=>{
      const expires=Date.parse(socket.getPeerCertificate().valid_to);
      const daysRemaining=Math.floor((expires-Date.now())/86400000);
      finish({ok:Number.isFinite(daysRemaining)&&daysRemaining>=14,daysRemaining,...(!(daysRemaining>=14)?{problem:'Certificate expires in fewer than 14 days'}:{})});
    });
  });
  results.push({url:base,check:'TLS certificate',...result});
}
async function check(base,path,validate,{redirect='follow',method='GET'}={}){
  let result;
  for(let attempt=1;attempt<=2;attempt++){
    const started=Date.now();
    try{
      const response=await fetch(base+path,{method,redirect,signal:AbortSignal.timeout(12000),headers:{'user-agent':'CarpoolLaunchMonitor/1.0','cache-control':'no-cache'}});
      const text=await response.text();
      const problem=validate(response,text);
      result={url:base+path,ok:!problem,status:response.status,durationMs:Date.now()-started,attempt,...(problem?{problem}: {})};
    }catch{result={url:base+path,ok:false,problem:'Request failed or timed out',durationMs:Date.now()-started,attempt};}
    if(result.ok)break;
    if(attempt===1)await new Promise(resolve=>setTimeout(resolve,1500));
  }
  results.push(result);
}
const status=expected=>r=>r.status===expected?null:`Expected HTTP ${expected}`;
for(const base of bases){
  const production=base.includes('carpoolnetwork.co.uk');
  if(production)await checkCertificate(base);
  await check(base,'/',(r,t)=>status(200)(r)||(!t.includes('property="og:image"')?'Share metadata missing':null)||(!r.headers.get('strict-transport-security')?'HTTPS policy missing':null));
  for(const path of ['/welcome','/help','/privacy','/safety'])await check(base,path,status(200));
  await check(base,'/robots.txt',(r,t)=>status(200)(r)||(!r.headers.get('content-type')?.includes('text/plain')||!t.includes('sitemap.xml')?'Invalid robots file':null));
  await check(base,'/sitemap.xml',(r,t)=>status(200)(r)||(!r.headers.get('content-type')?.includes('xml')||!t.includes('<urlset')?'Invalid sitemap':null));
  await check(base,'/api/health',(r,t)=>{
    if(r.status!==200)return 'Health endpoint unavailable';
    let health;try{health=JSON.parse(t);}catch{return 'Health endpoint is not JSON';}
    if(!health.ok||health.database!=='ok')return 'Database health failed';
    if(!health.maintenance?.status)return 'Maintenance status missing';
    if(['failed','stale'].includes(health.maintenance.status))return 'Daily maintenance needs attention';
    return null;
  });
  await check(base,'/api/admin/issues',r=>status(401)(r)||(!r.headers.get('cache-control')?.includes('no-store')?'Private API is cacheable':null));
  await check(base,'/?view=chat',r=>status(200)(r)||(!r.headers.get('x-robots-tag')?.includes('noindex')?'Private shell is indexable':null));
  await check(base,'/launch-monitor-missing-page',status(404));
  if(production)await check(base.replace('https:','http:'),'/?view=home',(r)=>![301,308].includes(r.status)||r.headers.get('location')!==base+'/?view=home'?'HTTP must redirect to HTTPS':null,{redirect:'manual'});
}
const report={checkedAt:new Date().toISOString(),ok:results.every(r=>r.ok),checks:results};
const output=process.env.CARPOOL_MONITOR_OUTPUT;
if(output)await writeFile(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;
