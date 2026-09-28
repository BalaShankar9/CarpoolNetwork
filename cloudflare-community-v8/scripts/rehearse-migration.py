"""Read a protected SQL export; rehearse upgrade/rollback entirely in memory.

No database content is printed or uploaded. Never pass a live SQLite database.
"""
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

root = Path(__file__).resolve().parent.parent
backup = Path(sys.argv[1])
db = sqlite3.connect(':memory:')
db.executescript(backup.read_text())
tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
def snapshot():
    return {name: sorted(json.dumps(row,default=str) for row in db.execute('SELECT * FROM "'+name.replace('"','""')+'"')) for name in tables}
before = snapshot()
duplicates = db.execute("SELECT COUNT(*) FROM (SELECT rider_id,ride_offer_post_id FROM ride_requests WHERE status IN ('pending','accepted','completed') GROUP BY rider_id,ride_offer_post_id HAVING COUNT(*)>1)").fetchone()[0]
assert duplicates == 0, 'Active booking duplicates require explicit resolution before upgrade'
assert not db.execute('PRAGMA foreign_key_check').fetchall(), 'Backup has invalid foreign keys'
migration = '\n'.join((root/name).read_text() for name in ['migrations/production-v8-additive.sql','migration-mobility.sql'])
db.executescript(migration)
assert snapshot() == before, 'Upgrade changed existing records'
assert not db.execute('PRAGMA foreign_key_check').fetchall(), 'Upgrade broke foreign keys'
db.executescript(migration)
assert snapshot() == before, 'Repeated upgrade changed existing records'
db.executescript((root/'migrations/rollback-v8-triggers.sql').read_text())
assert snapshot() == before, 'Rollback changed existing records'
assert not db.execute('PRAGMA foreign_key_check').fetchall(), 'Rollback broke foreign keys'
db.executescript(migration)
assert snapshot() == before, 'Forward recovery changed existing records'
print(json.dumps({'result':'PASS','migrations':['migrations/production-v8-additive.sql','migration-mobility.sql'],'original_tables':len(tables),'original_rows':sum(map(len,before.values())), 'active_booking_duplicates':duplicates,'upgrade_preserves_every_existing_row':True,'repeat_upgrade':True,'trigger_removal_preserves_every_existing_row':True,'forward_schema_reapplication':True,'runtime_rollback_tested':False,'backup_sha256':hashlib.sha256(backup.read_bytes()).hexdigest()},indent=2))
