import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveTrips} from '../public/live-trip.js';
// Exercise the shipped controller with deferred network responses and a fake
// device location source. This test never requests a real device location.
test('Stop cancels a pending sharing start and queued device updates cannot restart it',async()=>{
 const saved=Object.fromEntries(['document','window','navigator'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const controls=new Map(),events=new Map();let begins=[],puts=[],deletes=[],watches=[],finishPut;
 const control=id=>{if(!controls.has(id))controls.set(id,{textContent:'',innerHTML:'',disabled:false,hidden:false,checked:true,addEventListener(){}});return controls.get(id);};
 const root={isConnected:true,querySelector:selector=>['#startLiveTrip','#finishLiveTrip'].includes(selector)?null:control(selector),closest:()=>({addEventListener:(name,fn)=>events.set(name,fn)})};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{visibilityState:'visible',querySelector:()=>root,addEventListener(){},removeEventListener(){}}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){},removeEventListener(){}}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{watchPosition(fn){watches.push(fn);return watches.length;},clearWatch(){}}}});
 const api=async(path,options={})=>{
   if(!path.endsWith('/location'))return {trip:{origin:'Cardiff',destination:'Bristol',role:'rider',status:'active',participants:[{name:'Rider'}]}};
   if(options.method==='DELETE'){deletes.push(JSON.parse(options.body||'{}'));return {ok:true};}
   if(options.method==='POST'){const body=JSON.parse(options.body);if(body.begin)return new Promise(resolve=>begins.push(resolve));puts.push(body);return new Promise(resolve=>{finishPut=resolve;});}
   return {active:true,positions:[]};
 };
 try{
   await createLiveTrips({api,esc:x=>String(x),openSheet(){},closeSheet(){events.get('close')?.();},showToast(){}})('offer');
   const first=control('#shareTripLocation').onclick();assert.equal(begins.length,1);
   await control('#stopTripLocation').onclick();begins.shift()({active:true,shareId:'first'});await first;
   assert.equal(watches.length,0,'late start must not request device location');assert.deepEqual(deletes,[{shareId:'first'}]);
   const second=control('#shareTripLocation').onclick();begins.shift()({active:true,shareId:'second'});await second;assert.equal(watches.length,1);
   const pending=watches[0]({coords:{latitude:51.48,longitude:-3.18,accuracy:10},timestamp:Date.now()});assert.equal(puts.length,1);
   await control('#stopTripLocation').onclick();finishPut({active:true});await pending;
   assert.match(control('#tripState').textContent,/stopped/,'late update must not show that sharing resumed');
   await watches[0]({coords:{latitude:51.48,longitude:-3.18,accuracy:10},timestamp:Date.now()});assert.equal(puts.length,1,'queued callback after Stop must not send coordinates');
 }finally{
   events.get('close')?.();root.isConnected=false;
   for(const[k,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}
 }
});
