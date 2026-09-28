import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
export function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const file of ['schema.sql','migration-v8.sql','migration-mobility.sql','migration-launch.sql'])db.exec(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
  const prepare=sql=>{
    let args=[];
    return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},_run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};
  };
  const env={DB:{prepare,async batch(statements){db.exec('BEGIN');try{const r=statements.map(s=>s._run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},REQUIRE_WHATSAPP:'true',REQUIRE_PHONE_VERIFICATION:'true',REQUIRE_PROFILE_PHOTO:'true',REQUIRE_VEHICLE:'true',TWILIO_API_KEY_SID:'SK'+'a'.repeat(32),TWILIO_API_KEY_SECRET:'synthetic-provider-secret-123456',TWILIO_VERIFY_SERVICE_SID:'VA'+'b'.repeat(32),SMS_DAILY_LIMIT:'50',SMS_MONTHLY_LIMIT:'200'};
  function member(id,phone='+12025550123'){
    db.prepare('INSERT INTO users(id,token_hash,name,phone,area) VALUES(?,?,?,?,?)').run(id,randomUUID(),id,'email:'+id,'Cardiff');
    db.prepare('INSERT INTO member_emails(user_id,email) VALUES(?,?)').run(id,id+'@example.invalid');
    db.prepare('INSERT INTO member_contacts(user_id,whatsapp_number) VALUES(?,?)').run(id,phone);
  }
  const h={json:(data,status=200)=>Response.json(data,{status}),fail:(error,status=400)=>Response.json({ok:false,error},{status}),async requireUser(r){const id=r.headers.get('x-test-user');return id&&db.prepare('SELECT id FROM users WHERE id=?').get(id)?{user:{id}}:{error:Response.json({ok:false},{status:401})};},async verified(_env,id){return !!db.prepare('SELECT user_id FROM member_emails WHERE user_id=?').get(id);},async rateLimitOrFail(){return null;}};
  return {db,env,h,member};
}
