import {hasVerifiedPhone} from './phone-verification.js';
const issue=(error,code,status=428)=>({ok:false,error,code,status});
export async function participationIssue(env,userId){
  const member=await env.DB.prepare(`SELECT u.id,COALESCE(m.status,'active') status,COALESCE(m.until_at,'') until_at FROM users u
    LEFT JOIN user_moderation m ON m.user_id=u.id WHERE u.id=? AND u.phone NOT LIKE 'deleted:%'`).bind(userId).first();
  const now=new Date().toISOString().slice(0,19).replace('T',' ');
  if(!member||member.status==='banned'||member.status==='suspended'&&(!member.until_at||member.until_at>now))return issue('This member cannot participate right now. Contact Support if needed.','MEMBER_RESTRICTED',403);
  if(!await env.DB.prepare('SELECT user_id FROM member_emails WHERE user_id=?').bind(userId).first())return issue('Verify your email in Account before participating.','EMAIL_REQUIRED',403);
  if(env.REQUIRE_WHATSAPP==='true'&&!await env.DB.prepare('SELECT user_id FROM member_contacts WHERE user_id=?').bind(userId).first())return issue('Add your WhatsApp contact in Account and consent to sharing it with accepted ride partners.','CONTACT_REQUIRED');
  if(env.REQUIRE_PHONE_VERIFICATION==='true'&&!await hasVerifiedPhone(env,userId))return issue('Verify your phone number by SMS in Account before participating.','PHONE_VERIFICATION_REQUIRED');
  if(env.REQUIRE_PROFILE_PHOTO==='true'&&!await env.DB.prepare("SELECT user_id FROM profile_photos WHERE user_id=? AND approved_key<>''").bind(userId).first())return issue('Add a clear profile photo in Account and wait for moderator approval.','PHOTO_REQUIRED');
  return null;
}
export function vehicleIssue(vehicle,journeyDate,seats,now=new Date()){
  if(!vehicle)return issue('Add your vehicle in Account before offering a ride.','VEHICLE_REQUIRED');
  const checked=Date.parse(vehicle.checked_at?.replace(' ','T')+'Z');
  if(!Number.isFinite(checked)||now.getTime()-checked>86400000||checked>now.getTime()+60000)return issue('Refresh the DVLA check in Account before continuing.','VEHICLE_STALE');
  if(vehicle.mot_status!=='Valid'||vehicle.tax_status!=='Taxed')return issue('A valid MOT and taxed vehicle record are required. Contact Support if an exemption applies.','VEHICLE_INELIGIBLE');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(vehicle.mot_expiry)||vehicle.mot_expiry<journeyDate)return issue('The MOT record does not cover the journey date. Refresh it after renewal or choose an earlier date.','VEHICLE_MOT_EXPIRY');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(vehicle.tax_due)||vehicle.tax_due<=journeyDate)return issue('The tax record needs renewal before this journey. Refresh the vehicle check after renewal.','VEHICLE_TAX_EXPIRY');
  if(!Number.isInteger(Number(seats))||Number(seats)<1||Number(seats)>7||Number(seats)>vehicle.passenger_seats)return issue('Choose a passenger-seat count within your registered vehicle capacity (maximum 7).','VEHICLE_CAPACITY',400);
  return null;
}
export async function rideEligibility(env,userId,category,date,seats){
  const member=await participationIssue(env,userId);if(member)return member;
  if(category==='ride_offer'&&env.REQUIRE_VEHICLE==='true')return vehicleIssue(await env.DB.prepare('SELECT * FROM member_vehicles WHERE user_id=?').bind(userId).first(),date,seats);
  return null;
}
