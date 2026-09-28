import {findPlace,nearestPlace,placeLabel} from './geo.js';
let directory;
const loadPlaces=()=>directory ||= fetch('/uk-places.json').then(r=>{if(!r.ok)throw Error('Town suggestions are unavailable.');return r.json();}).catch(e=>{directory=null;throw e;});
export function bindLocationInput(input,{current=false,map=true,toast=()=>{}}={}){
  if(!input||input.dataset.locationBound)return;
  input.dataset.locationBound='true';input.autocomplete='off';
  const list=document.createElement('datalist');list.id=`places-${crypto.randomUUID()}`;input.setAttribute('list',list.id);input.after(list);
  // Keep a field's helpers inside its own grid cell, never as route-grid siblings.
  let actions;
  if(map||current){
    const field=input.closest('label,.ride-field');
    if(field){const group=document.createElement('div');group.className='location-field';field.before(group);group.append(field);actions=document.createElement('div');actions.className='location-actions';group.append(actions);}
  }
  if(map){const mapButton=document.createElement('button');mapButton.type='button';mapButton.className='text-action location-map';mapButton.textContent='Choose on map';
  actions?.append(mapButton);
  mapButton.onclick=async()=>{mapButton.disabled=true;try{const {chooseTownOnMap}=await import('./town-map.js');await chooseTownOnMap(input);}catch{toast('The map could not load. Type your town instead.','error');}finally{mapButton.disabled=false;}};}
  let revision=0,timer;
  input.addEventListener('input',()=>{clearTimeout(timer);const turn=++revision;timer=setTimeout(async()=>{
    const query=input.value.trim();if(query.length<2){list.replaceChildren();return;}
    try{const r=await fetch('/api/places?q='+encodeURIComponent(query));const data=await r.json();if(turn!==revision)return;list.replaceChildren(...data.places.map(p=>{const o=document.createElement('option');o.value=placeLabel(p);return o;}));}catch{/* Free text remains available. */}
  },250);});
  if(current){
    const button=document.createElement('button');button.type='button';button.className='text-action location-current';button.textContent='Use current location';actions?.prepend(button);
    button.onclick=async()=>{
      if(!navigator.geolocation){toast('Location is unavailable. Choose your town instead.','error');return;}
      button.disabled=true;button.textContent='Finding your town…';
      try{
        const towns=await loadPlaces();
        const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:300000}));
        const nearest=nearestPlace(towns,position.coords.latitude,position.coords.longitude);
        if(!nearest||nearest.miles>30)throw Error('No nearby UK town found. Enter your town manually.');
        input.value=placeLabel(nearest.place);input.dispatchEvent(new Event('change',{bubbles:true}));
        toast(`Suggested ${nearest.place.name}. Check this is the town you want.`);
      }catch(error){toast(error.code===1?'Location access was not allowed. You can type your town.':error.message||'Location could not be found. Type your town.','error');}
      finally{button.disabled=false;button.textContent='Use current location';}
    };
  }
}
export function bindSearchLocations(form,toast){
  bindLocationInput(form.origin,{toast,map:false});bindLocationInput(form.destination,{toast,map:false});
  const controls=document.createElement('div');controls.className='location-controls';
  controls.innerHTML='<button type="button" class="text-action" data-map-field="origin">Departure map</button><button type="button" class="text-action" data-map-field="destination">Destination map</button><button type="button" class="text-action" data-current-town>Use current location</button><label>Pickup area <select name="radiusMiles"><option value="0">Selected town</option><option value="5">Within 5 miles</option><option value="10">Within 10 miles</option><option value="25">Within 25 miles</option><option value="50">Within 50 miles</option></select></label><label class="location-check"><input type="checkbox" name="localDrivers"> Drivers based in this town only</label><p>Location is optional and used once to suggest a town. Your exact position stays on this device. Radius is measured between town centres. Town data: <a href="https://www.geonames.org" target="_blank" rel="noopener">GeoNames</a>.</p>';
  form.append(controls);
  controls.querySelectorAll('[data-map-field]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const {chooseTownOnMap}=await import('./town-map.js');await chooseTownOnMap(form.elements[button.dataset.mapField]);}catch{toast('Map unavailable. Type your town instead.','error');}finally{button.disabled=false;}});
  // Use the same one-shot flow without a second location input.
  const trigger=controls.querySelector('[data-current-town]');
  trigger.onclick=async()=>{
    if(!navigator.geolocation){toast('Type your town; this browser cannot provide location.','error');return;}
    trigger.disabled=true;
    try{const towns=await loadPlaces();const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:300000}));const nearest=nearestPlace(towns,p.coords.latitude,p.coords.longitude);if(!nearest||nearest.miles>30)throw Error('Choose a UK town manually.');form.origin.value=placeLabel(nearest.place);toast(`Suggested ${nearest.place.name}. Check before searching.`);}catch(e){toast(e.code===1?'Location not allowed. Type your town instead.':e.message||'Could not find your town.','error');}finally{trigger.disabled=false;}
  };
}
