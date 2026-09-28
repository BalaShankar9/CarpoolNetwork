-- Additive migration from the production schema inspected on 2026-09-28.
-- Preserves existing records; run only after a protected backup and rehearsal.
-- Preflight duplicate active (rider_id, ride_offer_post_id) pairs before running.

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY, user_id TEXT, purpose TEXT NOT NULL, payload TEXT NOT NULL,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL,
  area TEXT NOT NULL, website TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_media (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), user_id TEXT NOT NULL REFERENCES users(id),
  message_id TEXT REFERENCES chat_messages(id), object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id), author_id TEXT NOT NULL REFERENCES users(id),
  client_id TEXT NOT NULL, body TEXT NOT NULL, reply_to TEXT REFERENCES chat_messages(id),
  chat_only INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0, pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, edited_at TEXT,
  UNIQUE(conversation_id,author_id,client_id)
);

CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', access TEXT NOT NULL CHECK(access IN ('open','approval','invite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id), user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','moderator','owner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','invited','declined','removed')),
  muted INTEGER NOT NULL DEFAULT 0, read_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id,user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('lounge','community','direct','booking')),
  community_id TEXT UNIQUE REFERENCES communities(id), booking_id TEXT UNIQUE REFERENCES ride_requests(id),
  title TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS direct_pairs (
  pair_key TEXT PRIMARY KEY, conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id), initiator_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS extraction_jobs (
  message_id TEXT PRIMARY KEY REFERENCES chat_messages(id), status TEXT NOT NULL DEFAULT 'pending',
  draft_json TEXT NOT NULL DEFAULT '{}', missing_json TEXT NOT NULL DEFAULT '[]', error TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journey_outcomes (
  ride_request_id TEXT NOT NULL REFERENCES ride_requests(id), user_id TEXT NOT NULL REFERENCES users(id),
  outcome TEXT NOT NULL CHECK(outcome IN ('travelled','no_show','disputed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(ride_request_id,user_id)
);

CREATE TABLE IF NOT EXISTS member_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id), blocked_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);

CREATE TABLE IF NOT EXISTS member_emails (
  user_id TEXT PRIMARY KEY REFERENCES users(id), email TEXT NOT NULL UNIQUE,
  verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id TEXT NOT NULL REFERENCES chat_messages(id), user_id TEXT NOT NULL REFERENCES users(id),
  reaction TEXT NOT NULL, PRIMARY KEY(message_id,user_id,reaction)
);

CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), public_key TEXT NOT NULL,
  counter INTEGER NOT NULL, transports TEXT NOT NULL DEFAULT '[]', label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_audiences (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id), source_message_id TEXT UNIQUE REFERENCES chat_messages(id)
);

CREATE TABLE IF NOT EXISTS review_publication (
  rating_id TEXT PRIMARY KEY REFERENCES ratings(id), publish_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS review_replies (
  rating_id TEXT PRIMARY KEY REFERENCES ratings(id), user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ride_controls (
  post_id TEXT PRIMARY KEY REFERENCES posts(id),
  cancelled INTEGER NOT NULL DEFAULT 0 CHECK(cancelled IN (0,1))
);

CREATE TABLE IF NOT EXISTS ride_time_windows (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL, end_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id TEXT PRIMARY KEY, reporter_id TEXT NOT NULL REFERENCES users(id), conversation_id TEXT,
  target_id TEXT NOT NULL, target_type TEXT NOT NULL, reason TEXT NOT NULL, evidence_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', resolution TEXT NOT NULL DEFAULT '', appeal TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_usage (
  month TEXT NOT NULL, metric TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(month,metric)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_rider_offer
ON ride_requests(rider_id,ride_offer_post_id) WHERE status IN ('pending','accepted','completed');

CREATE INDEX IF NOT EXISTS idx_chat_history ON chat_messages(conversation_id,seq);

CREATE VIEW IF NOT EXISTS published_ratings AS
  SELECT r.* FROM ratings r LEFT JOIN review_publication p ON p.rating_id=r.id
  WHERE p.rating_id IS NULL OR (p.hidden=0 AND (p.publish_at<=CURRENT_TIMESTAMP OR
    EXISTS(SELECT 1 FROM ratings other WHERE other.ride_request_id=r.ride_request_id AND other.rater_id<>r.rater_id)));

CREATE TRIGGER IF NOT EXISTS trg_booking_accept_effects
AFTER UPDATE OF status ON ride_requests WHEN NEW.status='accepted' AND OLD.status='pending'
BEGIN
  UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP
    WHERE rider_id=NEW.rider_id AND id<>NEW.id AND status='pending' AND ride_offer_post_id IN (
      SELECT o.id FROM posts o JOIN posts n ON n.id=NEW.ride_offer_post_id
      WHERE ABS(strftime('%s',o.journey_date||' '||o.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800);
  UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP
    WHERE author_id=NEW.rider_id AND category='ride_wanted' AND status='active' AND id IN (
      SELECT w.id FROM posts w JOIN posts n ON n.id=NEW.ride_offer_post_id
      WHERE ABS(strftime('%s',w.journey_date||' '||w.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800);
  UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP
    WHERE ride_offer_post_id=NEW.ride_offer_post_id AND status='pending' AND seats_requested > (
      SELECT p.seats-COALESCE((SELECT SUM(r.seats_requested) FROM ride_requests r WHERE r.ride_offer_post_id=p.id AND r.status IN ('accepted','completed')),0)
      FROM posts p WHERE p.id=NEW.ride_offer_post_id);
  UPDATE posts SET status='closed',updated_at=CURRENT_TIMESTAMP
    WHERE id=NEW.ride_offer_post_id AND status='active' AND seats <= (
      SELECT COALESCE(SUM(seats_requested),0) FROM ride_requests WHERE ride_offer_post_id=NEW.ride_offer_post_id AND status IN ('accepted','completed'));
END;

CREATE TRIGGER IF NOT EXISTS trg_booking_block_accept BEFORE UPDATE OF status ON ride_requests WHEN NEW.status IN ('pending','accepted') BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM member_blocks WHERE (blocker_id=NEW.rider_id AND blocked_id=NEW.driver_id) OR (blocker_id=NEW.driver_id AND blocked_id=NEW.rider_id)) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_booking_block_insert BEFORE INSERT ON ride_requests BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM member_blocks WHERE (blocker_id=NEW.rider_id AND blocked_id=NEW.driver_id) OR (blocker_id=NEW.driver_id AND blocked_id=NEW.rider_id)) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_booking_cancel_effects
AFTER UPDATE OF status ON ride_requests WHEN NEW.status='cancelled' AND OLD.status='accepted'
BEGIN
  UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP
    WHERE id=NEW.ride_offer_post_id AND status='closed'
      AND NOT EXISTS(SELECT 1 FROM ride_controls WHERE post_id=NEW.ride_offer_post_id AND cancelled=1)
      AND seats > (SELECT COALESCE(SUM(seats_requested),0) FROM ride_requests WHERE ride_offer_post_id=NEW.ride_offer_post_id AND status IN ('accepted','completed'));
  UPDATE posts SET status='active',updated_at=CURRENT_TIMESTAMP
    WHERE id=NEW.ride_wanted_post_id AND status='closed'
      AND NOT EXISTS(SELECT 1 FROM ride_requests WHERE ride_wanted_post_id=NEW.ride_wanted_post_id AND status IN ('accepted','completed'));
END;

CREATE TRIGGER IF NOT EXISTS trg_booking_pending_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='pending'
BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM posts o JOIN posts w ON w.id=NEW.ride_wanted_post_id
    WHERE o.id=NEW.ride_offer_post_id AND o.category='ride_offer' AND w.category='ride_wanted'
      AND o.author_id=NEW.driver_id AND w.author_id=NEW.rider_id AND NEW.rider_id<>NEW.driver_id
      AND o.status='active' AND w.status='active'
      AND NOT EXISTS(SELECT 1 FROM ride_controls c WHERE c.post_id=o.id AND c.cancelled=1))
    THEN RAISE(ABORT,'JOURNEY_UNAVAILABLE') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM ride_requests r JOIN posts o ON o.id=r.ride_offer_post_id JOIN posts n ON n.id=NEW.ride_offer_post_id
    WHERE r.status IN ('accepted','completed') AND (r.rider_id=NEW.rider_id OR r.driver_id=NEW.rider_id)
    AND ABS(strftime('%s',o.journey_date||' '||o.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800)
    THEN RAISE(ABORT,'MEMBER_TIME_CONFLICT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_booking_status_history
AFTER UPDATE OF status ON ride_requests WHEN NEW.status<>OLD.status
BEGIN
  INSERT INTO booking_event_log(id,ride_request_id,event_type,from_status,to_status)
    VALUES(lower(hex(randomblob(16))),NEW.id,'status_changed',OLD.status,NEW.status);
  INSERT INTO notifications(id,user_id,kind,title,body,post_id)
    SELECT lower(hex(randomblob(16))),NEW.rider_id,'request_closed','Seat request closed',
      'This request is no longer pending. Check My rides for your current bookings and available alternatives.',NEW.ride_wanted_post_id
    WHERE OLD.status='pending' AND NEW.status='cancelled';
END;

CREATE TRIGGER IF NOT EXISTS trg_booking_transition
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status<>OLD.status
BEGIN
  SELECT CASE WHEN NOT (
    (OLD.status='pending' AND NEW.status IN ('accepted','declined','cancelled')) OR
    (OLD.status='accepted' AND NEW.status IN ('cancelled','completed')) OR
    (OLD.status IN ('cancelled','declined') AND NEW.status='pending'))
    THEN RAISE(ABORT,'INVALID_BOOKING_TRANSITION') END;
  SELECT CASE WHEN NEW.status IN ('pending','accepted') AND NOT EXISTS(
    SELECT 1 FROM posts o JOIN posts w ON w.id=NEW.ride_wanted_post_id
    WHERE o.id=NEW.ride_offer_post_id AND o.status='active' AND w.status='active'
    AND NOT EXISTS(SELECT 1 FROM ride_controls c WHERE c.post_id=o.id AND c.cancelled=1))
    THEN RAISE(ABORT,'JOURNEY_UNAVAILABLE') END;
  SELECT CASE WHEN NEW.status='pending' AND EXISTS(SELECT 1 FROM ride_requests r JOIN posts o ON o.id=r.ride_offer_post_id JOIN posts n ON n.id=NEW.ride_offer_post_id
    WHERE r.id<>NEW.id AND r.status IN ('accepted','completed') AND (r.rider_id=NEW.rider_id OR r.driver_id=NEW.rider_id)
    AND ABS(strftime('%s',o.journey_date||' '||o.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800)
    THEN RAISE(ABORT,'MEMBER_TIME_CONFLICT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_chat_member_insert BEFORE INSERT ON chat_messages BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM member_emails WHERE user_id=NEW.author_id) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM user_moderation WHERE user_id=NEW.author_id AND (status='banned' OR (status='suspended' AND (until_at='' OR until_at>CURRENT_TIMESTAMP)))) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM conversations c WHERE c.id=NEW.conversation_id AND c.kind='community'
    AND NOT EXISTS(SELECT 1 FROM conversation_members m JOIN communities g ON g.id=c.community_id WHERE m.conversation_id=c.id AND m.user_id=NEW.author_id AND m.status='active' AND g.status='approved')) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id=NEW.conversation_id AND user_id=NEW.author_id AND status='removed') THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_link_message_guard BEFORE INSERT ON post_audiences
WHEN NEW.source_message_id IS NOT NULL BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM chat_messages m JOIN conversations c ON c.id=m.conversation_id JOIN posts p ON p.id=NEW.post_id
    WHERE m.id=NEW.source_message_id AND m.conversation_id=NEW.conversation_id AND m.author_id=p.author_id
    AND m.deleted=0 AND m.chat_only=0 AND c.kind IN ('lounge','community')) THEN RAISE(ABORT,'MESSAGE_UNAVAILABLE') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_member_overlap_accept
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='accepted' AND OLD.status<>'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM ride_requests r
    JOIN posts o ON o.id=r.ride_offer_post_id
    JOIN posts n ON n.id=NEW.ride_offer_post_id
    WHERE r.status IN ('accepted','completed') AND r.id<>NEW.id
      AND r.ride_offer_post_id<>NEW.ride_offer_post_id
      AND (r.rider_id IN (NEW.rider_id,NEW.driver_id) OR r.driver_id IN (NEW.rider_id,NEW.driver_id))
      AND ABS(strftime('%s',o.journey_date||' '||o.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800
  ) THEN RAISE(ABORT,'MEMBER_TIME_CONFLICT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_new_review_publication AFTER INSERT ON ratings BEGIN
  INSERT INTO review_publication(rating_id,publish_at) VALUES(NEW.id,datetime('now','+14 days'));
END;

CREATE TRIGGER IF NOT EXISTS trg_pending_capacity_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='pending'
BEGIN
  SELECT CASE WHEN NEW.seats_requested > (SELECT p.seats-COALESCE((SELECT SUM(seats_requested) FROM ride_requests WHERE ride_offer_post_id=p.id AND status IN ('accepted','completed')),0) FROM posts p WHERE p.id=NEW.ride_offer_post_id)
    THEN RAISE(ABORT,'NO_SEATS') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_pending_capacity_update
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='pending' AND OLD.status<>'pending'
BEGIN
  SELECT CASE WHEN NEW.seats_requested > (SELECT p.seats-COALESCE((SELECT SUM(seats_requested) FROM ride_requests WHERE ride_offer_post_id=p.id AND status IN ('accepted','completed')),0) FROM posts p WHERE p.id=NEW.ride_offer_post_id)
    THEN RAISE(ABORT,'NO_SEATS') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_pending_limit_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='pending'
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM ride_requests r
    JOIN posts o ON o.id=r.ride_offer_post_id
    JOIN posts n ON n.id=NEW.ride_offer_post_id
    WHERE r.rider_id=NEW.rider_id AND r.status='pending'
      AND ABS(strftime('%s',o.journey_date||' '||o.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800
  ) >= 3 THEN RAISE(ABORT,'PENDING_LIMIT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_pending_limit_update
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='pending' AND OLD.status<>'pending'
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM ride_requests r
    JOIN posts o ON o.id=r.ride_offer_post_id
    JOIN posts n ON n.id=NEW.ride_offer_post_id
    WHERE r.rider_id=NEW.rider_id AND r.status='pending' AND r.id<>NEW.id
      AND ABS(strftime('%s',o.journey_date||' '||o.journey_time)-strftime('%s',n.journey_date||' '||n.journey_time))<10800
  ) >= 3 THEN RAISE(ABORT,'PENDING_LIMIT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_close_pending
AFTER UPDATE OF status ON posts WHEN NEW.status IN ('closed','deleted') AND OLD.status='active'
BEGIN
  UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE status='pending'
    AND (ride_offer_post_id=NEW.id OR ride_wanted_post_id=NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS trg_scoped_post_membership BEFORE INSERT ON post_audiences BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM conversations c JOIN posts p ON p.id=NEW.post_id WHERE c.id=NEW.conversation_id AND c.kind='community'
    AND NOT EXISTS(SELECT 1 FROM conversation_members m JOIN communities g ON g.id=c.community_id WHERE m.conversation_id=c.id AND m.user_id=p.author_id AND m.status='active' AND g.status='approved')) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TABLE IF NOT EXISTS email_challenges (id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, user_id TEXT, purpose TEXT NOT NULL CHECK(purpose IN ('signup','signin','link')), payload TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_email_challenges_expiry ON email_challenges(expires_at);

INSERT OR IGNORE INTO conversations(id,kind,title) VALUES('lounge','lounge','Community lounge');
