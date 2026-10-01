import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/diagnostics.js',import.meta.url),'utf8');
function client({online=false,saved='[]',status=201,storageFails=false}={}) {
  const events={},storage=new Map([['carpool-diagnostics-v2',saved]]),requests=[],timers=[];
  const window={addEventListener:(name,fn)=>events[name]=fn};
  const navigator={onLine:online};
  runInNewContext(source,{window,navigator,location:{href:'https://carpool.test/?view=inbox&room=private&token=secret',origin:'https://carpool.test'},
    document:{body:null,readyState:'loading',addEventListener:()=>{}},URL,AbortSignal,Date,Set,JSON,
    sessionStorage:{getItem:key=>{if(storageFails)throw Error();return storage.get(key);},setItem:(key,value)=>{if(storageFails)throw Error();storage.set(key,value);}},
    fetch:async(url,options)=>{requests.push({url,options});return {ok:status===201,status};},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}
  });
  return {events,storage,requests,timers,window,navigator,api:window.CarpoolDiagnostics,queue:()=>JSON.parse(storage.get('carpool-diagnostics-v2'))};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('automatic diagnostics exclude messages, credentials, query strings and private route IDs, then retry on reconnect',async()=>{
  const c=client();
  c.api.capture('API_5XX','/api/social/rooms/private-room/messages?token=secret',{stack:'Error: password=secret\n at fn (https://carpool.test/app.js:12:3)\n at https://untrusted.test/private'});
  c.api.capture('API_5XX','/api/social/rooms/private-room/messages?token=secret',{stack:'Error: password=secret\n at fn (https://carpool.test/app.js:12:3)'});
  assert.equal(c.queue().length,1);assert.equal(c.requests.length,0);
  const event=c.queue()[0];assert.equal(event.route,'/api/social/rooms/:id/messages');assert.equal(event.page,'/views/inbox');assert.equal(event.frames,'app.js:12:3');
  assert.doesNotMatch(JSON.stringify(event),/private-room|secret|password|untrusted/);
  c.navigator.onLine=true;c.events.online();await settle();
  assert.equal(c.requests.length,1);assert.equal(c.requests[0].options.credentials,'omit');assert.equal(c.queue().length,0);
});
test('offline queue survives reload, is bounded, and expires without copying arbitrary stored content',async()=>{
  const now=Date.now(),saved=JSON.stringify([{code:'JS_ERROR',route:'/views/account?token=secret',page:'/private-address',frames:'secret\napp.js:7:1',at:now,description:'private text'},{code:'JS_ERROR',at:now-86400001},{code:'password=secret',at:now}]);
  const c=client({saved});
  for(let i=0;i<20;i++)c.api.capture('JS_ERROR','',{stack:`Error: secret\napp.js:${i+50}:1`});
  assert.equal(c.queue().length,10);assert.doesNotMatch(JSON.stringify(c.queue()),/secret|private text|private-address|description/);
  c.navigator.onLine=true;c.events.online();await settle();assert.equal(c.requests.length,1);assert.equal(c.queue().length,9);
});
test('rate-limited diagnostics stay queued and reporting failure cannot recurse',async()=>{
  const c=client({online:true,status:429});c.api.capture('API_TIMEOUT','/api/profile');await settle();
  assert.equal(c.requests.length,1);assert.equal(c.queue().length,1);assert.equal(c.timers.length,1);
  const blocked=client({online:true,storageFails:true});assert.doesNotThrow(()=>blocked.api.capture('JS_ERROR'));await settle();assert.equal(blocked.requests.length,1);
});
test('script failures and unhandled rejections are detected independently of the app',()=>{
  const c=client();c.events.error({target:{tagName:'SCRIPT'}});c.events.unhandledrejection({reason:new Error('private contents')});
  assert.deepEqual(c.queue().map(e=>e.code),['RESOURCE_ERROR','UNHANDLED_REJECTION']);assert.doesNotMatch(JSON.stringify(c.queue()),/private contents/);
});
