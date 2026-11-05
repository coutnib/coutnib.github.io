"""Paths, SQLite database and settings for Closet Computer."""
import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("CLOSET_DATA", ROOT / "data")).resolve()
MEDIA = DATA / "media"
MODELS = DATA / "models"
for _d in ("items", "people", "outfits", "tryons"):
    (MEDIA / _d).mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)

CATEGORIES = {
    "top": "Top", "bottom": "Bottom", "dress": "Dress", "outerwear": "Outerwear",
    "shoes": "Shoes", "hat": "Hat", "accessory": "Accessory",
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  color TEXT, color_name TEXT, color_family TEXT,
  tags TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  favorite INTEGER NOT NULL DEFAULT 0,
  bg_removed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'Me',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outfits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  favorite INTEGER NOT NULL DEFAULT 0,
  cover_tryon_id INTEGER,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outfit_items (
  outfit_id INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  PRIMARY KEY (outfit_id, item_id)
);
CREATE TABLE IF NOT EXISTS tryons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outfit_id INTEGER, person_id INTEGER,
  item_ids TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL, instructions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued', error TEXT,
  created_at TEXT NOT NULL, finished_at TEXT
);
"""

_lock = threading.RLock()
_conn = sqlite3.connect(DATA / "closet.db", check_same_thread=False)
_conn.row_factory = sqlite3.Row
_conn.execute("PRAGMA foreign_keys = ON")
_conn.executescript(SCHEMA)
# Any try-on that was running when the server stopped will never finish.
_conn.execute("UPDATE tryons SET status='error', error='Interrupted (server restarted)' "
              "WHERE status IN ('queued','running')")
_conn.commit()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def query(sql, args=()):
    with _lock:
        rows = _conn.execute(sql, args).fetchall()
        _conn.commit()
        return [dict(r) for r in rows]


def query_one(sql, args=()):
    rows = query(sql, args)
    return rows[0] if rows else None


def execute(sql, args=()):
    with _lock:
        cur = _conn.execute(sql, args)
        _conn.commit()
        return cur.lastrowid


# ---------------------------------------------------------------- settings
SETTINGS_FILE = DATA / "settings.json"
DEFAULT_SETTINGS = {
    "provider": "paperdoll",
    "bg_model": "isnet-general-use",
    "providers": {},
}


def load_settings():
    s = json.loads(json.dumps(DEFAULT_SETTINGS))
    if SETTINGS_FILE.exists():
        try:
            s.update(json.loads(SETTINGS_FILE.read_text()))
        except Exception:
            pass
    return s


def save_settings(s):
    tmp = SETTINGS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(s, indent=2))
    tmp.replace(SETTINGS_FILE)
