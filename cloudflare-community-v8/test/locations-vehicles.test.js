import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findPlace,nearestPlace,distanceMiles,departureMatch} from '../public/geo.js';
import {queryVehicle,registrationNumber,socialLink,vehicleRoutes} from '../src/vehicles.js';
const places=JSON.parse(readFileSync(new URL('../public/uk-places.json',import.meta.url)));
test('departure filters cannot match an unrelated or unknown origin solely on destination and time',()=>{
  const resolve=value=>findPlace(places,value);
  assert.equal(departureMatch({origin:'Unknown town B'},{from:'Unknown town A'},resolve).matches,false);
  assert.equal(departureMatch({origin:'Unknown town A'},{from:'Unknown town A'},resolve).matches,true);
  assert.equal(departureMatch({origin:'Bristol Temple Meads'},{from:'Cardiff'},resolve).matches,false);
  assert.equal(departureMatch({origin:'Cardiff Central'},{from:'Cardiff'},resolve).matches,true);
  assert.equal(departureMatch({origin:'Cardiff Central'},{from:'Cardiff',radiusMiles:25},resolve).matches,false);
  assert.equal(departureMatch({origin:'Bristol',author_area:'Cardiff'},{from:'Cardiff',radiusMiles:50,localDrivers:true},resolve).matches,true);
  assert.equal(departureMatch({origin:'Bristol',author_area:'London'},{from:'Cardiff',radiusMiles:50,localDrivers:true},resolve).matches,false);
});
test('UK town directory resolves cities and nearest town without uploading a GPS position',()=>{
  const cardiff=findPlace(places,'Cardiff'),bristol=findPlace(places,'Bristol');
  assert.equal(cardiff.region,'Wales');assert.equal(findPlace(places,'Cardiff, Wales').id,cardiff.id);
  assert.ok(distanceMiles(cardiff,bristol)>20&&distanceMiles(cardiff,bristol)<30);
  assert.equal(nearestPlace(places,cardiff.lat,cardiff.lon).place.id,cardiff.id);
  assert.equal(nearestPlace(places,NaN,0),null);
});
test('DVLA integration sends a normalized plate server-side and keeps only declared record fields',async()=>{
  assert.equal(registrationNumber('ab12 cde'),'AB12CDE');
  const result=await queryVehicle({DVLA_API_KEY:'synthetic-test-key'},'AB12CDE',async(url,options)=>{
    assert.equal(new URL(url).hostname,'driver-vehicle-licensing.api.gov.uk');
    assert.equal(options.headers['x-api-key'],'synthetic-test-key');assert.deepEqual(JSON.parse(options.body),{registrationNumber:'AB12CDE'});
    return Response.json({registrationNumber:'AB12CDE',make:'TEST MAKE',colour:'RED',motStatus:'Valid',taxStatus:'Taxed',motExpiryDate:'2027-06-01',yearOfManufacture:2020,unexpectedPrivateField:'must not escape'});
  });
  assert.equal(result.mot_status,'Valid');assert.equal(result.manufacture_year,2020);assert.ok(!('unexpectedPrivateField' in result));assert.ok(!('roadworthy' in result));
});
test('DVLA missing key, upstream failures and mismatched plates fail closed',async()=>{
  await assert.rejects(()=>queryVehicle({},'AB12CDE',()=>assert.fail()),{status:503});
  await assert.rejects(()=>queryVehicle({DVLA_API_KEY:'test'},'AB12CDE',async()=>new Response('',{status:403})),{status:503});
  await assert.rejects(()=>queryVehicle({DVLA_API_KEY:'test'},'AB12CDE',async()=>Response.json({registrationNumber:'XX11XXX',make:'TEST',motStatus:'Valid',taxStatus:'Taxed'})),{status:503});
});
test('DVLA redirects, malformed responses and network failures stay distinct from timeouts',async()=>{
  const env={DVLA_API_KEY:'synthetic-secret'};
  for(const [status,code] of [[302,'DVLA_REDIRECT'],[403,'DVLA_AUTHORIZATION'],[429,'DVLA_RATE_LIMITED'],[500,'DVLA_UPSTREAM']]){
    await assert.rejects(()=>queryVehicle(env,'AB12CDE',async()=>new Response('',{status,headers:{location:'https://untrusted.invalid/'}})),{code,status:503});
  }
  for(const data of [null,{},'unexpected'])await assert.rejects(()=>queryVehicle(env,'AB12CDE',async()=>Response.json(data)),{code:'DVLA_INVALID_RESPONSE'});
  await assert.rejects(()=>queryVehicle(env,'AB12CDE',async()=>new Response('<html>Unavailable</html>')),{code:'DVLA_INVALID_RESPONSE'});
  await assert.rejects(()=>queryVehicle(env,'AB12CDE',async()=>{throw new TypeError('private transport detail');}),e=>e.code==='DVLA_CONNECTION'&&!e.message.includes('private')&&!e.message.includes('timed out'));
  await assert.rejects(()=>queryVehicle(env,'AB12CDE',async()=>{throw new DOMException('deadline','TimeoutError');}),{code:'DVLA_TIMEOUT'});
});
test('failed DVLA checks preserve the saved vehicle and record only a safe diagnostic code',async()=>{
  const calls=[],originalFetch=globalThis.fetch;
  const env={DVLA_API_KEY:'private-test-key',DB:{
    prepare(sql){return {bind(...values){return {async run(){calls.push({sql,values});return {};}};}};}
  }};
  globalThis.fetch=async()=>{throw new TypeError('private-test-key AB12CDE provider internals');};
  try{
    const result=await vehicleRoutes(new Request('https://carpool.invalid/api/member-details/vehicle',{method:'POST',body:JSON.stringify({registration:'AB12CDE',passengerSeats:4,authorised:true})}),env,{
      requireUser:async()=>({user:{id:'synthetic-member'}}),verified:async()=>true,rateLimitOrFail:async()=>null,
      fail:(error,status=400)=>Response.json({ok:false,error},{status})
    });
    assert.equal(result.status,503);assert.match((await result.json()).error,/could not connect/);
    assert.equal(calls.length,1);assert.match(calls[0].sql,/INSERT INTO diagnostic_issues/);
    assert.ok(calls[0].values.includes('DVLA_CONNECTION'));
    assert.doesNotMatch(JSON.stringify(calls),/private-test-key|AB12CDE|synthetic-member|provider internals/);
  }finally{globalThis.fetch=originalFetch;}
});
test('social links allow only direct HTTPS Instagram/Facebook origins and strip tracking',()=>{
  assert.equal(socialLink('https://instagram.com/test/?tracking=1#token','instagram'),'https://instagram.com/test/');
  assert.equal(socialLink('https://www.facebook.com/profile.php?id=123456789&tracking=1#token','facebook'),'https://www.facebook.com/profile.php?id=123456789');
  assert.throws(()=>socialLink('https://facebook.com/profile.php?tracking=1','facebook'));
  for(const u of ['javascript:alert(1)','https://instagram.com.attacker.invalid/test','https://user:secret@instagram.com/test','http://facebook.com/test'])assert.throws(()=>socialLink(u,'instagram'));
});
