export async function photoRoutes(request,env,h){
  const path=new URL(request.url).pathname,method=request.method;
  if(!path.startsWith('/api/profile-photo')&&!path.startsWith('/api/admin/profile-photos'))return null;
  const publicPhoto=path.match(/^\/api\/profile-photo\/([^/]+)$/);
  if(publicPhoto&&method==='GET'){
    const row=await env.DB.prepare("SELECT p.* FROM profile_photos p JOIN users u ON u.id=p.user_id LEFT JOIN user_moderation m ON m.user_id=p.user_id WHERE p.user_id=? AND COALESCE(m.status,'active')='active' AND u.phone NOT LIKE 'deleted:%'").bind(publicPhoto[1]).first();
    let key=row?.approved_key;
    if(!key){const auth=await h.requireUser(request,env);if(auth.error||auth.user.id!==publicPhoto[1])return h.fail('Photo unavailable.',404);key=row?.object_key;}
    const object=key&&await env.PROFILE_PHOTOS?.get(key);if(!object)return h.fail('Photo unavailable.',404);
    return new Response(object.body,{headers:{'content-type':'image/jpeg','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  if(path.startsWith('/api/admin/')){
    const admin=await h.requireAdmin(request,env);if(admin.error)return admin.error;
    if(!['superadmin','admin','moderator'].includes(admin.role))return h.fail('Photo moderator access required.',403);
    if(path==='/api/admin/profile-photos'&&method==='GET'){
      const rows=await env.DB.prepare("SELECT p.user_id,p.status,p.updated_at,u.name FROM profile_photos p JOIN users u ON u.id=p.user_id WHERE p.status='pending' ORDER BY p.updated_at LIMIT 20").all();
      return h.json({ok:true,photos:rows.results});
    }
    const action=path.match(/^\/api\/admin\/profile-photos\/([^/]+)$/);
    if(action){
      const row=await env.DB.prepare('SELECT * FROM profile_photos WHERE user_id=?').bind(action[1]).first();if(!row)return h.fail('Photo not found.',404);
      if(method==='GET'){
        const object=await env.PROFILE_PHOTOS?.get(row.object_key);if(!object)return h.fail('Photo unavailable.',404);
        const bytes=new Uint8Array(await object.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
        return h.json({ok:true,image:'data:image/jpeg;base64,'+btoa(binary),key:row.object_key});
      }
      if(method==='POST'){
        const data=await request.json();if(!['approved','rejected'].includes(data.status)||data.key!==row.object_key)return h.fail('The photo changed. Reload before reviewing.',409);
        const note=String(data.note||'').trim().slice(0,300);if(data.status==='rejected'&&note.length<5)return h.fail('Explain what the member should change.');
        const result=await env.DB.prepare("UPDATE profile_photos SET status=?,approved_key=CASE WHEN ?='approved' THEN object_key ELSE approved_key END,review_note=?,reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND object_key=? AND status='pending'").bind(data.status,data.status,note,admin.user.id,action[1],data.key).run();
        if(!result.meta.changes)return h.fail('This photo was already reviewed or changed. Reload the queue.',409);
        await h.adminAudit(env,admin.user.id,'profile_photo_review','user',action[1],note,{status:data.status});
        return h.json({ok:true});
      }
    }
    return h.fail('Not found.',404);
  }
  const auth=await h.requireUser(request,env);if(auth.error)return auth.error;
  if(path==='/api/profile-photo'&&method==='GET'){
    const photo=await env.DB.prepare('SELECT status,review_note,approved_key,updated_at FROM profile_photos WHERE user_id=?').bind(auth.user.id).first();
    return h.json({ok:true,available:!!env.PROFILE_PHOTOS,photo:photo?{status:photo.status,reviewNote:photo.review_note,hasApprovedPhoto:!!photo.approved_key,updatedAt:photo.updated_at}:null});
  }
  if(path==='/api/profile-photo'&&method==='POST'){
    if(!env.PROFILE_PHOTOS)return h.fail('Photo uploads are temporarily unavailable.',503);
    if(!await h.verified(env,auth.user.id))return h.fail('Verify your email before uploading a profile photo.',403);
    const limited=await h.rateLimitOrFail(request,env,'profile-photo',5,86400,auth.user.id,true);if(limited)return limited;
    const data=await request.json();if(data.publicProfile!==true||typeof data.jpeg!=='string'||data.jpeg.length>180000)return h.fail('Choose a photo under 130 KB and confirm its use on your public profile.',400);
    let bytes;try{bytes=h.stripJpegMetadata(Uint8Array.from(atob(data.jpeg),c=>c.charCodeAt(0)));}catch{return h.fail('Use a valid JPEG profile photo.');}
    const key=`profiles/${auth.user.id}/${crypto.randomUUID()}.jpg`;
    await env.PROFILE_PHOTOS.put(key,bytes,{httpMetadata:{contentType:'image/jpeg'}});
    try{await env.DB.batch([
      env.DB.prepare("INSERT INTO profile_photos(user_id,object_key) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET object_key=excluded.object_key,status='pending',review_note='',reviewed_by=NULL,updated_at=CURRENT_TIMESTAMP").bind(auth.user.id,key),
      env.DB.prepare('INSERT INTO profile_photo_objects(object_key,user_id) VALUES(?,?)').bind(key,auth.user.id)
    ]);}
    catch(error){await env.PROFILE_PHOTOS.delete(key);throw error;}
    return h.json({ok:true,status:'pending'},201);
  }
  return h.fail('Not found.',404);
}
export async function cleanupProfilePhotos(env){
  if(!env.PROFILE_PHOTOS)return;
  const rows=await env.DB.prepare(`SELECT o.object_key FROM profile_photo_objects o JOIN users u ON u.id=o.user_id
    WHERE u.phone LIKE 'deleted:%' OR (o.created_at<datetime('now','-30 days') AND NOT EXISTS (
      SELECT 1 FROM profile_photos p WHERE p.approved_key=o.object_key OR (p.object_key=o.object_key AND p.status='pending')))
    ORDER BY o.created_at LIMIT 100`).all();
  const keys=rows.results.map(r=>r.object_key);if(!keys.length)return;
  await env.PROFILE_PHOTOS.delete(keys);
  await env.DB.prepare(`DELETE FROM profile_photo_objects WHERE object_key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).run();
}
