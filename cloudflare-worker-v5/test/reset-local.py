from pathlib import Path
import sqlite3
root=Path(__file__).resolve().parent.parent
candidates=[p for p in (root/'.wrangler/state/v3/d1').rglob('*.sqlite') if p.name!='metadata.sqlite']
assert len(candidates)==1, 'Expected exactly one local fixture database'
p=candidates[0];c=sqlite3.connect(p);c.execute('PRAGMA foreign_keys=OFF')
for typ,name in c.execute("SELECT type,name FROM sqlite_master WHERE type IN ('trigger','table') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").fetchall():
 c.execute('DROP '+typ.upper()+' IF EXISTS "'+name.replace('"','""')+'"')
c.executescript((root/'schema.sql').read_text());c.executescript((root/'migration-v5-9.sql').read_text());c.commit();print('Reset disposable local Carpool fixture database')
