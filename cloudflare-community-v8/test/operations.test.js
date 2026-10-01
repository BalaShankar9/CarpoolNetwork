import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceStatus, httpsRedirect, pageIndexPolicy} from '../src/operations.js';
const now = Date.parse('2026-10-03T12:00:00Z');
test('maintenance failures, missed schedules and first-run grace are distinguishable',()=>{
  assert.equal(maintenanceStatus({status:'ok',finishedAt:'2026-10-03T03:18:00Z'},null,now).status,'ok');
  assert.equal(maintenanceStatus({status:'failed',finishedAt:'2026-10-03T03:18:00Z'},null,now).status,'failed');
  assert.equal(maintenanceStatus({status:'ok',finishedAt:'2026-10-01T03:18:00Z'},null,now).status,'stale');
  assert.equal(maintenanceStatus(null,'2026-10-03T00:00:00Z',now).status,'awaiting_first_run');
  assert.equal(maintenanceStatus(null,'2026-10-01T00:00:00Z',now).status,'stale');
  assert.equal(maintenanceStatus({status:'ok',finishedAt:'invalid'},'2026-10-01T00:00:00Z',now).status,'stale');
  assert.equal(maintenanceStatus({status:'ok',finishedAt:'2027-01-01'},'2026-10-01T00:00:00Z',now).status,'stale');
});
test('HTTPS redirect preserves host, route and query without affecting local development',()=>{
  const response=httpsRedirect(new Request('http://www.carpoolnetwork.co.uk/?view=chat'),{APP_ENV:'production'});
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://www.carpoolnetwork.co.uk/?view=chat');
  assert.equal(httpsRedirect(new Request('https://carpoolnetwork.co.uk/'),{APP_ENV:'production'}),null);
  assert.equal(httpsRedirect(new Request('http://127.0.0.1:8788/'),{APP_ENV:'local'}),null);
});
test('indexing excludes private shells, previews, API aliases and missing pages',()=>{
  const policy=(url,env='production',status=200)=>pageIndexPolicy(new Request(url),{APP_ENV:env},new Response('',{status})).headers.get('x-robots-tag');
  assert.equal(policy('https://carpoolnetwork.co.uk/'),null);
  assert.equal(policy('https://www.carpoolnetwork.co.uk/?view=home'),null);
  for(const url of ['https://carpoolnetwork.co.uk/?view=chat','https://carpoolnetwork.co.uk/?view=home&room=private','https://carpoolnetwork.co.uk/?view=find','https://carpool-network.example.workers.dev/'])assert.equal(policy(url),'noindex, nofollow');
  assert.equal(policy('https://carpoolnetwork.co.uk/','preview'),'noindex, nofollow');
  assert.equal(policy('https://carpoolnetwork.co.uk/missing','production',404),'noindex, nofollow');
});
test('public files and query navigation work while unknown routes return real 404s',async()=>{
  const get=(path,headers={})=>fetch('http://127.0.0.1:8788'+path,{headers,signal:AbortSignal.timeout(10000)});
  for(const path of ['/?view=home','/?view=chat','/help','/welcome','/privacy','/safety'])assert.equal((await get(path)).status,200,path);
  const robots=await get('/robots.txt');assert.match(robots.headers.get('content-type'),/text\/plain/);assert.match(await robots.text(),/Sitemap: https:\/\/carpoolnetwork.co.uk\/sitemap.xml/);
  const sitemap=await get('/sitemap.xml');assert.match(sitemap.headers.get('content-type'),/xml/);assert.match(await sitemap.text(),/<urlset/);
  for(const headers of [{},{'sec-fetch-mode':'navigate'}]){
    const missing=await get('/launch-audit-page-that-does-not-exist',headers);assert.equal(missing.status,404);assert.match(await missing.text(),/Report a broken link/);
    const privateApi=await get('/api/admin/issues',headers);assert.equal(privateApi.status,401);assert.equal(privateApi.headers.get('x-robots-tag'),'noindex, nofollow');
  }
  const home=await get('/');assert.match(home.headers.get('strict-transport-security'),/max-age=31536000/);assert.match(await home.text(),/property="og:image"/);
});
