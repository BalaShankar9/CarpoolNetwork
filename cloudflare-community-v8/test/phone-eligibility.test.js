import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './sqlite-fixture.js';
import {phoneRoutes,twilioVerify,phoneProviderAvailable,hasVerifiedPhone} from '../src/phone-verification.js';
import {participationIssue,rideEligibility,vehicleIssue} from '../src/eligibility.js';
import {contactRoutes} from '../src/contacts.js';
const sid='VE'+'a'.repeat(32),phone='+12025550123';
function setup(){
  const f=fixture();f.member('u');f.member('other','+12025550124');
  f.calls=[];f.provider=async(_env,action,data)=>{f.calls.push({action,data});return action==='send'?{sid,pending:true}:{approved:data.code==='123456'};};
  f.api=async(user,action,data)=>{const r=await phoneRoutes(new Request('https://carpool.test/api/auth/phone/'+action,{method:data?'POST':'GET',headers:{'x-test-user':user,'content-type':'application/json'},body:data?JSON.stringify(data):undefined}),f.env,f.h,f.provider);return {status:r.status,data:await r.json()};};
  f.start=(user='u',number=phone)=>f.api(user,'start',{number,shareBookings:true});
  f.check=(id,user='u',code='123456')=>f.api(user,'check',{challengeId:id,code});
  return f;
}
test('SMS verification requires email, provider configuration, valid consent and an authenticated member',async()=>{
  const f=setup();assert.equal((await f.start('')).status,401);
  f.db.prepare('DELETE FROM member_emails WHERE user_id=?').run('u');assert.equal((await f.start()).status,403);f.db.prepare('INSERT INTO member_emails(user_id,email) VALUES(?,?)').run('u','u@example.invalid');
  assert.equal((await f.api('u','start',{number:phone,shareBookings:false})).status,400);
  assert.equal((await f.start('u','+4412')).status,400);
  f.env.SMS_DAILY_LIMIT='0';assert.equal(phoneProviderAvailable(f.env),false);assert.equal((await f.start()).status,503);assert.equal(f.calls.length,0);f.db.close();
});
test('SMS success is bound to the account and challenge; responses omit codes and replay fails',async()=>{
  const f=setup(),sent=await f.start();assert.equal(sent.status,200);assert.ok(sent.data.challengeId);assert.ok(!JSON.stringify(sent.data).includes('123456'));assert.equal(sent.data.maskedNumber,'•••• 0123');
  assert.equal((await f.check(sent.data.challengeId,'other')).status,409);
  assert.equal((await f.check(sent.data.challengeId)).status,200);assert.equal(await hasVerifiedPhone(f.env,'u'),true);
  assert.equal((await f.check(sent.data.challengeId)).status,409);
  assert.equal((await f.start()).data.alreadyVerified,true);assert.equal(f.calls.filter(c=>c.action==='send').length,1);f.db.close();
});
test('expired codes, too many wrong attempts and parallel checks cannot verify a number',async()=>{
  const f=setup(),sent=await f.start();
  for(let i=0;i<5;i++)assert.equal((await f.check(sent.data.challengeId,'u','000000')).status,400);
  assert.equal((await f.check(sent.data.challengeId)).status,409);assert.equal(await hasVerifiedPhone(f.env,'u'),false);
  f.db.prepare("UPDATE phone_challenges SET status='pending',attempts=0,expires_at=datetime('now','-1 second')").run();assert.equal((await f.check(sent.data.challengeId)).status,409);
  f.db.prepare("UPDATE phone_challenges SET expires_at=datetime('now','+5 minutes')").run();
  const results=await Promise.all([f.check(sent.data.challengeId),f.check(sent.data.challengeId)]);assert.equal(results.filter(r=>r.status===200).length,1);f.db.close();
});
test('new number remains private until verified; old challenge and unverified contact edits cannot bypass it',async()=>{
  const f=setup(),first=await f.start();await f.check(first.data.challengeId);
  f.db.prepare("UPDATE phone_challenges SET created_at=datetime('now','-61 seconds')").run();
  const next=await f.start('u','+12025550125');assert.equal(next.status,200);
  assert.equal(f.db.prepare('SELECT whatsapp_number n FROM member_contacts WHERE user_id=?').get('u').n,phone);
  assert.equal((await f.check(first.data.challengeId)).status,409);
  const bypass=await contactRoutes(new Request('https://carpool.test/api/contact-details',{method:'POST',headers:{'x-test-user':'u','content-type':'application/json'},body:JSON.stringify({number:'+12025550125',shareBookings:true})}),f.env,f.h);assert.equal(bypass.status,428);
  await f.check(next.data.challengeId);assert.equal(f.db.prepare('SELECT whatsapp_number n FROM member_contacts WHERE user_id=?').get('u').n,'+12025550125');f.db.close();
});
test('resend cooldown and atomic daily budget prevent repeated or concurrent SMS sends',async()=>{
  const f=setup();assert.equal((await f.start()).status,200);assert.equal((await f.start()).status,429);assert.equal(f.calls.length,1);
  f.env.SMS_DAILY_LIMIT='1';assert.equal((await f.start('other','+12025550124')).status,503);assert.equal(f.calls.length,1);f.db.close();
  const g=setup();g.env.SMS_DAILY_LIMIT='1';const r=await Promise.all([g.start(),g.start('other','+12025550124')]);assert.equal(r.filter(x=>x.status===200).length,1);assert.equal(g.calls.length,1);g.db.close();
});
test('one verified number cannot be claimed by two accounts, including racing approvals',async()=>{
  const f=setup();const a=await f.start(),b=await f.start('other');assert.equal(b.status,200);
  const checks=await Promise.all([f.check(a.data.challengeId),f.check(b.data.challengeId,'other')]);assert.equal(checks.filter(r=>r.status===200).length,1);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM phone_verifications').get().n,1);
  assert.equal((await f.start('other')).status,409);f.db.close();
});
test('Twilio requests use the exact HTTPS service and bind approved results to number and verification SID',async()=>{
  const f=setup();let expectedAction='send';
  const fetcher=async(url,options)=>{assert.ok(url.startsWith('https://verify.twilio.com/v2/Services/'+f.env.TWILIO_VERIFY_SERVICE_SID+'/'));assert.equal(options.redirect,'error');assert.ok(!url.includes(phone));const body=new URLSearchParams(options.body);assert.equal(body.get(expectedAction==='send'?'To':'VerificationSid'),expectedAction==='send'?phone:sid);return Response.json({sid,service_sid:f.env.TWILIO_VERIFY_SERVICE_SID,to:phone,channel:'sms',status:expectedAction==='send'?'pending':'approved',valid:true});};
  assert.equal((await twilioVerify(f.env,'send',{number:phone},fetcher)).pending,true);expectedAction='check';assert.equal((await twilioVerify(f.env,'check',{number:phone,sid,code:'123456'},fetcher)).approved,true);
  await assert.rejects(()=>twilioVerify(f.env,'check',{number:phone,sid,code:'123456'},async()=>Response.json({sid,service_sid:f.env.TWILIO_VERIFY_SERVICE_SID,to:'+12025550124',channel:'sms',status:'approved',valid:true})),{status:503});
  await assert.rejects(()=>twilioVerify(f.env,'send',{number:phone},async()=>new Response('',{status:429})),{status:429});f.db.close();
});
test('phone, approved photograph and current dated vehicle records are enforced independently',async()=>{
  const f=setup();assert.equal((await participationIssue(f.env,'u')).code,'PHONE_VERIFICATION_REQUIRED');const s=await f.start();await f.check(s.data.challengeId);
  assert.equal((await participationIssue(f.env,'u')).code,'PHOTO_REQUIRED');f.db.prepare("INSERT INTO profile_photos(user_id,object_key,approved_key,status) VALUES('u','test','test','approved')").run();assert.equal(await participationIssue(f.env,'u'),null);
  assert.equal((await rideEligibility(f.env,'u','ride_offer','2026-10-02',4)).code,'VEHICLE_REQUIRED');assert.equal(await rideEligibility(f.env,'u','ride_wanted','2026-10-02',1),null);
  f.db.prepare("UPDATE phone_verifications SET expires_at=datetime('now','-1 second')").run();assert.equal((await participationIssue(f.env,'u')).code,'PHONE_VERIFICATION_REQUIRED');f.db.close();
});
test('vehicle eligibility rejects stale checks, future MOT/tax expiry and excess passenger capacity',()=>{
  const now=new Date('2026-09-28T10:00:00Z'),v={checked_at:'2026-09-28 09:00:00',mot_status:'Valid',tax_status:'Taxed',mot_expiry:'2027-01-01',tax_due:'2027-02-01',passenger_seats:4};
  assert.equal(vehicleIssue(v,'2026-10-01',4,now),null);
  assert.equal(vehicleIssue(v,'2026-10-01',7,now).code,'VEHICLE_CAPACITY');
  assert.equal(vehicleIssue(v,'2027-01-02',4,now).code,'VEHICLE_MOT_EXPIRY');
  assert.equal(vehicleIssue({...v,mot_expiry:'2028-01-01'},'2027-02-01',4,now).code,'VEHICLE_TAX_EXPIRY');
  assert.equal(vehicleIssue({...v,checked_at:'2026-09-26 09:00:00'},'2026-10-01',4,now).code,'VEHICLE_STALE');
  assert.equal(vehicleIssue({...v,mot_status:'Not valid'},'2026-10-01',4,now).code,'VEHICLE_INELIGIBLE');
});

test('email-and-WhatsApp launch mode preserves photo and vehicle gates without asserting phone verification',async()=>{
  const f=setup();f.env.REQUIRE_PHONE_VERIFICATION='false';f.env.SMS_DAILY_LIMIT='0';f.env.SMS_MONTHLY_LIMIT='0';
  const call=async data=>{const r=await contactRoutes(new Request('https://carpool.test/api/contact-details',{method:'POST',headers:{'x-test-user':'u','content-type':'application/json'},body:JSON.stringify(data)}),f.env,f.h);return {status:r.status,data:await r.json()};};
  assert.equal((await call({number:phone,shareBookings:false})).status,400);
  assert.equal((await call({number:phone,shareBookings:true})).status,200);
  assert.equal(await hasVerifiedPhone(f.env,'u'),false);assert.equal((await participationIssue(f.env,'u')).code,'PHOTO_REQUIRED');
  f.db.prepare("INSERT INTO profile_photos(user_id,object_key,approved_key,status) VALUES('u','synthetic','synthetic','approved')").run();
  assert.equal(await participationIssue(f.env,'u'),null);
  assert.equal((await rideEligibility(f.env,'u','ride_offer','2026-10-01',4)).code,'VEHICLE_REQUIRED');
  f.db.prepare("DELETE FROM member_emails WHERE user_id='u'").run();
  assert.equal((await call({number:phone,shareBookings:true})).status,403);
  assert.equal((await participationIssue(f.env,'u')).code,'EMAIL_REQUIRED');assert.equal(f.calls.length,0);f.db.close();
});
