"""
Content Cache — SQLite cache for consent content + media
"""
import sqlite3
import json
import hashlib
from pathlib import Path
from datetime import datetime

CACHE_DB = Path(__file__).parent.parent / "cache" / "consent_cache.db"


def _init_db():
    CACHE_DB.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(CACHE_DB))
    conn.execute("""CREATE TABLE IF NOT EXISTS consents (
        cache_key TEXT PRIMARY KEY,
        procedure TEXT,
        language TEXT,
        consent_json TEXT,
        videos_json TEXT,
        images_json TEXT,
        verified INTEGER DEFAULT 0,
        created_at TEXT
    )""")
    conn.commit()
    return conn


def make_key(procedure: str, language: str) -> str:
    return hashlib.md5(f"{procedure}:{language}".encode()).hexdigest()


def get_cached(procedure: str, language: str) -> dict | None:
    key = make_key(procedure, language)
    try:
        conn = _init_db()
        row = conn.execute("SELECT consent_json, videos_json, images_json, verified FROM consents WHERE cache_key = ?", (key,)).fetchone()
        conn.close()
        if row:
            return {
                "consent": json.loads(row[0]) if row[0] else None,
                "videos": json.loads(row[1]) if row[1] else [],
                "images": json.loads(row[2]) if row[2] else [],
                "verified": bool(row[3])
            }
    except:
        pass
    return None


def set_cached(procedure: str, language: str, consent: dict, videos: list, images: list, verified: bool = False):
    key = make_key(procedure, language)
    try:
        conn = _init_db()
        conn.execute("INSERT OR REPLACE INTO consents (cache_key, procedure, language, consent_json, videos_json, images_json, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (key, procedure, language, json.dumps(consent), json.dumps(videos), json.dumps(images), int(verified), datetime.now().isoformat()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  ⚠️ Cache write error: {e}")
