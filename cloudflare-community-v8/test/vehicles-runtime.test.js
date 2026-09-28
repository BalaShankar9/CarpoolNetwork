import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';

test('DVLA lookup runs inside the deployed Worker compatibility date without forwarding redirects',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const config=JSON.parse(readFileSync(new URL('../wrangler.production.jsonc',import.meta.url)));
  const bundle=await build({stdin:{contents:`import {queryVehicle} from './src/vehicles.js';
    export default {async fetch(request,env){try{return Response.json({ok:true,vehicle:await queryVehicle(env,'AB12CDE')});}
      catch(e){return Response.json({ok:false,code:e.code,error:e.message},{status:e.status||500});}}};`,resolveDir:root,sourcefile:'dvla-runtime-fixture.js'},bundle:true,format:'esm',platform:'neutral',write:false});
  let redirect=false,calls=0;
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,
    compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,
    bindings:{DVLA_API_KEY:'synthetic-runtime-secret'},
    outboundService:async request=>{
      calls++;
      assert.equal(request.url,'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles');
      assert.equal(request.method,'POST');
      assert.equal(request.headers.get('x-api-key'),'synthetic-runtime-secret');
      assert.deepEqual(await request.json(),{registrationNumber:'AB12CDE'});
      return redirect?new Response('',{status:302,headers:{location:'https://untrusted.invalid/'}}):Response.json({registrationNumber:'AB12CDE',make:'SYNTHETIC',motStatus:'Valid',taxStatus:'Taxed'});
    }}));
  try{
    const success=await mf.dispatchFetch('http://localhost/');
    assert.equal(success.status,200);assert.equal((await success.json()).vehicle.make,'SYNTHETIC');assert.equal(calls,1);
    redirect=true;
    const rejected=await mf.dispatchFetch('http://localhost/');
    assert.equal(rejected.status,503);assert.equal((await rejected.json()).code,'DVLA_REDIRECT');
    assert.equal(calls,2,'Redirect destination must never receive a request or secret');
  }finally{await mf.dispose();}
});
