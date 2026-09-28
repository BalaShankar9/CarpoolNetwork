export function createLiveTrips({api,esc,openSheet,closeSheet,showToast}){
  return async function openTrip(id){
    let shareId='',watch=null,timer=null,map=null,markers=[],positions=[],stopped=false,lastSent=0,inflight=false;
    const path='/api/trips/'+encodeURIComponent(id);
    try{
      const {trip}=await api(path);
      openSheet(`<div id="liveTrip"><span class="eyebrow">YOUR CONFIRMED JOURNEY</span><h2>${esc(trip.origin)} → ${esc(trip.destination)}</h2><p id="tripState" role="status">${esc(trip.status.replaceAll('_',' '))}</p><p>Confirmed participants: ${trip.participants.map(p=>esc(p.name)).join(', ')}.</p>${trip.role==='driver'&&trip.status==='not_started'?'<button class="primary-btn" id="startLiveTrip">Start this trip</button>':''}<div id="sharingControls" ${trip.status==='active'?'':'hidden'}><label class="location-check"><input type="checkbox" id="locationConsent"> Share my precise location with the confirmed participants of this trip.</label><p>Sharing works while this screen is open and visible. Switching apps, locking your phone or losing signal can pause updates. Points disappear after 90 seconds without an update. Closing this screen stops your sharing.</p><div class="toolbar-actions"><button class="primary-btn" id="shareTripLocation">Share my location</button><button class="outline-btn" id="stopTripLocation" disabled>Stop sharing</button><button class="outline-btn" id="showTripMap">Show trip map</button></div><p class="auth-intro">Opening the map requests tiles from OpenFreeMap for the area viewed. Member coordinates are drawn on this device; the map provider receives your IP and viewed area.</p><div id="liveTripMap" class="town-map-canvas" hidden></div><div id="tripLocations" aria-live="polite"></div></div>${trip.role==='driver'&&['active','expired'].includes(trip.status)?'<button class="danger-outline" id="finishLiveTrip">Finish trip for everyone</button>':''}<p id="tripError" class="form-error" role="alert"></p></div>`);
      const root=document.querySelector('#liveTrip'),status=root.querySelector('#tripState');
      async function stop(quiet=false){
        if(watch!==null||shareId){if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;shareId='';await api(path+'/location',{method:'DELETE',keepalive:true}).catch(()=>{});}
        if(root.isConnected){root.querySelector('#shareTripLocation').disabled=false;root.querySelector('#stopTripLocation').disabled=true;if(!quiet)status.textContent='Your location sharing is stopped.';}
      }
      function clearMarkers(){markers.forEach(m=>m.remove());markers=[];}
      function draw(){if(!map)return;clearMarkers();for(const p of positions){const dot=document.createElement('div');dot.className='trip-position-dot';dot.textContent=p.name;dot.title=`${p.name} · ±${Math.round(p.accuracy)} m`;markers.push(new map.library.Marker({element:dot}).setLngLat([p.lon,p.lat]).addTo(map));}if(positions.length&&!map.positioned){map.jumpTo({center:[positions[0].lon,positions[0].lat],zoom:13});map.positioned=true;}}
      async function poll(){
        if(stopped||!root.isConnected)return;
        try{
          const result=await api(path+'/location');if(stopped)return;
          if(!result.active){await stop(true);positions=[];clearMarkers();root.querySelector('#sharingControls').hidden=true;status.textContent='Trip sharing has ended.';return;}
          positions=result.positions;root.querySelector('#tripLocations').innerHTML=positions.length?positions.map(p=>`<p><strong>${esc(p.name)}</strong> · ${Math.max(0,Math.floor((Date.now()-p.receivedAt)/1000))} seconds ago · accuracy ±${Math.round(p.accuracy)} m</p>`).join(''):'<p>No recent locations are being shared.</p>';draw();
        }catch(error){positions=[];clearMarkers();if(root.isConnected)root.querySelector('#tripError').textContent=error.message;if([401,403,404].includes(error.status)){await stop(true);status.textContent='Trip access ended.';return;}}
        if(!stopped)timer=setTimeout(()=>{if(document.visibilityState==='visible')poll();},10000);
      }
      const onVisibility=()=>{if(document.visibilityState!=='visible'){clearTimeout(timer);stop();positions=[];clearMarkers();}else if(trip.status==='active')poll();};
      const cleanup=()=>{stopped=true;clearTimeout(timer);stop(true);map?.remove();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',cleanup);};
      root.closest('#sheetBackdrop').addEventListener('close',cleanup,{once:true});window.addEventListener('pagehide',cleanup,{once:true});document.addEventListener('visibilitychange',onVisibility);
      root.querySelector('#startLiveTrip')?.addEventListener('click',async e=>{e.target.disabled=true;try{await api(path+'/start',{method:'POST',body:'{}'});await openTrip(id);}catch(error){root.querySelector('#tripError').textContent=error.message;e.target.disabled=false;}});
      root.querySelector('#finishLiveTrip')?.addEventListener('click',async e=>{if(!confirm('Finish this trip for everyone and stop all location sharing?'))return;e.target.disabled=true;try{await api(path+'/finish',{method:'POST',body:JSON.stringify({confirm:true})});closeSheet();showToast('Trip finished. Location sharing has stopped.','success');}catch(error){root.querySelector('#tripError').textContent=error.message;e.target.disabled=false;}});
      root.querySelector('#shareTripLocation').onclick=async()=>{
        root.querySelector('#tripError').textContent='';
        if(!root.querySelector('#locationConsent').checked){root.querySelector('#tripError').textContent='Confirm who can see your location before sharing.';return;}
        if(!navigator.geolocation){root.querySelector('#tripError').textContent='Location is unavailable on this device. Arrange pickup in booking chat.';return;}
        if(watch!==null)return;root.querySelector('#shareTripLocation').disabled=true;root.querySelector('#stopTripLocation').disabled=false;status.textContent='Waiting for your location…';
        try{const started=await api(path+'/location',{method:'POST',body:JSON.stringify({begin:true,consent:true})});shareId=started.shareId;if(stopped||document.visibilityState!=='visible'){await stop(true);return;}}catch(error){root.querySelector('#tripError').textContent=error.message;root.querySelector('#shareTripLocation').disabled=false;return;}
        watch=navigator.geolocation.watchPosition(async p=>{if(stopped||inflight||Date.now()-lastSent<5000)return;inflight=true;lastSent=Date.now();try{
          const result=await api(path+'/location',{method:'POST',body:JSON.stringify({consent:true,shareId,position:{lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:p.timestamp}})});
          if(stopped)return;if(!result.active){await stop(true);status.textContent='Trip sharing has ended.';return;}status.textContent='Sharing your location with confirmed trip participants.';
        }catch(e){root.querySelector('#tripError').textContent=e.message;if([401,403,404,409,428].includes(e.status))await stop(true);}finally{inflight=false;}},error=>{root.querySelector('#tripError').textContent=error.code===1?'Location permission was denied. You can still use booking chat.':'Location is unavailable. Move to a clearer area and try again.';stop(true);},{enableHighAccuracy:true,maximumAge:10000,timeout:15000});
      };
      root.querySelector('#stopTripLocation').onclick=()=>stop();
      root.querySelector('#showTripMap').onclick=async e=>{e.target.disabled=true;try{
        if(!document.querySelector('link[data-maplibre]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/maplibre-gl.css';css.dataset.maplibre='true';document.head.append(css);}
        const gl=await import('./vendor/maplibre-gl.mjs');if(stopped)return;gl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');const canvas=root.querySelector('#liveTripMap');canvas.hidden=false;
        map=new gl.Map({container:canvas,style:'https://tiles.openfreemap.org/styles/liberty',center:[-3.2,54.2],zoom:5,maxZoom:16,attributionControl:true});map.library=gl;map.on('load',draw);map.on('error',()=>{if(root.isConnected)root.querySelector('#tripError').textContent='Some map tiles could not load. Location update times remain available below.';});
      }catch{root.querySelector('#tripError').textContent='Map unavailable on this device. Use the location update list and booking chat.';}};
      if(trip.status==='active')await poll();
    }catch(error){showToast(error.message,'error');}
  };
}
