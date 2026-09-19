"""Single place for the SQLite path so Docker volumes + backups agree."""
from __future__ import annotations

import os
from pathlib import Path


def path() -> Path:
    override = os.environ.get("DB_PATH", "")
    if override:
        return Path(override)
    return Path(__file__).resolve().parent.parent / "tracker.db"
