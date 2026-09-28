-- Additive preview release work. Never run schema.sql against an existing database.
CREATE TABLE IF NOT EXISTS phone_verifications (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider='twilio_verify_sms')
);
CREATE TABLE IF NOT EXISTS phone_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  provider_sid TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('sending','pending','checking','consumed','failed','exhausted')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS phone_send_usage (
  period TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL CHECK(attempts>0)
);
CREATE TABLE IF NOT EXISTS trip_sessions (
  offer_id TEXT PRIMARY KEY REFERENCES posts(id),
  status TEXT NOT NULL CHECK(status IN ('active','completed','cancelled')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TRIGGER IF NOT EXISTS protect_booked_vehicle BEFORE UPDATE ON member_vehicles
WHEN OLD.registration<>NEW.registration AND EXISTS(
  SELECT 1 FROM posts p JOIN ride_requests r ON r.ride_offer_post_id=p.id
  WHERE p.author_id=NEW.user_id AND p.journey_date>=date('now','-1 day') AND r.status='accepted'
)
BEGIN SELECT RAISE(ABORT,'VEHICLE_BOOKED'); END;
CREATE TRIGGER IF NOT EXISTS protect_vehicle_capacity BEFORE UPDATE ON member_vehicles
WHEN EXISTS(SELECT 1 FROM posts p WHERE p.author_id=NEW.user_id AND p.category='ride_offer'
  AND p.journey_date>=date('now') AND p.status<>'deleted' AND p.seats>NEW.passenger_seats
  AND (p.status='active' OR EXISTS(SELECT 1 FROM ride_requests r WHERE r.ride_offer_post_id=p.id AND r.status='accepted')))
BEGIN SELECT RAISE(ABORT,'VEHICLE_CAPACITY'); END;
CREATE TRIGGER IF NOT EXISTS respect_registered_capacity_insert BEFORE INSERT ON posts
WHEN NEW.category='ride_offer' AND EXISTS(SELECT 1 FROM member_vehicles v WHERE v.user_id=NEW.author_id AND v.passenger_seats<NEW.seats)
BEGIN SELECT RAISE(ABORT,'VEHICLE_CAPACITY'); END;
CREATE TRIGGER IF NOT EXISTS respect_registered_capacity_update BEFORE UPDATE OF seats,status ON posts
WHEN NEW.category='ride_offer' AND NEW.status='active' AND EXISTS(SELECT 1 FROM member_vehicles v WHERE v.user_id=NEW.author_id AND v.passenger_seats<NEW.seats)
BEGIN SELECT RAISE(ABORT,'VEHICLE_CAPACITY'); END;
CREATE TRIGGER IF NOT EXISTS no_booking_after_trip_start BEFORE INSERT ON ride_requests
WHEN EXISTS(SELECT 1 FROM trip_sessions t WHERE t.offer_id=NEW.ride_offer_post_id)
BEGIN SELECT RAISE(ABORT,'JOURNEY_UNAVAILABLE'); END;
CREATE TRIGGER IF NOT EXISTS no_booking_accept_after_trip_start BEFORE UPDATE OF status ON ride_requests
WHEN NEW.status IN ('pending','accepted') AND OLD.status<>NEW.status AND EXISTS(SELECT 1 FROM trip_sessions t WHERE t.offer_id=NEW.ride_offer_post_id)
BEGIN SELECT RAISE(ABORT,'JOURNEY_UNAVAILABLE'); END;
CREATE TABLE IF NOT EXISTS commute_series (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
  conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id),
  community_id TEXT NOT NULL UNIQUE REFERENCES communities(id),
  client_id TEXT NOT NULL, name TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL,
  origin_id TEXT NOT NULL, destination_id TEXT NOT NULL,
  departure_time TEXT NOT NULL, weekdays_json TEXT NOT NULL,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, seats INTEGER NOT NULL CHECK(seats BETWEEN 1 AND 7),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id,client_id)
);
CREATE TABLE IF NOT EXISTS commute_members (
  series_id TEXT NOT NULL REFERENCES commute_series(id),user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('invited','active','left','removed')),
  PRIMARY KEY(series_id,user_id)
);
CREATE TABLE IF NOT EXISTS commute_occurrences (
  series_id TEXT NOT NULL REFERENCES commute_series(id),local_date TEXT NOT NULL,
  offer_id TEXT NOT NULL UNIQUE REFERENCES posts(id),
  PRIMARY KEY(series_id,local_date)
);
CREATE TRIGGER IF NOT EXISTS no_duplicate_driver_offer BEFORE INSERT ON posts
WHEN NEW.category='ride_offer' AND NEW.status='active' AND EXISTS(SELECT 1 FROM posts p
  WHERE p.author_id=NEW.author_id AND p.category='ride_offer' AND p.journey_date=NEW.journey_date AND p.status='active'
  AND ABS((CAST(substr(p.journey_time,1,2) AS INTEGER)*60+CAST(substr(p.journey_time,4,2) AS INTEGER))-
          (CAST(substr(NEW.journey_time,1,2) AS INTEGER)*60+CAST(substr(NEW.journey_time,4,2) AS INTEGER)))<60)
BEGIN SELECT RAISE(ABORT,'DRIVER_DUPLICATE_OFFER'); END;

CREATE TRIGGER IF NOT EXISTS commute_members_capacity_insert BEFORE INSERT ON commute_members
WHEN NEW.status IN ('active','invited') AND NEW.user_id<>(SELECT owner_id FROM commute_series WHERE id=NEW.series_id)
AND NOT EXISTS(SELECT 1 FROM commute_members WHERE series_id=NEW.series_id AND user_id=NEW.user_id AND status IN ('active','invited'))
AND (SELECT COUNT(*) FROM commute_members m JOIN commute_series s ON s.id=m.series_id WHERE m.series_id=NEW.series_id AND m.user_id<>s.owner_id AND m.status IN ('active','invited'))>=7
BEGIN SELECT RAISE(ABORT,'COMMUTE_MEMBER_LIMIT'); END;
CREATE TRIGGER IF NOT EXISTS commute_members_capacity_update BEFORE UPDATE OF status ON commute_members
WHEN NEW.status IN ('active','invited') AND OLD.status NOT IN ('active','invited') AND NEW.user_id<>(SELECT owner_id FROM commute_series WHERE id=NEW.series_id)
AND (SELECT COUNT(*) FROM commute_members m JOIN commute_series s ON s.id=m.series_id WHERE m.series_id=NEW.series_id AND m.user_id<>s.owner_id AND m.status IN ('active','invited'))>=7
BEGIN SELECT RAISE(ABORT,'COMMUTE_MEMBER_LIMIT'); END;

CREATE TRIGGER IF NOT EXISTS commute_booking_member_insert BEFORE INSERT ON ride_requests
WHEN NEW.status IN ('pending','accepted') AND EXISTS(SELECT 1 FROM commute_occurrences o JOIN commute_series s ON s.id=o.series_id WHERE o.offer_id=NEW.ride_offer_post_id AND (s.status<>'active' OR NOT EXISTS(SELECT 1 FROM commute_members m WHERE m.series_id=s.id AND m.user_id=NEW.rider_id AND m.status='active')))
BEGIN SELECT RAISE(ABORT,'JOURNEY_UNAVAILABLE'); END;
CREATE TRIGGER IF NOT EXISTS commute_booking_member_update BEFORE UPDATE OF status ON ride_requests
WHEN NEW.status IN ('pending','accepted') AND NEW.status<>OLD.status AND EXISTS(SELECT 1 FROM commute_occurrences o JOIN commute_series s ON s.id=o.series_id WHERE o.offer_id=NEW.ride_offer_post_id AND (s.status<>'active' OR NOT EXISTS(SELECT 1 FROM commute_members m WHERE m.series_id=s.id AND m.user_id=NEW.rider_id AND m.status='active')))
BEGIN SELECT RAISE(ABORT,'JOURNEY_UNAVAILABLE'); END;
