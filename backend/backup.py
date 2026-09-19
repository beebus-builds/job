"""Nightly SQLite backup: python backend/backup.py (cron it). Keeps 7 copies."""
import datetime
import os
import shutil
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
from db import path as db_path  # noqa: E402

src = db_path()
dst_dir = src.parent / "backups"
dst_dir.mkdir(exist_ok=True)
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
dst = dst_dir / f"tracker-{stamp}.db"

con = sqlite3.connect(src)
con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
b = sqlite3.connect(dst)
con.backup(b)
b.close()
con.close()

keeps = sorted(dst_dir.glob("tracker-*.db"))
for old in keeps[:-7]:
    old.unlink()
print(f"backed up {src} -> {dst} (keeping {min(7, len(keeps))})")
