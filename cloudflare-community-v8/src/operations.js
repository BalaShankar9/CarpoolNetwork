const MAX_MAINTENANCE_AGE = 40 * 60 * 60 * 1000;
export function maintenanceStatus(record, startedAt, now = Date.now()) {
  const lastRun = Date.parse(record?.finishedAt || '');
  if (['ok','failed'].includes(record?.status) && Number.isFinite(lastRun) && lastRun <= now + 60000) {
    return { status: record.status === 'failed' ? 'failed' : now - lastRun > MAX_MAINTENANCE_AGE ? 'stale' : 'ok', lastRun: new Date(lastRun).toISOString() };
  }
  const started = Date.parse(startedAt || '');
  return { status: Number.isFinite(started) && now - started > MAX_MAINTENANCE_AGE ? 'stale' : 'awaiting_first_run', lastRun: null };
}
export async function readMaintenance(env) {
  const row = await env.DB.prepare("SELECT value FROM app_settings WHERE key='operations_maintenance'").first();
  let record; try { record = JSON.parse(row?.value || 'null'); } catch { record = null; }
  return maintenanceStatus(record, env.OPERATIONS_STARTED_AT);
}
export async function recordMaintenance(env, status, scheduledTime) {
  await env.DB.prepare("INSERT INTO app_settings(key,value,updated_at) VALUES('operations_maintenance',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP")
    .bind(JSON.stringify({status, scheduledTime, finishedAt:new Date().toISOString()})).run();
}
export function httpsRedirect(request, env) {
  const url = new URL(request.url);
  if (env.APP_ENV === 'production' && url.protocol === 'http:') {
    url.protocol = 'https:';
    return new Response(null, {status:308, headers:{location:url.href,'cache-control':'no-store'}});
  }
  return null;
}
export function pageIndexPolicy(request, env, response) {
  const url = new URL(request.url);
  const publicHost = ['carpoolnetwork.co.uk','www.carpoolnetwork.co.uk'].includes(url.hostname);
  // Keep account, conversation, booking and query-result shells out of search results.
  const privateShell = ['/', '/index.html'].includes(url.pathname) &&
    [...url.searchParams].some(([key,value]) => key !== 'view' || value !== 'home');
  if (env.APP_ENV !== 'production' || !publicHost || privateShell || response.status >= 400) {
    response.headers.set('x-robots-tag','noindex, nofollow');
  }
  return response;
}
