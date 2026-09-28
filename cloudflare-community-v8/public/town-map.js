import {findPlace,nearestPlace,placeLabel} from './geo.js';

// Maps load only when requested. The map provider sees the viewed map area,
// never the device's precise GPS reading used by town suggestions.
export async function chooseTownOnMap(input){
  const dialog=document.createElement('dialog');dialog.className='town-map-dialog';dialog.setAttribute('aria-label','Choose a town on the map');
  dialog.innerHTML='<div class="town-map-top"><h2>Choose a town</h2><button type="button" class="outline-btn" data-close>Close map</button></div><p>Tap the map to select the nearest UK town. Pickups are agreed privately after booking. The map provider receives the map area you view.</p><div class="town-map-canvas" aria-label="Interactive UK town map"></div><p data-status role="status">Loading map…</p><div class="town-map-actions"><button type="button" class="primary-btn" data-use disabled>Use this town</button><button type="button" class="outline-btn" data-manual>Type a town instead</button></div>';
  document.body.append(dialog);dialog.showModal();
  let map,selected,closed=false;const status=dialog.querySelector('[data-status]'),use=dialog.querySelector('[data-use]');
  const cleanup=()=>{closed=true;map?.remove();dialog.remove();input.focus();};
  dialog.addEventListener('close',cleanup,{once:true});
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-manual]').onclick=()=>dialog.close();
  use.onclick=()=>{if(selected){input.value=placeLabel(selected);input.dispatchEvent(new Event('change',{bubbles:true}));dialog.close();}};
  try{
    if(!document.querySelector('link[data-maplibre]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/maplibre-gl.css';css.dataset.maplibre='true';document.head.append(css);}
    const [gl,towns]=await Promise.all([import('./vendor/maplibre-gl.mjs'),fetch('/uk-places.json').then(r=>{if(!r.ok)throw Error();return r.json();})]);
    if(closed)return;
    selected=findPlace(towns,input.value);
    gl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
    map=new gl.Map({container:dialog.querySelector('.town-map-canvas'),style:'https://tiles.openfreemap.org/styles/liberty',center:selected?[selected.lon,selected.lat]:[-3.2,54.2],zoom:selected?10:5,maxZoom:15,minZoom:4,attributionControl:true,cooperativeGestures:true});
    map.addControl(new gl.NavigationControl({showCompass:false}),'top-right');
    const marker=new gl.Marker({color:'#c7353b'});
    const showTown=()=>{if(selected){marker.setLngLat([selected.lon,selected.lat]).addTo(map);status.textContent=placeLabel(selected)+' — town centre, not an exact pickup.';use.disabled=false;}else{status.textContent='Tap near your departure or destination town.';use.disabled=true;}};
    map.on('load',showTown);
    map.on('click',event=>{const nearest=nearestPlace(towns,event.lngLat.lat,event.lngLat.lng);selected=nearest&&nearest.miles<=30?nearest.place:null;showTown();if(!selected)status.textContent='No nearby UK town found. Try another point or type your town.';});
    map.on('error',()=>{status.textContent='Some map details could not load. You can type a town instead.';});
    map.on('webglcontextlost',()=>{status.textContent='The map is unavailable on this device. Type your town instead.';use.disabled=true;});
  }catch{status.textContent='The map could not load. You can still type your town and search for rides.';}
}
