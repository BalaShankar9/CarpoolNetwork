import {whatsappNumber} from './contact-number.js';
import {phoneState,hasVerifiedPhone} from './phone-verification.js';
export {whatsappNumber} from './contact-number.js';

export function whatsappLink(number,name=''){
  let parsed;try{parsed=whatsappNumber(number);}catch{return '';}
  return `https://wa.me/${parsed.slice(1)}?text=${encodeURIComponent(`Hi${name?' '+name:''}, we connected for a ride on Carpool Network. Shall we arrange the pickup here?`)}`;
}
export async function hasContact(env,userId){
  return !!await env.DB.prepare('SELECT user_id FROM member_contacts WHERE user_id=? AND share_bookings=1').bind(userId).first();
}
export async function ownContact(env,user){
  const saved=await env.DB.prepare('SELECT whatsapp_number,share_bookings,confirmed_at FROM member_contacts WHERE user_id=?').bind(user.id).first();
  let existing='';try{existing=whatsappNumber(user.phone);}catch{}
  return {number:saved?.whatsapp_number||'',existingNumber:existing,shareBookings:saved?.share_bookings===1,confirmedAt:saved?.confirmed_at||null,required:env.REQUIRE_WHATSAPP==='true',phone:await phoneState(env,user.id)};
}
export async function connectedContact(env,viewerId,otherId,bookingId){
  if(viewerId===otherId)return null;
  if(env.REQUIRE_PHONE_VERIFICATION==='true'&&(!await hasVerifiedPhone(env,viewerId)||!await hasVerifiedPhone(env,otherId)))return null;
  const row=await env.DB.prepare(`SELECT c.whatsapp_number,u.name FROM member_contacts c JOIN users u ON u.id=c.user_id
    LEFT JOIN user_moderation m ON m.user_id=u.id
    WHERE c.user_id=? AND c.share_bookings=1 AND u.phone NOT LIKE 'deleted:%' AND COALESCE(m.status,'active')='active'
    AND NOT EXISTS(SELECT 1 FROM member_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?))
    AND EXISTS(SELECT 1 FROM ride_requests r WHERE r.status IN ('accepted','completed') AND (?='' OR r.id=?)
      AND ((r.rider_id=? AND r.driver_id=c.user_id) OR (r.driver_id=? AND r.rider_id=c.user_id)))`).bind(otherId,viewerId,otherId,otherId,viewerId,bookingId||'',bookingId||'',viewerId,viewerId).first();
  const verified=!!row&&await hasVerifiedPhone(env,otherId);
  return row?{number:row.whatsapp_number,url:whatsappLink(row.whatsapp_number,row.name),phoneVerified:verified,verification:verified?'Phone access verified by SMS. This does not verify identity or WhatsApp ownership.':'Member-provided number; phone access is not verified.'}:null;
}
export async function contactRoutes(request,env,h){
  const path=new URL(request.url).pathname;
  const booking=path.match(/^\/api\/ride-requests\/([^/]+)\/contact$/);
  if(path!=='/api/contact-details'&&!booking)return null;
  const auth=await h.requireUser(request,env);if(auth.error)return auth.error;
  if(booking&&request.method==='GET'){
    const ride=await env.DB.prepare('SELECT rider_id,driver_id FROM ride_requests WHERE id=? AND (rider_id=? OR driver_id=?)').bind(booking[1],auth.user.id,auth.user.id).first();
    if(!ride)return h.fail('Booking not found.',404);
    const other=ride.rider_id===auth.user.id?ride.driver_id:ride.rider_id;
    return h.json({ok:true,contact:await connectedContact(env,auth.user.id,other,booking[1])});
  }
  if(path!=='/api/contact-details')return h.fail('Not found.',404);
  if(request.method==='GET'){
    return h.json({ok:true,...await ownContact(env,auth.user)});
  }
  if(request.method==='POST'){
    if(!await h.verified(env,auth.user.id))return h.fail('Verify your email before adding a contact number.',403);
    const limited=await h.rateLimitOrFail(request,env,'contact-update',5,3600,auth.user.id,true);if(limited)return limited;
    const data=await request.json();let number;
    try{number=whatsappNumber(data.number);}catch(error){return h.fail(error.message);}
    if(data.shareBookings!==true)return h.fail('Confirm this is your WhatsApp number and that accepted ride partners may use it.');
    if(env.REQUIRE_PHONE_VERIFICATION==='true'){
      const matching=await env.DB.prepare('SELECT user_id FROM phone_verifications WHERE user_id=? AND phone_number=? AND expires_at>CURRENT_TIMESTAMP').bind(auth.user.id,number).first();
      if(!matching)return h.json({ok:false,error:'Verify this number by SMS before saving it.',code:'PHONE_VERIFICATION_REQUIRED'},428);
    }
    await env.DB.prepare(`INSERT INTO member_contacts(user_id,whatsapp_number,share_bookings) VALUES(?,?,1)
      ON CONFLICT(user_id) DO UPDATE SET whatsapp_number=excluded.whatsapp_number,share_bookings=1,confirmed_at=CURRENT_TIMESTAMP`).bind(auth.user.id,number).run();
    return h.json({ok:true,...await ownContact(env,auth.user)});
  }
  return h.fail('Not found.',404);
}
