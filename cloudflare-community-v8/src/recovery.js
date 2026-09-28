// Forward-recovery maintenance entrypoint. Retain both deployed DO classes and
// bindings; never roll back migration history or restore an old database dump.
export {LiveHub,ChatRoom} from './index.js';
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    const headers={'cache-control':'no-store','retry-after':'600','x-carpool-recovery':'maintenance','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
    if(path==='/api/health'){
      let database='unavailable';try{await env.DB.prepare('SELECT 1').first();database='ok';}catch{}
      return Response.json({ok:false,service:'Carpool Network',recovery:true,database,writes:'paused'},{status:503,headers});
    }
    if(path.startsWith('/api/'))return Response.json({ok:false,error:'Carpool Network is temporarily undergoing maintenance. Existing records are preserved. Please try again shortly.'},{status:503,headers});
    return new Response(`<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Carpool Network · Maintenance</title><style>body{font:18px/1.6 system-ui;background:#f8fafc;color:#17364a;margin:0}main{max-width:600px;margin:15vh auto;padding:28px;border-top:5px solid #ee354d}h1{line-height:1.2}a{color:#c42741}</style><main><p>CARPOOL NETWORK</p><h1>We’ll be back shortly.</h1><p>We’ve paused the app while we fix a service issue. Please wait before repeating a booking or message.</p><p>Use an already agreed contact method to coordinate an imminent journey. This page cannot confirm a booking.</p><p>For help, contact <a href="mailto:balashankarbollineni4@gmail.com">the community owner</a>.</p></main></html>`,{status:503,headers:{...headers,'content-type':'text/html; charset=utf-8'}});
  },
  async scheduled(){/* Maintenance is deliberately read-only. */}
};
