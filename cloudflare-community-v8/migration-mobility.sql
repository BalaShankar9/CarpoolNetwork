-- Additive preview expansion. Never apply schema.sql to an existing database.
CREATE TABLE IF NOT EXISTS profile_photo_objects (
  object_key TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profile_photos (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL, approved_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  review_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS member_social_links (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  instagram TEXT NOT NULL DEFAULT '', facebook TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS member_vehicles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  registration TEXT NOT NULL, make TEXT NOT NULL, colour TEXT NOT NULL,
  manufacture_year INTEGER, fuel TEXT NOT NULL DEFAULT '',
  mot_status TEXT NOT NULL, mot_expiry TEXT NOT NULL DEFAULT '',
  tax_status TEXT NOT NULL, tax_due TEXT NOT NULL DEFAULT '',
  passenger_seats INTEGER NOT NULL CHECK(passenger_seats BETWEEN 1 AND 7),
  keeper_confirmed_at TEXT NOT NULL, checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
