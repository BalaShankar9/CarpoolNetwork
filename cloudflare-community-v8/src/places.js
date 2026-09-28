import places from '../public/uk-places.json';
import {normalisePlace,findPlace,distanceMiles,placeLabel,departureMatch} from '../public/geo.js';
export {findPlace,distanceMiles};
const labels=new Map(),names=new Map();
for(const p of places){for(const [map,key] of [[labels,normalisePlace(placeLabel(p))],[names,normalisePlace(p.name)]])map.set(key,map.has(key)?null:p);}
const searchIndex=places.map(place=>({place,name:normalisePlace(place.name),label:normalisePlace(placeLabel(place))}));
export const resolvePlace=value=>{const key=normalisePlace(value);return labels.get(key)||names.get(key)||null;};
export function placesRoute(request){
  const url=new URL(request.url);if(url.pathname!=='/api/places'||request.method!=='GET')return null;
  const q=normalisePlace(url.searchParams.get('q')).slice(0,80);
  const matches=q.length<2?[]:searchIndex.filter(p=>p.name.startsWith(q)||p.label.includes(q)).slice(0,12).map(p=>p.place);
  return Response.json({ok:true,places:matches,attribution:'GeoNames · CC BY 4.0'},{headers:{'cache-control':'public, max-age=86400'}});
}
// Radius uses the departure town, not a member's home address. Distances are
// straight-line estimates between town centres, never driving distances.
export function locationMatch(row,{from,radiusMiles=0,localDrivers=false}){
  return departureMatch(row,{from,radiusMiles,localDrivers},resolvePlace);
}
