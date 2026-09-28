export const placeLabel = p => p.label || `${p.name}, ${p.region}`;
export const normalisePlace = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function departureMatch(row,{from,radiusMiles=0,localDrivers=false},resolve){
  const centre=resolve(from),origin=resolve(row.origin),home=resolve(row.author_area);
  const query=normalisePlace(from),actual=normalisePlace(row.origin);
  if(!centre)return {matches:!!query&&radiusMiles===0&&!localDrivers&&query===actual,miles:null};
  if(localDrivers&&home?.id!==centre.id)return {matches:false,miles:null};
  // Legacy station names can match their town by prefix; they cannot be used
  // to invent coordinates for radius calculations.
  if(!origin)return {matches:radiusMiles===0&&(actual===query||actual.startsWith(normalisePlace(centre.name)+' ')),miles:null};
  const miles=distanceMiles(centre,origin);
  return {matches:radiusMiles>0?miles<=radiusMiles:origin.id===centre.id,miles};
}
export function distanceMiles(a,b){
  const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
  const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function findPlace(places,value){
  const q=normalisePlace(value),exact=places.filter(p=>normalisePlace(placeLabel(p))===q);if(exact.length===1)return exact[0];const names=places.filter(p=>normalisePlace(p.name)===q);return names.length===1?names[0]:null;
}
export function nearestPlace(places,lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat >90||lon < -180||lon >180)return null;
  return places.map(place=>({place,miles:distanceMiles({lat,lon},place)})).sort((a,b)=>a.miles-b.miles)[0]||null;
}
