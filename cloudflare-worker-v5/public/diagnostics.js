/* Independent of the app bundle so reporting survives app startup failures. */
(() => {
  'use strict';
  const release = '5.9.0', queue = [], seen = new Set();
  let sending = false;
  const route = value => {
    try {
      const p = new URL(value || location.href, location.origin).pathname;
      return p.startsWith('/api/') ? p.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id') : '/';
    } catch { return '/'; }
  };
  async function drain() {
    if (sending || navigator.onLine === false || !queue.length) return;
    sending = true;
    try {
      const response = await fetch('/api/diagnostics', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(queue[0]), credentials:'omit', signal:AbortSignal.timeout(8000)});
      if (response.ok || (response.status >= 400 && response.status < 500)) queue.shift();
    } catch { /* Never report a reporting failure recursively. Retry on reconnect. */ }
    finally { sending = false; }
    if (queue.length && navigator.onLine !== false) setTimeout(drain, 30000);
  }
  function capture(code, path = '', error) {
    const frames = String(error?.stack || '').split('\n').slice(1,6).map(s => s.match(/(?:app|diagnostics|sw)\.js:\d+:\d+/)?.[0]).filter(Boolean).join('\n');
    const event = {source:'browser', code, route:route(path), release, frames};
    const key = JSON.stringify(event);
    if (seen.has(key) || seen.size >= 20) return;
    seen.add(key); if (queue.length < 10) queue.push(event); drain();
  }
  window.addEventListener('error', e => {
    if (e.target !== window) { if (['SCRIPT','LINK'].includes(e.target?.tagName)) capture('RESOURCE_ERROR'); }
    else capture('JS_ERROR','',e.error);
  }, true);
  window.addEventListener('unhandledrejection', e => capture('UNHANDLED_REJECTION','',e.reason));
  window.addEventListener('online', drain);
  function openReport() {
    if (document.querySelector('#problemDialog')) return;
    const previous = document.activeElement;
    const dialog = document.createElement('dialog'); dialog.id = 'problemDialog'; dialog.className = 'problem-dialog'; dialog.setAttribute('aria-labelledby','problemTitle');
    dialog.innerHTML = `<form id="problemForm"><button type="button" class="problem-close" aria-label="Close report">×</button><h2 id="problemTitle">Report a problem</h2><p>Tell us what you tried, what happened and what you expected. You can report without an account.</p><label for="problemDescription">What went wrong?</label><textarea id="problemDescription" name="description" minlength="10" maxlength="1800" rows="6" required></textarea><p class="problem-note">Do not include passwords, recovery codes, bank details or private trip addresses. Reports are visible only to the Carpool Network admin team. This is not an emergency service.</p><label class="problem-trap" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label><p class="problem-status" role="status"></p><button type="submit" class="problem-submit">Send report</button><a href="/privacy.html">How reports and diagnostics are used</a></form>`;
    document.body.append(dialog); dialog.showModal();
    const close = () => {dialog.close(); dialog.remove(); previous?.focus();};
    dialog.querySelector('.problem-close').onclick = close;
    dialog.addEventListener('cancel', e => {e.preventDefault(); close();});
    const id = crypto.randomUUID();
    dialog.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const button = dialog.querySelector('[type=submit]'), status = dialog.querySelector('[role=status]');
      button.disabled = true; status.textContent = 'Sending…';
      try {
        const response = await fetch('/api/diagnostics', {method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',signal:AbortSignal.timeout(15000),body:JSON.stringify({id,source:'manual',route:route(),release,description:dialog.querySelector('textarea').value,website:dialog.querySelector('[name=website]').value})});
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'Could not send the report.');
        status.textContent = `Report saved. Reference: ${data.reference}. Keep this reference if you contact Support. Thank you for helping us improve.`;
        dialog.querySelector('textarea').readOnly = true; button.textContent = 'Report sent';
      } catch (error) {
        status.textContent = navigator.onLine === false ? 'You are offline. Your text is still here. Reconnect and send again.' : (error.name === 'TimeoutError' ? 'The request timed out. Your text is still here; try sending again.' : error.message || 'Could not send. Please try again.');
        button.disabled = false;
      }
    };
    dialog.querySelector('textarea').focus();
  }
  window.CarpoolDiagnostics = Object.freeze({capture, openReport});
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-report-problem]').forEach(button => button.onclick = openReport);
  });
})();
