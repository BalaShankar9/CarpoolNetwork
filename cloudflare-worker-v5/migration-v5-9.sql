-- Additive release migration. Existing members, bookings and audit records are untouched.
CREATE TABLE IF NOT EXISTS diagnostic_issues (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK(source IN ('browser','server','manual','scheduled')),
  code TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  release TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  reporter_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','ignored')),
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolution TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_diagnostic_status_seen ON diagnostic_issues(status,last_seen DESC);

CREATE TRIGGER IF NOT EXISTS trg_pending_limit_v59_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='pending'
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM ride_requests rr
    JOIN posts existing ON existing.id=rr.ride_offer_post_id
    JOIN posts target ON target.id=NEW.ride_offer_post_id
    WHERE rr.rider_id=NEW.rider_id AND rr.id<>NEW.id AND rr.status='pending'
      AND ABS(julianday(existing.journey_date||' '||existing.journey_time)-julianday(target.journey_date||' '||target.journey_time)) < 0.125) >= 3
    THEN RAISE(ABORT,'PENDING_LIMIT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_pending_limit_v59_update
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='pending' AND OLD.status<>'pending'
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM ride_requests rr
    JOIN posts existing ON existing.id=rr.ride_offer_post_id
    JOIN posts target ON target.id=NEW.ride_offer_post_id
    WHERE rr.rider_id=NEW.rider_id AND rr.id<>NEW.id AND rr.status='pending'
      AND ABS(julianday(existing.journey_date||' '||existing.journey_time)-julianday(target.journey_date||' '||target.journey_time)) < 0.125) >= 3
    THEN RAISE(ABORT,'PENDING_LIMIT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_duplicate_request_v59_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='pending'
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ride_requests r WHERE r.rider_id=NEW.rider_id AND r.ride_offer_post_id=NEW.ride_offer_post_id AND r.id<>NEW.id AND r.status IN ('pending','accepted','completed')) THEN RAISE(ABORT,'REQUEST_ALREADY_PENDING') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_duplicate_request_v59_update
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='pending' AND OLD.status<>'pending'
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ride_requests r WHERE r.rider_id=NEW.rider_id AND r.ride_offer_post_id=NEW.ride_offer_post_id AND r.id<>NEW.id AND r.status IN ('pending','accepted','completed')) THEN RAISE(ABORT,'REQUEST_ALREADY_PENDING') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_overnight_overlap_v59_insert
BEFORE INSERT ON ride_requests WHEN NEW.status='accepted'
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ride_requests r JOIN posts old_offer ON old_offer.id=r.ride_offer_post_id JOIN posts new_offer ON new_offer.id=NEW.ride_offer_post_id
 WHERE r.id<>NEW.id AND r.status IN ('accepted','completed')
 AND (r.rider_id=NEW.rider_id OR r.driver_id=NEW.rider_id OR r.rider_id=NEW.driver_id OR (r.driver_id=NEW.driver_id AND r.ride_offer_post_id<>NEW.ride_offer_post_id))
 AND ABS(julianday(old_offer.journey_date||' '||old_offer.journey_time)-julianday(new_offer.journey_date||' '||new_offer.journey_time))<0.125)
 THEN RAISE(ABORT,'RIDER_TIME_CONFLICT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_overnight_overlap_v59_update
BEFORE UPDATE OF status ON ride_requests WHEN NEW.status='accepted' AND OLD.status<>'accepted'
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM ride_requests r JOIN posts old_offer ON old_offer.id=r.ride_offer_post_id JOIN posts new_offer ON new_offer.id=NEW.ride_offer_post_id
 WHERE r.id<>NEW.id AND r.status IN ('accepted','completed')
 AND (r.rider_id=NEW.rider_id OR r.driver_id=NEW.rider_id OR r.rider_id=NEW.driver_id OR (r.driver_id=NEW.driver_id AND r.ride_offer_post_id<>NEW.ride_offer_post_id))
 AND ABS(julianday(old_offer.journey_date||' '||old_offer.journey_time)-julianday(new_offer.journey_date||' '||new_offer.journey_time))<0.125)
 THEN RAISE(ABORT,'RIDER_TIME_CONFLICT') END;
END;
