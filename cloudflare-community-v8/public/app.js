import {accountPresentation,contactPresentation} from './account-status.js';
import {createCommutes} from './commutes.js';
import {createLiveTrips} from './live-trip.js';
import {createContactDetails} from './contact-details.js';
import {createProfilePhotos} from './profile-photo.js';
import {createMemberDetails} from './member-details.js';
import {bindLocationInput,bindSearchLocations} from './locations.js';
import { createSocialUI } from './social.js';
const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');
const PROFILE_KEY = 'carpool_network_profile_v5_6';
const LEGACY_PROFILE_KEYS = ['carpool_network_profile_v5_5','carpool_network_profile_v5_4','carpool_network_profile_v5_3','carpool_network_profile_v5_2','carpool_network_profile_v5_1', 'carpool_network_profile_v5', 'carpool_network_profile_v2', 'carpool_network_profile'];

const state = {
  view: 'home',
  preview: false,
  supportEmail: '',
  emailAvailable: false,
  phoneVerificationRequired: false,
  category: '',
  q: '',
  posts: [],
  unread: 0,
  profile: null,
  cachedProfile: loadProfile(),
  sessionCheckedAt: 0,
  socket: null,
  installPrompt: null,
  requestedOffers: new Set(),
  lastRideSearch: loadRideSearch(),
  adminToken: loadAdminToken(),
};

const CATEGORIES = [
  ['', 'All', 'grid'],
  ['ride_offer', 'Rides', 'car'],
  ['ride_wanted', 'Ride wanted', 'person'],
  ['marketplace', 'Buy & Sell', 'bag'],
  ['job', 'Jobs', 'briefcase'],
  ['service', 'Services', 'tool'],
  ['accommodation', 'Accommodation', 'home'],
  ['community', 'Community', 'megaphone'],
];
const LABELS = Object.fromEntries(CATEGORIES.map(([k, l]) => [k, l]));

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5"/><path d="M9.5 21v-6h5v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  car: '<path d="M5 17h14l1-5-2-5H6l-2 5 1 5Z"/><path d="M7 17v2M17 17v2M4 12h16M7 14h.01M17 14h.01"/>',
  map: '<path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  heart: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  comment: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.5 7.8c.4 3 2.2 5 5.3 6.2l1.5-1.5"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  star: '<path d="m12 2.5 3 6.1 6.7 1-4.9 4.7 1.2 6.7-6-3.2-6 3.2 1.2-6.7-4.9-4.7 6.7-1 3-6.1Z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5-5L7.4 3.6l3 3-3.8 3.8-3-3L1.3 9.7a4 4 0 0 0 5 5L16 5"/><path d="m14 14 7 7"/>',
  megaphone: '<path d="m3 11 15-6v14L3 13v-2Z"/><path d="M11 16v4H7l-1-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.8 2c-1 .7-1.6 1.1-1.6 2.5M12 17h.01"/>',
  shield: '<path d="M12 3 20 6v6c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-5"/>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
};

function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.grid}</svg>`;
}

function loadAdminToken(){ try{return sessionStorage.getItem('carpool_network_admin_token')||'';}catch{return '';} }
function saveAdminToken(token=''){ try{ if(token)sessionStorage.setItem('carpool_network_admin_token',token); else sessionStorage.removeItem('carpool_network_admin_token'); }catch{} }
function loadProfile() {
  try {
    const current = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (current?.id || current?.token) return current;
    for (const key of LEGACY_PROFILE_KEYS) {
      const legacy = JSON.parse(localStorage.getItem(key) || 'null');
      if (legacy?.id || legacy?.token) { localStorage.setItem(PROFILE_KEY, JSON.stringify(legacy)); return legacy; }
    }
  } catch {}
  return null;
}
function saveProfile(p) { state.profile = p; state.cachedProfile=p; try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {} }
function clearStoredProfile() {
  try { localStorage.removeItem(PROFILE_KEY); LEGACY_PROFILE_KEYS.forEach(k => localStorage.removeItem(k)); } catch {}
  state.profile=null; state.cachedProfile=null; state.adminToken=''; saveAdminToken('');
  try { state.socket?.close(); } catch {} state.socket=null;
}
async function restoreSession() {
  const cached=state.cachedProfile || loadProfile();
  const token=cached?.token || '';
  const headers={'accept':'application/json'};
  if(token) headers.authorization=`Bearer ${token}`;
  let response;
  try { response=await fetch('/api/profile',{headers,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}); } catch { return false; }
  if(response.status === 401 && token) {
    try { response=await fetch('/api/profile',{headers:{accept:'application/json'},credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}); } catch { return false; }
  }
  if(!response.ok) { if(response.status === 401 || response.status === 403) clearStoredProfile(); else window.CarpoolDiagnostics?.capture('API_5XX','/api/profile'); return false; }
  const data=await response.json().catch(()=>null); if(!data?.profile){window.CarpoolDiagnostics?.capture('API_INVALID_RESPONSE','/api/profile'); return false;}
  const source=response.headers.get('x-auth-source')||'';
  const next={...data.profile};
  if(source==='bearer' && token) next.token=token;
  saveProfile(next); state.sessionCheckedAt=Date.now(); return true;
}
function loadRideSearch() { try { return JSON.parse(localStorage.getItem('carpool_network_last_search') || 'null'); } catch { return null; } }
function saveRideSearch(v) { state.lastRideSearch = v; try { localStorage.setItem('carpool_network_last_search', JSON.stringify(v)); } catch {} }
function esc(s = '') { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function fmtDate(v) { if (!v) return ''; const d = new Date(v.includes('T') ? v : `${v}T12:00:00`); return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
function fmtLongDate(v) { if (!v) return ''; const d = new Date(`${v}T12:00:00`); return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); }
function relative(v) { const ms = Date.now() - new Date(`${v}Z`).getTime(); const m = Math.max(0, Math.floor(ms / 60000)); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; }
function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'CN'; }
const MEMBER_EMOJIS = ['🚗','🦊','🌟','🐼','🦁','🐬','🦉','🐧','🦋','⚡','🌿','🎯','🚙','☀️','🧭','🐨','🌈','☕','🎧','🐢','🐝','🌙','🏁','🛣️'];
function fallbackEmoji(id='') { let hash=0; for(const ch of String(id)) hash=((hash*31)+ch.charCodeAt(0))>>>0; return MEMBER_EMOJIS[hash % MEMBER_EMOJIS.length]; }
function memberEmoji(user={}) { return user.avatarEmoji || user.avatar_emoji || fallbackEmoji(user.id || user.name || 'cn'); }
function avatarHtml(user={}, cls='') { return user.photo_approved?`<img class="avatar profile-photo ${cls}" src="/api/profile-photo/${encodeURIComponent(user.id)}" alt="${esc(user.name||'Member')} profile photo">`:`<span class="avatar emoji-avatar ${cls}" title="${esc(user.name || 'Member')}">${esc(memberEmoji(user))}</span>`; }
function travelRoleLabel(role='both') { return role === 'driver' ? 'Usually drives' : role === 'rider' ? 'Usually rides' : 'Drives & rides'; }
function profileChips(user={}) {
  const chips=[];
  const gender=user.gender && user.gender !== 'Prefer not to say' ? user.gender : '';
  if(user.travel_role) chips.push(travelRoleLabel(user.travel_role));
  if(gender) chips.push(gender);
  if(user.community) chips.push(user.community);
  return chips.map(x=>`<span class="profile-chip">${esc(x)}</span>`).join('');
}
function today(offset = 0) { return new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(Date.now() + offset * 86400000)); }
function defaultTime() { return new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date(Date.now() + 3600000)); }
function postUrl(id) { return `${location.origin}/?post=${encodeURIComponent(id)}`; }
function haptic() { try { navigator.vibrate?.(12); } catch {} }
function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isStandalone() { return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true; }

function showToast(msg, kind = '') {
  toastEl.textContent = msg;
  if (kind === 'error') {
    const report = document.createElement('button'); report.type = 'button'; report.className = 'toast-report'; report.dataset.reportProblem = ''; report.textContent = 'Report a bug'; toastEl.append(' ', report);
  }
  toastEl.className = `toast show ${kind}`;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => { toastEl.className = 'toast'; }, kind === 'error' ? 9000 : 2800);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && !headers['content-type']) headers['content-type'] = 'application/json';
  if (state.profile?.token) headers.authorization = `Bearer ${state.profile.token}`;
  if ((path.startsWith('/api/admin/') || path.startsWith('/api/social/')) && state.adminToken) headers['x-admin-token'] = state.adminToken;
  let response;
  try { response = await fetch(path, { ...options, headers, credentials:'same-origin', signal:options.signal || AbortSignal.timeout(20000) }); }
  catch (cause) {
    const timeout = cause.name === 'TimeoutError' || cause.name === 'AbortError';
    window.CarpoolDiagnostics?.capture(timeout ? 'API_TIMEOUT' : 'API_NETWORK',path);
    throw new Error(timeout ? 'The request timed out. Check My bookings before repeating a booking action.' : 'Connection lost. Check your internet connection and try again.');
  }
  let data;
  try { data = await response.json(); }
  catch { window.CarpoolDiagnostics?.capture('API_INVALID_RESPONSE',path); throw new Error('The server returned an unreadable response. Please retry or report the problem.'); }
  if (!response.ok || data?.ok !== true) {
    if(response.status >= 500) window.CarpoolDiagnostics?.capture('API_5XX',path);
    if(response.status===401 && state.profile && !options.keepSessionOn401 && !(path.startsWith('/api/admin/') || path.startsWith('/api/social/'))){
      clearStoredProfile(); showToast('Your session needs reconnecting. Use Recover account to keep your existing profile.', 'error');
    }
    if(['CONTACT_REQUIRED','PHONE_VERIFICATION_REQUIRED'].includes(data.code)&&!path.startsWith('/api/contact-details')&&!path.startsWith('/api/auth/phone'))queueMicrotask(()=>editContact());
    if(data.code==='PHOTO_REQUIRED')queueMicrotask(()=>profilePhotos.edit());
    if(data.code?.startsWith('VEHICLE_')&&!path.startsWith('/api/member-details'))queueMicrotask(()=>memberDetails.edit());
    const err = new Error((data.error || 'Something went wrong.') + (data.reference ? ` Reference: ${data.reference}` : '')); err.status=response.status; throw err;
  }
  return data;
}

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installPrompt = e; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => window.CarpoolDiagnostics?.capture('SERVICE_WORKER_ERROR','/sw.js'));

function navButton(id, iconName, label, active) {
  const badge = ['alerts','inbox'].includes(id) && state.unread ? `<b class="nav-badge">${state.unread > 9 ? '9+' : state.unread}</b>` : '';
  return `<button class="nav-item ${active === id ? 'active' : ''}" ${active === id ? 'aria-current="page"' : ''} data-nav="${id}">${icon(iconName)}<span>${label}</span>${badge}</button>`;
}

function shell(content, active = 'home', opts = {}) {
  const route = new URLSearchParams({ view: state.view, ...(state.routeParams || {}) });
  if (!restoringHistory && location.search !== `?${route}`) {
    history.pushState({ view: state.view }, '', `/?${route}`);
  }
  const profileLine = state.profile
    ? `<button class="side-profile" data-nav="me">${avatarHtml(state.profile,'small-avatar')}<span><strong>${esc(state.profile.name)}</strong><small>${esc(state.profile.area || 'Member')}</small></span>${icon('chevron')}</button>`
    : `<button class="side-join" id="sideJoin">Sign in / Join</button>`;

  app.innerHTML = `
    <a class="skip-link" href="#mainContent">Skip to content</a>
    <div class="app-shell">
      <aside class="sidebar">
        <button class="side-brand" data-nav="home">
          <img src="/icon.svg" alt="Carpool Network">
          <span><strong>carpool network</strong><small>move together</small></span>
        </button>
        <nav class="side-nav" aria-label="Main navigation">
          ${navButton('home', 'search', 'Find a ride', active === 'find' ? 'home' : active)}
          ${navButton('trips', 'car', 'My bookings', active === 'me' && state.routeParams?.tab === 'rides' ? 'trips' : active)}
          ${navButton('inbox', 'comment', 'Messages', active)}
          ${navButton('chat', 'users', 'Community', active)}
          ${navButton('account', 'user', 'Account', active === 'me' && state.routeParams?.tab === 'account' ? 'account' : active)}
        </nav>
        <button class="side-offer" id="sideOffer">${icon('car')}<span>Offer a ride</span></button>
        <div class="side-spacer"></div>
        <button class="side-help" data-nav="support">${icon('help')}<span><strong>Help & Support</strong><small>Contact the Carpool Network team</small></span></button>
        <div class="side-feedback"><button type="button" data-leave-feedback>Leave feedback</button><button type="button" data-report-problem>Report a bug</button></div>
        <div class="side-note"><strong>A better way to share the journey.</strong><span>A seat on the way. A conversation before you go.</span></div>
        ${profileLine}
      </aside>

      <section class="workspace">
        <header class="mobile-topbar">
          <button class="mobile-brand" data-nav="home"><img src="/icon.svg" alt=""><span>carpool network</span></button>
          <button class="circle-btn" data-nav="alerts" aria-label="Alerts">${icon('bell')}${state.unread ? `<b class="nav-badge">${state.unread > 9 ? '9+' : state.unread}</b>` : ''}</button>
        </header>
        ${opts.title ? `<div class="page-heading"><div><span class="eyebrow">${esc(opts.eyebrow || 'CARPOOL NETWORK')}</span><h1>${esc(opts.title)}</h1>${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ''}</div>${opts.action || ''}</div>` : ''}
        <main class="main-content" id="mainContent" tabindex="-1">${state.preview ? '<div class="preview-notice">Preview: test accounts and journeys only</div>' : ''}${content}</main>
      </section>

      <nav class="mobile-nav" aria-label="Mobile navigation">
        ${navButton('home','search','Find',active === 'find' ? 'home' : active)}
        ${navButton('trips','car','Bookings',active === 'me' && state.routeParams?.tab === 'rides' ? 'trips' : active)}
        ${navButton('inbox','comment','Messages',active)}
        ${navButton('chat','users','Community',active)}
        ${navButton('account','user','Account',active === 'me' && state.routeParams?.tab === 'account' ? 'account' : active)}
      </nav>
    </div>`;

  const titles = {home:'Find a ride',find:'Search rides',me:state.routeParams?.tab==='account'?'Your account':'My bookings',post:'Create a post',inbox:'Messages',chat:'Community',community:'Local listings',support:'Help & support',admin:'Control room',issues:'Feedback & bug reports',alerts:'Activity'};
  document.title = `${titles[state.view] || 'Move together'} · Carpool Network`;
  if (focusNextView) {
    focusNextView=false;
    requestAnimationFrame(()=>{if(!document.querySelector('#sheetBackdrop')){document.querySelector('#mainContent')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}});
  }
  bindNav();
  document.querySelector('#sideOffer')?.addEventListener('click', () => ensureMember(() => renderPostPage('ride_offer')));
  document.querySelector('#sideJoin')?.addEventListener('click', () => openSignIn());
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.onclick = () => navigate(button.dataset.nav);
  });
}

function navigate(view) {
  haptic();
  if (['chat','inbox','businesses'].includes(view)) return ensureMember(() => socialUI.render(view));
  if (view === 'trips') return ensureMember(() => renderMe('rides'));
  if (view === 'account') return ensureMember(() => renderMe('account'));
  if (view === 'community') return renderCommunity();
  if (view === 'home') return renderHome();
  if (view === 'find') return renderFind();
  if (view === 'post') return ensureMember(() => renderPostPage());
  if (view === 'alerts') return ensureMember(() => renderAlerts());
  if (view === 'support') return ensureMember(() => renderSupport());
  if (view === 'admin') return ensureMember(() => renderAdmin());
  if (view === 'issues') return ensureMember(() => renderIssues());
  if (view === 'me') return state.profile ? renderMe() : openSignIn(() => renderMe());
}
let viewRevision = 0;
let focusNextView = false;
function beginView(view, params = {}) { focusNextView=state.view!==view || JSON.stringify(state.routeParams||{})!==JSON.stringify(params); socialUI.stop(); state.view = view; state.routeParams = params; return ++viewRevision; }
function pageError(title, error, retry) {
  shell(`<section class="error-card" role="alert"><div><h1>${esc(title)}</h1><p>${esc(error.message)}</p></div><button class="outline-btn" id="retryPage">${icon('refresh')} Retry</button><button class="outline-btn" data-report-problem data-report-context>Report this problem</button></section>`, state.view);
  document.querySelector('#retryPage').onclick = retry;
}
function ensureMember(fn) { if (state.profile) return fn(); openSignIn(fn); }

async function refreshUnread() {
  if (!state.profile) { state.unread = 0; return; }
  try { const data = await api('/api/notifications'); state.unread = data.unread || 0; } catch {}
}

function rideSearchValues(overrides = {}) {
  const saved = state.lastRideSearch || {};
  const requestedDate = overrides.date ?? saved.date;
  return {
    origin: overrides.origin ?? saved.origin ?? state.profile?.area ?? '',
    destination: overrides.destination ?? saved.destination ?? '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || '') && requestedDate >= today() ? requestedDate : today(1),
    time: overrides.time ?? saved.time ?? defaultTime(),
    seats: Number(overrides.seats ?? saved.seats ?? 1),
    radiusMiles:Number(overrides.radiusMiles ?? saved.radiusMiles ?? 0),
    localDrivers:Boolean(overrides.localDrivers ?? saved.localDrivers ?? true),
    kind:overrides.kind ?? saved.kind ?? "offered",
  };
}

function rideSearchForm(values = rideSearchValues(), compact = false) {
  return `
    <form id="rideSearchForm" class="ride-search-form ${compact ? 'compact' : ''}">
      <div class="ride-field from-field">
        <span class="field-icon">${icon('map')}</span>
        <label for="rideOrigin">From</label>
        <input id="rideOrigin" name="origin" value="${esc(values.origin)}" autocomplete="address-level2" placeholder="Cardiff, CF10…" required>
      </div>
      <button type="button" class="swap-btn" id="swapRoute" aria-label="Swap route">${icon('swap')}</button>
      <div class="ride-field to-field">
        <span class="field-icon destination-dot"></span>
        <label for="rideDestination">To</label>
        <input id="rideDestination" name="destination" value="${esc(values.destination)}" autocomplete="address-level2" placeholder="Bristol, Amazon BRS1…" required>
      </div>
      <div class="ride-field date-field">
        <span class="field-icon">${icon('calendar')}</span>
        <label for="rideDate">Date</label>
        <input id="rideDate" name="date" type="date" min="${today()}" value="${esc(values.date)}" required>
      </div>
      <div class="ride-field time-field">
        <span class="field-icon">${icon('clock')}</span>
        <label for="rideTime">Around</label>
        <input id="rideTime" name="time" type="time" value="${esc(values.time)}">
      </div>
      <div class="ride-field seats-field">
        <span class="field-icon">${icon('users')}</span>
        <label for="rideSeats">Seats</label>
        <select id="rideSeats" name="seats">${[1,2,3,4,5,6,7].map(n => `<option value="${n}" ${n === values.seats ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      <button class="find-btn" type="submit">${icon('search')}<span>Find rides</span></button>
    </form>`;
}

function bindRideSearchForm(onSubmit) {
  const form = document.querySelector('#rideSearchForm');
  if (!form) return;
  bindSearchLocations(form,showToast);
  form.radiusMiles.value=String(state.lastRideSearch?.radiusMiles||0);form.localDrivers.checked=state.lastRideSearch?.localDrivers!==false;
  const mode=document.createElement('label');mode.className='search-mode';mode.innerHTML='<span>I want to find</span><select name=kind><option value=offered>Drivers with available seats</option><option value=wanted>Passengers for my route</option></select>';form.prepend(mode);form.kind.value=state.lastRideSearch?.kind||'offered';
  const changeMode=()=>{const wanted=form.kind.value==='wanted';form.querySelector('.find-btn span').textContent=wanted?'Find passengers':'Find rides';form.querySelector('label[for=rideSeats]').textContent=wanted?'My capacity':'Seats';form.localDrivers.closest('label').hidden=wanted;};form.kind.onchange=changeMode;changeMode();
  document.querySelector('#swapRoute')?.addEventListener('click', () => {
    const a = form.origin.value; form.origin.value = form.destination.value; form.destination.value = a; haptic();
  });
  form.onsubmit = e => {
    e.preventDefault();
    const values = { origin: form.origin.value.trim(), destination: form.destination.value.trim(), date: form.date.value, time: form.time.value, seats: Number(form.seats.value),radiusMiles:Number(form.radiusMiles.value),localDrivers:form.localDrivers.checked,kind:form.kind.value };
    saveRideSearch(values);
    onSubmit(values);
  };
}

async function renderHome() {
  const visit = beginView('home');
  shell(`
    <div class="home-topline"><p>${state.profile ? `Welcome back, ${esc(state.profile.name.split(' ')[0])}.` : 'SHARED JOURNEYS. LOCAL CONNECTIONS.'}</p><button class="text-action" data-nav="support">${icon('help')} Need a hand?</button></div>
    <section class="hero-intro"><div><span class="eyebrow">A GOOD WAY TO GET THERE</span><h1>Your journey.<br>A little more <em>together.</em></h1><p>Find a seat going your way, share your next trip, and keep the details in one place.</p></div>
      <div class="hero-art"><picture><source srcset="/community-cover-hd.webp" type="image/webp"><img src="/community-cover.png" width="1419" height="1108" fetchpriority="high" alt="The Carpool Network community sharing a red car"></picture></div>
    </section>
    <section class="journey-search"><div class="search-card-head"><h2>Where are you heading?</h2><button class="outline-btn" id="offerInstead">${icon('car')} Offer a ride</button></div>${rideSearchForm()}<p class="search-hint">${icon('clock')} Journey times are shown in UK local time.</p></section>
    <div class="home-steps"><div class="home-step"><span class="step-number">1</span><div><strong>Find your route</strong><p>Choose your journey, date and the seats you need.</p></div></div><div class="home-step"><span class="step-number">2</span><div><strong>Request a seat</strong><p>Your seat is confirmed when the driver accepts.</p></div></div><div class="home-step"><span class="step-number">3</span><div><strong>Agree the details</strong><p>Use your booking conversation to arrange the pickup.</p></div></div></div>
    <section class="section-block"><div class="section-title-row"><div><span class="eyebrow">GOING YOUR WAY</span><h2>${state.profile?.area?`Rides from ${esc(state.profile.area)}`:"Rides from the community"}</h2></div><button class="text-action" id="allRides">Find rides ${icon('arrow')}</button></div><div id="homeFeed" class="feed-grid"><p class="feed-loading" role="status">Looking for available rides…</p></div></section>
    <section class="community-cta"><div><h2>The people behind the journeys.</h2><p>Meet your community, ask a question, or share a useful local update.</p></div><button class="outline-btn" data-nav="chat">Open community ${icon('arrow')}</button></section>
    <footer class="site-footer"><span>Carpool Network · Move together</span><div><a href="/welcome.html">Getting started &amp; guide</a><a href="/safety.html">Travel safely</a><a href="/privacy.html">Privacy</a><a href="/help">Help &amp; contact</a><a href="/attribution.html">Attribution</a><button class="text-action" data-nav="community">Local listings</button></div></footer>
  `,'home');
  bindRideSearchForm(values => renderFind(values,true));
  document.querySelector('#offerInstead').onclick=()=>ensureMember(()=>renderPostPage('ride_offer'));
  document.querySelector('#allRides').onclick=()=>renderFind();
  try {
    const nearby=new URLSearchParams({category:'ride_offer'});if(state.profile?.area){nearby.set('from',state.profile.area);nearby.set('localDrivers','true');}const data=await api('/api/feed?'+nearby);
    if(visit!==viewRevision)return;
    state.posts=data.posts||[];
    const rides=state.posts.filter(p=>p.category==='ride_offer'&&p.status==='active'&&p.journeyDate>=today()).slice(0,3);
    document.querySelector('#homeFeed').innerHTML=rides.map(postCard).join('')||emptyFeed('Your next shared journey starts here','No available rides to show yet. Search your route, or offer a ride so someone can join you.');
    bindPostActions();
  }catch(error){if(visit===viewRevision){document.querySelector('#homeFeed').innerHTML=`<div class="error-card"><strong>Rides could not be loaded</strong><p>${esc(error.message)}</p><button id="retryFeed" class="outline-btn">Try again</button></div>`;document.querySelector('#retryFeed').onclick=renderHome;}}
  refreshUnread().then(updateBadges);connectLive();
}

function categoryDescription(k) {
  return ({
    ride_offer: 'Seats going your way', ride_wanted: 'People who need a lift', marketplace: 'Useful local listings', job: 'Work and opportunities',
    service: 'People who can help', accommodation: 'Rooms and places', community: 'Questions and updates'
  })[k] || '';
}

async function loadStats() {
  try {
    const { stats } = await api('/api/stats');
    const el = document.querySelector('#networkStats'); if (!el) return;
    el.innerHTML = `
      <div class="stat-item"><strong>${stats.rideOffers}</strong><span>rides available</span></div>
      <div class="stat-item"><strong>${stats.rideNeeds}</strong><span>people looking</span></div>
      <div class="stat-item"><strong>${stats.confirmedBookings}</strong><span>matches accepted</span></div>
      <div class="stat-item"><strong>${stats.members}</strong><span>network members</span></div>`;
  } catch {}
}

async function renderFind(values = rideSearchValues(), autoSearch = false) {
  const visit = beginView('find');
  await refreshUnread();
  if (visit !== viewRevision) return;
  shell(`
    <section class="find-page">
      <div class="find-intro"><h1>Find your journey</h1></div>
      <div class="finder-panel">${rideSearchForm(values, true)}</div>
      <div id="rideResults" class="ride-results"><div class="find-empty"><span class="round-icon">${icon('search')}</span><h2>Search the network</h2><p>Enter your route and date to see the best available drivers.</p></div></div>
    </section>
  `, 'find');
  bindRideSearchForm(runRideSearch);
  if (autoSearch || values.origin && values.destination && values.date && state.lastRideSearch) runRideSearch(values);
  connectLive();
}

async function runRideSearch(values) {
  saveRideSearch(values);
  const el = document.querySelector('#rideResults'); if (!el) return;
  const searchId = Symbol(); el.searchId = searchId;
  el.innerHTML = `<div class="results-head"><div><span class="eyebrow">SEARCHING</span><h2>Finding the best matches…</h2></div></div>${Array.from({ length: 3 }, () => '<div class="ride-skeleton"></div>').join('')}`;
  try {
    const qs = new URLSearchParams({ from: values.origin, to: values.destination, date: values.date, time: values.time || '', seats: String(values.seats || 1),radiusMiles:String(values.radiusMiles||0),localDrivers:String(Boolean(values.localDrivers)),kind:values.kind||'offered',page:String(values.page||0) });
    const data = await api(`/api/rides/search?${qs}`);
    if (!el.isConnected || el.searchId !== searchId) return;
    const rides = data.rides || [];
    if(values.kind==='wanted'){
      state.posts=rides;el.innerHTML=`<div class="results-head"><div><span class="eyebrow">PASSENGERS NEAR YOUR ROUTE</span><h2>${esc(values.origin)} → ${esc(values.destination)}</h2><p>${fmtLongDate(values.date)} · up to ${values.seats} passenger seat${values.seats===1?'':'s'} · ${values.radiusMiles||0} mile pickup radius</p></div></div>${rides.length?`<div class="feed-grid">${rides.map(postCard).join('')}</div>`:emptyFeed('No matching passengers yet','Offer your journey so riders can request a seat.')}${data.nextPage!==null?'<button class=outline-btn id=nextMatches>Check more journeys</button>':''}<button class="primary-btn" id="offerSearchedRoute">Offer this route</button>`;
      document.querySelector('#offerSearchedRoute').onclick=()=>offerRoute(values);document.querySelector('#nextMatches')?.addEventListener('click',()=>runRideSearch({...values,page:data.nextPage}));bindPostActions();return;
    }
    el.innerHTML = `<div class="results-head"><div><span class="eyebrow">${rides.length ? `${rides.length} MATCH${rides.length === 1 ? '' : 'ES'}` : 'NO MATCH YET'}</span><h2>${esc(values.origin)} <span>→</span> ${esc(values.destination)}</h2><p>${fmtLongDate(values.date)}${values.time ? ` · around ${esc(values.time)}` : ''} · ${values.seats} seat${values.seats === 1 ? '' : 's'}</p></div><button class="outline-btn" id="postNeedFromSearch">${icon('person')} Post my ride need</button></div>`;
    if (rides.length) {
      el.insertAdjacentHTML('beforeend', `<div class="ride-result-list">${rides.map(rideResultCard).join('')}</div><div class="booking-explainer"><span class="shield-icon">${icon('lock')}</span><div><strong>Request Seat prevents double booking.</strong><p>When a driver accepts, Carpool Network holds the seat. Then <b>agree pickup, timing and any contribution in your booking conversation</b>.</p></div></div>`);
    } else {
      el.insertAdjacentHTML('beforeend', `<div class="find-empty premium-empty"><span class="round-icon">${icon('person')}</span><h2>No suitable driver has posted yet.</h2><p>Post your need once. Matching drivers can then find you, and we'll alert you when a compatible ride appears.</p><button class="primary-btn red" id="emptyPostNeed">Post my ride request</button></div>`);
    }
    document.querySelector('#postNeedFromSearch')?.addEventListener('click', () => ensureMember(() => postNeedFromSearch(values)));
    document.querySelector('#emptyPostNeed')?.addEventListener('click', () => ensureMember(() => postNeedFromSearch(values)));
    if(data.nextPage!==null){el.insertAdjacentHTML('beforeend','<button class=outline-btn id=nextMatches>Check more journeys</button>');document.querySelector('#nextMatches').onclick=()=>runRideSearch({...values,page:data.nextPage});}
    bindRideResultActions(values);
  } catch (e) {
    if (!el.isConnected || el.searchId !== searchId) return;
    el.innerHTML = `<div class="error-card">${icon('alert')}<div><strong>Search failed</strong><span>${esc(e.message)}</span></div><button id="retrySearch" class="outline-btn">Retry</button></div>`;
    document.querySelector('#retrySearch').onclick = () => runRideSearch(values);
  }
}

function rideResultCard(p) {
  const score = p.matchScore ?? 0;
  const seats = p.availableSeats ?? p.seats;
  const rating = ratingText(p.author);
  return `<article class="ride-result-card" data-post-card="${esc(p.id)}">
    <div class="match-rail"><div class="match-orb ${score >= 80 ? 'great' : score >= 60 ? 'good' : ''}"><strong>${score}%</strong><span>match</span></div><div class="rail-line"></div></div>
    <div class="ride-result-main">
      <div class="driver-row">
        <button class="driver-identity" data-user="${esc(p.author.id)}">${avatarHtml(p.author)}<span><strong>${esc(p.author.name)}</strong><small>${esc(p.author.area || '')} · <b>${esc(rating)}</b></small></span></button>
        <span class="seat-pill ${seats <= 1 ? 'last' : ''}">${seats} seat${seats === 1 ? '' : 's'} left</span>
      </div>
      <div class="route-timeline">
        <div class="timeline-row"><i class="start-dot"></i><div><small>Leaves ${esc(p.timeWindow ? p.timeWindow.start + ' to ' + p.timeWindow.end : p.journeyTime)}</small><strong>${esc(p.origin)}</strong></div></div>
        <div class="timeline-stem"></div>
        <div class="timeline-row"><i class="end-dot"></i><div><small>${fmtDate(p.journeyDate)}</small><strong>${esc(p.destination)}</strong></div></div>
      </div>
      ${p.body ? `<p class="ride-note">${esc(p.body)}</p>` : ''}
      ${p.pickupDistanceMiles!=null?`<p class="ride-note">Pickup town is about ${Number(p.pickupDistanceMiles)} miles from your selected town. Agree the exact pickup before travelling.</p>`:''}
      <div class="ride-result-bottom">
        <div class="price-stack">${p.price ? `<strong>${esc(p.price)}</strong><span>contribution</span>` : `<strong>Ask driver</strong><span>contribution</span>`}</div>
        <div class="ride-result-actions">
          ${p.whatsappUrl ? `<a class="whatsapp-link" href="${esc(p.whatsappUrl)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : ''}
          <button class="outline-btn" data-ride-detail="${esc(p.id)}">Details</button>
          ${p.booking ? `<button class="outline-btn" data-nav="me">${p.booking.status === 'pending' ? 'Request pending' : 'Booking confirmed'}</button>` : `<button class="primary-btn request-seat" data-request-offer="${esc(p.id)}">Request ${state.lastRideSearch?.seats || 1} seat${(state.lastRideSearch?.seats || 1) === 1 ? '' : 's'}</button>`}
        </div>
      </div>
    </div>
  </article>`;
}

function bindRideResultActions(values) {
  bindNav();
  document.querySelectorAll('[data-ride-detail]').forEach(b => b.onclick = () => openPost(b.dataset.rideDetail));
  document.querySelectorAll('[data-request-offer]').forEach(button => {
    button.onclick = () => ensureMember(() => quickRequest(button.dataset.requestOffer, values, button));
  });
  document.querySelectorAll('[data-user]').forEach(b => b.onclick = e => { e.stopPropagation(); openUser(b.dataset.user); });
}

async function quickRequest(offerId, values, button) {
  const original = button?.innerHTML;
  if (button) { button.disabled = true; button.innerHTML = 'Sending…'; }
  try {
    const data = await api('/api/ride-requests/quick', { method: 'POST', body: JSON.stringify({ rideOfferPostId: offerId, origin: values.origin, destination: values.destination, journeyDate: values.date, journeyTime: values.time, seats: values.seats, flexibilityMinutes: 60 }) });
    if (button) { button.classList.add('sent'); button.innerHTML = `${icon('check')} Request sent`; }
    haptic(); showToast(data.already ? 'Request already waiting for this driver' : 'Seat request sent. Track the response in My bookings.', 'success');
  } catch (e) {
    if (button) { button.disabled = false; button.innerHTML = original; }
    showToast(e.message, 'error');
  }
}

function offerRoute(values){ensureMember(()=>{closeSheet();renderPostPage('ride_offer');const f=document.querySelector('#createPostForm');for(const [key,value] of Object.entries({origin:values.origin,destination:values.destination,journeyDate:values.date,journeyTime:values.time||defaultTime(),seats:values.seats||1})){if(f.elements[key])f.elements[key].value=value;}f.dispatchEvent(new Event('change',{bubbles:true}));});}

async function postNeedFromSearch(values) {
  try {
    const data = await api('/api/posts', { method: 'POST', body: JSON.stringify({ category: 'ride_wanted', origin: values.origin, destination: values.destination, journeyDate: values.date, journeyTime: values.time || defaultTime(), flexibilityMinutes: 60, seats: values.seats, whatsappEnabled: true, body: '' }) });
    showToast('Ride request posted. Matching drivers can now find you.', 'success');
    if (data.matches?.length) openRideMatches(data.post.id, 'rider'); else renderMe('rides');
  } catch (e) { showToast(e.message, 'error'); }
}

async function renderCommunity(category = '', q = '') {
  const visit = beginView('community', { ...(category ? { category } : {}), ...(q ? { q } : {}) }); state.category = category; state.q = q;
  await refreshUnread();
  if (visit !== viewRevision) return;
  shell(`
    <section class="community-page">
      <div class="community-toolbar">
        <div><span class="eyebrow">COMMUNITY FEED</span><h1>${category ? esc(LABELS[category]) : 'What’s happening in the network'}</h1></div>
        <button class="primary-btn red" id="communityPost">${icon('plus')} Create post</button>
      </div>
      <div class="community-search"><div class="wide-search">${icon('search')}<input id="communitySearch" aria-label="Search local listings" value="${esc(q)}" placeholder="Search rides, jobs, items, people, places…"><button id="communitySearchGo">Search</button></div></div>
      <div class="filter-chips">${CATEGORIES.map(([k, l, ico]) => `<button class="filter-chip ${category === k ? 'active' : ''}" data-community-cat="${k}">${icon(ico)}${esc(l)}</button>`).join('')}</div>
      <div id="communityFeed" class="feed-grid"><div class="feed-loading" role="status">Loading…</div></div>
    </section>
  `, 'community');
  document.querySelector('#communityPost').insertAdjacentHTML('beforebegin','<button class="outline-btn" id="businessDirectory">Local businesses</button>');
  document.querySelector('#businessDirectory').onclick=()=>ensureMember(()=>socialUI.render('businesses'));
  document.querySelector('#communityPost').onclick = () => ensureMember(() => renderPostPage());
  document.querySelector('#communitySearchGo').onclick = () => renderCommunity(state.category, document.querySelector('#communitySearch').value.trim());
  document.querySelector('#communitySearch').onkeydown = e => { if (e.key === 'Enter') renderCommunity(state.category, e.currentTarget.value.trim()); };
  document.querySelectorAll('[data-community-cat]').forEach(b => b.onclick = () => renderCommunity(b.dataset.communityCat, state.q));
  await loadCommunityFeed(); connectLive();
}

async function loadCommunityFeed() {
  const el = document.querySelector('#communityFeed'); if (!el) return;
  try {
    const qs = new URLSearchParams(); if (state.category) qs.set('category', state.category); if (state.q) qs.set('q', state.q);
    const data = await api(`/api/feed?${qs}`); state.posts = data.posts;
    el.innerHTML = data.posts.map(postCard).join('') || emptyFeed('Nothing matched', 'Try another search or create the first post in this category.');
    bindPostActions();
  } catch (e) { el.innerHTML = `<div class="error-card">${icon('alert')}<div><strong>Could not load posts</strong><span>${esc(e.message)}</span></div></div>`; }
}

function ratingText(author) { return author?.ratingCount ? `★ ${Number(author.rating).toFixed(1)} (${author.ratingCount})` : '☆ New'; }
function postCard(p) {
  const isRide = p.category === 'ride_offer' || p.category === 'ride_wanted';
  const isOffer = p.category === 'ride_offer';
  const seats = isOffer ? (p.availableSeats ?? p.seats) : p.seats;
  return `<article class="post-card ${isRide ? 'ride-post' : ''}" data-post-card="${esc(p.id)}">
    <div class="post-top">
      <button class="author-row" data-user="${esc(p.author.id)}">${avatarHtml(p.author)}<span><strong>${esc(p.author.name)}</strong><small>${esc(p.author.area || '')} · ${relative(p.createdAt)}</small></span></button>
      <span class="post-category ${esc(p.category)}">${categoryIcon(p.category)}${esc(LABELS[p.category] || 'Post')}</span>
    </div>
    ${isRide ? `
      <div class="compact-route">
        <div><i class="start-dot"></i><span><small>${isOffer ? 'DRIVER LEAVES' : 'NEEDS A RIDE'} · ${esc(p.timeWindow ? p.timeWindow.start + ' to ' + p.timeWindow.end : p.journeyTime)}</small><strong>${esc(p.origin)}</strong></span></div>
        <div class="compact-route-line"></div>
        <div><i class="end-dot"></i><span><small>${fmtDate(p.journeyDate)}</small><strong>${esc(p.destination)}</strong></span></div>
      </div>
      <div class="ride-pills"><span>${icon('users')} ${seats} seat${seats === 1 ? '' : 's'} ${isOffer ? 'left' : 'needed'}</span>${p.price ? `<span class="money-pill">${esc(p.price)}</span>` : ''}<button class="rating-inline" data-user="${esc(p.author.id)}">${esc(ratingText(p.author))}</button></div>
      ${p.body ? `<p class="post-copy">${esc(p.body)}</p>` : ''}
    ` : `
      <h3>${esc(p.title)}</h3><p class="post-copy">${esc(p.body)}</p>${p.price ? `<div class="listing-price">${esc(p.price)}</div>` : ''}${p.location ? `<div class="location-line">${icon('map')} ${esc(p.location)}</div>` : ''}
    `}
    ${p.matchScore != null ? `<div class="match-banner">${p.matchScore}% match with your journey</div>` : ''}
    <div class="post-footer">
      <button class="post-action ${p.reacted ? 'active' : ''}" aria-label="${p.reacted ? 'Unlike' : 'Like'} post" data-react="${esc(p.id)}">${icon('heart')}<span>${p.reactionCount || ''}</span></button>
      <button class="post-action" aria-label="View details and comments" data-open-post="${esc(p.id)}">${icon('comment')}<span>${p.commentCount || ''}</span></button>
      <button class="post-action" aria-label="Share post" data-share="${esc(p.id)}">${icon('share')}<span>Share</span></button>
      ${p.whatsappUrl ? `<a class="post-action whatsapp" href="${esc(p.whatsappUrl)}" target="_blank" rel="noopener">${icon('whatsapp')}<span>WhatsApp</span></a>` : !isRide && p.whatsappEnabled ? `<button class="post-action whatsapp locked-whatsapp" data-join-whatsapp="${esc(p.id)}">${icon('lock')}<span>WhatsApp</span></button>` : ''}
      ${isOffer && !p.own && (p.availableSeats ?? 0) > 0 ? `<button class="post-action book" data-book-post="${esc(p.id)}">${icon('check')}<span>Request seat</span></button>` : ''}
    </div>
  </article>`;
}

function categoryIcon(category) {
  const found = CATEGORIES.find(([k]) => k === category); return icon(found?.[2] || 'grid');
}

function emptyFeed(title, text) { return `<div class="find-empty feed-empty"><span class="round-icon">${icon('grid')}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`; }

function bindPostActions() {
  document.querySelectorAll('[data-join-whatsapp]').forEach(b => b.onclick = e => { e.stopPropagation(); openJoin(() => openPost(b.dataset.joinWhatsapp)); });
  document.querySelectorAll('[data-post-card]').forEach(card => card.onclick = e => { if (e.target.closest('button,a')) return; openPost(card.dataset.postCard); });
  document.querySelectorAll('[data-open-post]').forEach(b => b.onclick = e => { e.stopPropagation(); openPost(b.dataset.openPost); });
  document.querySelectorAll('[data-user]').forEach(b => b.onclick = e => { e.stopPropagation(); openUser(b.dataset.user); });
  document.querySelectorAll('[data-react]').forEach(b => b.onclick = async e => { e.stopPropagation(); ensureMember(async () => { try { const d = await api(`/api/posts/${b.dataset.react}/reaction`, { method: 'POST' }); b.classList.toggle('active', d.reacted); const span = b.querySelector('span'); if (span) span.textContent = d.count || ''; } catch (err) { showToast(err.message); } }); });
  document.querySelectorAll('[data-share]').forEach(b => b.onclick = e => { e.stopPropagation(); sharePost(b.dataset.share); });
  document.querySelectorAll('[data-book-post]').forEach(b => b.onclick = e => { e.stopPropagation(); const post = state.posts.find(x => x.id === b.dataset.bookPost); if (!post) return openPost(b.dataset.bookPost); const values = { origin: post.origin, destination: post.destination, date: post.journeyDate, time: post.journeyTime, seats: 1 }; ensureMember(() => quickRequest(post.id, values, b)); });
}

async function sharePost(id) {
  const url = postUrl(id);
  try { if (navigator.share) await navigator.share({ title: 'Carpool Network', url }); else { await navigator.clipboard.writeText(url); showToast('Post link copied'); } } catch {}
}

function renderPostPage(type = '') {
  beginView('post', type ? { type } : {});
  const types = [
    ['ride_offer', 'Offer a ride', 'Share your spare seats', 'car'], ['ride_wanted', 'Need a ride', 'Let matching drivers find you', 'person'],
    ['marketplace', 'Buy & Sell', 'List something locally', 'bag'], ['job', 'Job', 'Share work or a vacancy', 'briefcase'], ['service', 'Service', 'Offer or request local help', 'tool'],
    ['accommodation', 'Accommodation', 'Rooms, stays or housing', 'home'], ['community', 'Community', 'Question, update or announcement', 'megaphone']
  ];
  shell(`
    <section class="post-page ${type.startsWith('ride_')?'ride-post-page':''}">
      <div class="post-page-head"><span class="eyebrow">${type==='ride_offer'?'MAKE ROOM FOR A GOOD JOURNEY':type==='ride_wanted'?'FIND YOUR WAY TOGETHER':'CREATE'}</span><h1>${type ? esc(types.find(t => t[0] === type)?.[1] || 'Create post') : 'Create a post'}</h1><p>${type==='ride_offer'?'Share the journey. You choose which requests to accept.':type==='ride_wanted'?'Tell the community where you need to go.':'A clear title and useful details make it easier to connect.'}</p></div>
      ${type ? `<div id="postFormWrap">${postForm(type)}</div>` : `<div class="post-type-grid">${types.map(([k, title, sub, ico]) => `<button class="post-type-card" data-post-type="${k}"><span class="post-type-icon ${k}">${icon(ico)}</span><span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>${icon('chevron')}</button>`).join('')}</div>`}
    </section>
  `, 'post');
  document.querySelectorAll('[data-post-type]').forEach(b => b.onclick = () => renderPostPage(b.dataset.postType));
  if (type) bindPostForm(type);
}

function postForm(type) {
  const ride = type === 'ride_offer' || type === 'ride_wanted';
  if (ride) {
    const offer = type === 'ride_offer';
    return `<form id="createPostForm" class="create-form ride-create-form">
      <div id="rideSetupNotice" class="ride-setup-notice" role="status" hidden></div>
      <div class="form-section"><div class="form-section-title"><span>1</span><div><strong>Your journey</strong><small>${offer ? 'Tell riders where and when you are driving.' : 'Tell drivers where and when you need to travel.'}</small></div></div>
        <div class="route-input-stack ride-route-fields">
          <label class="premium-field"><span>${icon('map')}</span><div><small>FROM</small><input name="origin" placeholder="Departure town or city" value="${esc(state.profile?.area||'')}" maxlength="100" required></div></label>
          <div class="route-connector"></div>
          <label class="premium-field"><span class="destination-pin"></span><div><small>TO</small><input name="destination" placeholder="Where are you heading?" maxlength="100" required></div></label>
        </div>
        <p class="ride-field-hint">Choose towns for your route. Agree the exact pickup privately after a booking is accepted.</p>
        <div class="form-columns three"><label><span>Date</span><input name="journeyDate" type="date" min="${today()}" value="${today(1)}" required></label><label><span>Time</span><input name="journeyTime" type="time" value="${defaultTime()}" required></label><label><span>${offer ? 'Passenger seats' : 'Seats needed'}</span><select name="seats">${[1,2,3,4,5,6,7].map(n => `<option value="${n}">${n} ${n===1?'seat':'seats'}</option>`).join('')}</select></label></div>
        <p class="ride-field-hint">${offer?'Count passengers only, excluding you. ':''}All journey times use UK local time.</p>
      </div>
      <div class="form-section"><div class="form-section-title"><span>2</span><div><strong>Helpful details</strong><small>Optional, but useful for a smooth journey.</small></div></div>
        <div class="form-columns two"><label><span>${offer ? 'Contribution' : 'Budget / contribution'} <em>optional</em></span><input name="price" placeholder="e.g. £5 or Free"></label><label><span>Time flexibility</span><select name="flexibilityMinutes"><option value="15">± 15 min</option><option value="30" selected>± 30 min</option><option value="60">± 1 hour</option><option value="120">± 2 hours</option></select></label></div>
        <label><span>Notes <em>optional</em></span><textarea name="body" maxlength="800" placeholder="Pickup area, luggage, work shift, anything useful…"></textarea></label>
        <div class="whatsapp-required-note">${icon('whatsapp')}<span><strong>Keep trip details together</strong><small>${offer?'You choose which requests to accept.':'Your seat is confirmed when the driver accepts.'} Agree the pickup in your booking chat, or open WhatsApp after acceptance.</small></span></div><input type="hidden" name="whatsappEnabled" value="true">
      </div>
      <section class="ride-review" aria-labelledby="rideReviewTitle"><div class="ride-review-heading"><span class="setup-icon">${icon('car')}</span><div><span class="eyebrow">AT A GLANCE</span><h2 id="rideReviewTitle">Your ${offer?'ride offer':'ride request'}</h2></div><span class="ride-draft-label">Not published yet</span></div><div id="ridePreview"></div></section>
      <p id="postError" class="form-error" role="alert" tabindex="-1" hidden></p>
      <div class="sticky-submit"><button class="ghost-btn" type="button" id="backPostTypes">Back</button><button class="primary-btn red large" type="submit">${offer ? 'Publish ride offer' : 'Post ride request'} ${icon('arrow')}</button></div>
    </form>`;
  }
  return `<form id="createPostForm" class="create-form">
    <div class="form-section"><div class="form-section-title"><span>1</span><div><strong>${esc(LABELS[type])}</strong><small>Make it useful and easy to understand.</small></div></div>
      <label><span>Title</span><input name="title" maxlength="140" required placeholder="A short clear title"></label>
      <label><span>Details</span><textarea name="body" maxlength="2500" required placeholder="Tell the network what people need to know…"></textarea></label>
      <div class="form-columns two"><label><span>Area / location</span><input name="location" value="${esc(state.profile?.area || '')}" placeholder="Cardiff"></label><label><span>Price / pay <em>optional</em></span><input name="price" placeholder="e.g. £25, £12/hour, Free"></label></div>
      <label class="toggle-row"><input type="checkbox" name="whatsappEnabled" checked><span class="toggle-ui"></span><span><strong>Show a WhatsApp button</strong><small>WhatsApp contact is available only to accepted ride partners.</small></span></label>
    </div>
    <div class="sticky-submit"><button class="ghost-btn" type="button" id="backPostTypes">Back</button><button class="primary-btn red large" type="submit">Publish post ${icon('arrow')}</button></div>
  </form>`;
}

function bindPostForm(type, existing = null) {
  document.querySelector('#backPostTypes').onclick = () => existing ? closeSheet() : renderPostPage();
  const form = document.querySelector('#createPostForm');
  bindLocationInput(form.origin,{current:true,toast:showToast});bindLocationInput(form.destination,{toast:showToast});
  const preview=form.querySelector('#ridePreview');
  if(preview){
    const update=()=>{const f=form.elements,seats=Number(f.seats.value),date=f.journeyDate.value;
      preview.innerHTML=`<div class="ride-preview-route"><strong>${esc(f.origin.value.trim()||'Your departure')}</strong>${icon('arrow')}<strong>${esc(f.destination.value.trim()||'Your destination')}</strong></div><div class="ride-preview-meta"><span>${icon('calendar')} ${date?esc(fmtDate(date)):'Choose a date'}</span><span>${icon('clock')} ${esc(f.journeyTime.value||'Choose a time')}</span><span>${icon('users')} ${seats} ${seats===1?'seat':'seats'}</span>${f.price.value.trim()?`<span>${esc(f.price.value.trim())}</span>`:''}</div>`;};
    form.addEventListener('input',update);form.addEventListener('change',update);update();
    if(existing)form.querySelector('.ride-draft-label').textContent='Preview of your changes';
    if(state.profile)api('/api/account-status').then(({account})=>{
      if(!form.isConnected)return;const issue=account.participationIssue||(type==='ride_offer'?account.vehicleIssue:null),notice=form.querySelector('#rideSetupNotice');
      if(issue){notice.hidden=false;notice.innerHTML=`${icon('alert')}<div><strong>Before you publish</strong><p>${esc(issue.error)}</p><a href="/?view=me&tab=account" target="_blank" rel="noopener">Open account in a new tab ${icon('arrow')}</a></div>`;}
    }).catch(()=>{});
  }
  form.onsubmit = async e => {
    e.preventDefault();const inlineError=form.querySelector('#postError');if(inlineError){inlineError.hidden=true;inlineError.textContent='';} const button = form.querySelector('[type="submit"]'); const original = button.innerHTML; button.disabled = true; button.innerHTML = 'Publishing…';
    const f = new FormData(form); const body = Object.fromEntries(f.entries()); body.category = type; body.whatsappEnabled = form.whatsappEnabled?.type === 'checkbox' ? form.whatsappEnabled.checked : true;
    if (body.seats) body.seats = Number(body.seats); if (body.flexibilityMinutes) body.flexibilityMinutes = Number(body.flexibilityMinutes);
    try {
      const data = await api(existing ? `/api/posts/${existing.id}` : '/api/posts', { method: existing ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      haptic(); showToast(existing ? 'Post updated' : 'Posted to Carpool Network', 'success');
      if (existing) { closeSheet(); await renderMe('posts'); return; }
      if (type === 'ride_wanted' && data.matches?.length) openRideMatches(data.post.id, 'rider');
      else if (type === 'ride_offer' && data.matches?.length) openRideMatches(data.post.id, 'driver');
      else renderHome();
    } catch (err) { if(inlineError){inlineError.hidden=false;inlineError.textContent=err.message;inlineError.focus();}else showToast(err.message, 'error'); button.disabled = false; button.innerHTML = original; }
  };
}

async function openRideMatches(postId, role = 'rider') {
  try {
    const data = await api(`/api/posts/${postId}/matches`);
    const matches = data.matches || [];
    if (!matches.length) { renderMe('rides'); return; }
    openSheet(`<div class="sheet-title"><span class="eyebrow">MATCHES FOUND</span><h2>${role === 'rider' ? 'Choose a driver' : 'Potential riders nearby'}</h2><p>${role === 'rider' ? 'Request up to three. The first driver who accepts holds your seat; then agree pickup in your booking conversation.' : 'They have been matched to your route. Riders make the booking request so seats stay coordinated.'}</p></div><div class="match-list">${matches.map(m => matchCard(m, role)).join('')}</div>${role === 'rider' ? '<div class="booking-explainer compact"><span class="shield-icon">' + icon('lock') + '</span><div><strong>No double booking.</strong><p>After one driver accepts, conflicting requests cancel automatically and your booking conversation keeps the details together.</p></div></div>' : ''}`);
    if (role === 'rider') document.querySelectorAll('[data-request-match]').forEach(b => b.onclick = async () => { try { b.disabled = true; b.textContent = 'Sending…'; await api('/api/ride-requests', { method: 'POST', body: JSON.stringify({ rideWantedPostId: postId, rideOfferPostId: b.dataset.requestMatch }) }); b.textContent = 'Request sent'; b.classList.add('sent'); showToast('Driver alerted', 'success'); } catch (e) { b.disabled = false; b.textContent = 'Request seat'; showToast(e.message, 'error'); } });
    else document.querySelectorAll('[data-open-match]').forEach(b => b.onclick = () => openPost(b.dataset.openMatch));
  } catch (e) { showToast(e.message, 'error'); }
}

function matchCard(m, role) {
  const p = m.post;
  return `<div class="match-choice"><div class="match-orb ${m.post.matchScore >= 80 ? 'great' : 'good'}"><strong>${m.post.matchScore}%</strong><span>match</span></div><div class="match-choice-main"><div class="match-member-line">${avatarHtml(p.author,'tiny-avatar')}<strong>${esc(p.author.name)} <small>${esc(ratingText(p.author))}</small></strong></div><p>${esc(p.origin)} → ${esc(p.destination)}</p><span>${fmtDate(p.journeyDate)} · ${esc(p.timeWindow ? p.timeWindow.start + ' to ' + p.timeWindow.end : p.journeyTime)} · ${p.availableSeats ?? p.seats} seat${(p.availableSeats ?? p.seats) === 1 ? '' : 's'}</span></div>${role === 'rider' ? `<button class="primary-btn small ${m.requestStatus ? 'sent' : ''}" data-request-match="${esc(p.id)}" ${m.requestStatus === 'pending' ? 'disabled' : ''}>${m.requestStatus === 'pending' ? 'Requested' : 'Request seat'}</button>` : `<button class="outline-btn small" data-open-match="${esc(p.id)}">View</button>`}</div>`;
}

async function openPost(id) {
  try {
    const { post } = await api(`/api/posts/${id}`);
    let comments = []; try { comments = (await api(`/api/posts/${id}/comments`)).comments || []; } catch {}
    const isRide = post.category === 'ride_offer' || post.category === 'ride_wanted';
    openSheet(`<div class="post-detail">
      <div class="post-detail-head"><button class="author-row" data-user="${esc(post.author.id)}">${avatarHtml(post.author,'large-avatar')}<span><strong>${esc(post.author.name)}</strong><small>${esc(post.author.area)} · ${esc(ratingText(post.author))}</small></span></button><span class="post-category ${esc(post.category)}">${categoryIcon(post.category)}${esc(LABELS[post.category])}</span></div>
      ${isRide ? `<div class="detail-route"><div><small>${post.category === 'ride_offer' ? 'DRIVING FROM' : 'NEEDS PICKUP FROM'}</small><strong>${esc(post.origin)}</strong></div><span>${icon('arrow')}</span><div><small>GOING TO</small><strong>${esc(post.destination)}</strong></div></div><div class="detail-meta"><span>${icon('calendar')} ${fmtLongDate(post.journeyDate)}</span><span>${icon('clock')} ${esc(post.journeyTime)}</span><span>${icon('users')} ${post.category === 'ride_offer' ? `${post.availableSeats} of ${post.seats} seats left` : `${post.seats} needed`}</span>${post.price ? `<span class="money-pill">${esc(post.price)}</span>` : ''}</div>` : `<h2 class="detail-title">${esc(post.title)}</h2>${post.location ? `<div class="location-line">${icon('map')} ${esc(post.location)}</div>` : ''}${post.price ? `<div class="listing-price big">${esc(post.price)}</div>` : ''}`}
      ${post.body ? `<p class="detail-copy">${esc(post.body)}</p>` : ''}
      ${isRide && post.whatsappUrl ? `<div class="booking-explainer compact"><span class="shield-icon">${icon('lock')}</span><div><strong>Request a seat, then agree the pickup.</strong><p>Carpool Network holds the seat after driver acceptance; agree the exact trip details in Messages or WhatsApp.</p></div></div>` : ''}
      <div id="rideBookingArea"></div>
      <div class="detail-actions">${post.whatsappUrl ? `<a class="primary-btn whatsapp-solid" href="${esc(post.whatsappUrl)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : !['ride_offer','ride_wanted'].includes(post.category) && post.whatsappEnabled ? `<button class="primary-btn whatsapp-solid" id="joinForWhatsapp">${icon('lock')} WhatsApp</button>` : ''}<button class="outline-btn" id="shareDetail">${icon('share')} Share</button><button class="outline-btn" id="reportDetail">Report</button></div>
      ${post.own ? ownerActions(post) : ''}
      <div class="comments-section"><div class="comments-head"><strong>Comments</strong><span>${comments.length}</span></div><div class="comments">${comments.map(commentHtml).join('') || '<p class="muted-center">No comments yet.</p>'}</div>${state.profile ? `<form id="commentForm" class="comment-form"><input name="body" maxlength="600" placeholder="Write a comment…" required><button>${icon('arrow')}</button></form>` : '<button class="wide-join" id="joinToComment">Join to comment</button>'}</div>
    </div>`);
    document.querySelector('#sheetBackdrop [data-user]')?.addEventListener('click', () => openUser(post.author.id));
    document.querySelector('#shareDetail').onclick = () => sharePost(post.id);
    document.querySelector('#reportDetail').onclick = () => ensureMember(() => reportPost(post.id));
    document.querySelector('#joinToComment')?.addEventListener('click', () => openJoin(() => openPost(post.id)));
    document.querySelector('#joinForWhatsapp')?.addEventListener('click', () => state.profile && isRide ? showToast('Contact details unlock after the driver accepts your request.') : openSignIn(() => openPost(post.id)));
    document.querySelector('#commentForm')?.addEventListener('submit', async e => { e.preventDefault(); try { await api(`/api/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ body: e.currentTarget.body.value }) }); openPost(post.id); } catch (err) { showToast(err.message); } });
    bindOwnerActions(post);
    if (isRide) await renderBookingArea(post);
  } catch (e) { showToast(e.message, 'error'); }
}

function ownerActions(post) {
  if(post.commuteId)return `<div class="owner-panel"><p>This journey belongs to your regular commute.</p><button class="outline-btn" id="manageCommuteJourney">Manage regular commute</button></div>`;
  const active = post.status === 'active';
  const isRide = post.category === 'ride_offer' || post.category === 'ride_wanted';
  return `<div class="owner-panel"><div><strong>Your post</strong><span>${active ? 'Live in the network' : `Status: ${esc(post.status)}`} · ${isRide ? 'Coordinate in your booking conversation' : `WhatsApp ${post.whatsappEnabled ? 'on' : 'off'}`}</span></div><div class="owner-buttons">${!isRide ? `<button class="outline-btn" id="toggleWhatsapp">${icon('whatsapp')} ${post.whatsappEnabled ? 'WhatsApp on' : 'Enable WhatsApp'}</button>` : `<span class="required-pill">${icon('whatsapp')} Booking chat available</span>`}${post.category === 'ride_offer' ? `<button class="danger-outline" id="cancelWholeRide">Cancel ride</button>` : ''}<button class="outline-btn" id="togglePost">${active ? 'Close' : 'Reopen'}</button><button class="danger-outline" id="deletePost">${icon('trash')} Delete</button></div></div>`;
}

function bindOwnerActions(post) {
  if(post.commuteId){document.querySelector('#manageCommuteJourney').onclick=()=>commuteUI.view(post.commuteId);return;}
  const buttons = document.querySelector('#sheetBackdrop .owner-buttons');
  if (post.status === 'active' && !post.departed && buttons) {
    const edit = document.createElement('button'); edit.className = 'outline-btn'; edit.id = 'editPost'; edit.innerHTML = `${icon('edit')} Edit`;
    edit.onclick = () => editPost(post); buttons.prepend(edit);
  }
  if (post.departed) { document.querySelector('#cancelWholeRide')?.remove(); document.querySelector('#togglePost')?.remove(); }
  document.querySelector('#toggleWhatsapp')?.addEventListener('click', async () => { try { await api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ whatsappEnabled: !post.whatsappEnabled }) }); showToast(post.whatsappEnabled ? 'WhatsApp contact hidden' : 'WhatsApp contact enabled', 'success'); openPost(post.id); } catch (e) { showToast(e.message, 'error'); } });
  document.querySelector('#togglePost')?.addEventListener('click', async () => { try { await api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ status: post.status === 'active' ? 'closed' : 'active' }) }); closeSheet(); showToast(post.status === 'active' ? 'Post closed' : 'Post reopened'); renderMe(); } catch (e) { showToast(e.message, 'error'); } });
  document.querySelector('#deletePost')?.addEventListener('click', async () => { if (!confirm('Delete this post from the network?')) return; try { await api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'deleted' }) }); closeSheet(); showToast('Post deleted'); renderMe(); } catch (e) { showToast(e.message, 'error'); } });
  document.querySelector('#cancelWholeRide')?.addEventListener('click', async () => { if (!confirm('Cancel this entire ride? Confirmed and pending riders will be notified automatically.')) return; try { const d = await api(`/api/posts/${post.id}/cancel-ride`, { method: 'POST' }); closeSheet(); showToast(`Ride cancelled. ${d.cancelledBookings || 0} booking${d.cancelledBookings === 1 ? '' : 's'} updated.`, 'success'); renderMe('rides'); } catch (e) { showToast(e.message, 'error'); } });
}

function editPost(post) {
  openSheet(`<div class="sheet-title"><h2>Edit ${esc(LABELS[post.category])}</h2></div>${postForm(post.category)}`);
  const form = document.querySelector('#createPostForm');
  bindLocationInput(form.origin,{current:true,toast:showToast});bindLocationInput(form.destination,{toast:showToast});
  for (const key of ['title','body','location','price','origin','destination','journeyDate','journeyTime','seats','flexibilityMinutes']) {
    const field = form.elements.namedItem(key); if (field) field.value = post[key] ?? '';
  }
  const whatsapp = form.elements.namedItem('whatsappEnabled'); if (whatsapp?.type === 'checkbox') whatsapp.checked = post.whatsappEnabled;
  form.querySelector('[type=submit]').textContent = 'Save changes';
  bindPostForm(post.category, post);
}

async function renderBookingArea(post) {
  const el = document.querySelector('#rideBookingArea'); if (!el) return;
  if (post.booking) {
    el.innerHTML = `<div class="booking-summary"><span class="trip-status ${esc(post.booking.status)}">${post.booking.status === 'pending' ? 'Awaiting driver' : 'Confirmed'}</span><p>${post.booking.seats_requested} seat${post.booking.seats_requested === 1 ? '' : 's'} requested</p><button id="openMyBooking" class="primary-btn">View booking</button></div>`;
    document.querySelector('#openMyBooking').onclick = () => { closeSheet(); renderMe('rides'); };
    return;
  }
  if (post.category === 'ride_offer' && !post.own && !post.canBook) {
    el.innerHTML = `<div class="booking-summary"><h3>${post.departed ? 'This journey has departed' : post.status !== 'active' ? 'This journey is closed' : 'No seats available'}</h3><button id="findAvailable" class="outline-btn">Find another ride</button></div>`;
    document.querySelector('#findAvailable').onclick = () => { closeSheet(); renderFind(); };
    return;
  }
  if (!state.profile) {
    if (post.category === 'ride_offer' && (post.availableSeats ?? 0) > 0) el.innerHTML = `<button class="primary-btn red full" id="joinToBook">Join Carpool Network to request a seat</button>`;
    document.querySelector('#joinToBook')?.addEventListener('click', () => openSignIn(() => openPost(post.id)));
    return;
  }
  if (post.category === 'ride_offer' && !post.own) {
    const values = { origin: post.origin, destination: post.destination, date: post.journeyDate, time: post.journeyTime, seats: 1 };
    el.innerHTML = `<div class="booking-box"><div><span class="eyebrow">SAFE MATCHING</span><h3>Request the seat</h3><p>The driver accepts or declines here. If accepted, the seat is held and you can agree the trip details in Messages.</p></div><div class="seat-stepper"><button id="seatMinus">−</button><strong id="seatCount">1</strong><button id="seatPlus">+</button><span>seat(s)</span></div><button class="primary-btn red full" id="detailBook">Request seat</button></div>`;
    let count = 1; const max = Math.max(1, Math.min(8, post.availableSeats || 1));
    const update = () => { document.querySelector('#seatCount').textContent = count; document.querySelector('#seatMinus').disabled = count === 1; document.querySelector('#seatPlus').disabled = count === max; };
    document.querySelector('#seatMinus').onclick = () => { count = Math.max(1, count - 1); update(); };
    document.querySelector('#seatPlus').onclick = () => { count = Math.min(max, count + 1); update(); };
    update();
    document.querySelector('#detailBook').onclick = async () => { values.seats = count; await quickRequest(post.id, values, document.querySelector('#detailBook')); if (document.querySelector('#detailBook')?.disabled) openPost(post.id); };
    return;
  }
  if (post.own && post.category === 'ride_offer') {
    try {
      const data = await api(`/api/posts/${post.id}/ride-requests`); const reqs = data.requests || [];
      if (!el.isConnected) return;
      const pending = reqs.filter(r => r.status === 'pending' && !post.departed && post.status === 'active'); const accepted = reqs.filter(r => ['accepted','completed'].includes(r.status));
      el.innerHTML = `<div class="booking-box owner-bookings"><div class="booking-box-head"><div><span class="eyebrow">BOOKINGS</span><h3>${pending.length} request${pending.length === 1 ? '' : 's'} waiting</h3></div><span class="seat-pill">${post.availableSeats} seats left</span></div>${pending.map(driverRequestRow).join('') || '<p class="muted-center">No pending requests.</p>'}${accepted.length ? `<div class="accepted-list"><strong>Confirmed riders — open My bookings to message</strong>${accepted.map(r => `<div class="accepted-rider-row"><span>${avatarHtml({id:r.rider_id,name:r.rider_name,avatarEmoji:r.rider_avatar_emoji},'tiny-avatar')}<b>${esc(r.rider_name)}</b></span><span>${r.seats_requested} seat${r.seats_requested === 1 ? '' : 's'}</span>${r.contact_url ? `<a class="whatsapp-link compact" href="${esc(r.contact_url)}" target="_blank" rel="noopener">${icon('whatsapp')} Open WhatsApp</a>` : ''}</div>`).join('')}</div>` : ''}</div>`;
      bindDriverRequestActions(post.id);
    } catch (e) { el.innerHTML = `<div class="notice-error">${esc(e.message)}</div>`; }
    return;
  }
  if(!post.own&&post.category==='ride_wanted'&&post.status==='active'&&!post.departed){el.innerHTML='<div class="booking-box"><h3>Can you share this journey?</h3><p>Publish your available seats. The passenger can request your ride, then you confirm the booking.</p><button class="primary-btn" id="offerWantedRoute">Offer this route</button></div>';document.querySelector('#offerWantedRoute').onclick=()=>offerRoute({origin:post.origin,destination:post.destination,date:post.journeyDate,time:post.journeyTime,seats:post.seats});}
  if (post.own && post.category === 'ride_wanted') {
    if (post.status !== 'active' || post.departed) { el.innerHTML = '<div class="booking-summary">This ride request is no longer open.</div>'; return; }
    el.innerHTML = `<div class="booking-box"><div><span class="eyebrow">DRIVER MATCHING</span><h3>Find a confirmed driver</h3><p>Request up to three matching drivers. The first accepted ride becomes your booking.</p></div><button class="primary-btn full" id="showMatches">Show matching drivers</button></div>`;
    document.querySelector('#showMatches').onclick = () => openRideMatches(post.id, 'rider');
  }
}

function driverRequestRow(r) {
  const rating = r.rider_rating_count ? `★ ${Number(r.rider_rating).toFixed(1)} (${r.rider_rating_count})` : '☆ New';
  return `<div class="request-row">${avatarHtml({id:r.rider_id,name:r.rider_name,avatarEmoji:r.rider_avatar_emoji})}<div class="request-main"><strong>${esc(r.rider_name)} <small>${esc(rating)}</small></strong><p>${r.seats_requested} seat${r.seats_requested === 1 ? '' : 's'} · ${esc(r.rider_area || '')}</p></div><div class="request-decisions"><button class="accept-btn" data-accept-request="${esc(r.id)}">Accept</button><button class="decline-btn" data-decline-request="${esc(r.id)}">Decline</button></div></div>`;
}
function bindDriverRequestActions(postId) {
  document.querySelectorAll('[data-accept-request]').forEach(b => b.onclick = async () => { try { b.disabled = true; b.textContent = 'Accepting…'; await api(`/api/ride-requests/${b.dataset.acceptRequest}`, { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) }); showToast('Booking confirmed — agree pickup in Messages.', 'success'); openPost(postId); } catch (e) { b.disabled = false; b.textContent = 'Accept'; showToast(e.message, 'error'); } });
  document.querySelectorAll('[data-decline-request]').forEach(b => b.onclick = async () => { try { await api(`/api/ride-requests/${b.dataset.declineRequest}`, { method: 'PATCH', body: JSON.stringify({ status: 'declined' }) }); openPost(postId); } catch (e) { showToast(e.message, 'error'); } });
}

function commentHtml(c) { return `<div class="comment">${avatarHtml({id:c.author_id,name:c.author_name,avatarEmoji:c.author_avatar_emoji},'tiny-avatar')}<div class="comment-bubble"><strong>${esc(c.author_name)}</strong><p>${esc(c.body)}</p><small>${relative(c.created_at)}</small></div></div>`; }

async function openUser(id) {
  try {
    const data = await api(`/api/users/${id}`); const u = data.user; const reviews = data.reviews || [];
    const memberSince = u.created_at ? new Date(`${String(u.created_at).replace(' ','T')}Z`).toLocaleDateString(undefined,{month:'short',year:'numeric'}) : '';
    openSheet(`<div class="member-profile">${avatarHtml(u,'member-avatar')}<h2>${esc(u.name)}</h2><p>${esc(u.area || '')}</p><div class="profile-chip-row centered-chips">${profileChips(u)}</div><div class="member-trust-grid"><div><strong>${u.rating_count ? `★ ${Number(u.rating).toFixed(1)}` : '☆ New'}</strong><span>ride rating</span></div><div><strong>${Number(u.completed_rides||0)}</strong><span>past bookings</span></div><div><strong>${esc(memberSince || 'New')}</strong><span>member since</span></div></div>${u.bio ? `<p class="member-bio">${esc(u.bio)}</p>` : ''}<div class="trust-note">${icon('lock')} Ratings come only from completed Carpool Network ride matches. New reviews are cryptographically sealed after submission. Agree final trip details in your booking conversation.</div><div class="review-list">${reviews.length ? reviews.map(r => `<div class="review"><div class="review-head"><strong>${'★'.repeat(r.score)}</strong>${r.sealed?`<span class="sealed-badge">${icon('shield')} Sealed</span>`:''}</div><p>${esc(r.comment)}</p><small>${esc(r.rater_name)} · ${relative(r.created_at)}</small></div>`).join('') : '<p class="muted-center">No written ride reviews yet.</p>'}</div>${state.profile && state.profile.id!==u.id?`<button class="text-danger report-member-btn" data-report-member="${esc(u.id)}">Report this member to Support</button>`:''}</div>`);
    if(state.profile){const profile=document.querySelector('.member-profile');profile?.insertAdjacentHTML('beforeend','<button class="outline-btn" id="viewVehicleDetails">Vehicle & social profiles</button>');document.querySelector('#viewVehicleDetails')?.addEventListener('click',()=>memberDetails.view(u.id));}
    document.querySelector('[data-report-member]')?.addEventListener('click',()=>reportMember(u.id,u.name));
    const trust = document.querySelector('.trust-note');
    if (trust) trust.textContent = `${u.email_verified ? 'Email verified. ' : 'Email not verified. '}Phone and identity are not verified. Reviews follow confirmed bookings, not independently verified travel. New reviews publish when both participants submit or after 14 days.`;
    const profile = document.querySelector('.member-profile');
    if(u.role_ratings?.length) profile.querySelector('.member-trust-grid').insertAdjacentHTML('afterend',`<p>${u.role_ratings.map(r=>`${esc(r.role)}: ${r.score} / 5 (${r.count} reviews)`).join(' · ')}</p>`);
    profile.querySelectorAll('.review').forEach((el,index)=>{
      const review=reviews[index];if(review.reply)el.insertAdjacentHTML('beforeend',`<blockquote>${esc(review.reply.body)}</blockquote>`);
      if(!state.profile)return;
      const action=state.profile.id===u.id?'reply':'report',b=document.createElement('button');b.className='text-action';b.textContent=action==='reply'?'Reply to review':'Report review';
      b.onclick=async()=>{const text=prompt(action==='reply'?'Your reply':'Reason for reporting');if(!text)return;try{await api(`/api/social/reviews/${review.id}/${action}`,{method:'POST',body:JSON.stringify(action==='reply'?{body:text}:{reason:text})});showToast('Saved');await openUser(u.id);}catch(error){showToast(error.message,'error');}};el.appendChild(b);
    });
    if (state.profile && state.profile.id !== u.id) {
      profile.insertAdjacentHTML('beforeend','<div class="toolbar-actions"><button class="outline-btn" id="messageMember">Message</button><button class="danger-outline" id="blockMember">Block member</button><button class="outline-btn" id="copyMember">Copy member ID</button></div>');
      document.querySelector('#messageMember').onclick = () => socialUI.direct(u.id);
      document.querySelector('#blockMember').onclick = () => socialUI.block(u.id);
      document.querySelector('#copyMember').onclick = async () => {await navigator.clipboard.writeText(u.id);showToast('Member ID copied');};
    }
  } catch (e) { showToast(e.message, 'error'); }
}

function reportPost(id) {
  openSheet(`<div class="sheet-title"><span class="eyebrow">SAFETY</span><h2>Report this post</h2><p>Tell us what is wrong. Reports are saved for administrator review.</p></div><form id="reportForm" class="simple-form"><label><span>Reason</span><textarea name="reason" required maxlength="400" placeholder="Spam, scam, unsafe content, misleading information…"></textarea></label><button class="primary-btn red full">Send report</button></form>`);
  document.querySelector('#reportForm').onsubmit = async e => { e.preventDefault(); try { await api('/api/report', { method: 'POST', body: JSON.stringify({ postId: id, reason: e.currentTarget.reason.value }) }); closeSheet(); showToast('Report sent'); } catch (err) { showToast(err.message); } };
}

function openSignIn(after) {
  if(state.emailAvailable) return socialUI.email('signin',after);
  return openPinSignIn(after);
}
function openPinSignIn(after) {
  openSheet(`<div class="sheet-title"><span class="eyebrow">CARPOOL NETWORK</span><h2>Welcome back</h2></div><form id="signInForm" class="simple-form"><label><span>WhatsApp number</span><input name="phone" type="tel" autocomplete="username" required></label><label><span>6-digit PIN</span><input name="pin" type="password" inputmode="numeric" autocomplete="current-password" pattern="[0-9]{6}" maxlength="6" required></label><p id="signInError" class="form-error" role="alert"></p><button class="primary-btn red full" type="submit">Sign in</button><button type="button" class="text-action centered" id="forgotPin">Forgot PIN or haven't set one?</button><button type="button" class="outline-btn full" id="newMember">Create an account</button></form>`);
  document.querySelector('#newMember').onclick = () => state.emailAvailable ? socialUI.email('signup',after) : openJoin(after);
  document.querySelector('#signInForm').insertAdjacentHTML('beforebegin', '<div class="toolbar-actions"><button class="outline-btn" id="emailSignIn">Email sign-in / Join</button><button class="outline-btn" id="passkeySignIn">Use passkey</button></div>');
  document.querySelector('#emailSignIn').disabled=!state.emailAvailable;
  document.querySelector('#emailSignIn').textContent=state.emailAvailable?'Continue with email':'Email sign-in is being set up';
  document.querySelector('#emailSignIn').onclick = () => socialUI.email('signin', after);
  document.querySelector('#passkeySignIn').onclick = () => socialUI.passkeyLogin(after);
  document.querySelector('#forgotPin').onclick = () => openRecovery(after);
  document.querySelector('#signInForm').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const data = await api('/api/auth/pin/login', { method: 'POST', body: JSON.stringify({ phone: form.phone.value, pin: form.pin.value }) });
      saveProfile(data.profile); closeSheet(); connectLive(); if (after) await after(); else await renderMe();
    } catch (error) { form.querySelector('#signInError').textContent = error.message; button.disabled = false; }
  };
}

async function openPinSetup(done) {
  try {
    const { configured } = await api('/api/auth/pin/status');
    openSheet(`<div class="sheet-title"><h2>${configured ? 'Change' : 'Set up'} sign-in PIN</h2></div><form id="pinForm" class="simple-form">${configured ? '<label><span>Current PIN</span><input name="currentPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password" required></label>' : ''}<label><span>New 6-digit PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label><label><span>Confirm PIN</span><input name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label><p role="alert" class="form-error"></p><button type="submit" class="primary-btn full">Save PIN</button></form>`);
    document.querySelector('#pinForm').onsubmit = async e => {
      e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]');
      if (form.pin.value !== form.confirmPin.value) { form.querySelector('[role=alert]').textContent = 'The PINs do not match.'; return; }
      button.disabled = true;
      try { await api('/api/auth/pin/setup', { method: 'POST', body: JSON.stringify({ pin: form.pin.value, currentPin: form.currentPin?.value }) }); state.adminToken = ''; saveAdminToken(''); closeSheet(); showToast('PIN saved. Other devices have been signed out.', 'success'); if (done) await done(); }
      catch (error) { form.querySelector('[role=alert]').textContent = error.message; button.disabled = false; }
    };
  } catch (error) { showToast(error.message, 'error'); }
}

function openJoin(after) {
  if(state.emailAvailable)return socialUI.email('signup',after);
  openSheet(`<div class="join-hero"><img src="/icon.svg" alt=""><span class="eyebrow">WELCOME TO</span><h2>Carpool Network</h2></div>
    <form id="joinForm" class="simple-form join-form">
      <label><span>Your name</span><input name="name" autocomplete="name" maxlength="60" required placeholder="Your name"></label>
      <label><span>WhatsApp number</span><input name="phone" autocomplete="tel" inputmode="tel" required placeholder="+44 7…"></label>
      <label><span>Choose a 6-digit PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required></label>
      <label><span>Town / area</span><input name="area" autocomplete="address-level2" maxlength="100" required placeholder="e.g. Cardiff"></label>
      <div class="form-columns two profile-extra-grid">
        <label><span>I usually</span><select name="travelRole"><option value="both">Drive & ride</option><option value="driver">Offer rides</option><option value="rider">Look for rides</option></select></label>
        <label><span>Gender <em>optional</em></span><select name="gender"><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary</option></select></label>
      </div>
      <label><span>Workplace / community <em>optional</em></span><input name="community" maxlength="100" placeholder="e.g. Amazon EMA2, NHS, university, local group"></label>
      <div class="privacy-note">${icon('lock')}<span><strong>Your WhatsApp number is not shown to anonymous visitors.</strong> Coordinate accepted bookings in Messages. A WhatsApp contact is required before participating. Gender is optional and is not secretly used to rank matches.</span></div>
      <button class="primary-btn red full large" type="submit">Join Carpool Network</button>
      <button class="text-action centered" type="button" id="recoverAccount">Already a member? Sign in</button>
    </form>`);
  document.querySelector('#recoverAccount').onclick = () => openSignIn(after);
  document.querySelector('#joinForm').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget; const btn = form.querySelector('[type="submit"]'); btn.disabled = true; btn.textContent = 'Joining…';
    try {
      const data = await api('/api/profile', { method: 'POST', body: JSON.stringify({ name: form.name.value, phone: form.phone.value, pin: form.pin.value, area: form.area.value, gender: form.gender.value, travelRole: form.travelRole.value, community: form.community.value }) });
      saveProfile(data.profile); connectLive();
      showRecoveryCode(data.recoveryCode, () => { closeSheet(); showToast('Welcome to Carpool Network', 'success'); if (after) after(); else renderHome(); });
    } catch (err) {
      showToast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Join Carpool Network';
      if (/already.*member|recover account/i.test(err.message)) {
        const recover = document.querySelector('#recoverAccount');
        recover?.classList.add('attention');
        recover?.focus();
      }
    }
  };
}

function showRecoveryCode(code, done) {
  if (!code) return done();
  const sheet = document.querySelector('.sheet'); if (!sheet) return done();
  sheet.innerHTML = `<button class="sheet-close" id="sheetClose">${icon('x')}</button><div class="recovery-card"><span class="round-icon">${icon('lock')}</span><span class="eyebrow">ACCOUNT RECOVERY</span><h2>Save this code once</h2><p>If you change phone or clear browser data, this code and your WhatsApp number can restore access to your posts and bookings.</p><div class="recovery-code" id="recoveryCode">${esc(code)}</div><button class="primary-btn full" id="copyRecovery">${icon('copy')} Copy recovery code</button><button class="text-action centered" id="continueRecovery">I saved it — continue</button></div>`;
  document.querySelector('#sheetClose').onclick = done;
  document.querySelector('#copyRecovery').onclick = async () => { try { await navigator.clipboard.writeText(code); showToast('Recovery code copied', 'success'); } catch { showToast('Copy the code manually'); } };
  document.querySelector('#continueRecovery').onclick = done;
}

function openRecovery(after) {
  openSheet(`<div class="sheet-title"><span class="eyebrow">RECOVER ACCOUNT</span><h2>Use your recovery code</h2><p>This replaces your recovery code, resets your PIN, and signs out your other devices.</p></div><form id="recoveryForm" class="simple-form"><label><span>WhatsApp number</span><input name="phone" type="tel" autocomplete="username" required></label><label><span>Recovery code</span><input name="recoveryCode" autocomplete="off" required placeholder="CN-XXXXX-XXXXX-XXXXX-XXXXX"></label><button class="primary-btn red full" type="submit">Recover my account</button><button type="button" class="text-action centered" id="backJoin">Back to sign in</button></form>`);
  document.querySelector('#backJoin').onclick = () => openSignIn(after);
  document.querySelector('#recoveryForm').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const data = await api('/api/profile/recover', { method: 'POST', body: JSON.stringify({ phone: form.phone.value, recoveryCode: form.recoveryCode.value }) });
      clearStoredProfile(); saveProfile(data.profile); connectLive();
      showRecoveryCode(data.recoveryCode, () => openPinSetup(() => after ? after() : renderMe()));
    } catch (error) { showToast(error.message, 'error'); button.disabled = false; }
  };
}

async function renderAlerts() {
  const visit = beginView('alerts'); let data;
  try { data = await api('/api/notifications'); if (visit !== viewRevision) return; state.unread = data.unread || 0; } catch (e) { if (visit === viewRevision) pageError('Alerts are unavailable', e, renderAlerts); return; }
  shell(`<section class="alerts-page"><div class="alerts-head"><div><span class="eyebrow">LIVE ACTIVITY</span><h1>Alerts</h1><p>Ride requests, confirmations, matches, comments and ratings.</p></div><button class="outline-btn" id="markRead">Mark all read</button></div>
    <div class="notification-permission-card"><span class="notification-art">${icon('bell')}</span><div><strong>Get ride alerts quickly</strong><p>Enable push notifications so requests and confirmations reach you even when Carpool Network is closed.</p></div><button class="primary-btn" id="enablePush">Enable notifications</button></div>
    <div class="alerts-list">${data.notifications.map(notificationRow).join('') || `<div class="find-empty"><span class="round-icon">${icon('bell')}</span><h2>Nothing to catch up on</h2><p>New matches and booking activity will appear here.</p></div>`}</div></section>`, 'alerts');
  document.querySelector('#markRead').onclick = async () => { try { await api('/api/notifications/read', { method: 'POST' }); state.unread = 0; renderAlerts(); } catch (e) { showToast(e.message, 'error'); } };
  document.querySelector('#enablePush').onclick = enablePush;
  document.querySelectorAll('[data-alert-post]').forEach(b => b.onclick = () => { if (b.dataset.alertKind === 'support') renderSupport(); else if (b.dataset.alertKind === 'chat') socialUI.render('inbox'); else if (b.dataset.alertPost) openPost(b.dataset.alertPost); else renderMe('rides'); });
  if (data.unread) api('/api/notifications/read', { method: 'POST' }).then(() => { state.unread = 0; updateBadges(); }).catch(() => {});
  connectLive();
}

function notificationRow(n) { return `<button class="notification-row ${n.is_read ? 'read' : ''}" data-alert-post="${esc(n.post_id)}" data-alert-kind="${esc(n.kind)}"><span class="notification-symbol">${notificationIcon(n.kind)}</span><span><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${relative(n.created_at)}</small></span>${icon('chevron')}</button>`; }
function notificationIcon(kind) { if (kind.includes('ride') || kind.includes('seat')) return icon('car'); if (kind === 'rating') return icon('star'); if (kind === 'comment') return icon('comment'); return icon('bell'); }

async function enablePush() {
  if (isIos() && !isStandalone()) { showToast('On iPhone, add Carpool Network to your Home Screen first, then enable notifications.'); return; }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) { showToast('Push notifications are not supported on this browser.'); return; }
  try {
    const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('Notifications were not allowed.');
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Notifications could not start. Reload the app and try again.')), 10000))]); const key = (await api('/api/push/public-key')).publicKey; const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }); showToast('Notifications enabled', 'success');
  } catch (e) { showToast(e.message || 'Could not enable notifications.', 'error'); }
}
function urlBase64ToUint8Array(base64String) { const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(base64); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); }

async function renderMe(tab = 'rides') {
  const visit = beginView('me', { tab });
  let mine = [], trips = [], account;
  try {
    const [pd, feed, bookings, setup] = await Promise.all([api('/api/profile'), api('/api/feed?mine=1'), api('/api/ride-requests/mine'), tab==='account'?api('/api/account-status'):null]);
    account=setup?.account;
    if (visit !== viewRevision) return;
    saveProfile({ ...state.profile, ...pd.profile, token: state.profile?.token });
    mine = feed.posts || []; trips = bookings.requests || [];
  } catch (error) { if (visit === viewRevision) pageError(tab==='account'?'Your account is unavailable':tab==='posts'?'Your posts are unavailable':'Your bookings are unavailable', error, () => state.profile ? renderMe(tab) : openSignIn(() => renderMe(tab))); return; }
  const rating = state.profile?.rating_count ? `★ ${Number(state.profile.rating).toFixed(1)}` : 'New';
  const completed = trips.filter(t => t.status === 'completed').length;
  const confirmed = trips.filter(t => t.status === 'accepted').length;
  shell(`<section class="me-page">
    <div class="profile-hero">${avatarHtml(state.profile,'profile-avatar-xl')}<div class="profile-main"><span class="eyebrow">YOUR JOURNEYS</span><h1>${esc(state.profile.name)}</h1><p>${esc(state.profile.area || '')}${state.profile.bio ? ` · ${esc(state.profile.bio)}` : ''}</p><div class="profile-chip-row">${profileChips(state.profile)}</div><div class="profile-metrics"><div><strong>${esc(rating)}</strong><span>ride rating</span></div><div><strong>${completed}</strong><span>past bookings</span></div><div><strong>${confirmed}</strong><span>upcoming</span></div><div><strong>${mine.length}</strong><span>posts</span></div></div></div><button class="outline-btn" id="editProfile">${icon('edit')} Edit profile</button></div>
    <div class="me-tabs" role="tablist" aria-label="My account"><button role="tab" id="me-tab-rides" aria-controls="meContent" tabindex="${tab === 'rides' ? '0' : '-1'}" aria-selected="${tab === 'rides'}" class="${tab === 'rides' ? 'active' : ''}" data-me-tab="rides">My rides</button><button role="tab" id="me-tab-posts" aria-controls="meContent" tabindex="${tab === 'posts' ? '0' : '-1'}" aria-selected="${tab === 'posts'}" class="${tab === 'posts' ? 'active' : ''}" data-me-tab="posts">My posts</button><button role="tab" id="me-tab-account" aria-controls="meContent" tabindex="${tab === 'account' ? '0' : '-1'}" aria-selected="${tab === 'account'}" class="${tab === 'account' ? 'active' : ''}" data-me-tab="account">Account</button></div>
    <div id="meContent" role="tabpanel" aria-labelledby="me-tab-${tab}">${tab === 'rides' ? myRidesHtml(trips, mine) : tab === 'posts' ? `<div class="feed-grid">${mine.map(postCard).join('') || emptyFeed('No posts yet', 'Create your first post.')}</div>` : accountHtml()}</div>
  </section>`, 'me');
  state.posts = mine; bindPostActions(); bindTripActions();
  document.querySelectorAll('[data-me-tab]').forEach(b => {
    b.onclick = () => renderMe(b.dataset.meTab);
    b.onkeydown = async e => {
      const order=['rides','posts','account'],index=order.indexOf(b.dataset.meTab);
      const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:-1;
      if(next<0)return;e.preventDefault();await renderMe(order[next]);requestAnimationFrame(()=>document.querySelector(`#me-tab-${order[next]}`)?.focus());
    };
  });
  document.querySelector('#editProfile').onclick = ()=>editProfile();
  document.querySelectorAll('[data-manage-ride]').forEach(b => b.onclick = () => openPost(b.dataset.manageRide));
  document.querySelectorAll('[data-ride-filter]').forEach(b => b.onclick = () => { state.rideFilter = b.dataset.rideFilter; renderMe('rides'); });
  document.querySelector('#regularCommutes')?.addEventListener('click',()=>commuteUI.list());
  document.querySelector('#offerFromRides')?.addEventListener('click', () => renderPostPage('ride_offer'));
  document.querySelector('#regenRecovery')?.addEventListener('click', regenerateRecovery);
  if(state.profile.phone?.startsWith('email:')){document.querySelector('#setupPin')?.closest('.account-card')?.remove();document.querySelector('#regenRecovery')?.closest('.account-card')?.remove();}
  document.querySelector('#setupPin')?.addEventListener('click', () => openPinSetup());
  document.querySelector('#logoutOthers')?.addEventListener('click', signOutOtherDevices);
  document.querySelector('#enablePushAccount')?.addEventListener('click', enablePush);
  document.querySelector('#installApp')?.addEventListener('click', installApp);
  document.querySelector('#signOut')?.addEventListener('click', signOut);
  if (tab === 'account') {
    document.querySelector('#meContent').insertAdjacentHTML('afterbegin',accountSetupHtml(account));
    document.querySelector('#whatsappContact').onclick=()=>editContact();
    document.querySelector('#profilePhoto').onclick=()=>profilePhotos.edit();
    document.querySelector('#vehicleAndLinks').onclick=()=>memberDetails.edit();
    document.querySelector('#socialSecurity').onclick = () => socialUI.account();
    document.querySelector('#communityReports').onclick = () => socialUI.reports();
    bindNav();
  }
  checkAdminEntry();
  connectLive();
}

function myRidesHtml(trips, posts = []) {
  const filter = state.rideFilter || 'all';
  const visible = trips.filter(t => filter === 'all' || t.role === filter);
  const upcoming = visible.filter(t => ['accepted', 'pending'].includes(t.status) && !t.departed);
  const past = visible.filter(t => !upcoming.includes(t));
  const offers = posts.filter(p => p.category === 'ride_offer' && !p.departed);
  const needs = posts.filter(p => p.category === 'ride_wanted' && p.status === 'active' && !p.departed);
  const managed = (filter === 'rider' ? [] : offers).concat(filter === 'driver' ? [] : needs);
  return `<div class="rides-dashboard"><div class="rides-toolbar"><div class="segmented" role="group" aria-label="Journey role">${[['all','All'],['driver','Driving'],['rider','Riding']].map(([key,label]) => `<button aria-pressed="${filter === key}" class="${filter === key ? 'active' : ''}" data-ride-filter="${key}">${label}</button>`).join('')}</div><div class="toolbar-actions"><button class="outline-btn" id="regularCommutes">Regular commutes</button><button class="outline-btn" id="offerFromRides">${icon('car')} Offer ride</button><button class="primary-btn small" id="findAnother">${icon('search')} Find ride</button></div></div>
    ${managed.length ? `<section class="rides-section"><h2>Your journeys</h2><div class="managed-rides">${managed.map(p => `<article class="managed-ride"><div><span class="eyebrow">${p.category === 'ride_offer' ? 'DRIVING' : 'LOOKING FOR A DRIVER'} · ${p.status === 'closed' && p.availableSeats === 0 ? 'FULL' : esc(p.status)}</span><h3>${esc(p.origin)} → ${esc(p.destination)}</h3><p>${fmtDate(p.journeyDate)} · ${esc(p.timeWindow ? p.timeWindow.start + ' to ' + p.timeWindow.end : p.journeyTime)} · ${p.category === 'ride_offer' ? `${p.availableSeats} of ${p.seats} seats available` : `${p.seats} seats needed`}</p></div><button class="outline-btn" data-manage-ride="${esc(p.id)}">Manage</button></article>`).join('')}</div></section>` : ''}
    <section class="rides-section"><h2>Upcoming & pending</h2>${upcoming.length ? `<div class="trip-list">${upcoming.map(tripCard).join('')}</div>` : `<div class="find-empty inline-empty"><h3>No active bookings</h3></div>`}</section>
    ${past.length ? `<section class="rides-section"><h2>Past activity</h2><div class="trip-list muted-trips">${past.map(tripCard).join('')}</div></section>` : ''}</div>`;
}

function tripCard(t) {
  const other = t.other_name || (t.role === 'rider' ? t.driver_name : t.rider_name) || 'Member';
  const incoming = t.role === 'driver' && t.status === 'pending' && !t.departed;
  const statusLabel = t.status === 'pending' && t.departed ? 'expired' : t.status === 'accepted' ? (t.departed ? 'departed' : 'confirmed') : t.status === 'pending' ? 'awaiting driver' : t.status;
  const canCancel = t.can_cancel;
  return `<article class="trip-card ${t.status}" data-booking="${esc(t.id)}">
    <div class="trip-date"><strong>${new Date(`${t.journey_date}T12:00:00`).getDate()}</strong><span>${new Date(`${t.journey_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
    <div class="trip-main"><div class="trip-status-row"><span class="trip-status ${t.status}">${esc(statusLabel)}</span><span>${t.role === 'rider' ? 'You are riding' : 'You are driving'}</span></div><h3>${esc(t.origin)} <span>→</span> ${esc(t.destination)}</h3><p>${esc(t.journey_time)} · ${t.seats_requested} seat${t.seats_requested === 1 ? '' : 's'} · with ${esc(other)}</p></div>
    <div class="trip-actions">
      ${incoming ? `<button class="accept-btn" data-trip-accept="${esc(t.id)}">Accept</button><button class="decline-btn" data-trip-decline="${esc(t.id)}">Decline</button>` : ''}
      ${['accepted','completed'].includes(t.status)?`<button class="outline-btn small" data-live-trip="${esc(t.ride_offer_post_id)}">Trip & location</button>`:''}
      ${t.contact_url ? `<a class="whatsapp-link compact finalise-link" href="${esc(t.contact_url)}" target="_blank" rel="noopener">${icon('whatsapp')} Open WhatsApp</a>` : ''}
      ${canCancel ? `<button class="danger-outline small" data-trip-cancel="${esc(t.id)}">${t.status === 'pending' ? 'Withdraw' : 'Cancel'}</button>` : ''}
      ${t.can_rate ? `<button class="outline-btn small" data-rate-trip="${esc(t.id)}" data-rate-name="${esc(other)}">${icon('star')} Rate</button>` : ''}
      ${t.my_rating ? `<span class="rated-pill">★ ${t.my_rating} rated</span>` : ''}
      <button class="outline-btn small" data-booking-history="${esc(t.id)}">${icon('clock')} Activity</button>
    </div></article>`;
}

function bindTripActions() {
  document.querySelectorAll('[data-booking]').forEach(card => {
    const b = document.createElement('button'); b.className='outline-btn small';b.textContent='Booking chat';b.onclick=()=>socialUI.render('inbox',`booking:${card.dataset.booking}`);card.querySelector('.trip-actions')?.appendChild(b);
  });
  document.querySelectorAll('[data-live-trip]').forEach(b=>b.onclick=()=>openTrip(b.dataset.liveTrip));
  document.querySelectorAll('[data-booking-history]').forEach(b => b.onclick = () => openBookingHistory(b.dataset.bookingHistory));
  document.querySelector('#findAnother')?.addEventListener('click', () => renderFind());
  document.querySelectorAll('[data-trip-accept]').forEach(b => b.onclick = async () => { b.disabled=true; try { await api(`/api/ride-requests/${b.dataset.tripAccept}`, { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) }); showToast('Booking confirmed — agree pickup in Messages', 'success'); renderMe('rides'); } catch (e) { b.disabled=false; showToast(e.message, 'error'); } });
  document.querySelectorAll('[data-trip-decline]').forEach(b => b.onclick = async () => { b.disabled=true; try { await api(`/api/ride-requests/${b.dataset.tripDecline}`, { method: 'PATCH', body: JSON.stringify({ status: 'declined' }) }); renderMe('rides'); } catch (e) { b.disabled=false; showToast(e.message, 'error'); } });
  document.querySelectorAll('[data-trip-cancel]').forEach(b => b.onclick = async () => { if (!confirm('Cancel this seat request or booking? The other person will be notified and availability will update automatically.')) return; try { await api(`/api/ride-requests/${b.dataset.tripCancel}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }); showToast('Booking cancelled and availability updated'); renderMe('rides'); } catch (e) { showToast(e.message, 'error'); } });
  document.querySelectorAll('[data-rate-trip]').forEach(b => b.onclick = () => openRating(b.dataset.rateTrip, b.dataset.rateName));
}

async function openBookingHistory(id) {
  try {
    const data = await api(`/api/ride-requests/${id}/timeline`);
    const labels = { pending:'Request sent', accepted:'Driver confirmed', declined:'Driver declined', cancelled:'Request cancelled', completed:'Past booking' };
    const changes = data.events.filter(e => e.event_type === 'status_changed');
    openSheet(`<div class="sheet-title"><h2>Booking activity</h2><p>${esc(labels[data.booking.status] || data.booking.status)}</p></div><ol class="timeline"><li><strong>Request created</strong><small>${esc(new Date(data.booking.created_at + 'Z').toLocaleString())}</small></li>${changes.map(e => `<li><strong>${esc(labels[e.to_status] || e.to_status)}</strong><small>${esc(new Date(e.created_at + 'Z').toLocaleString())}</small></li>`).join('')}</ol><button class="outline-btn" id="bookingHelp">${icon('help')} Booking support</button>`);
    document.querySelector('#bookingHelp').onclick = () => { closeSheet(); renderSupport(); };
  } catch(e) { showToast(e.message, 'error'); }
}

function accountSetupHtml(account) {
  const presentation=accountPresentation(account);
  return `<section class="account-setup" aria-labelledby="accountSetupTitle"><div class="section-title-row"><div><span class="eyebrow">YOUR ACCOUNT STATUS</span><h2 id="accountSetupTitle">${esc(presentation.heading)}</h2><p>${esc(presentation.summary)}</p></div></div><div class="setup-grid">${presentation.cards.map(([id,ico,title,copy,action,status])=>`<article class="setup-card"><span class="setup-icon">${icon(ico)}</span><h3>${esc(title)}</h3>${status?`<span class="account-status-label ${['Saved','Approved','Checked','Verified'].includes(status)?'ready':'pending'}">${esc(status)}</span>`:''}<p>${esc(copy)}</p><button class="text-action" id="${id}">${action} ${icon('arrow')}</button></article>`).join('')}<article class="setup-card"><span class="setup-icon">${icon('bag')}</span><h3>Local businesses</h3><p>Explore member-provided services around your community.</p><button class="text-action" data-nav="businesses">Explore directory ${icon('arrow')}</button></article></div></section><div class="section-title-row account-preferences"><div><span class="eyebrow">MAKE IT YOURS</span><h2>Preferences & support</h2></div></div>`;
}

function accountHtml() {
  return `<div class="account-grid">
    <div class="account-card"><span class="account-icon">${icon('lock')}</span><div><strong>Sign-in PIN</strong></div><button class="outline-btn" id="setupPin">Set / change</button></div>
    <div class="account-card"><span class="account-icon">${icon('bell')}</span><div><strong>Notifications</strong><p>Get booking requests and confirmations quickly.</p></div><button class="outline-btn" id="enablePushAccount">Enable</button></div>
    <div class="account-card support-accent"><span class="account-icon">${icon('help')}</span><div><strong>Help & Support</strong><p>Booking, safety, account or technical problem? Contact the network team.</p></div><button class="outline-btn" data-nav="support">Contact</button></div>
    <div class="account-card"><span class="account-icon">${icon('lock')}</span><div><strong>Recovery code</strong><p>Emergency backup only — normal visits stay signed in automatically.</p></div><button class="outline-btn" id="regenRecovery">Generate</button></div><div class="account-card"><span class="account-icon">${icon('shield')}</span><div><strong>Other devices</strong><p>This device is remembered automatically. If a phone is lost, sign out your other sessions here.</p></div><button class="outline-btn" id="logoutOthers">Sign out others</button></div>
    ${!isStandalone() ? `<div class="account-card"><span class="account-icon">${icon('plus')}</span><div><strong>Add to Home Screen</strong><p>Use Carpool Network full-screen like an app.</p></div><button class="outline-btn" id="installApp">Install</button></div>` : ''}
    <div class="account-card admin-entry hidden" id="adminEntry"><span class="account-icon">${icon('shield')}</span><div><strong>Admin Control Room</strong><p>Members, reports, support, moderation and rating integrity.</p></div><button class="outline-btn" data-nav="admin">Open</button></div>
    <div class="account-card danger-card"><span class="account-icon">${icon('user')}</span><div><strong>Sign out on this device</strong><p>Your posts and bookings stay in the network.</p></div><button class="danger-outline" id="signOut">Sign out</button></div>
  </div>`;
}


async function renderSupport() {
  const visit = beginView('support');
  let tickets=[]; try { tickets=(await api('/api/support/tickets')).tickets||[]; if (visit !== viewRevision) return; } catch(e){ if (visit === viewRevision) pageError('Support is unavailable', e, renderSupport); return; }
  shell(`<section class="support-hero"><div><h1>Help & Support</h1>${state.supportEmail ? `<a href="mailto:${esc(state.supportEmail)}">${esc(state.supportEmail)}</a>` : ''}</div><button class="primary-btn" id="newSupportTicket">${icon('message')} New support request</button></section>
    <section class="feedback-support"><h2>Help us improve Carpool Network</h2><p>Share an idea, tell us what works well, or report something that went wrong. You can send even if you cannot sign in.</p><div><button type="button" class="outline-btn" data-leave-feedback>Leave feedback</button><button type="button" class="outline-btn" data-report-problem>Report a bug</button></div></section><section class="support-inbox"><h2>Your requests</h2><div class="ticket-list">${tickets.length ? tickets.map(ticketCard).join('') : '<div class="empty-card"><h3>No support requests</h3></div>'}</div></section>`, 'me');
  document.querySelector('#newSupportTicket')?.addEventListener('click',openSupportForm);
  document.querySelectorAll('[data-ticket]').forEach(b=>b.onclick=()=>openSupportTicket(b.dataset.ticket));
}
function ticketCard(t){ return `<button class="ticket-card" data-ticket="${esc(t.id)}"><span class="ticket-priority ${esc(t.priority)}"></span><div><div class="ticket-top"><strong>${esc(t.subject)}</strong><span class="ticket-status ${esc(t.status)}">${esc(t.status)}</span></div><p>${esc(t.last_message||t.category)}</p><small>${relative(t.updated_at)}</small></div>${icon('chevron')}</button>`; }
function openSupportForm(){
  openSheet(`<div class="sheet-title"><span class="eyebrow">CONTACT SUPPORT</span><h2>What can we help with?</h2><p>This goes privately to Carpool Network administration.</p></div><form id="supportForm" class="simple-form"><label><span>Category</span><select name="category"><option value="booking">Booking / ride</option><option value="safety">Safety concern</option><option value="account">Account</option><option value="community">Community / member</option><option value="technical">Technical problem</option><option value="other">Other</option></select></label><label><span>Subject</span><input name="subject" maxlength="120" required placeholder="Short summary"></label><label><span>What happened?</span><textarea name="message" maxlength="1800" required placeholder="Tell us what happened and what you need help with."></textarea></label><button class="primary-btn full">Send to Support</button></form>`);
  document.querySelector('#supportForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/api/support/tickets',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});closeSheet();showToast('Sent privately to Support','success');renderSupport();}catch(err){showToast(err.message,'error')}};
}
async function openSupportTicket(id){
  try{const d=await api(`/api/support/tickets/${id}/messages`);openSheet(`<div class="sheet-title"><span class="eyebrow">SUPPORT REQUEST</span><h2>${esc(d.ticket.subject)}</h2><p>${esc(d.ticket.category)} · <b>${esc(d.ticket.status)}</b></p></div><div class="support-thread">${d.messages.map(m=>`<div class="support-message ${m.sender_role}"><strong>${m.sender_role==='admin'?'Carpool Network Support':'You'}</strong><p>${esc(m.body)}</p><small>${relative(m.created_at)}</small></div>`).join('')}</div>${d.ticket.status!=='closed'?`<form id="supportReply" class="support-reply"><textarea name="message" maxlength="1800" placeholder="Reply…" required></textarea><button class="primary-btn">Send</button></form>`:''}`);document.querySelector('#supportReply')?.addEventListener('submit',async e=>{e.preventDefault();try{await api(`/api/support/tickets/${id}/messages`,{method:'POST',body:JSON.stringify({message:e.currentTarget.message.value})});openSupportTicket(id);}catch(err){showToast(err.message,'error')}});}catch(e){showToast(e.message,'error')}
}
async function reportMember(id,name){const reason=prompt(`Tell Support why you are reporting ${name}:`);if(!reason)return;try{await api(`/api/users/${id}/report`,{method:'POST',body:JSON.stringify({reason})});closeSheet();showToast('Report sent privately to Support','success');}catch(e){showToast(e.message,'error')}}
async function checkAdminEntry(){ if(!state.profile)return; try{const d=await api('/api/admin/status'); document.querySelector('#adminEntry')?.classList.toggle('hidden',!d.isAdmin);}catch{} }
async function renderAdmin(){
  const visit = beginView('admin');
  let status;try{status=await api('/api/admin/status');}catch(e){showToast(e.message,'error');return renderMe('account');}
  if(!status.isAdmin){shell('<div class="empty-card"><h2>Admin access only</h2><p>This area is restricted to authorised Carpool Network administrators.</p></div>','me',{title:'Admin Control Room'});return;}
  if(!state.adminToken){
    shell(`<section class="admin-lock-screen"><div class="admin-lock-icon">${icon('shield')}</div><span class="eyebrow">SECURE ADMIN</span><h1>Unlock Control Room</h1><p>Your normal member session is not enough. Enter your separate admin security code.</p><form id="adminUnlock" class="admin-unlock-form"><input name="code" type="password" autocomplete="off" placeholder="Admin security code" required><button class="primary-btn">Unlock for 30 minutes</button></form><small>Admin sessions expire automatically and all moderation actions are audited.</small></section>`,'me',{title:'Admin Control Room',eyebrow:'CARPOOL NETWORK'});
    document.querySelector('#adminUnlock').onsubmit=async e=>{e.preventDefault();try{const d=await api('/api/admin/unlock',{method:'POST',body:JSON.stringify({code:e.currentTarget.code.value})});state.adminToken=d.adminToken;saveAdminToken(d.adminToken);showToast('Admin unlocked','success');renderAdmin();}catch(err){showToast(err.message,'error')}};return;
  }
  let d;try{d=await api('/api/admin/dashboard');}catch(e){if(/expired|unlock/i.test(e.message)){state.adminToken='';saveAdminToken('');return renderAdmin();}showToast(e.message,'error');return;}
  if (visit !== viewRevision) return;
  state.adminRole = d.role;
  if (d.role === 'support') {
    shell(`<section class="support-staff"><div class="section-title-row"><h1>Support inbox</h1><button id="lockAdmin" class="outline-btn">${icon('lock')} Lock</button></div><div class="admin-ticket-list">${d.tickets.length ? d.tickets.map(adminTicketCard).join('') : '<p>No open requests.</p>'}</div></section>`, 'me');
    document.querySelector('#lockAdmin').onclick = async () => { try { await api('/api/admin/lock', { method:'POST' }); state.adminToken=''; saveAdminToken(''); renderAdmin(); } catch(e) { showToast(e.message,'error'); } };
    document.querySelectorAll('[data-admin-ticket]').forEach(b => b.onclick = () => openAdminTicket(b.dataset.adminTicket));
    return;
  }
  const s=d.stats||{};
  shell(`<div class="admin-top"><div class="admin-banner"><span class="admin-shield">${icon('shield')}</span><div><span class="eyebrow">${esc(String(d.role||'admin').toUpperCase())}</span><h2>Network Control Room</h2><p>Moderation, support and integrity monitoring. Admin actions are recorded in the audit log.</p></div></div><button class="outline-btn" id="lockAdmin">${icon('lock')} Lock admin</button></div>
    <div class="admin-stat-grid"><div><strong>${Number(s.members||0)}</strong><span>Members</span></div><div><strong>${Number(s.active_posts||0)}</strong><span>Active posts</span></div><div class="warn"><strong>${Number(s.support_open||0)}</strong><span>Support open</span></div><div class="warn"><strong>${Number(s.member_reports||0)+Number(s.post_reports||0)}</strong><span>Reports</span></div><div><strong>${Number(s.sealed_ratings||0)}/${Number(s.ratings||0)}</strong><span>Sealed ratings</span></div><div><strong>${Number(d.integrityHead?.seq||0)}</strong><span>Ledger events</span></div></div>
    <div class="admin-columns"><section class="admin-panel"><div class="section-head"><div><span class="eyebrow">MEMBERS</span><h2>Member control</h2></div><input id="adminMemberSearch" class="admin-search" placeholder="Search members…"></div><div id="adminMembers" class="admin-member-list">${(d.members||[]).map(adminMemberCard).join('')}</div></section>
    <section class="admin-panel"><div class="section-head"><div><span class="eyebrow">SUPPORT</span><h2>Open requests</h2></div></div><div class="admin-ticket-list">${(d.tickets||[]).length?(d.tickets||[]).map(adminTicketCard).join(''):'<p class="muted-center">Support inbox is clear.</p>'}</div></section></div>
    <div class="admin-columns"><section class="admin-panel"><div class="section-head"><div><span class="eyebrow">REPORTS</span><h2>Member & post reports</h2></div></div><h3 class="admin-subhead">Members</h3>${(d.memberReports||[]).length?(d.memberReports||[]).map(r=>`<div class="admin-report"><div><strong>${esc(r.target_name)}</strong><p>${esc(r.reason)}</p><small>Reported by ${esc(r.reporter_name)} · ${relative(r.updated_at)}</small></div><button class="danger-outline small" data-admin-ban="${esc(r.target_id)}">Review member</button></div>`).join(''):'<p class="muted-center">No open member reports.</p>'}<h3 class="admin-subhead">Posts</h3>${(d.postReports||[]).length?(d.postReports||[]).map(r=>`<div class="admin-report"><div><strong>${esc(r.title)}</strong><p>${esc(r.reason)}</p><small>${esc(r.author_name)} · reported by ${esc(r.reporter_name)}</small></div><button class="danger-outline small" data-admin-remove-post="${esc(r.post_id)}">Remove post</button></div>`).join(''):'<p class="muted-center">No active post reports.</p>'}</section>
    <section class="admin-panel integrity-panel"><div class="section-head"><div><span class="eyebrow">CRYPTOGRAPHIC INTEGRITY</span><h2>Rating transparency</h2></div></div><div class="integrity-head">${icon('shield')}<div><strong>Ed25519 + SHA-256 chain</strong><p>Head #${Number(d.integrityHead?.seq||0)} · ${esc(String(d.integrityHead?.head_hash||'GENESIS').slice(0,24))}…</p></div></div><p class="admin-explain">Submitted ride ratings cannot be edited through the app. Each new rating is signed by a private key stored outside D1 and linked to the previous ledger hash. Database edits therefore become detectable.</p></section></div>
    <div class="admin-columns"><section class="admin-panel"><div class="section-head"><div><span class="eyebrow">CONTENT</span><h2>Recent network posts</h2></div></div><div class="admin-content-list">${(d.recentPosts||[]).length?(d.recentPosts||[]).slice(0,30).map(p=>`<div class="admin-content-row"><div><strong>${esc(p.title)}</strong><p>${esc(p.author_name)} · ${esc(p.category)} · ${esc(p.status)}</p><small>${relative(p.created_at)}</small></div>${p.status!=='deleted'?`<button class="danger-outline tiny" data-admin-remove-post="${esc(p.id)}">Remove</button>`:''}</div>`).join(''):'<p class="muted-center">No posts.</p>'}</div></section><section class="admin-panel"><div class="section-head"><div><span class="eyebrow">RIDES</span><h2>Recent booking activity</h2></div></div><div class="admin-booking-list">${(d.recentBookings||[]).length?(d.recentBookings||[]).slice(0,30).map(r=>`<div class="admin-booking-row"><span class="trip-status ${esc(r.status)}">${esc(r.status)}</span><div><strong>${esc(r.origin)} → ${esc(r.destination)}</strong><p>${esc(r.driver_name)} + ${esc(r.rider_name)} · ${esc(r.journey_date)} ${esc(r.journey_time)}</p><small>${Number(r.seats_requested||1)} seat${Number(r.seats_requested||1)===1?'':'s'}</small></div></div>`).join(''):'<p class="muted-center">No booking activity.</p>'}</div></section></div>
    <section class="admin-panel"><div class="section-head"><div><span class="eyebrow">AUDIT TRAIL</span><h2>Recent admin actions</h2></div></div><div class="audit-list">${(d.audit||[]).length?(d.audit||[]).map(a=>`<div><strong>${esc(a.action)}</strong><span>${esc(a.target_type)} · ${esc(a.target_id).slice(0,10)}…</span><small>${esc(a.admin_name||'Admin')} · ${relative(a.created_at)}${a.reason?` · ${esc(a.reason)}`:''}</small></div>`).join(''):'<p class="muted-center">No admin actions yet.</p>'}</div></section>`, 'me', {title:'Admin Control Room',eyebrow:'SECURE NETWORK OPERATIONS'});
  document.querySelector('#lockAdmin').onclick=async()=>{try{await api('/api/admin/lock',{method:'POST'});}catch{}state.adminToken='';saveAdminToken('');renderAdmin();};
  const search=document.querySelector('#adminMemberSearch');search.oninput=()=>{const q=search.value.toLowerCase();document.querySelectorAll('.admin-member').forEach(x=>x.hidden=!x.dataset.search.includes(q));};
  const adminTop=document.querySelector('.admin-top');if(adminTop){adminTop.insertAdjacentHTML('afterend','<button class="outline-btn" id="reviewPhotos">Profile photo reviews</button><button class="outline-btn" id="openIssues">Feedback & bug reports</button>');document.querySelector('#openIssues').onclick=()=>renderIssues();document.querySelector('#reviewPhotos').onclick=()=>profilePhotos.review();}
  bindAdminActions();
}
function adminMemberCard(u){return `<div class="admin-member" data-search="${esc(`${u.name} ${u.phone} ${u.area}`.toLowerCase())}"><div class="admin-member-main"><span class="admin-member-avatar">${esc(fallbackEmoji(u.id))}</span><div><strong>${esc(u.name)} ${u.role?`<em>${esc(u.role)}</em>`:''}</strong><p>${esc(u.area)} · ${esc(String(u.phone||'').startsWith('email:')?'Email account':u.phone||'Phone not shared')}</p><small>${u.rating?`★ ${Number(u.rating).toFixed(1)} · `:''}${Number(u.posts||0)} posts · ${esc(u.moderation_status)}</small></div></div>${u.role==='superadmin'?'<span class="protected-admin">Protected</span>':`<div class="admin-actions">${/^\+?[0-9 ()-]{9,20}$/.test(String(u.phone||''))?`<a class="whatsapp-mini" aria-label="Open WhatsApp contact" target="_blank" rel="noopener" href="https://wa.me/${esc(String(u.phone).replace(/\D/g,''))}">${icon('whatsapp')}</a>`:``}${u.moderation_status==='active'?`<button class="outline-btn tiny" data-admin-suspend="${esc(u.id)}">Suspend</button><button class="danger-outline tiny" data-admin-ban="${esc(u.id)}">Ban</button>`:`<button class="outline-btn tiny" data-admin-unban="${esc(u.id)}">Restore</button>`}</div>`}</div>`;}
function adminTicketCard(t){return `<button class="admin-ticket" data-admin-ticket="${esc(t.id)}"><span class="ticket-priority ${esc(t.priority)}"></span><div><strong>${esc(t.subject)}</strong><p>${esc(t.name)} · ${esc(t.category)}</p><small>${relative(t.updated_at)}</small></div>${icon('chevron')}</button>`;}
function bindAdminActions(){
  document.querySelectorAll('[data-admin-suspend]').forEach(b=>b.onclick=()=>moderateMember(b.dataset.adminSuspend,'suspend'));
  document.querySelectorAll('[data-admin-ban]').forEach(b=>b.onclick=()=>moderateMember(b.dataset.adminBan,'ban'));
  document.querySelectorAll('[data-admin-unban]').forEach(b=>b.onclick=()=>moderateMember(b.dataset.adminUnban,'unban'));
  document.querySelectorAll('[data-admin-ticket]').forEach(b=>b.onclick=()=>openAdminTicket(b.dataset.adminTicket));
  document.querySelectorAll('[data-admin-remove-post]').forEach(b=>b.onclick=()=>removeReportedPost(b.dataset.adminRemovePost));
}
async function removeReportedPost(id){const reason=prompt('Why is this post being removed?');if(!reason)return;if(!confirm('Remove this post from the network?'))return;try{await api(`/api/admin/posts/${id}/remove`,{method:'POST',body:JSON.stringify({reason})});showToast('Post removed','success');renderAdmin();}catch(e){showToast(e.message,'error')}}
async function moderateMember(id,action){const reason=action==='unban'?'':prompt(`${action==='ban'?'Ban':'Suspend'} reason:`);if(action!=='unban'&&!reason)return;let days=7;if(action==='suspend'){const raw=prompt('Suspend for how many days?','7');if(!raw)return;days=Math.max(1,Math.min(90,Number(raw)||7));}if(!confirm(`${action==='unban'?'Restore':action==='ban'?'Ban':'Suspend'} this member?`))return;try{await api(`/api/admin/users/${id}/moderate`,{method:'POST',body:JSON.stringify({action,reason,days})});showToast('Moderation updated','success');renderAdmin();}catch(e){showToast(e.message,'error')}}
async function openAdminTicket(id){try{const d=await api(`/api/admin/support/${id}`);openSheet(`<div class="sheet-title"><span class="eyebrow">ADMIN SUPPORT</span><h2>${esc(d.ticket.subject)}</h2><p>${esc(d.ticket.name)} · ${esc(String(d.ticket.phone||'').startsWith('email:')?'Email account':d.ticket.phone||'Phone not shared')} · ${esc(d.ticket.category)}</p></div><div class="support-thread">${d.messages.map(m=>`<div class="support-message ${m.sender_role}"><strong>${m.sender_role==='admin'?'Support':esc(d.ticket.name)}</strong><p>${esc(m.body)}</p><small>${relative(m.created_at)}</small></div>`).join('')}</div><form id="adminSupportReply" class="simple-form"><label><span>Reply</span><textarea name="message" maxlength="1800" required></textarea></label><label><span>After reply</span><select name="status"><option value="waiting">Waiting for member</option><option value="resolved">Resolved</option><option value="open">Keep open</option><option value="closed">Close</option></select></label><button class="primary-btn full">Send reply</button></form>`);document.querySelector('#adminSupportReply').onsubmit=async e=>{e.preventDefault();try{await api(`/api/admin/support/${id}`,{method:'POST',body:JSON.stringify({message:e.currentTarget.message.value,status:e.currentTarget.status.value})});closeSheet();showToast('Support reply sent','success');renderAdmin();}catch(err){showToast(err.message,'error')}};}catch(e){showToast(e.message,'error')}}

async function editProfile() {
  let contact;try{contact=await api('/api/contact-details');}catch(error){showToast(error.message,'error');return;}
  const contactView=contactPresentation(contact);
  const currentEmoji=memberEmoji(state.profile);
  openSheet(`<div class="sheet-title"><span class="eyebrow">PROFILE</span><h2>Edit your details</h2><p>These details help members know who they are travelling or dealing with. Gender is optional.</p></div><form id="profileForm" class="simple-form">
    <label><span>Name</span><input name="name" value="${esc(state.profile.name)}" required></label>
    <label><span>WhatsApp number</span><input value="${esc(contact.number||'')}" readonly placeholder="No WhatsApp contact saved"></label><p class="auth-intro">${esc(contactView.label)}. Change your number in Account → Manage contact.</p>
    <label><span>Area</span><input name="area" value="${esc(state.profile.area || '')}" required></label>
    <div class="form-columns two profile-extra-grid">
      <label><span>I usually</span><select name="travelRole"><option value="both" ${state.profile.travel_role==='both'?'selected':''}>Drive & ride</option><option value="driver" ${state.profile.travel_role==='driver'?'selected':''}>Offer rides</option><option value="rider" ${state.profile.travel_role==='rider'?'selected':''}>Look for rides</option></select></label>
      <label><span>Gender <em>optional</em></span><select name="gender"><option value="" ${!state.profile.gender||state.profile.gender==='Prefer not to say'?'selected':''}>Prefer not to say</option><option ${state.profile.gender==='Woman'?'selected':''}>Woman</option><option ${state.profile.gender==='Man'?'selected':''}>Man</option><option ${state.profile.gender==='Non-binary'?'selected':''}>Non-binary</option></select></label>
    </div>
    <label><span>Workplace / community <em>optional</em></span><input name="community" maxlength="100" value="${esc(state.profile.community || '')}" placeholder="e.g. Amazon EMA2, NHS, university"></label>
    <label><span>Short bio <em>optional</em></span><textarea name="bio" maxlength="300">${esc(state.profile.bio || '')}</textarea></label>
    <div class="emoji-picker-wrap"><span class="field-label">Your network emoji</span><input type="hidden" name="avatarEmoji" value="${esc(currentEmoji)}"><div class="emoji-picker">${MEMBER_EMOJIS.map(e=>`<button type="button" class="${e===currentEmoji?'selected':''}" data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>
    <button class="primary-btn full">Save changes</button></form>`);
  const form=document.querySelector('#profileForm');
  bindLocationInput(form.area,{current:true,toast:showToast});
  form.querySelectorAll('[data-emoji]').forEach(b=>b.onclick=()=>{ form.avatarEmoji.value=b.dataset.emoji; form.querySelectorAll('[data-emoji]').forEach(x=>x.classList.toggle('selected',x===b)); });
  form.onsubmit = async e => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await api('/api/profile', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(f)) }); const d = await api('/api/profile'); saveProfile({ ...state.profile, ...d.profile, token: state.profile.token }); closeSheet(); renderMe('account'); } catch (err) { showToast(err.message); } };
}

async function regenerateRecovery() { try { const d = await api('/api/profile/recovery-key', { method: 'POST' }); openSheet(`<div class="recovery-card"><span class="round-icon">${icon('lock')}</span><span class="eyebrow">NEW RECOVERY CODE</span><h2>Save it somewhere private</h2><div class="recovery-code">${esc(d.recoveryCode)}</div><button class="primary-btn full" id="copyNewRecovery">${icon('copy')} Copy code</button></div>`); document.querySelector('#copyNewRecovery').onclick = async () => { await navigator.clipboard.writeText(d.recoveryCode); showToast('Copied', 'success'); }; } catch (e) { showToast(e.message, 'error'); } }

async function installApp() {
  if (state.installPrompt) { state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; return; }
  if (isIos()) showToast('On iPhone: tap Share, then “Add to Home Screen”.'); else showToast('Open your browser menu and choose “Install app” or “Add to Home screen”.');
}
async function signOutOtherDevices() {
  if (!confirm('Sign out your other Carpool Network devices? This browser will stay signed in.')) return;
  try { await api('/api/profile/logout-others', { method: 'POST' }); state.adminToken=''; saveAdminToken(''); showToast('Other devices signed out','success'); }
  catch (e) { showToast(e.message,'error'); }
}
async function signOut() {
  if (!confirm('Sign out on this device? Your other signed-in devices will stay connected.')) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg=await navigator.serviceWorker.getRegistration().catch(()=>null);
      const sub=await reg?.pushManager?.getSubscription?.();
      if(sub){
        try { await api('/api/push/unsubscribe',{method:'POST',body:JSON.stringify({endpoint:sub.endpoint})}); } catch {}
        try { await sub.unsubscribe(); } catch {}
      }
    }
    await api('/api/profile/logout', { method: 'POST' });
  } catch (e) { showToast('Could not sign out: '+e.message,'error'); return; }
  socialUI.stop(); clearStoredProfile(); renderHome();
}

function openRating(id, name) {
  openSheet(`<div class="sheet-title"><span class="eyebrow">RIDE COMPLETE</span><h2>Rate ${esc(name)}</h2><p>Reviews publish when both participants submit or after 14 days. Report a problem separately if you need help.</p></div><form id="ratingForm" class="simple-form"><input type="hidden" name="score" value="5"><label>Journey outcome<select name="outcome" required><option value="">Choose an outcome</option><option value="travelled">We travelled</option><option value="no_show">The other person did not arrive</option><option value="disputed">There is a dispute</option></select></label><div class="star-picker">${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}" class="${n <= 5 ? 'selected' : ''}">★</button>`).join('')}</div><label><span>Comment <em>optional</em></span><textarea name="comment" maxlength="500" placeholder="On time, friendly, safe, good communication…"></textarea></label><button class="primary-btn full">Submit review</button></form>`);
  const form = document.querySelector('#ratingForm'); document.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { form.score.value = b.dataset.star; form.querySelectorAll('[data-star]').forEach(x => x.classList.toggle('selected', Number(x.dataset.star) <= Number(b.dataset.star))); });
  form.onsubmit = async e => { e.preventDefault(); try { await api('/api/social/outcome', {method:'POST',body:JSON.stringify({bookingId:id,outcome:form.outcome.value})}); await api(`/api/ride-requests/${id}/rating`, { method: 'POST', body: JSON.stringify({ score: form.score.value, comment: form.comment.value }) }); closeSheet(); showToast('Review submitted', 'success'); renderMe('rides'); } catch (err) { showToast(err.message); } };
}

function openSheet(content) {
  const previousFocus = document.activeElement;
  closeSheet();
  const wrap = document.createElement('div'); wrap.className = 'sheet-backdrop'; wrap.id = 'sheetBackdrop';
  wrap.innerHTML = `<section class="sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div><button class="sheet-close" id="sheetClose" aria-label="Close">${icon('x')}</button>${content}</section>`;
  document.body.appendChild(wrap); document.body.classList.add('no-scroll');
  wrap.previousFocus = previousFocus;
  const heading = wrap.querySelector('h2');
  if (heading) { heading.id = 'dialogHeading'; wrap.querySelector('[role=dialog]').setAttribute('aria-labelledby', heading.id); }
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key !== 'Tab') return;
    const fields = [...wrap.querySelectorAll('button:not(:disabled), input:not([type=hidden]), select, textarea, a[href]')].filter(el => el.getClientRects().length);
    const first = fields[0], last = fields.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  });
  requestAnimationFrame(() => wrap.querySelector('input:not([type=hidden]), button')?.focus());
  wrap.addEventListener('click', e => { if (e.target === wrap) closeSheet(); }); document.querySelector('#sheetClose').onclick = closeSheet;
}
function closeSheet() { const wrap = document.querySelector('#sheetBackdrop'); const previous = wrap?.previousFocus; wrap?.dispatchEvent(new Event('close')); wrap?.remove(); document.body.classList.remove('no-scroll'); if (previous?.isConnected) previous.focus(); }

function connectLive() {
  if (!state.profile || state.socket?.readyState === WebSocket.OPEN || state.socket?.readyState === WebSocket.CONNECTING) return;
  try {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'; const url=`${proto}//${location.host}/api/live`; const ws = state.profile.token ? new WebSocket(url, state.profile.token) : new WebSocket(url); state.socket = ws;
    ws.onmessage = ev => { if (ev.data === 'pong') return; try { const msg = JSON.parse(ev.data); if (msg.type === 'notification') { state.unread++; updateBadges(); showToast(msg.title || 'New Carpool Network alert'); } } catch {} };
    ws.onclose = () => { if (state.socket === ws) state.socket = null; setTimeout(() => { if (state.profile && document.visibilityState === 'visible') connectLive(); }, 3500); };
  } catch {}
}
function updateBadges() {
  document.querySelectorAll('[data-nav="alerts"]').forEach(btn => {
    let badge = btn.querySelector('.nav-badge');
    if (state.unread > 0) {
      if (!badge) { badge = document.createElement('b'); badge.className = 'nav-badge'; btn.appendChild(badge); }
      badge.textContent = state.unread > 9 ? '9+' : state.unread;
    } else badge?.remove();
  });
}
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible') { if(state.profile && Date.now()-state.sessionCheckedAt>300000) await restoreSession(); connectLive(); refreshUnread().then(updateBadges); } });

let restoringHistory = false;
async function renderLocation() {
  restoringHistory = true;
  try {
    const params = new URLSearchParams(location.search);
    const view = params.get('view') || 'home';
    if (['chat','inbox','businesses'].includes(view)) {
      if (!state.profile) { await renderHome(); openSignIn(() => socialUI.render(view, params.get('room') || '')); }
      else await socialUI.render(view, params.get('room') || '');
      return;
    }
    if (!state.profile && ['post', 'alerts', 'support', 'admin', 'issues', 'me'].includes(view)) await renderHome();
    if (view === 'me' && state.profile) await renderMe(['rides','posts','account'].includes(params.get('tab')) ? params.get('tab') : 'rides');
    else if (view === 'community') await renderCommunity(LABELS[params.get('category')] ? params.get('category') : '', params.get('q') || '');
    else if (view === 'post' && state.profile) renderPostPage(LABELS[params.get('type')] ? params.get('type') : '');
    else await navigate(['home', 'find', 'trips', 'account', 'community', 'post', 'alerts', 'support', 'admin', 'issues', 'me'].includes(view) ? view : 'home');
    if (params.get('post')) await openPost(params.get('post'));
  } finally { restoringHistory = false; }
}
window.addEventListener('popstate', () => { closeSheet(); renderLocation().catch(error => showToast(error.message, 'error')); });
window.addEventListener('offline', () => showToast('You are offline. Reconnect before posting or booking.', 'error'));
function renderConnectionUnavailable(){
  state.connectionUnavailable=true;
  closeSheet();
  shell('<section class="section-block"><div class="empty-card"><h1>Connection unavailable</h1><p>Reconnect to check your account, bookings and messages. Your sign-in has not been cleared. No booking or message can be confirmed while offline.</p><button id="retryConnection" class="primary-btn">Try connection again</button></div></section>','home');
  document.querySelector('#retryConnection').onclick=()=>boot().catch(error=>showToast(error.message,'error'));
}
window.addEventListener('online',()=>{if(state.connectionUnavailable)boot().catch(error=>showToast(error.message,'error'));});
async function boot() {
  if(!navigator.onLine){renderConnectionUnavailable();return;}
  state.connectionUnavailable=false;
  const params = new URLSearchParams(location.search); const post = params.get('post');
  let configLoaded=false;
  await Promise.all([restoreSession(), fetch('/api/config', { signal: AbortSignal.timeout(10000) }).then(r => {if(!r.ok)throw Error('Configuration unavailable');return r.json();}).then(config => { configLoaded=true;state.preview = Boolean(config.preview); state.supportEmail = config.supportEmail || ''; state.emailAvailable = Boolean(config.emailAvailable); state.phoneVerificationRequired = Boolean(config.phoneVerificationRequired); }).catch(() => {})]);
  if(!configLoaded&&!state.profile){renderConnectionUnavailable();return;}
  await renderLocation();
}
const commuteUI=createCommutes({api,esc,openSheet,closeSheet,showToast,state,openPost,chat:id=>socialUI.render('inbox',id)});
const openTrip=createLiveTrips({api,esc,openSheet,closeSheet,showToast});
const refreshAccount=async()=>{if(state.view==='me')await renderMe(state.routeParams?.tab||'account');};
const editContact=createContactDetails({api,esc,openSheet,closeSheet,showToast,onSaved:refreshAccount});
const profilePhotos=createProfilePhotos({api,esc,openSheet,closeSheet,showToast,onSaved:refreshAccount});
const memberDetails=createMemberDetails({api,esc,openSheet,closeSheet,showToast,onSaved:refreshAccount});
const socialUI = createSocialUI({api,esc,icon,shell,beginView,state,openSheet,closeSheet,showToast,openPost,openUser,saveProfile,clearStoredProfile,navigate,openPinSignIn,connectLive});
boot().catch(error => { window.CarpoolDiagnostics?.capture('BOOT_ERROR','',error); app.textContent = 'Unable to load Carpool Network. Please reload the page.'; showToast(error.message, 'error'); });

async function renderIssues(filter='open', kind='all', offset=0) {
  const visit = beginView('issues');
  const labels = {all:'All reports',bug:'Bug reports',feedback:'Feedback',idea:'Ideas',automatic:'Automatic errors'};
  try {
    const data = await api(`/api/admin/issues?status=${encodeURIComponent(filter)}&kind=${encodeURIComponent(kind)}&offset=${offset}`);
    if (visit !== viewRevision) return;
    shell(`<section class="section-block"><div class="section-title-row"><div><span class="eyebrow">LISTEN & IMPROVE</span><h1>Feedback & bug reports</h1><p>Private feedback, ideas and technical problems in one place. Repeated automatic errors are grouped; a resolved error reopens if it happens again.</p></div><button class="outline-btn" id="issuesBack">Control Room</button></div><aside class="operations-summary"><strong>Service checks</strong><p>Database reachable · Release ${esc(data.release || "unknown")} · Daily maintenance: ${esc(({ok:"up to date",stale:"overdue — investigate",failed:"failed — investigate",awaiting_first_run:"waiting for the first recorded run"})[data.maintenance?.status] || "unknown")}${data.maintenance?.lastRun ? ` · Last run ${esc(data.maintenance.lastRun)} UTC` : ""}.</p><a href="https://carpool-availability.balashankarbollineni4.workers.dev/" target="_blank" rel="noopener noreferrer">Live service checks</a></aside><div class="issue-filters"><label>Status<select id="issueFilter">${['open','investigating','resolved','ignored','all'].map(v=>`<option value="${v}" ${v===filter?'selected':''}>${v}</option>`).join('')}</select></label><label>Report type<select id="issueKind">${Object.entries(labels).map(([v,label])=>`<option value="${v}" ${v===kind?'selected':''}>${label}</option>`).join('')}</select></label><button class="outline-btn" id="refreshIssues">Refresh reports</button></div><p>${data.counts.map(c=>`${Number(c.count)} ${esc(c.status)}`).join(' · ') || 'No reports recorded'}</p><div class="issues-list">${data.issues.map(i=>`<article class="issue-card"><h2>${esc(({USER_REPORT:'Bug report',USER_FEEDBACK:'Feedback',USER_IDEA:'Improvement idea'})[i.code] || i.code)}</h2><small>Reference: ${esc(i.id)} · ${esc(i.status)} · ${Number(i.occurrences)} occurrence(s)<br>${esc(i.route)} · release ${esc(i.release)} · first seen ${esc(i.first_seen)} UTC · last seen ${esc(i.last_seen)} UTC${i.reporter_id?` · member ${esc(i.reporter_id)}`:''}</small><pre>${esc(i.detail || 'No additional detail')}</pre><form data-issue="${esc(i.id)}"><label>Status <select name="status" aria-label="Status for ${esc(i.id)}">${['open','investigating','resolved','ignored'].map(v=>`<option ${v===i.status?'selected':''}>${v}</option>`).join('')}</select></label><label>Resolution note <input name="resolution" maxlength="600" value="${esc(i.resolution)}" placeholder="What changed and how was it checked?"></label><button class="primary-btn small">Save status</button></form></article>`).join('') || '<div class="empty-card"><h2>No reports in this view</h2><p>Use the filters to see other report types and statuses.</p></div>'}</div><div class="issue-pagination"><button class="outline-btn" id="issuesPrevious" ${offset===0?'disabled':''}>Previous</button><span>${data.total ? `${offset+1}–${offset+data.issues.length} of ${data.total}` : '0 reports'}</span><button class="outline-btn" id="issuesNext" ${offset+data.limit>=data.total?'disabled':''}>Next</button></div></section>`,'me');
    document.querySelector('#issuesBack').onclick=renderAdmin;
    document.querySelector('#issueFilter').onchange=e=>renderIssues(e.target.value,kind);
    document.querySelector('#issueKind').onchange=e=>renderIssues(filter,e.target.value);
    document.querySelector('#refreshIssues').onclick=()=>renderIssues(filter,kind,offset);
    document.querySelector('#issuesPrevious').onclick=()=>renderIssues(filter,kind,Math.max(0,offset-data.limit));
    document.querySelector('#issuesNext').onclick=()=>renderIssues(filter,kind,offset+data.limit);
    document.querySelectorAll('[data-issue]').forEach(form=>form.onsubmit=async e=>{
      e.preventDefault();const button=form.querySelector('button');button.disabled=true;
      try{await api(`/api/admin/issues/${form.dataset.issue}`,{method:'PATCH',body:JSON.stringify({status:form.elements.status.value,resolution:form.elements.resolution.value})});showToast('Report updated','success');if (visit === viewRevision) renderIssues(filter,kind,offset);}
      catch(error){button.disabled=false;showToast(error.message,'error');}
    });
  } catch(error) {
    if (visit !== viewRevision) return;
    if (error.status === 403) {shell('<section class="empty-card"><h1>Unlock the report inbox</h1><p>Open the Control Room to verify your admin access, then choose Feedback &amp; bug reports.</p><button class="primary-btn" data-nav="admin">Open Control Room</button></section>','me');return;}
    pageError('Reports are unavailable',error,()=>renderIssues(filter,kind,offset));
  }
}
