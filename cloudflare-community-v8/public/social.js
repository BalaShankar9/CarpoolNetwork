import { createEmailUI } from './email-ui.js';
export function createSocialUI(h) {
  const { api, esc, icon, shell, beginView, state, openSheet, closeSheet, showToast, openPost, openUser } = h;
  const $ = selector => document.querySelector(selector);
  const post = (path, body = {}) => api(path, { method: 'POST', body: JSON.stringify(body) });
  const safe = fn => async (...args) => { try { await fn(...args); } catch (error) { showToast(error.message, 'error'); } };
  const button = (name, label, attrs = '') => `<button class="outline-btn small" ${attrs}>${icon(name)} ${esc(label)}</button>`;
  let socket, heartbeat, reconnect, refreshTimer, generation = 0, currentRoom, messages = [], overview, selectedReply = null, photoId = null, mentionIds = [];
  function stop() { generation++; clearInterval(heartbeat); clearTimeout(reconnect); clearTimeout(refreshTimer); if (socket) { socket.onclose = null; socket.close(); } socket = null; }
  const draftMemory=new Map();
  const draftStore={getItem:k=>{try{return localStorage.getItem(k)||draftMemory.get(k)||'';}catch{return draftMemory.get(k)||'';}},setItem:(k,v)=>{draftMemory.set(k,v);try{localStorage.setItem(k,v);}catch{}},removeItem:k=>{draftMemory.delete(k);try{localStorage.removeItem(k);}catch{}}};
  const draftKey = id => `cn-chat-draft:${state.profile?.id}:${id}`;
  const time = value => new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z')).toLocaleString('en-GB', { day:'numeric',month:'short',hour:'2-digit',minute:'2-digit' });
  function connect(id, visit) {
    if (visit !== generation) return;
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/social/rooms/${encodeURIComponent(id)}/live`);
    socket = ws;
    const presence = () => { if (ws.readyState === 1) ws.send(JSON.stringify({ type:'presence',visible:document.visibilityState === 'visible' })); };
    ws.onopen = () => { if ($('#chatStatus')) $('#chatStatus').textContent = 'Connected'; presence(); clearInterval(heartbeat); heartbeat = setInterval(presence, 30000); safe(()=>loadMessages(id,visit))(); };
    ws.onmessage = safe(async event => {
      if (visit !== generation) return;
      const data = JSON.parse(event.data);
      if(data.type==='session_ended'){stop();if($('#chatStatus'))$('#chatStatus').textContent='Signed out';if($('#sendMessage'))$('#sendMessage').disabled=true;return;}
      if (data.type === 'presence' && $('#onlineCount')) $('#onlineCount').textContent = `${data.online} online in this room`;
      if (data.type === 'refresh') {clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refreshTimer=null;safe(()=>loadMessages(id,visit))();},750);}
      if (data.type === 'message' && !refreshTimer) refreshTimer=setTimeout(()=>{refreshTimer=null;safe(()=>loadMessages(id,visit,0,true))();},750);
    });
    ws.onclose = event => {
      clearInterval(heartbeat);
      if (visit !== generation) return;
      if ($('#onlineCount')) $('#onlineCount').textContent='Online count unavailable';
      if(event.code===1008){if($('#chatStatus'))$('#chatStatus').textContent='Access ended';if($('#sendMessage'))$('#sendMessage').disabled=true;return;}
      if ($('#chatStatus')) $('#chatStatus').textContent = navigator.onLine ? 'Reconnecting...' : 'Offline';
      reconnect = setTimeout(() => connect(id, visit), 5000);
    };
  }
  document.addEventListener('visibilitychange', () => { if (socket?.readyState === 1) socket.send(JSON.stringify({type:'presence',visible:document.visibilityState === 'visible'})); });
  function messageHtml(m) {
    const own = m.author_id === state.profile.id;
    const listing = m.post ? `<div class="chat-listing"><span>${esc(m.post.category.replaceAll('_',' '))} · ${esc(m.post.status)}</span><strong>${esc(m.post.title)}</strong>${m.post.journeyDate ? `<p>${esc(m.post.journeyDate)} · ${esc(m.post.timeWindow ? m.post.timeWindow.start + ' to ' + m.post.timeWindow.end : m.post.journeyTime)} · ${m.post.availableSeats} seats</p>` : ''}${button('chevron','View listing',`data-listing="${esc(m.post.id)}"`)}</div>` : '';
    return `<article class="chat-message ${own ? 'own' : ''}" data-message="${esc(m.id)}"><header><button class="chat-author" data-author="${esc(m.author_id)}">${esc(m.author_name)}</button><time>${esc(time(m.created_at))}${m.edited_at ? ' · edited' : ''}</time></header>
      ${m.reply_to ? `<button class="chat-reply-ref" data-jump="${esc(m.reply_to)}">${icon('comment')} Reply to message</button>` : ''}
      <p class="message-body">${m.deleted ? '<em>Message removed</em>' : esc(m.body)}</p>
      ${(m.media || []).map(p => `<img class="chat-photo" loading="lazy" src="/api/social/media/${esc(p.id)}" alt="Photo shared by ${esc(m.author_name)}">`).join('')}${listing}
      ${own && !m.post && ['ready','clarification','manual'].includes(m.extraction_status) ? `<div class="chat-clarification"><span>Listing needs your details</span>${button('edit','Complete listing',`data-action="clarify"`)}</div>` : ''}
      ${!m.deleted ? `<footer class="message-actions">${button('comment','Reply','data-action="reply"')}${button('heart',String(m.reactions?.reduce((n,r)=>n+r.count,0) || 'Like'),'data-action="react"')}<details><summary aria-label="Message options">More</summary><div>${own ? `${button('edit','Edit','data-action="edit"')}${button('trash','Remove message','data-action="delete"')}${m.post ? button('x','Close listing','data-action="undo"') : ''}` : button('alert','Report','data-action="report"')}${['owner','moderator'].includes(currentRoom?.role) ? button('megaphone',m.pinned ? 'Unpin' : 'Pin','data-action="pin"') : ''}</div></details></footer>` : ''}</article>`;
  }
  function emptyConversation(query=''){
    if(query)return `<div class="conversation-welcome"><span class="welcome-symbol">${icon('search')}</span><h3>No matching messages</h3><p>Try another word or clear your search to return to the conversation.</p><button class="outline-btn" id="clearChatSearch">Clear search</button></div>`;
    const shared=['lounge','community'].includes(currentRoom?.kind);
    return `<div class="conversation-welcome"><span class="welcome-symbol">${icon(shared?'users':'comment')}</span><span class="eyebrow">${shared?'A PLACE TO CONNECT':'KEEP THE DETAILS TOGETHER'}</span><h3>${shared?'A good journey starts with hello.':'Your conversation starts here.'}</h3><p>${shared?'Introduce yourself, ask about a route, or share something useful with your community.':'Say hello and agree the pickup, timing and anything your ride partner should know.'}</p><div class="conversation-starters"><button type="button" data-chat-starter="hello">${shared?'Introduce myself':'Say hello'}</button><button type="button" data-chat-starter="route">${shared?'Ask about a route':'Arrange the pickup'}</button></div><small>${shared?'Keep phone numbers and exact pickup addresses in your private booking chat.':'Only members of this conversation can read these messages.'}</small></div>`;
  }
  let messageLoadRevision = 0;
  async function loadMessages(id, visit, before = 0, incremental = false) {
    const revision = ++messageLoadRevision;
    try {
      const q = $('#chatSearch')?.value || '';
      const result = await api(`/api/social/rooms/${encodeURIComponent(id)}/messages?q=${encodeURIComponent(q)}${before ? `&before=${before}` : incremental && messages.length ? `&after=${messages.at(-1).seq}` : ''}`);
      if (visit !== generation || revision !== messageLoadRevision || !$('#chatMessages')) return;
      currentRoom = result.room;
      messages = before ? [...result.messages,...messages].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i) : incremental ? [...messages,...result.messages].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i) : result.messages;
      const viewport = $('#chatMessages'), atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
      viewport.innerHTML = (messages.length ? messages.map(messageHtml).join('') : emptyConversation(q));
      viewport.querySelectorAll('.message-actions details>div').forEach(menu=>menu.insertAdjacentHTML('afterbegin',button('users','Mention','data-action="mention"')));
      if(currentRoom.kind==='community')viewport.querySelectorAll('.chat-message.own:has(.chat-listing) .message-actions details>div').forEach(menu=>menu.insertAdjacentHTML('beforeend',button('share','Share with all members','data-action="share"')));
      $('#chatPinned').innerHTML = result.pinned.map(p=>`<div>${icon('megaphone')} ${esc(p.body)}</div>`).join('');
      $('#olderMessages').hidden = result.messages.length < 50;
      $('#sendMessage').disabled = !result.canWrite;
      $('#chatWriteNotice').textContent = result.canWrite ? '' : overview.verifiedEmail ? 'This conversation is read-only or waiting for the other member to accept.' : 'Verify your email in Account to send messages.';
      if(!messages.length)viewport.scrollTop=0;else if (!before && atBottom) viewport.scrollTop = viewport.scrollHeight;
      viewport.querySelector('#clearChatSearch')?.addEventListener('click',safe(async()=>{$('#chatSearch').value='';await loadMessages(id,visit);}));
      viewport.querySelectorAll('[data-chat-starter]').forEach(b=>b.onclick=()=>{
        const field=$('#chatText');if(!field.value.trim()){field.value=b.dataset.chatStarter==='hello'?`Hi${['lounge','community'].includes(currentRoom.kind)?' everyone':''}, I'm ${state.profile.name.split(' ')[0]}. `:currentRoom.kind==='lounge'||currentRoom.kind==='community'?`Is anyone travelling from ${state.profile.area||'my area'} to `:'Hi! Where would be a good place to meet?';draftStore.setItem(draftKey(id),field.value);}field.focus();
      });
      viewport.querySelectorAll('[data-author]').forEach(b=>b.onclick=()=>openUser(b.dataset.author));
      viewport.querySelectorAll('[data-listing]').forEach(b=>b.onclick=()=>openPost(b.dataset.listing));
      viewport.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{ const el=viewport.querySelector(`[data-message="${CSS.escape(b.dataset.jump)}"]`); if(el)el.scrollIntoView({block:'center'});else showToast('Load earlier messages to see this reply.'); });
      viewport.querySelectorAll('[data-action]').forEach(b=>b.onclick=safe(()=>messageAction(messages.find(m=>m.id===b.closest('[data-message]').dataset.message),b.dataset.action)));
      if (document.visibilityState === 'visible' && messages.length) await post(`/api/social/rooms/${encodeURIComponent(id)}/preferences`,{readSeq:messages.at(-1).seq,muted:!!currentRoom.muted});
    } finally { /* Navigation and newer refreshes invalidate earlier responses. */ }
  }
  async function render(view = 'chat', roomId = '') {
    beginView(view, roomId ? {room:roomId} : {});
    const visit = generation;
    shell('<p class="chat-empty">Loading conversations...</p>',view);
    try {
      overview = await api('/api/social/overview');
      if (visit !== generation) return;
      if (view === 'businesses') return renderBusinesses(visit);
      const rooms = overview.rooms.filter(r=>view === 'inbox' ? ['direct','booking'].includes(r.kind) : ['lounge','community'].includes(r.kind));
      const selected = rooms.find(r=>r.id===roomId) || rooms.find(r=>r.membership!=='pending');
      const list = `<aside class="room-list"><div class="room-list-heading"><h1>${view==='inbox'?'Messages':'Community'}</h1>${button('plus','',`id="newCommunity" aria-label="${view==='inbox'?'New message':'Create community'}" title="${view==='inbox'?'New message':'Create community'}"`)}</div>
        ${rooms.map(r=>`<button class="room-link ${r.id===selected?.id?'selected':''}" data-room="${esc(r.id)}"><strong>${esc(r.title)}</strong><span>${r.membership==='pending'?'Message request':r.kind==='booking'?'Ride conversation':r.unread?`${r.unread} unread`:r.kind==='lounge'?'All members':'Community'}</span></button>`).join('')}
        ${view==='chat'?`<div class="community-discovery"><span class="eyebrow">YOUR PEOPLE, YOUR ROUTES</span><p>Find a local group or bring your regular travel community together.</p>${button('users','Browse groups','id="browseCommunities"')}</div>`:''}
        <div class="room-tools">${view==='chat'?button('bag','Local listings','id="localListings"'):''}${button('shield','Reports','id="socialReports"')}${button('user','Account security','id="socialAccount"')}</div></aside>`;
      if (!selected) {
        shell(`<section class="chat-workspace">${list}<div class="chat-empty"><span class="setup-icon">${icon(view==='inbox'?'comment':'users')}</span><h2>${view==='inbox'?'Your conversations start here':'Find your people'}</h2><p>${view==='inbox'?'Accepted bookings have their own conversation. You can also request a chat from a member’s profile.':'Join a local group to arrange journeys and keep in touch.'}</p>${button('search','Find a ride','id="chatFindRide"')}</div></section>`,view);
        bindSidebar(view,rooms); return;
      }
      currentRoom = selected;
      shell(`<section class="chat-workspace">${list}<section class="chat-pane" aria-label="Conversation"><header class="chat-heading"><div class="chat-room-title"><span class="room-symbol">${icon(selected.kind==='lounge'?'users':selected.kind==='booking'?'car':'comment')}</span><div><h2>${esc(selected.title)}</h2><span id="onlineCount">Connecting to the room…</span></div></div><div class="chat-heading-actions">${button('search','','id="toggleChatSearch" aria-label="Search conversation" aria-expanded="false" aria-controls="chatSearchPanel"')}${button('bell',selected.muted?'Unmute':'Mute','id="muteRoom"')}${!selected.id.startsWith('commute:')&&['owner','moderator'].includes(selected.role)?button('users','Members','id="roomMembers"'):''}</div></header>
        <div id="chatSearchPanel" class="chat-search" hidden><input id="chatSearch" type="search" aria-label="Search messages" placeholder="Search this conversation">${button('search','Search','id="runChatSearch"')}</div><div id="chatPinned" class="chat-pinned"></div>
        <button class="text-action" id="olderMessages" hidden>Earlier messages</button><div id="chatMessages" class="chat-messages" role="log" aria-label="Messages" aria-live="polite"></div>
        <form id="chatComposer" class="chat-composer"><div id="replyNotice"></div><p id="chatWriteNotice" role="status"></p><textarea id="chatText" maxlength="2000" rows="2" aria-label="Message" placeholder="Message ${esc(selected.title)}"></textarea><div class="composer-tools"><span class="chat-audience">${icon(selected.kind==='lounge'?'users':'lock')} ${selected.kind==='lounge'?'Visible to all signed-in members':selected.kind==='community'?'Visible to this group’s members':'Only this conversation’s members'}</span><span id="photoStatus"></span>${overview.uploads ? '<label class="outline-btn small" title="Attach photo"><input type="file" id="chatPhoto" accept="image/jpeg,image/png,image/webp" hidden>Photo</label>':''}<span id="chatStatus" role="status">Connecting...</span><button class="primary-btn small" id="sendMessage" type="submit">${icon('arrow')} Send</button></div><p id="sendError" class="form-error" role="alert"></p></form></section></section>`,view);
      bindSidebar(view,rooms);
      const id=selected.id;
      if(selected.kind==='booking'){
        // Optional external contact must never prevent the in-app chat from loading.
        const contact=await api('/api/ride-requests/'+encodeURIComponent(id.replace(/^booking:/,''))+'/contact').catch(()=>({contact:null}));
        if(visit!==generation)return;
        if(contact.contact){const link=document.createElement('a');link.className='whatsapp-link compact';link.href=contact.contact.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open WhatsApp';document.querySelector('.chat-heading').append(link);}
      }
      $('#chatText').value=draftStore.getItem(draftKey(id))||'';
      $('#chatText').oninput=()=>draftStore.setItem(draftKey(id),$('#chatText').value);
      $('#toggleChatSearch').onclick=()=>{const panel=$('#chatSearchPanel');panel.hidden=!panel.hidden;$('#toggleChatSearch').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)$('#chatSearch').focus();else if($('#chatSearch').value){$('#chatSearch').value='';safe(()=>loadMessages(id,visit))();}};
      $('#chatSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();safe(()=>loadMessages(id,visit))();}};
      $('#runChatSearch').onclick=safe(()=>loadMessages(id,visit));
      $('#olderMessages').onclick=safe(()=>loadMessages(id,visit,messages[0]?.seq));
      $('#muteRoom').onclick=safe(async()=>{await post(`/api/social/rooms/${id}/preferences`,{muted:!currentRoom.muted});await render(view,id);});
      $('#roomMembers')?.addEventListener('click',safe(()=>members(id)));
      if(selected.kind==='community'&&!selected.id.startsWith('commute:')&&selected.role!=='owner'){
        $('#muteRoom').insertAdjacentHTML('afterend',button('x','Leave','id="leaveRoom"'));
        $('#leaveRoom').onclick=safe(async()=>{if(confirm('Leave this community? Existing bookings are not cancelled.')){await post(`/api/social/rooms/${id}/leave`);await render('chat');}});
      }
      let pendingClientId=null,pendingBody=null;
      $('#chatComposer').onsubmit=safe(async e=>{
        e.preventDefault(); const text=$('#chatText').value;
        if(!text.trim()&&!photoId)return;
        if(pendingBody!==text){pendingClientId=null;pendingBody=text;}
        pendingClientId ||= crypto.randomUUID(); $('#sendMessage').disabled=true;$('#sendError').textContent='';
        try {
          await post(`/api/social/rooms/${id}/messages`,{body:text,clientId:pendingClientId,chatOnly:true,replyTo:selectedReply,mediaId:photoId,mentionIds});
          pendingClientId=null;selectedReply=null;photoId=null;mentionIds=[];
          if(draftStore.getItem(draftKey(id))===text)draftStore.removeItem(draftKey(id));
          if(visit!==generation)return;
          if($('#chatText').value===text)$('#chatText').value='';$('#replyNotice').textContent='';$('#photoStatus').textContent='';
          await loadMessages(id,visit); $('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;
        } catch(error) { if(visit===generation)$('#sendError').textContent=`${error.message} Your message is saved. Send again to retry.`; }
        finally { if(visit===generation)$('#sendMessage').disabled=false; }
      });
      $('#chatPhoto')?.addEventListener('change',safe(async e=>{
        const file=e.target.files[0];if(!file)return;
        if(file.size>10000000)throw new Error('Choose a photo under 10 MB.');
        const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
        const jpeg=canvas.toDataURL('image/jpeg',0.8).split(',')[1];
        const uploaded=await post('/api/social/media',{roomId:id,jpeg});photoId=uploaded.id;$('#photoStatus').textContent='Photo attached';
      }));
      await loadMessages(id,visit);connect(id,visit);
    } catch(error) { if(visit===generation){shell(`<section class="chat-empty"><h1>Conversation unavailable</h1><p>${esc(error.message)}</p>${button('arrow','Retry','id="retryChat"')}</section>`,view);$('#retryChat').onclick=()=>render(view,roomId);} }
  }
  function browseCommunities(){
    openSheet(`<span class="eyebrow">YOUR COMMUNITY</span><h2>Find a group</h2><p>Join a local conversation. Private groups may need approval from their owner.</p><div class="chat-directory-list">${overview.communities.filter(c=>c.status==='approved').map(c=>`<article><h3>${esc(c.name)}</h3><p>${esc(c.description||'Connect with members of this community.')}</p><p>${esc(c.access==='open'?'Open community':'Private community')}</p>${button('plus','Join community',`data-directory-join="${esc(c.id)}"`)}</article>`).join('')||'<p>No groups are available to join yet. You can start a community from the + button.</p>'}</div>`);
    document.querySelectorAll('[data-directory-join]').forEach(b=>b.onclick=safe(async()=>{b.disabled=true;try{const d=await post(`/api/social/communities/${encodeURIComponent(b.dataset.directoryJoin)}/join`);closeSheet();showToast(d.status==='pending'?'Join request sent':'Joined');await render('chat',b.dataset.directoryJoin);}catch(e){b.disabled=false;throw e;}}));
  }
  function bindSidebar(view,rooms) {
    $('#browseCommunities')?.addEventListener('click',browseCommunities);
    $('#chatFindRide')?.addEventListener('click',()=>h.navigate('home'));
    $('#localListings')?.addEventListener('click',()=>h.navigate('community'));
    if(view==='inbox'){
      $('.room-list-heading').insertAdjacentHTML('afterend',button('bell','Activity','id="inboxActivity"'));
      $('#inboxActivity').onclick=()=>h.navigate('alerts');
    }
    document.querySelectorAll('[data-room]').forEach(b=>b.onclick=safe(async()=>{
      const r=rooms.find(r=>r.id===b.dataset.room);
      if(r.membership==='pending'){
        openSheet(`<h2>Message request</h2><p>Accept this conversation?</p>${button('check','Accept','id="acceptDirect"')}${button('x','Decline','id="declineDirect"')}`);
        for(const [key,status] of [['acceptDirect','active'],['declineDirect','declined']])$('#'+key).onclick=safe(async()=>{await post(`/api/social/rooms/${r.id}/respond`,{status});closeSheet();render(view,r.id);});
      } else render(view,r.id);
    }));
    document.querySelectorAll('[data-join]').forEach(b=>b.onclick=safe(async()=>{const d=await post(`/api/social/communities/${b.dataset.join}/join`);showToast(d.status==='pending'?'Join request sent':'Joined');render('chat',b.dataset.join);}));
    $('#newCommunity').onclick=view==='inbox'?()=>{openSheet(`<h2>New message</h2><p>Open a member profile from a post or chat message to request a conversation.</p>`);}:newCommunity;
    $('#socialAccount').onclick=account;
    $('#socialReports').onclick=reports;
  }
  async function messageAction(message,action) {
    if(action==='share'){if(confirm('Share this listing with every signed-in member? The original community conversation stays private.'))await post(`/api/social/listings/${message.post.id}/share`,{audience:'lounge',confirm:true});return;}
    if(action==='mention'){mentionIds=[...new Set([...mentionIds,message.author_id])].slice(0,5);$('#chatText').value+=`@${message.author_name} `;$('#chatText').focus();return;}
    if(action==='reply'){selectedReply=message.id;$('#replyNotice').textContent=`Replying to ${message.author_name}`;$('#chatText').focus();return;}
    if(action==='clarify')return clarify(message);
    let data={};
    if(action==='edit'){const body=prompt('Edit message',message.body);if(body===null)return;data={body};}
    if(action==='report'){const reason=prompt('What is wrong with this message?');if(!reason)return;data={reason};}
    if(action==='delete'&&!confirm('Remove this message? Any linked listing and booking remain until separately closed or cancelled.'))return;
    if(action==='undo'&&!confirm('Close the linked listing? Confirmed bookings must be cancelled separately.'))return;
    if(action==='react')data={reaction:'like'};
    if(action==='pin')data={pinned:!message.pinned};
    await post(`/api/social/messages/${message.id}/${action}`,data);await loadMessages(currentRoom.id,generation);
  }
  function clarify(message) {
    openSheet(`<h2>Complete listing</h2><form id="clarifyForm" class="simple-form"><label>Type<select name="category">${['ride_wanted','ride_offer','marketplace','job','service','accommodation'].map(k=>`<option value="${k}">${k.replaceAll('_',' ')}</option>`).join('')}</select></label><label>Title<input name="title" maxlength="140" value="${esc(message.body.slice(0,140))}"></label><label>Details<textarea name="body">${esc(message.body)}</textarea></label><div id="clarifyRide"><label>From<input name="origin"></label><label>To<input name="destination"></label><label>Date<input name="journeyDate" type="date"></label><label>Time<input name="journeyTime" type="time"></label><label>End of time window (ride requests only)<input name="windowEnd" type="time"></label><label>Seats<input name="seats" type="number" min="1" max="8" value="1"></label></div><label>Area<input name="location" value="${esc(state.profile.area)}"></label><label>Price (optional)<input name="price"></label><p class="form-error" id="clarifyError" role="alert"></p><button class="primary-btn">Publish to this conversation</button></form>`);
    const form=$('#clarifyForm');form.category.onchange=()=>$('#clarifyRide').hidden=!form.category.value.startsWith('ride_');
    const draft=JSON.parse(message.draft_json||'{}');for(const [key,value] of Object.entries(draft))if(form.elements.namedItem(key))form.elements.namedItem(key).value=value;form.category.onchange();
    form.onsubmit=async e=>{e.preventDefault();try{await post(`/api/social/messages/${message.id}/clarify`,Object.fromEntries(new FormData(form)));closeSheet();await loadMessages(currentRoom.id,generation);}catch(error){$('#clarifyError').textContent=error.message;}};
  }
  function newCommunity() {
    openSheet(`<h2>Request a community</h2><form id="communityForm" class="simple-form"><label>Name<input name="name" maxlength="80" required></label><label>Description<textarea name="description" maxlength="500"></textarea></label><label>Membership<select name="access"><option value="open">Open to members</option><option value="approval">Join by approval</option><option value="invite">Invite only</option></select></label><button class="primary-btn">Request approval</button></form>`);
    $('#communityForm').insertAdjacentHTML('beforebegin',(overview?.communities||[]).filter(c=>c.status==='approved').map(c=>`<div class="community-row"><strong>${esc(c.name)}</strong>${button('plus','Join',`data-discover="${esc(c.id)}"`)}</div>`).join(''));
    document.querySelectorAll('[data-discover]').forEach(b=>b.onclick=safe(async()=>{const d=await post(`/api/social/communities/${b.dataset.discover}/join`);closeSheet();showToast(d.status==='pending'?'Join request sent':'Joined');await render('chat',b.dataset.discover);}));
    $('#communityForm').onsubmit=safe(async e=>{e.preventDefault();await post('/api/social/communities',Object.fromEntries(new FormData(e.currentTarget)));closeSheet();await render('chat');});
  }
  async function members(id) {
    const data=await api(`/api/social/communities/${id}/members`);
    openSheet(`<h2>Community members</h2><div class="member-management">${data.members.map(m=>`<div><strong>${esc(m.name)}</strong><span>${esc(m.role)} · ${esc(m.status)}</span>${m.role!=='owner'?`${button('check','Approve',`data-member="${esc(m.user_id)}" data-status="active"`)}${button('x','Remove',`data-member="${esc(m.user_id)}" data-status="removed"`)}${currentRoom.role==='owner'?button('shield','Make moderator',`data-member="${esc(m.user_id)}" data-status="active" data-role="moderator"`):''}`:''}</div>`).join('')}</div><form id="inviteMember" class="simple-form"><label>Member ID<input name="userId" required></label><button class="primary-btn">Invite member</button></form>`);
    document.querySelectorAll('[data-member]').forEach(b=>b.onclick=safe(async()=>{await post(`/api/social/communities/${id}/members`,{userId:b.dataset.member,status:b.dataset.status,role:b.dataset.role||'member'});await members(id);}));
    $('#inviteMember').onsubmit=safe(async e=>{e.preventDefault();await post(`/api/social/communities/${id}/members`,{userId:e.currentTarget.userId.value,status:'invited'});await members(id);});
  }
  async function reports() {
    const data=await api('/api/social/reports');
    openSheet(`<h2>Reports & moderation</h2>${data.communities.map(c=>`<div class="community-row"><strong>${esc(c.name)}</strong><p>${esc(c.description)}</p>${button('check','Approve',`data-approve="${esc(c.id)}"`)}</div>`).join('')}<div class="social-reports">${data.reports.map(r=>`<article><strong>${esc(r.reason)}</strong><p>${esc(r.status)} · ${esc(r.resolution)}</p><pre>${esc(JSON.parse(r.evidence_json).body||'')}</pre>${r.reporter_id===state.profile.id?button('message','Appeal',`data-appeal="${esc(r.id)}"`):button('check','Resolve',`data-resolve="${esc(r.id)}"`)}</article>`).join('')||'<p>No reports.</p>'}</div>`);
    if(state.adminToken){
      $('.social-reports').insertAdjacentHTML('beforebegin',button('shield','Usage & cost controls','id="costControls"'));
      $('#costControls').onclick=safe(async()=>{
        const d=await api('/api/social/usage');
        openSheet(`<h2>Usage & cost controls</h2><p>${esc(d.month)} · ${esc(d.estimateSource)}</p><p>${d.estimatedGbp===null?'Cost estimate unavailable':`Recorded estimate: GBP ${d.estimatedGbp}`}</p><p>${d.optionalPaused?'AI and photo uploads paused':d.warning?'Cost warning threshold reached':'Within the recorded warning threshold'}</p><ul>${d.usage.map(u=>`<li>${esc(u.metric)}: ${u.amount}</li>`).join('')}</ul><form id="costForm" class="simple-form"><label>Cloudflare monthly estimate (GBP)<input name="estimatedGbp" type="number" min="0" step="0.01" required></label><button class="primary-btn">Update estimate</button></form>`);
        $('#costForm').onsubmit=safe(async e=>{e.preventDefault();await post('/api/social/usage',{estimatedGbp:Number(e.currentTarget.estimatedGbp.value)});closeSheet();showToast('Cost controls updated');});
      });
    }
    document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=safe(async()=>{await post(`/api/social/communities/${b.dataset.approve}/decision`,{status:'approved'});reports();}));
    document.querySelectorAll('[data-resolve],[data-appeal]').forEach(b=>b.onclick=safe(async()=>{const value=prompt(b.dataset.resolve?'Resolution':'Reason for appeal');if(value){await post(`/api/social/reports/${b.dataset.resolve||b.dataset.appeal}`,b.dataset.resolve?{resolution:value}:{appeal:value});reports();}}));
  }
  async function account() {
    try {
      const data=await api('/api/auth/email/status');
      openSheet(`<h2>Account security</h2><p>${data.email?`${esc(data.email)} · Email verified`:'Email not verified'}</p><p>${state.phoneVerificationRequired?'Manage SMS verification in Account → WhatsApp contact.':'Manage your WhatsApp number in Account. SMS verification is currently off.'} Email or phone verification does not prove identity.</p>${!data.email?button('message','Verify email','id="verifyEmail"'):button('lock','Add passkey','id="addPasskey"')}<div>${data.passkeys.map(p=>`<div class="community-row"><strong>${esc(p.label)}</strong>${button('trash','Remove',`data-key="${esc(p.id)}"`)}</div>`).join('')}</div><hr>${button('bag','My business profile','id="editBusiness"')}${button('copy','Export my data','id="exportAccount"')}${button('trash','Delete account','id="deleteAccount"')}`);
      $('#verifyEmail')?.addEventListener('click',()=>email('link'));
      $('#deleteAccount').insertAdjacentHTML('afterend','<p><a href="/privacy.html" target="_blank" rel="noopener">Data and safety information</a></p>');
      $('#addPasskey')?.addEventListener('click',safe(async()=>{const {startRegistration}=await import('/passkeys.js');const options=await post('/api/auth/passkey/register/options');const response=await startRegistration({optionsJSON:options.options});await post('/api/auth/passkey/register/verify',{id:options.id,response});account();}));
      document.querySelectorAll('[data-key]').forEach(b=>b.onclick=safe(async()=>{if(confirm('Remove this passkey?')){await post('/api/auth/passkey/remove',{id:b.dataset.key});account();}}));
      $('#editBusiness').onclick=business;
      $('#exportAccount').onclick=safe(async()=>{const result=await api('/api/social/export');const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='carpool-network-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
      $('#deleteAccount').onclick=safe(async()=>{const confirmText=prompt('Type DELETE to remove your account. Outstanding bookings must be closed first.');if(confirmText==='DELETE'){await post('/api/social/delete-account',{confirm:confirmText});h.clearStoredProfile();closeSheet();h.navigate('home');}});
    } catch(error){showToast(error.message,'error');}
  }
  const email=createEmailUI(h);
  async function passkeyLogin(after) {
    try { const {startAuthentication}=await import('/passkeys.js');const options=await post('/api/auth/passkey/login/options');const response=await startAuthentication({optionsJSON:options.options});const result=await post('/api/auth/passkey/login/verify',{id:options.id,response});h.saveProfile(result.profile);closeSheet();if(after)await after();else await render('chat'); }
    catch(error){showToast(error.message,'error');}
  }
  async function direct(id) { const result=await post('/api/social/direct',{userId:id});closeSheet();await render('inbox',result.id); }
  async function block(id) { if(confirm('Block this member? Direct messages will stop. Existing bookings are not cancelled.')){await post('/api/social/block',{userId:id});closeSheet();showToast('Member blocked');} }
  async function business() {
    const d=(await api('/api/social/overview')).business||{};
    openSheet(`<h2>Business profile</h2><form id="businessForm" class="simple-form">${[['name','Business name'],['area','Area'],['website','Website (https://)']].map(([key,label])=>`<label>${label}<input name="${key}" value="${esc(d[key]||'')}"></label>`).join('')}<label>Description<textarea name="description">${esc(d.description||'')}</textarea></label><button class="primary-btn">Save profile</button></form>`);
    $('#businessForm').onsubmit=safe(async e=>{e.preventDefault();await post('/api/social/business',Object.fromEntries(new FormData(e.currentTarget)));closeSheet();showToast('Business profile saved');});
  }
  async function renderBusinesses(visit) {
    const d=await api('/api/social/businesses');if(visit!==generation)return;
    shell(`<section class="business-directory"><header><h1>Local businesses</h1>${button('edit','My business profile','id="myBusiness"')}</header>${d.businesses.map(b=>`<article><h2>${esc(b.name)}</h2><p>${esc(b.area)}</p><p>${esc(b.description)}</p>${b.website?`<a href="${esc(b.website)}" target="_blank" rel="noopener noreferrer">Website</a>`:''}${button('message','Contact',`data-business="${esc(b.user_id)}"`)}</article>`).join('')||'<p>No businesses listed yet.</p>'}</section>`,'community');
    $('#myBusiness').onclick=business;document.querySelectorAll('[data-business]').forEach(b=>b.onclick=safe(()=>direct(b.dataset.business)));
  }
  return {render,stop,account,email,passkeyLogin,direct:safe(direct),block:safe(block),reports:safe(reports)};
}
