/* Independent of the app bundle so feedback survives app startup failures. */
(() => {
  'use strict';
  const release = '8.0.2-launch', storageKey = 'carpool-diagnostics-v2';
  const queue = [], seen = new Set();
  const views = new Set('home find trips account me inbox chat community businesses post alerts support admin issues'.split(' '));
  const paths = new Set('/ /privacy.html /safety.html /welcome.html /attribution.html /sw.js /app.js /diagnostics.js /styles.css /release.css /social.css /focus.css /polish.css /diagnostics.css /social.js /email-ui.js /icon.svg /community-cover-hd.webp'.split(' '));
  const segments = new Set('api auth email start verify capabilities social rooms communities direct block security passkeys sessions health stats rides search profile logout logout-others recovery-key recover session adopt feed posts cancel-ride matches options comments reactions ride-request-options ride-requests quick mine rating users support tickets messages report admin status unlock lock dashboard moderate remove integrity notifications read push public-key subscribe unsubscribe live diagnostics issues member-details contact-details photos vehicles trips commutes config'.split(' '));
  const codes = new Set('JS_ERROR UNHANDLED_REJECTION RESOURCE_ERROR API_5XX API_NETWORK API_TIMEOUT API_INVALID_RESPONSE SERVICE_WORKER_ERROR BOOT_ERROR'.split(' '));
  let sending = false, timer, lastFailure = null, pendingPrompt = false;
  function route(value = location.href) {
    try {
      const url = new URL(value, location.origin), path = url.pathname;
      if (path.startsWith('/api/')) return path.split('/').map(s => !s || segments.has(s) ? s : ':id').join('/').slice(0,160);
      if (path.startsWith('/views/') && views.has(path.slice(7))) return path;
      if (path === '/' && views.has(url.searchParams.get('view'))) return '/views/' + url.searchParams.get('view');
      return paths.has(path) ? path : '/page';
    } catch { return '/page'; }
  }
  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(queue)); } catch { /* Storage is optional. */ }
  }
  function frames(value) {
    return String(value || '').split('\n').map(s => s.match(/\b(?:app|social|email-ui|diagnostics|sw|passkeys|locations|member-details|profile-photo|contact-details|live-trip|commutes|town-map)\.js:\d+:\d+/)?.[0]).filter(Boolean).slice(0,5).join('\n');
  }
  // Only sanitised technical metadata survives reloads. Never persist user text.
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) for (const item of saved.slice(0,10)) {
      if (!codes.has(item.code) || !Number.isFinite(item.at) || Date.now()-item.at > 86400000 || item.at > Date.now()) continue;
      queue.push({source:'browser',code:item.code,route:route(item.route),page:route(item.page),release,frames:frames(item.frames),at:item.at});
    }
  } catch { /* Storage is optional. */ }
  async function drain() {
    clearTimeout(timer);
    if (sending || navigator.onLine === false || !queue.length) return;
    while (queue.length && Date.now()-queue[0].at > 86400000) queue.shift();
    persist();
    if (!queue.length) return;
    sending = true;
    try {
      const response = await fetch('/api/diagnostics', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(queue[0]),credentials:'omit',signal:AbortSignal.timeout(8000)});
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) queue.shift();
    } catch { /* Never report a reporting failure recursively. */ }
    finally { sending = false; persist(); }
    if (queue.length && navigator.onLine !== false) timer = setTimeout(drain, 60000);
  }
  function offerReport(code = '', path = '') {
    lastFailure = {code:codes.has(code) ? code : '',route:route(path || location.href),page:route()};
    if (!document.body) { pendingPrompt = true; return; }
    let notice = document.querySelector('#problemNotice');
    if (!notice) {
      notice = document.createElement('aside'); notice.id = 'problemNotice'; notice.className = 'problem-notice';
      notice.setAttribute('aria-label','Problem reporting');
      notice.innerHTML = '<p role="status">Something didn’t work as expected.</p><button type="button" data-report-problem data-report-context>Report this problem</button><button type="button" class="problem-notice-close" aria-label="Dismiss problem notice">×</button>';
      notice.querySelector('.problem-notice-close').onclick = () => notice.remove();
      document.body.append(notice);
    }
  }
  function capture(code, path = '', error) {
    if (!codes.has(code)) return;
    const event = {source:'browser',code,route:route(path || location.href),page:route(),release,frames:frames(error?.stack)};
    const key = JSON.stringify(event);
    if (seen.has(key) || seen.size >= 20) return;
    seen.add(key); offerReport(code,path);
    if (queue.length < 10) { queue.push({...event,at:Date.now()}); persist(); }
    drain();
  }
  window.addEventListener('error', e => {
    if (e.target !== window) { if (['SCRIPT','LINK','IMG'].includes(e.target?.tagName)) capture('RESOURCE_ERROR',e.target.src || e.target.href); }
    else capture('JS_ERROR','',e.error);
  }, true);
  window.addEventListener('unhandledrejection', e => capture('UNHANDLED_REJECTION','',e.reason));
  window.addEventListener('online', drain);
  function openReport(kind = 'bug', context = null) {
    if (document.querySelector('#problemDialog')) return;
    if (!['bug','feedback','idea'].includes(kind)) kind = 'bug';
    const previous = document.activeElement, page = route();
    const pageNames = {home:'Find a ride',find:'Search rides',trips:'My bookings',account:'Account',me:'Account and bookings',inbox:'Messages',chat:'Community',community:'Local listings',businesses:'Local businesses',post:'Offer a ride',alerts:'Alerts',support:'Help & Support',admin:'Control Room',issues:'Feedback & bug reports'};
    const pageLabel = page.startsWith('/views/') ? pageNames[page.slice(7)] : ({'/':'Home','/privacy.html':'Privacy','/safety.html':'Travel safely','/welcome.html':'Getting started','/attribution.html':'Attribution'}[page] || 'Carpool Network');
    const dialog = document.createElement('dialog'); dialog.id = 'problemDialog'; dialog.className = 'problem-dialog'; dialog.setAttribute('aria-labelledby','problemTitle');
    dialog.innerHTML = `<form id="problemForm"><button type="button" class="problem-close" aria-label="Close report">×</button><h2 id="problemTitle"></h2><p class="problem-intro"></p><label for="problemKind">I’d like to</label><select id="problemKind" name="kind"><option value="bug">Report a bug</option><option value="feedback">Leave feedback</option><option value="idea">Suggest an improvement</option></select><label for="problemDescription" id="problemLabel"></label><textarea id="problemDescription" name="description" minlength="10" maxlength="1800" rows="5" required></textarea><p class="problem-context"></p><p class="problem-note">Private to the Carpool Network admin team. No account needed. Please leave out passwords, codes, bank details and private addresses. This is not an emergency service.</p><label class="problem-trap" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label><p class="problem-status" role="status"></p><button type="submit" class="problem-submit">Send report</button><a href="/privacy.html">How reports and diagnostics are used</a></form>`;
    const select = dialog.querySelector('select'), textarea = dialog.querySelector('textarea'), button = dialog.querySelector('[type=submit]');
    select.value = kind;
    function updateKind() {
      const bug = select.value === 'bug', idea = select.value === 'idea';
      dialog.querySelector('h2').textContent = bug ? 'Report a bug' : idea ? 'Suggest an improvement' : 'Leave feedback';
      dialog.querySelector('.problem-intro').textContent = bug ? 'Tell us what you tried, what happened and what you expected.' : 'What is working well, and what could we make better?';
      dialog.querySelector('#problemLabel').textContent = bug ? 'What went wrong?' : idea ? 'What would you like us to improve?' : 'Your feedback';
      button.textContent = bug ? 'Send bug report' : 'Send feedback';
      dialog.querySelector('.problem-context').textContent = `Page included: ${pageLabel}.${bug && context?.code ? ' Detected technical error details are included.' : ''} No form contents or screenshots are attached.`;
    }
    updateKind(); select.onchange = updateKind;
    document.body.append(dialog); dialog.showModal();
    const close = () => {dialog.close(); dialog.remove(); if (previous?.isConnected) previous.focus();};
    dialog.querySelector('.problem-close').onclick = close;
    dialog.addEventListener('cancel', e => {e.preventDefault(); close();});
    const id = crypto.randomUUID();
    dialog.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const status = dialog.querySelector('[role=status]');
      if (button.disabled) return;
      button.disabled = true; select.disabled = true; textarea.readOnly = true; status.textContent = 'Sending…';
      try {
        const response = await fetch('/api/diagnostics', {method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',signal:AbortSignal.timeout(15000),body:JSON.stringify({id,source:'manual',kind:select.value,route:page,release,description:textarea.value,context:select.value === 'bug' ? context : null,website:dialog.querySelector('[name=website]').value})});
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'Could not send. Please try again.');
        status.textContent = `${select.value === 'bug' ? 'Bug report' : 'Feedback'} saved. Reference: ${data.reference}. Thank you for helping us improve.`;
        button.textContent = 'Sent'; document.querySelector('#problemNotice')?.remove();
      } catch (error) {
        status.textContent = navigator.onLine === false ? 'You are offline. Your text is still here. Reconnect and send again.' : (error.name === 'TimeoutError' ? 'The request timed out. Your text is still here; try sending again.' : error.message || 'Could not send. Please try again.');
        button.disabled = false; select.disabled = false; textarea.readOnly = false;
      }
    };
    textarea.focus();
  }
  document.addEventListener('click', e => {
    const button = e.target.closest?.('[data-report-problem],[data-leave-feedback]');
    if (!button) return;
    openReport(button.hasAttribute('data-leave-feedback') ? 'feedback' : 'bug',button.hasAttribute('data-report-context') ? lastFailure : null);
  });
  window.CarpoolDiagnostics = Object.freeze({capture,openReport,offerReport});
  function ready() {
    if (!document.querySelector('.feedback-dock')) {
      const dock = document.createElement('nav'); dock.className = 'feedback-dock'; dock.setAttribute('aria-label','Feedback and bug reports');
      dock.innerHTML = '<button type="button" data-leave-feedback>Leave feedback</button><button type="button" data-report-problem>Report a bug</button>';
      document.body.append(dock);
    }
    if (pendingPrompt) { pendingPrompt = false; offerReport(lastFailure?.code,lastFailure?.route); }
    drain();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready); else ready();
})();
