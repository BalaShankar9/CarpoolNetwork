import {ownContact} from './contacts.js';
import {participationIssue,vehicleIssue} from './eligibility.js';

// Private account data, read from the same records used by booking eligibility.
// The legacy users.phone value remains a login identifier, not a contact record.
export async function accountStatus(env,user){
  const [contact,email,photo,vehicle,participation]=await Promise.all([
    ownContact(env,user),
    env.DB.prepare('SELECT email FROM member_emails WHERE user_id=?').bind(user.id).first(),
    env.DB.prepare('SELECT status,review_note,approved_key FROM profile_photos WHERE user_id=?').bind(user.id).first(),
    env.DB.prepare('SELECT make,colour,passenger_seats,mot_status,mot_expiry,tax_status,tax_due,checked_at FROM member_vehicles WHERE user_id=?').bind(user.id).first(),
    participationIssue(env,user.id)
  ]);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today=`${parts.year}-${parts.month}-${parts.day}`;
  const vehicleProblem=env.REQUIRE_VEHICLE==='true'?vehicleIssue(vehicle,today,vehicle?.passenger_seats||1):null;
  return {contact,email:{verified:!!email,address:email?.email||''},photo:photo?{status:photo.status,hasApprovedPhoto:!!photo.approved_key,reviewNote:photo.review_note||''}:null,
    vehicle:vehicle?{...vehicle,issue:vehicleProblem}:null,vehicleIssue:vehicleProblem,participationIssue:participation,
    requirements:{photo:env.REQUIRE_PROFILE_PHOTO==='true',vehicle:env.REQUIRE_VEHICLE==='true'},
    canParticipate:!participation,canOfferToday:!participation&&!vehicleProblem};
}
