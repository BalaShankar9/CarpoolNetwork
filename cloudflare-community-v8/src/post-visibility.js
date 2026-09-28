// Resolve a whole result page in one query, including all private-room rules.
// json_each keeps the bound-parameter count constant for large result pages.
export async function visiblePostIds(env,ids,userId=''){
 if(!ids.length)return new Set();
 const rows=await env.DB.prepare(`WITH viewer AS (SELECT ? id)
 SELECT p.id FROM posts p JOIN users u ON u.id=p.author_id
 LEFT JOIN user_moderation um ON um.user_id=u.id
 LEFT JOIN post_audiences a ON a.post_id=p.id
 LEFT JOIN conversations c ON c.id=a.conversation_id
 LEFT JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=(SELECT id FROM viewer)
 LEFT JOIN communities co ON co.id=c.community_id
 LEFT JOIN commute_series s ON s.conversation_id=c.id
 LEFT JOIN commute_members cm ON cm.series_id=s.id AND cm.user_id=(SELECT id FROM viewer)
 LEFT JOIN ride_requests r ON r.id=c.booking_id
 WHERE p.id IN (SELECT value FROM json_each(?)) AND u.phone NOT LIKE 'deleted:%'
 AND COALESCE(um.status,'active')<>'banned' AND (COALESCE(um.status,'active')<>'suspended' OR (um.until_at<>'' AND um.until_at<=CURRENT_TIMESTAMP))
 AND NOT EXISTS(SELECT 1 FROM member_blocks b WHERE (b.blocker_id=(SELECT id FROM viewer) AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=(SELECT id FROM viewer)))
 AND (a.post_id IS NULL OR ((SELECT id FROM viewer)<>'' AND (
   (c.kind='lounge' AND COALESCE(m.status,'')<>'removed') OR
   (c.kind='booking' AND (SELECT id FROM viewer) IN (r.rider_id,r.driver_id)) OR
   (c.kind='community' AND m.status='active' AND co.status='approved' AND (s.id IS NULL OR (cm.status='active' AND NOT EXISTS(SELECT 1 FROM member_blocks b WHERE (b.blocker_id=(SELECT id FROM viewer) AND b.blocked_id=s.owner_id) OR (b.blocker_id=s.owner_id AND b.blocked_id=(SELECT id FROM viewer)))))) OR
   (c.kind='direct' AND m.status='active' AND EXISTS(SELECT 1 FROM conversation_members other WHERE other.conversation_id=c.id AND other.user_id<>(SELECT id FROM viewer) AND NOT EXISTS(SELECT 1 FROM member_blocks b WHERE (b.blocker_id=(SELECT id FROM viewer) AND b.blocked_id=other.user_id) OR (b.blocker_id=other.user_id AND b.blocked_id=(SELECT id FROM viewer)))))
 )))`).bind(userId||'',JSON.stringify(ids)).all();
 return new Set(rows.results.map(r=>r.id));
}
