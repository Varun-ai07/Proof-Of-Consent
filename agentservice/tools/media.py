"""
Media Enrichment — YouTube (cached) + Openverse + Wikimedia Commons
"""
import os
import requests
import hashlib
import json
import sqlite3
from pathlib import Path

TIMEOUT = 10
CACHE_DB = Path(__file__).parent.parent / "cache" / "media_cache.db"


def _init_db():
    CACHE_DB.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(CACHE_DB))
    conn.execute("""CREATE TABLE IF NOT EXISTS media (
        cache_key TEXT PRIMARY KEY,
        media_type TEXT,
        data TEXT,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    return conn


def _cache_get(cache_key: str) -> list | None:
    try:
        conn = _init_db()
        row = conn.execute("SELECT data FROM media WHERE cache_key = ?", (cache_key,)).fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
    except:
        pass
    return None


def _cache_set(cache_key: str, media_type: str, data: list):
    try:
        conn = _init_db()
        conn.execute("INSERT OR REPLACE INTO media (cache_key, media_type, data) VALUES (?, ?, ?)",
                      (cache_key, media_type, json.dumps(data)))
        conn.commit()
        conn.close()
    except:
        pass


def search_youtube(procedure: str, max_results: int = 3) -> list:
    """Search YouTube for procedure explanation videos."""
    cache_key = f"yt:{procedure}"
    cached = _cache_get(cache_key)
    if cached:
        print(f"  📹 YouTube: {len(cached)} cached videos")
        return cached

    youtube_key = os.getenv("YOUTUBE_API_KEY")
    if not youtube_key or youtube_key == "your_youtube_api_key_here":
        print(f"  📹 YouTube: No API key configured (YOUTUBE_API_KEY)")
        return []

    try:
        query = f"{procedure} surgery explanation medical"
        url = "https://www.googleapis.com/youtube/v3/search"
        res = requests.get(url, params={
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": max_results,
            "key": youtube_key,
            "videoDuration": "short",
            "relevanceLanguage": "en"
        }, timeout=TIMEOUT)
        data = res.json()

        videos = []
        for item in data.get("items", []):
            vid = item["id"]["videoId"]
            snippet = item["snippet"]
            videos.append({
                "title": snippet.get("title", ""),
                "description": snippet.get("description", "")[:200],
                "url": f"https://www.youtube.com/watch?v={vid}",
                "embed_url": f"https://www.youtube.com/embed/{vid}",
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "channel": snippet.get("channelTitle", "")
            })

        _cache_set(cache_key, "video", videos)
        print(f"  📹 YouTube: {len(videos)} videos found")
        return videos
    except Exception as e:
        print(f"  ⚠️ YouTube error: {e}")
        return []


def search_openverse(procedure: str, max_results: int = 4) -> list:
    """Search Openverse for medical images (free, no key)."""
    cache_key = f"img:{procedure}"
    cached = _cache_get(cache_key)
    if cached:
        print(f"  🖼️ Openverse: {len(cached)} cached images")
        return cached

    # Try multiple search terms for better results
    queries = [procedure, f"{procedure} surgery", f"{procedure} medical"]
    for query in queries:
        try:
            url = "https://api.openverse.org/v1/images/"
            res = requests.get(url, params={
                "q": query,
                "page_size": max_results,
                "license": "by,by-sa,cc0"
            }, headers={"User-Agent": "MedConsentApp/1.0"}, timeout=TIMEOUT)
            data = res.json()

            images = []
            for item in data.get("results", []):
                images.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "thumbnail": item.get("thumbnail", ""),
                    "creator": item.get("creator", ""),
                    "license": item.get("license", ""),
                    "source": "Openverse"
                })

            if images:
                _cache_set(cache_key, "image", images)
                print(f"  🖼️ Openverse: {len(images)} images (query: {query})")
                return images
        except Exception as e:
            print(f"  ⚠️ Openverse error: {e}")

    print(f"  🖼️ Openverse: 0 images found")
    return []


def search_wikimedia_images(procedure: str, max_results: int = 3) -> list:
    """Search Wikimedia Commons for medical diagrams."""
    cache_key = f"wiki_img:{procedure}"
    cached = _cache_get(cache_key)
    if cached:
        print(f"  🖼️ Wikimedia: {len(cached)} cached images")
        return cached

    try:
        url = "https://commons.wikimedia.org/w/api.php"
        res = requests.get(url, params={
            "action": "query",
            "list": "search",
            "srsearch": f"{procedure} medical",
            "srnamespace": "6",
            "srlimit": max_results,
            "format": "json",
            "formatversion": "2"
        }, timeout=TIMEOUT, headers={"User-Agent": "MedConsentApp/1.0"})

        if res.status_code != 200:
            print(f"  ⚠️ Wikimedia: HTTP {res.status_code}")
            return []

        data = res.json()
        images = []
        for item in data.get("query", {}).get("search", []):
            title = item.get("title", "")
            images.append({
                "title": title.replace("File:", ""),
                "url": f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}",
                "thumbnail": "",
                "source": "Wikimedia Commons"
            })

        _cache_set(cache_key, "image", images)
        print(f"  🖼️ Wikimedia: {len(images)} images found")
        return images
    except Exception as e:
        print(f"  ⚠️ Wikimedia error: {e}")
        return []


def enrich_media(procedure: str) -> dict:
    """Get all media for a procedure."""
    print(f"🎨 Enriching media: {procedure}")

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=3) as executor:
        videos = executor.submit(search_youtube, procedure, 3).result()
        openverse = executor.submit(search_openverse, procedure, 4).result()
        wikimedia = executor.submit(search_wikimedia_images, procedure, 3).result()

    all_images = openverse + wikimedia
    print(f"  ✅ Media: {len(videos)} videos, {len(all_images)} images")

    return {"videos": videos, "images": all_images}
