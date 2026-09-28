PRAGMA foreign_keys = ON;
CREATE TABLE account_login_pins (
  user_id TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE account_recovery (
  user_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_auth_guard (
  user_id TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_credentials (
  user_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_challenges (
  id TEXT PRIMARY KEY, user_id TEXT, purpose TEXT NOT NULL, payload TEXT NOT NULL,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_event_log (
  id TEXT PRIMARY KEY,
  ride_request_id TEXT NOT NULL,
  actor_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  from_status TEXT NOT NULL DEFAULT '',
  to_status TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL,
  area TEXT NOT NULL, website TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_media (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), user_id TEXT NOT NULL REFERENCES users(id),
  message_id TEXT REFERENCES chat_messages(id), object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id), author_id TEXT NOT NULL REFERENCES users(id),
  client_id TEXT NOT NULL, body TEXT NOT NULL, reply_to TEXT REFERENCES chat_messages(id),
  chat_only INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0, pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, edited_at TEXT,
  UNIQUE(conversation_id,author_id,client_id)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE communities (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', access TEXT NOT NULL CHECK(access IN ('open','approval','invite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id), user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','moderator','owner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','invited','declined','removed')),
  muted INTEGER NOT NULL DEFAULT 0, read_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id,user_id)
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('lounge','community','direct','booking')),
  community_id TEXT UNIQUE REFERENCES communities(id), booking_id TEXT UNIQUE REFERENCES ride_requests(id),
  title TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE direct_pairs (
  pair_key TEXT PRIMARY KEY, conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id), initiator_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE extraction_jobs (
  message_id TEXT PRIMARY KEY REFERENCES chat_messages(id), status TEXT NOT NULL DEFAULT 'pending',
  draft_json TEXT NOT NULL DEFAULT '{}', missing_json TEXT NOT NULL DEFAULT '[]', error TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integrity_head (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  seq INTEGER NOT NULL DEFAULT 0,
  head_hash TEXT NOT NULL DEFAULT 'GENESIS',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integrity_ledger (
  seq INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL DEFAULT '',
  payload_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL UNIQUE,
  signature TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journey_outcomes (
  ride_request_id TEXT NOT NULL REFERENCES ride_requests(id), user_id TEXT NOT NULL REFERENCES users(id),
  outcome TEXT NOT NULL CHECK(outcome IN ('travelled','no_show','disputed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(ride_request_id,user_id)
);

CREATE TABLE member_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id), blocked_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);

CREATE TABLE member_emails (
  user_id TEXT PRIMARY KEY REFERENCES users(id), email TEXT NOT NULL UNIQUE,
  verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reported_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved','dismissed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(reporter_id, reported_user_id)
);

CREATE TABLE message_reactions (
  message_id TEXT NOT NULL REFERENCES chat_messages(id), user_id TEXT NOT NULL REFERENCES users(id),
  reaction TEXT NOT NULL, PRIMARY KEY(message_id,user_id,reaction)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  post_id TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE passkeys (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), public_key TEXT NOT NULL,
  counter INTEGER NOT NULL, transports TEXT NOT NULL DEFAULT '[]', label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_audiences (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id), source_message_id TEXT UNIQUE REFERENCES chat_messages(id)
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ride_offer','ride_wanted','marketplace','job','service','accommodation','community')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  whatsapp_enabled INTEGER NOT NULL DEFAULT 1,
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  journey_date TEXT NOT NULL DEFAULT '',
  journey_time TEXT NOT NULL DEFAULT '',
  flexibility_minutes INTEGER NOT NULL DEFAULT 30,
  seats INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE rating_seals (
  rating_id TEXT PRIMARY KEY,
  ledger_seq INTEGER NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  key_id TEXT NOT NULL DEFAULT 'ed25519-v1',
  sealed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  ride_request_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  ratee_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ratee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (ride_request_id, rater_id)
);

CREATE TABLE reactions (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE review_publication (
  rating_id TEXT PRIMARY KEY REFERENCES ratings(id), publish_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE review_replies (
  rating_id TEXT PRIMARY KEY REFERENCES ratings(id), user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ride_controls (
  post_id TEXT PRIMARY KEY REFERENCES posts(id),
  cancelled INTEGER NOT NULL DEFAULT 0 CHECK(cancelled IN (0,1))
);

CREATE TABLE ride_requests (
  id TEXT PRIMARY KEY,
  ride_offer_post_id TEXT NOT NULL,
  ride_wanted_post_id TEXT NOT NULL,
  rider_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested BETWEEN 1 AND 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','completed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_offer_post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (ride_wanted_post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (ride_offer_post_id, ride_wanted_post_id)
);

CREATE TABLE ride_time_windows (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL, end_time TEXT NOT NULL
);

CREATE TABLE safety_reports (
  id TEXT PRIMARY KEY, reporter_id TEXT NOT NULL REFERENCES users(id), conversation_id TEXT,
  target_id TEXT NOT NULL, target_type TEXT NOT NULL, reason TEXT NOT NULL, evidence_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', resolution TEXT NOT NULL DEFAULT '', appeal TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_rate_limits (
  key_hash TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  reset_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key_hash, bucket)
);

CREATE TABLE social_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_usage (
  month TEXT NOT NULL, metric TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(month,metric)
);

CREATE TABLE support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL DEFAULT '',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('member','admin','system')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('safety','booking','account','community','technical','other')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
  assigned_to TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_moderation (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  reason TEXT NOT NULL DEFAULT '',
  until_at TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_profile_details (
  user_id TEXT PRIMARY KEY,
  avatar_emoji TEXT NOT NULL DEFAULT '🚗',
  gender TEXT NOT NULL DEFAULT '',
  travel_role TEXT NOT NULL DEFAULT 'both' CHECK (travel_role IN ('driver','rider','both')),
  community TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('superadmin','admin','moderator','support')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_account_login_pins_updated ON account_login_pins(updated_at);

CREATE INDEX idx_account_recovery_hash ON account_recovery (code_hash);

CREATE UNIQUE INDEX idx_active_rider_offer
ON ride_requests(rider_id,ride_offer_post_id) WHERE status IN ('pending','accepted','completed');

CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_type,target_id,created_at DESC);

CREATE INDEX idx_admin_audit_time ON admin_audit_log(created_at DESC);

CREATE INDEX idx_admin_sessions_user ON admin_sessions(user_id, expires_at DESC);

CREATE INDEX idx_booking_event_actor_time
  ON booking_event_log(actor_id, created_at);

CREATE INDEX idx_booking_event_request_time
  ON booking_event_log(ride_request_id, created_at);

CREATE INDEX idx_chat_history ON chat_messages(conversation_id,seq);

CREATE INDEX idx_comments_post ON comments (post_id, created_at);

CREATE INDEX idx_integrity_entity ON integrity_ledger(entity_type,entity_id,seq DESC);

CREATE INDEX idx_member_reports_admin ON member_reports(status,updated_at DESC);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

CREATE UNIQUE INDEX idx_one_confirmed_ride_per_wanted
  ON ride_requests (ride_wanted_post_id)
  WHERE status IN ('accepted','completed');

CREATE INDEX idx_posts_author ON posts (author_id, created_at DESC);

CREATE INDEX idx_posts_category ON posts (status, category, created_at DESC);

CREATE INDEX idx_posts_feed ON posts (status, created_at DESC);

CREATE INDEX idx_posts_ride_match ON posts (status, category, journey_date, journey_time);

CREATE INDEX idx_posts_ride_search_v5
  ON posts (status, category, journey_date, journey_time, created_at DESC);

CREATE INDEX idx_push_user ON push_subscriptions (user_id);

CREATE INDEX idx_rating_seals_seq ON rating_seals(ledger_seq);

CREATE INDEX idx_ratings_ratee ON ratings (ratee_id, created_at DESC);

CREATE INDEX idx_reactions_post ON reactions (post_id);

CREATE UNIQUE INDEX idx_reports_one_per_user_post ON reports(reporter_id,post_id);

CREATE INDEX idx_ride_requests_driver ON ride_requests (driver_id, status, created_at DESC);

CREATE INDEX idx_ride_requests_offer ON ride_requests (ride_offer_post_id, status);

CREATE INDEX idx_ride_requests_rider ON ride_requests (rider_id, status, created_at DESC);

CREATE INDEX idx_ride_requests_wanted ON ride_requests (ride_wanted_post_id, status);

CREATE INDEX idx_security_rate_limits_reset
  ON security_rate_limits(reset_at);

CREATE INDEX idx_support_admin ON support_tickets(status,priority,updated_at DESC);

CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id,created_at);

CREATE INDEX idx_support_user ON support_tickets(user_id,status,updated_at DESC);

CREATE INDEX idx_user_moderation_status ON user_moderation(status, until_at);

CREATE INDEX idx_user_profile_role ON user_profile_details (travel_role, user_id);

CREATE INDEX idx_user_sessions_user ON user_sessions (user_id, created_at DESC);

CREATE UNIQUE INDEX idx_users_unique_phone ON users(phone);

CREATE VIEW published_ratings AS
  SELECT r.* FROM ratings r LEFT JOIN review_publication p ON p.rating_id=r.id
  WHERE p.rating_id IS NULL OR (p.hidden=0 AND (p.publish_at<=CURRENT_TIMESTAMP OR
    EXISTS(SELECT 1 FROM ratings other WHERE other.ride_request_id=r.ride_request_id AND other.rater_id<>r.rater_id)));

CREATE TRIGGER trg_booking_accept_effects
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

CREATE TRIGGER trg_booking_block_accept BEFORE UPDATE OF status ON ride_requests WHEN NEW.status IN ('pending','accepted') BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM member_blocks WHERE (blocker_id=NEW.rider_id AND blocked_id=NEW.driver_id) OR (blocker_id=NEW.driver_id AND blocked_id=NEW.rider_id)) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER trg_booking_block_insert BEFORE INSERT ON ride_requests BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM member_blocks WHERE (blocker_id=NEW.rider_id AND blocked_id=NEW.driver_id) OR (blocker_id=NEW.driver_id AND blocked_id=NEW.rider_id)) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER trg_booking_cancel_effects
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

CREATE TRIGGER trg_booking_event_no_delete
BEFORE DELETE ON booking_event_log
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_EVENT_IMMUTABLE');
END;

CREATE TRIGGER trg_booking_event_no_update
BEFORE UPDATE ON booking_event_log
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_EVENT_IMMUTABLE');
END;

CREATE TRIGGER trg_booking_pending_insert
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

CREATE TRIGGER trg_booking_status_history
AFTER UPDATE OF status ON ride_requests WHEN NEW.status<>OLD.status
BEGIN
  INSERT INTO booking_event_log(id,ride_request_id,event_type,from_status,to_status)
    VALUES(lower(hex(randomblob(16))),NEW.id,'status_changed',OLD.status,NEW.status);
  INSERT INTO notifications(id,user_id,kind,title,body,post_id)
    SELECT lower(hex(randomblob(16))),NEW.rider_id,'request_closed','Seat request closed',
      'This request is no longer pending. Check My rides for your current bookings and available alternatives.',NEW.ride_wanted_post_id
    WHERE OLD.status='pending' AND NEW.status='cancelled';
END;

CREATE TRIGGER trg_booking_transition
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

CREATE TRIGGER trg_chat_member_insert BEFORE INSERT ON chat_messages BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM member_emails WHERE user_id=NEW.author_id) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM user_moderation WHERE user_id=NEW.author_id AND (status='banned' OR (status='suspended' AND (until_at='' OR until_at>CURRENT_TIMESTAMP)))) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM conversations c WHERE c.id=NEW.conversation_id AND c.kind='community'
    AND NOT EXISTS(SELECT 1 FROM conversation_members m JOIN communities g ON g.id=c.community_id WHERE m.conversation_id=c.id AND m.user_id=NEW.author_id AND m.status='active' AND g.status='approved')) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id=NEW.conversation_id AND user_id=NEW.author_id AND status='removed') THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER trg_integrity_ledger_advance
AFTER INSERT ON integrity_ledger
BEGIN
  UPDATE integrity_head SET seq=NEW.seq,head_hash=NEW.chain_hash,updated_at=CURRENT_TIMESTAMP WHERE singleton=1;
END;

CREATE TRIGGER trg_integrity_ledger_guard
BEFORE INSERT ON integrity_ledger
BEGIN
  SELECT CASE WHEN NEW.seq <> (SELECT seq + 1 FROM integrity_head WHERE singleton=1)
    THEN RAISE(ABORT,'LEDGER_RACE') END;
  SELECT CASE WHEN NEW.prev_hash <> (SELECT head_hash FROM integrity_head WHERE singleton=1)
    THEN RAISE(ABORT,'LEDGER_RACE') END;
END;

CREATE TRIGGER trg_link_message_guard BEFORE INSERT ON post_audiences
WHEN NEW.source_message_id IS NOT NULL BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM chat_messages m JOIN conversations c ON c.id=m.conversation_id JOIN posts p ON p.id=NEW.post_id
    WHERE m.id=NEW.source_message_id AND m.conversation_id=NEW.conversation_id AND m.author_id=p.author_id
    AND m.deleted=0 AND m.chat_only=0 AND c.kind IN ('lounge','community')) THEN RAISE(ABORT,'MESSAGE_UNAVAILABLE') END;
END;

CREATE TRIGGER trg_member_overlap_accept
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

CREATE TRIGGER trg_new_review_publication AFTER INSERT ON ratings BEGIN
  INSERT INTO review_publication(rating_id,publish_at) VALUES(NEW.id,datetime('now','+14 days'));
END;

CREATE TRIGGER trg_pending_capacity_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='pending'
BEGIN
  SELECT CASE WHEN NEW.seats_requested > (SELECT p.seats-COALESCE((SELECT SUM(seats_requested) FROM ride_requests WHERE ride_offer_post_id=p.id AND status IN ('accepted','completed')),0) FROM posts p WHERE p.id=NEW.ride_offer_post_id)
    THEN RAISE(ABORT,'NO_SEATS') END;
END;

CREATE TRIGGER trg_pending_capacity_update
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='pending' AND OLD.status<>'pending'
BEGIN
  SELECT CASE WHEN NEW.seats_requested > (SELECT p.seats-COALESCE((SELECT SUM(seats_requested) FROM ride_requests WHERE ride_offer_post_id=p.id AND status IN ('accepted','completed')),0) FROM posts p WHERE p.id=NEW.ride_offer_post_id)
    THEN RAISE(ABORT,'NO_SEATS') END;
END;

CREATE TRIGGER trg_pending_limit_insert
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

CREATE TRIGGER trg_pending_limit_update
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

CREATE TRIGGER trg_post_close_pending
AFTER UPDATE OF status ON posts WHEN NEW.status IN ('closed','deleted') AND OLD.status='active'
BEGIN
  UPDATE ride_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE status='pending'
    AND (ride_offer_post_id=NEW.id OR ride_wanted_post_id=NEW.id);
END;

CREATE TRIGGER trg_rating_core_immutable
BEFORE UPDATE OF ride_request_id,rater_id,ratee_id,score,comment,created_at ON ratings
BEGIN
  SELECT RAISE(ABORT,'RATING_IMMUTABLE');
END;

CREATE TRIGGER trg_ride_request_accept_guard_insert
BEFORE INSERT ON ride_requests
WHEN NEW.status = 'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM ride_requests rr
    WHERE rr.ride_wanted_post_id = NEW.ride_wanted_post_id
      AND rr.status IN ('accepted','completed')
  ) THEN RAISE(ABORT, 'RIDER_ALREADY_BOOKED') END;

  SELECT CASE WHEN COALESCE((
    SELECT SUM(rr.seats_requested) FROM ride_requests rr
    WHERE rr.ride_offer_post_id = NEW.ride_offer_post_id
      AND rr.status IN ('accepted','completed')
  ), 0) + NEW.seats_requested > COALESCE((
    SELECT p.seats FROM posts p
    WHERE p.id = NEW.ride_offer_post_id
      AND p.category = 'ride_offer'
      AND p.status = 'active'
  ), 0)
  THEN RAISE(ABORT, 'NO_SEATS') END;
END;

CREATE TRIGGER trg_ride_request_accept_guard_update
BEFORE UPDATE OF status ON ride_requests
WHEN NEW.status = 'accepted' AND OLD.status <> 'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM ride_requests rr
    WHERE rr.ride_wanted_post_id = NEW.ride_wanted_post_id
      AND rr.status IN ('accepted','completed')
      AND rr.id <> NEW.id
  ) THEN RAISE(ABORT, 'RIDER_ALREADY_BOOKED') END;

  SELECT CASE WHEN COALESCE((
    SELECT SUM(rr.seats_requested) FROM ride_requests rr
    WHERE rr.ride_offer_post_id = NEW.ride_offer_post_id
      AND rr.status IN ('accepted','completed')
      AND rr.id <> NEW.id
  ), 0) + NEW.seats_requested > COALESCE((
    SELECT p.seats FROM posts p
    WHERE p.id = NEW.ride_offer_post_id
      AND p.category = 'ride_offer'
      AND p.status = 'active'
  ), 0)
  THEN RAISE(ABORT, 'NO_SEATS') END;
END;

CREATE TRIGGER trg_scoped_post_membership BEFORE INSERT ON post_audiences BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM conversations c JOIN posts p ON p.id=NEW.post_id WHERE c.id=NEW.conversation_id AND c.kind='community'
    AND NOT EXISTS(SELECT 1 FROM conversation_members m JOIN communities g ON g.id=c.community_id WHERE m.conversation_id=c.id AND m.user_id=p.author_id AND m.status='active' AND g.status='approved')) THEN RAISE(ABORT,'CHAT_ACCESS_DENIED') END;
END;

CREATE TRIGGER trg_v5_rider_overlap_insert
BEFORE INSERT ON ride_requests
WHEN NEW.status = 'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.rider_id = NEW.rider_id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'RIDER_TIME_CONFLICT') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.driver_id = NEW.driver_id
      AND existing.ride_offer_post_id <> NEW.ride_offer_post_id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'DRIVER_TIME_CONFLICT') END;
END;

CREATE TRIGGER trg_v5_rider_overlap_update
BEFORE UPDATE OF status ON ride_requests
WHEN NEW.status = 'accepted' AND OLD.status <> 'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.rider_id = NEW.rider_id
      AND existing.id <> NEW.id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'RIDER_TIME_CONFLICT') END;

  -- A driver may carry multiple passengers on the same offer, but cannot confirm
  -- passengers onto a different ride offer that overlaps the same time window.
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.driver_id = NEW.driver_id
      AND existing.id <> NEW.id
      AND existing.ride_offer_post_id <> NEW.ride_offer_post_id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'DRIVER_TIME_CONFLICT') END;
END;
INSERT OR IGNORE INTO integrity_head(singleton) VALUES(1);
INSERT OR IGNORE INTO conversations(id,kind,title) VALUES('lounge','lounge','Community lounge');
