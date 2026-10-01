import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{probe,runChecks,serviceState} from './worker.js';
const healthy=(url)=>new Response(url.includes('/api/health')?JSON.stringify({ok:true,database:'ok',maintenance:{status:'ok'}}):'',{status:url.startsWith('http:')?308:url.endsWith('/api/admin/issues')?401:url.includes('missing-page')?404:200,headers:{'strict-transport-security':'max-age=31536000',location:url.replace('http:','https:')}});
function store(){const entries=new Map();return {entries,async put(key,value,options){entries.set(key,{value,options});},async get(key,type){const v=entries.get(key)?.value;return v?type==='json'?JSON.parse(v):v:null;}};}
test('availability stores only safe results and expires historical receipts',async()=>{
 const STATE=store();const r=await runChecks({STATE},async url=>healthy(url));assert.equal(r.ok,true);assert.equal(r.checks.length,12);assert.equal(STATE.entries.get('check:'+r.checkedAt).options.expirationTtl,7*86400);assert.equal(STATE.entries.has('last-failure'),false);assert.equal(serviceState(r),'Checks passing');
 const status=await worker.fetch(new Request('https://status.invalid/status.json'),{STATE});assert.equal((await status.json()).ok,true);
});
test('failed checks retry, persist and distinguish stale health from success',async()=>{
 const STATE=store();let requests=0;const r=await runChecks({STATE},async url=>{requests++;return url.includes('/api/health')?Response.json({ok:true,database:'ok',maintenance:{status:'stale'}}):healthy(url);});assert.equal(r.ok,false);assert.equal(requests,14);assert.equal(STATE.entries.get('last-failure').options.expirationTtl,30*86400);assert.equal(serviceState(r),'Needs attention');
 const failed=await probe('https://carpoolnetwork.co.uk/api/health','health',async()=>{throw Error('private upstream body');});assert.equal(failed.problem,'Connection failed or timed out');assert.ok(!JSON.stringify(failed).includes('private upstream'));
});
test('status never reports stale or missing checks as healthy and cannot trigger writes',async()=>{
 const STATE=store();assert.equal(serviceState(null),'Waiting for the first check');await STATE.put('latest',JSON.stringify({checkedAt:'2020-01-01',ok:true,checks:[]}));const r=await worker.fetch(new Request('https://status.invalid/status.json'),{STATE});const d=await r.json();assert.equal(d.ok,false);assert.equal(d.state,'Monitoring is overdue');assert.equal((await worker.fetch(new Request('https://status.invalid/',{method:'POST'}),{STATE})).status,405);assert.equal((await worker.fetch(new Request('https://status.invalid/missing'),{STATE})).status,404);
});
