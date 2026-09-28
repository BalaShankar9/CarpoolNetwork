import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './sqlite-fixture.js';
import {accountStatus} from '../src/account-status.js';
import {ownContact} from '../src/contacts.js';
import {accountPresentation,contactPresentation} from '../public/account-status.js';

test('account and contact views use saved WhatsApp and consent instead of the login identifier',async()=>{
  const f=fixture();f.member('owner');f.env.REQUIRE_PHONE_VERIFICATION='false';
  const user={id:'owner',phone:'email:owner'};
  let account=await accountStatus(f.env,user),contact=await ownContact(f.env,user);
  assert.deepEqual(account.contact,contact);assert.equal(contact.shareBookings,true);
  assert.equal(contactPresentation(contact).saved,true);assert.equal(contactPresentation(contact).needsCode,false);
  assert.equal(account.contact.phone.available,true,'A configured optional provider must not force SMS');
  assert.equal(accountPresentation(account).cards[0][2],'WhatsApp contact saved');
  assert.match(accountPresentation(account).cards[0][3],/12025550123/);
  assert.equal(account.participationIssue.code,'PHOTO_REQUIRED');
  f.db.prepare("UPDATE member_contacts SET whatsapp_number='+12025550124' WHERE user_id='owner'").run();
  assert.equal((await accountStatus(f.env,user)).contact.number,'+12025550124');
  assert.equal(f.db.prepare("SELECT phone FROM users WHERE id='owner'").get().phone,'email:owner');
  assert.throws(()=>f.db.prepare("UPDATE member_contacts SET share_bookings=0 WHERE user_id='owner'").run(),/CHECK constraint/);
  f.db.prepare("DELETE FROM member_contacts WHERE user_id='owner'").run();
  account=await accountStatus(f.env,user);assert.equal(account.participationIssue.code,'CONTACT_REQUIRED');assert.equal(contactPresentation(account.contact).saved,false);
  f.db.close();
});
test('photo pending/replacement and vehicle stale states agree with participation requirements',async()=>{
  const f=fixture();f.member('u');f.env.REQUIRE_PHONE_VERIFICATION='false';
  f.db.prepare("INSERT INTO profile_photos(user_id,object_key,status) VALUES('u','synthetic','pending')").run();
  let a=await accountStatus(f.env,{id:'u'});assert.equal(a.canParticipate,false);assert.match(accountPresentation(a).cards[1][3],/awaiting moderator/);assert.match(accountPresentation(a).summary,/awaiting moderator approval/);
  f.db.prepare("UPDATE profile_photos SET approved_key='previous-approved',status='pending' WHERE user_id='u'").run();
  a=await accountStatus(f.env,{id:'u'});assert.equal(a.canParticipate,true);assert.match(accountPresentation(a).cards[1][3],/replacement is awaiting/);assert.equal(a.canOfferToday,false);
  f.db.prepare("INSERT INTO member_vehicles(user_id,registration,make,colour,mot_status,mot_expiry,tax_status,tax_due,passenger_seats,keeper_confirmed_at) VALUES('u','TEST001','TEST','GREY','Valid',date('now','+90 days'),'Taxed',date('now','+180 days'),4,CURRENT_TIMESTAMP)").run();
  a=await accountStatus(f.env,{id:'u'});assert.equal(a.canOfferToday,true);assert.equal(accountPresentation(a).cards[2][5],'Checked');
  assert.ok(!JSON.stringify(a).includes('previous-approved'));assert.ok(!JSON.stringify(a).includes('TEST001'));
  f.db.prepare("UPDATE member_vehicles SET checked_at=datetime('now','-2 days') WHERE user_id='u'").run();
  a=await accountStatus(f.env,{id:'u'});assert.equal(a.vehicleIssue.code,'VEHICLE_STALE');assert.equal(accountPresentation(a).cards[2][5],'Check needed');f.db.close();
});
