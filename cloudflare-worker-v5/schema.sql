PRAGMA defer_foreign_keys=TRUE;
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
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE reactions (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE TABLE account_recovery (
  user_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
CREATE TABLE admin_auth_guard (
  user_id TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT NOT NULL DEFAULT '',
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
CREATE TABLE support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL DEFAULT '',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('member','admin','system')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
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
CREATE TABLE rating_seals (
  rating_id TEXT PRIMARY KEY,
  ledger_seq INTEGER NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  key_id TEXT NOT NULL DEFAULT 'ed25519-v1',
  sealed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE security_rate_limits (
  key_hash TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  reset_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key_hash, bucket)
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
CREATE TABLE account_login_pins (
  user_id TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_posts_feed ON posts (status, created_at DESC);
CREATE INDEX idx_posts_category ON posts (status, category, created_at DESC);
CREATE INDEX idx_posts_ride_match ON posts (status, category, journey_date, journey_time);
CREATE INDEX idx_posts_author ON posts (author_id, created_at DESC);
CREATE INDEX idx_comments_post ON comments (post_id, created_at);
CREATE INDEX idx_reactions_post ON reactions (post_id);
CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_push_user ON push_subscriptions (user_id);
CREATE INDEX idx_ride_requests_driver ON ride_requests (driver_id, status, created_at DESC);
CREATE INDEX idx_ride_requests_rider ON ride_requests (rider_id, status, created_at DESC);
CREATE INDEX idx_ride_requests_offer ON ride_requests (ride_offer_post_id, status);
CREATE INDEX idx_ride_requests_wanted ON ride_requests (ride_wanted_post_id, status);
CREATE UNIQUE INDEX idx_one_confirmed_ride_per_wanted
  ON ride_requests (ride_wanted_post_id)
  WHERE status IN ('accepted','completed');
CREATE INDEX idx_ratings_ratee ON ratings (ratee_id, created_at DESC);
CREATE INDEX idx_posts_ride_search_v5
  ON posts (status, category, journey_date, journey_time, created_at DESC);
CREATE INDEX idx_account_recovery_hash ON account_recovery (code_hash);
CREATE INDEX idx_user_sessions_user ON user_sessions (user_id, created_at DESC);
CREATE UNIQUE INDEX idx_users_unique_phone ON users(phone);
CREATE UNIQUE INDEX idx_reports_one_per_user_post ON reports(reporter_id,post_id);
CREATE INDEX idx_user_profile_role ON user_profile_details (travel_role, user_id);
CREATE INDEX idx_admin_sessions_user ON admin_sessions(user_id, expires_at DESC);
CREATE INDEX idx_user_moderation_status ON user_moderation(status, until_at);
CREATE INDEX idx_support_user ON support_tickets(user_id,status,updated_at DESC);
CREATE INDEX idx_support_admin ON support_tickets(status,priority,updated_at DESC);
CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id,created_at);
CREATE INDEX idx_member_reports_admin ON member_reports(status,updated_at DESC);
CREATE INDEX idx_admin_audit_time ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_type,target_id,created_at DESC);
CREATE INDEX idx_integrity_entity ON integrity_ledger(entity_type,entity_id,seq DESC);
CREATE INDEX idx_rating_seals_seq ON rating_seals(ledger_seq);
CREATE INDEX idx_security_rate_limits_reset
  ON security_rate_limits(reset_at);
CREATE INDEX idx_booking_event_request_time
  ON booking_event_log(ride_request_id, created_at);
CREATE INDEX idx_booking_event_actor_time
  ON booking_event_log(actor_id, created_at);
CREATE INDEX idx_account_login_pins_updated ON account_login_pins(updated_at);
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
CREATE TRIGGER trg_integrity_ledger_guard
BEFORE INSERT ON integrity_ledger
BEGIN
  SELECT CASE WHEN NEW.seq <> (SELECT seq + 1 FROM integrity_head WHERE singleton=1)
    THEN RAISE(ABORT,'LEDGER_RACE') END;
  SELECT CASE WHEN NEW.prev_hash <> (SELECT head_hash FROM integrity_head WHERE singleton=1)
    THEN RAISE(ABORT,'LEDGER_RACE') END;
END;
CREATE TRIGGER trg_integrity_ledger_advance
AFTER INSERT ON integrity_ledger
BEGIN
  UPDATE integrity_head SET seq=NEW.seq,head_hash=NEW.chain_hash,updated_at=CURRENT_TIMESTAMP WHERE singleton=1;
END;
CREATE TRIGGER trg_rating_core_immutable
BEFORE UPDATE OF ride_request_id,rater_id,ratee_id,score,comment,created_at ON ratings
BEGIN
  SELECT RAISE(ABORT,'RATING_IMMUTABLE');
END;
CREATE TRIGGER trg_booking_event_no_update
BEFORE UPDATE ON booking_event_log
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_EVENT_IMMUTABLE');
END;
CREATE TRIGGER trg_booking_event_no_delete
BEFORE DELETE ON booking_event_log
BEGIN
  SELECT RAISE(ABORT, 'BOOKING_EVENT_IMMUTABLE');
END;
