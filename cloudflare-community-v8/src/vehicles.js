import {connectedContact} from './contacts.js';
import {recordIssue} from './reliability.js';
const text=(v,n=100)=>String(v??'').trim().slice(0,n);
const vehicleError=(code,message,status=503)=>Object.assign(Error(message),{code,status});
export function registrationNumber(input){return text(input,16).toUpperCase().replace(/\s/g,'');}
export function socialLink(input,kind){
  if(!input)return '';
  const u=new URL(input);const allowed=kind==='instagram'?['instagram.com','www.instagram.com']:['facebook.com','www.facebook.com','m.facebook.com'];
  if(u.protocol!=='https:'||u.username||u.password||u.port||!allowed.includes(u.hostname)||u.pathname.length<2||u.pathname.length>180)throw Error('Use a direct https profile link from Instagram or Facebook.');
  // Facebook still issues numeric profile.php links; removing their id breaks them.
  const profileId=kind==='facebook'&&u.pathname==='/profile.php'?u.searchParams.get('id'):null;
  if(kind==='facebook'&&u.pathname==='/profile.php'&&!/^\d{1,30}$/.test(profileId||''))throw Error('Use a Facebook profile URL with its numeric profile id.');
  u.search='';if(profileId)u.searchParams.set('id',profileId);u.hash='';return u.href;
}
export async function queryVehicle(env,registration,requestFetch=fetch){
  if(!env.DVLA_API_KEY)throw vehicleError('DVLA_NOT_CONFIGURED','Vehicle checks are temporarily unavailable. Please try again later.');
  if(!/^[A-Z0-9]{2,8}$/.test(registration))throw Object.assign(Error('Enter a UK registration number.'),{status:400});
  let response;
  try {response=await requestFetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',{
    method:'POST',headers:{'content-type':'application/json','x-api-key':env.DVLA_API_KEY},
    // Workers at our compatibility date reject redirect:'error'. Manual mode
    // never forwards the API key or registration to a redirect destination.
    body:JSON.stringify({registrationNumber:registration}),signal:AbortSignal.timeout(10000),redirect:'manual'
  });}catch(e){
    if(e?.name==='TimeoutError'||e?.name==='AbortError')throw vehicleError('DVLA_TIMEOUT','DVLA took too long to respond. Your saved vehicle has not changed. Please try again.');
    throw vehicleError('DVLA_CONNECTION','We could not connect to DVLA. Your saved vehicle has not changed. Please try again later.');
  }
  if(response.status>=300&&response.status<400)throw vehicleError('DVLA_REDIRECT','DVLA returned an unexpected response. Your saved vehicle has not changed.');
  if(response.status===400)throw vehicleError('DVLA_INVALID_REGISTRATION','DVLA could not read that registration. Check it and try again.',400);
  if(response.status===404)throw Object.assign(Error('DVLA could not find that vehicle. Check the registration.'),{status:404});
  if(response.status===401||response.status===403)throw vehicleError('DVLA_AUTHORIZATION','The DVLA connection needs attention from our team. Your saved vehicle has not changed.');
  if(response.status===429)throw vehicleError('DVLA_RATE_LIMITED','DVLA is receiving too many checks. Please wait a little and try again. Your saved vehicle has not changed.');
  if(!response.ok)throw vehicleError('DVLA_UPSTREAM','DVLA could not complete the check. Your saved vehicle has not changed.');
  let d;try{d=await response.json();}catch(e){
    if(e?.name==='TimeoutError'||e?.name==='AbortError')throw vehicleError('DVLA_TIMEOUT','DVLA took too long to respond. Your saved vehicle has not changed. Please try again.');
    throw vehicleError('DVLA_INVALID_RESPONSE','DVLA returned unreadable vehicle details. Your saved vehicle has not changed. Please try again later.');
  }
  if(!d||registrationNumber(d.registrationNumber)!==registration||!d.make||!d.motStatus||!d.taxStatus)throw vehicleError('DVLA_INVALID_RESPONSE','DVLA returned incomplete vehicle details. Please try again later.');
  return {registration,make:text(d.make),colour:text(d.colour),manufacture_year:Number.isInteger(d.yearOfManufacture)?d.yearOfManufacture:null,fuel:text(d.fuelType),mot_status:text(d.motStatus),mot_expiry:/^\d{4}-\d{2}-\d{2}$/.test(d.motExpiryDate)?d.motExpiryDate:'',tax_status:text(d.taxStatus),tax_due:/^\d{4}-\d{2}-\d{2}$/.test(d.taxDueDate)?d.taxDueDate:''};
}
export async function vehicleRoutes(request,env,h){
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/member-details'))return null;
  const auth=await h.requireUser(request,env);if(auth.error)return auth.error;
  const uid=auth.user.id;
  const target=path.match(/^\/api\/member-details\/([^/]+)$/);
  if((path==='/api/member-details'||target)&&request.method==='GET'){
    const id=target?decodeURIComponent(target[1]):uid;
    if(!await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(id).first())return h.fail('Member not found.',404);
    if(await h.blocked(env,uid,id))return h.fail('Member not available.',404);
    const links=await env.DB.prepare('SELECT instagram,facebook FROM member_social_links WHERE user_id=?').bind(id).first();
    const vehicle=await env.DB.prepare('SELECT * FROM member_vehicles WHERE user_id=?').bind(id).first();
    if(vehicle){
      const confirmed=id===uid||await env.DB.prepare("SELECT r.id FROM ride_requests r JOIN posts p ON p.id=r.ride_offer_post_id WHERE r.status IN ('accepted','completed') AND p.journey_date>=date('now','-1 day') AND ((r.rider_id=? AND r.driver_id=?) OR (r.rider_id=? AND r.driver_id=?)) LIMIT 1").bind(uid,id,id,uid).first();
      vehicle.registration=confirmed?vehicle.registration:vehicle.registration.slice(0,2)+' •••';delete vehicle.user_id;
    }
    return h.json({ok:true,links:links||{instagram:'',facebook:''},vehicle,whatsapp:id===uid?null:await connectedContact(env,uid,id),vehicleChecksAvailable:!!env.DVLA_API_KEY});
  }
  if(path==='/api/member-details/links'&&request.method==='POST'){
    const data=await request.json();let instagram,facebook;
    try{instagram=socialLink(data.instagram,'instagram');facebook=socialLink(data.facebook,'facebook');}catch{return h.fail('Use a direct https profile link from Instagram or Facebook.');}
    await env.DB.prepare('INSERT INTO member_social_links(user_id,instagram,facebook) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET instagram=excluded.instagram,facebook=excluded.facebook,updated_at=CURRENT_TIMESTAMP').bind(uid,instagram,facebook).run();
    return h.json({ok:true});
  }
  if(path==='/api/member-details/vehicle'&&request.method==='POST'){
    if(!await h.verified(env,uid))return h.fail('Verify your email before adding a vehicle.',403);
    const limited=await h.rateLimitOrFail(request,env,'vehicle-check',5,3600,uid,true);if(limited)return limited;
    const data=await request.json(),seats=Number(data.passengerSeats);
    if(data.authorised!==true||!Number.isInteger(seats)||seats<1||seats>7)return h.fail('Confirm you are authorised to use this vehicle and choose 1 to 7 passenger seats, excluding the driver.');
    let v;try{v=await queryVehicle(env,registrationNumber(data.registration));}catch(e){
      if(!e.status||e.status>=500){
        const code=/^DVLA_[A-Z_]+$/.test(e.code||'')?e.code:'DVLA_INTERNAL';
        // Only fixed diagnostic codes: no plate, key, provider body or member data.
        console.error(JSON.stringify({event:'vehicle_check_failed',code}));
        try{await recordIssue(env,{source:'server',code,route:path});}catch{console.error(JSON.stringify({event:'vehicle_diagnostic_storage_failed',code}));}
      }
      return h.fail(e.status?e.message:'The vehicle check could not complete. Your saved vehicle has not changed.',e.status||503);
    }
    await env.DB.prepare(`INSERT INTO member_vehicles(user_id,registration,make,colour,manufacture_year,fuel,mot_status,mot_expiry,tax_status,tax_due,passenger_seats,keeper_confirmed_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET registration=excluded.registration,make=excluded.make,colour=excluded.colour,manufacture_year=excluded.manufacture_year,fuel=excluded.fuel,mot_status=excluded.mot_status,mot_expiry=excluded.mot_expiry,tax_status=excluded.tax_status,tax_due=excluded.tax_due,passenger_seats=excluded.passenger_seats,keeper_confirmed_at=CURRENT_TIMESTAMP,checked_at=CURRENT_TIMESTAMP`).bind(uid,v.registration,v.make,v.colour,v.manufacture_year,v.fuel,v.mot_status,v.mot_expiry,v.tax_status,v.tax_due,seats).run();
    return h.json({ok:true,vehicle:v});
  }
  return h.fail('Not found.',404);
}
