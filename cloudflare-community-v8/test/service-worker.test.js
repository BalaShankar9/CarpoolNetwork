import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function worker({fetchImpl=async()=>new Response('fresh'),cached}={}) {
  const events={}, notifications=[], writes=[], deleted=[];
  const cache={addAll:async paths=>{assert.ok(paths.includes('/'));},put:async(key,value)=>writes.push([key,value])};
  const self={location:{origin:'https://carpool.example'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}},registration:{showNotification:async(title,options)=>notifications.push({title,options})}};
  runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{
    self,URL,Response,fetch:fetchImpl,clients:{matchAll:async()=>[],openWindow:async()=>{}},
    caches:{open:async()=>cache,match:async()=>cached,keys:async()=>['carpool-network-old','unrelated-cache'],delete:async key=>deleted.push(key)}
  });
  return {events,notifications,writes,deleted};
}
test('service worker installs, removes only old app caches, and displays a private push notification',async()=>{
  const w=worker();let pending;
  for(const event of ['install','activate','push']){w.events[event]({waitUntil:p=>pending=p});await pending;}
  assert.deepEqual(w.deleted,['carpool-network-old']);
  assert.equal(w.notifications.length,1);
  assert.equal(w.notifications[0].options.icon,'/icon-192.png');
  assert.equal(w.notifications[0].options.data.url,'/?view=alerts');
  assert.doesNotMatch(w.notifications[0].options.body,/address|pickup|phone|email/i);
});
test('service worker never intercepts private APIs or writes; cached shell is available offline',async()=>{
  const w=worker({fetchImpl:async()=>{throw Error('offline');},cached:new Response('cached shell')});let result;
  for(const [path,method] of [['/api/profile','GET'],['/api/social/rooms/lounge/messages','GET'],['/','POST']]){
    w.events.fetch({request:{url:'https://carpool.example'+path,method},respondWith:()=>assert.fail('Private request must remain network-only')});
  }
  w.events.fetch({request:{url:'https://carpool.example/?view=me',method:'GET',mode:'navigate'},respondWith:p=>result=p,waitUntil:()=>{}});
  assert.equal(await (await result).text(),'cached shell');assert.equal(w.writes.length,0);
});
