import asyncio
import httpx
import json
import math
import os
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from cachetools import TTLCache
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()

app = FastAPI(title="Video Discovery & Ranking Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_STATS_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_COMMENTS_URL = "https://www.googleapis.com/youtube/v3/commentThreads"
RYD_API_URL = "https://returnyoutubedislikeapi.com/votes"
GOOGLE_SUGGEST_URL = "https://suggestqueries.google.com/complete/search"

query_cache = TTLCache(maxsize=200, ttl=1800)
suggest_cache = TTLCache(maxsize=500, ttl=3600)
analyzer = SentimentIntensityAnalyzer()

class RankedVideo(BaseModel):
    video_id: str
    title: str
    channel_title: str
    published_at: str
    language: str
    views: int
    likes: int
    dislikes: int
    duration_sec: int
    duration_formatted: str
    is_short: bool
    topics_covered: List[str]
    positive_feedback_pct: float
    relevance_score: float
    comment_score: float
    composite_score: float
    reason: str
    pros: List[str]
    cons: List[str]
    breakdown: Dict[str, float]

class RankResponse(BaseModel):
    videos: List[RankedVideo]
    next_page_token: Optional[str]

def parse_duration(pt_str: str) -> int:
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', pt_str)
    if not match:
        return 0
    h, m, s = match.groups()
    return int(h or 0) * 3600 + int(m or 0) * 60 + int(s or 0)

def format_duration(seconds: int) -> str:
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def calc_relevance(query: str, title: str, desc: str, tags: List[str]) -> float:
    q_tokens = set(re.findall(r'\w+', query.lower()))
    if not q_tokens:
        return 0.0

    def overlap(text: str) -> float:
        if not text:
            return 0.0
        text_tokens = set(re.findall(r'\w+', text.lower()))
        if not text_tokens:
            return 0.0
        return (len(q_tokens.intersection(text_tokens)) / len(q_tokens)) * 100.0

    T = overlap(title)
    D = overlap(desc)
    G = overlap(" ".join(tags))
    if not tags:
        return (0.70 * T) + (0.30 * D)
    return (0.60 * T) + (0.25 * D) + (0.15 * G)

async def fetch_search_results(query: str, page_token: Optional[str], client: httpx.AsyncClient) -> tuple:
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 15,
        "key": YOUTUBE_API_KEY
    }
    if page_token:
        params["pageToken"] = page_token
    response = await client.get(YOUTUBE_SEARCH_URL, params=params, timeout=10.0)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="YouTube API error or quota exceeded.")
    data = response.json()
    results = {}
    for item in data.get("items", []):
        vid = item.get("id", {}).get("videoId")
        if vid:
            results[vid] = {
                "id": vid,
                "channel": item.get("snippet", {}).get("channelTitle", "Unknown Channel")
            }
    return list(results.values()), data.get("nextPageToken")

async def fetch_video_details(video_ids: List[str], client: httpx.AsyncClient) -> dict:
    params = {
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids),
        "key": YOUTUBE_API_KEY
    }
    response = await client.get(YOUTUBE_STATS_URL, params=params, timeout=10.0)
    details = {}
    for item in response.json().get("items", []):
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content = item.get("contentDetails", {})
        details[item["id"]] = {
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "tags": snippet.get("tags", [])[:5],
            "publishedAt": snippet.get("publishedAt", ""),
            "language": snippet.get("defaultAudioLanguage", snippet.get("defaultLanguage", "en")),
            "views": int(stats.get("viewCount", 0)),
            "likes": int(stats.get("likeCount", 0)),
            "commentCount": int(stats.get("commentCount", 0)),
            "duration_sec": parse_duration(content.get("duration", "PT0S"))
        }
    return details

async def fetch_ryd_dislikes(video_id: str, client: httpx.AsyncClient) -> dict:
    try:
        res = await client.get(f"{RYD_API_URL}?videoId={video_id}", timeout=5.0)
        if res.status_code == 200:
            return {"id": video_id, "dislikes": res.json().get("dislikes", 0)}
    except Exception:
        pass
    return {"id": video_id, "dislikes": 0}

async def analyze_comments(video_id: str, client: httpx.AsyncClient) -> dict:
    params = {
        "part": "snippet",
        "videoId": video_id,
        "maxResults": 25,
        "order": "relevance",
        "key": YOUTUBE_API_KEY
    }
    try:
        res = await client.get(YOUTUBE_COMMENTS_URL, params=params, timeout=6.0)
        if res.status_code != 200:
            return {"id": video_id, "H": 50.0, "S": 50.0, "pros": [], "cons": []}

        total_weight, weighted_sentiment, weighted_quality = 0.0, 0.0, 0.0
        pros, cons = [], []
        quality_words = [
            "explain", "clear", "understand", "learned", "helped", "easy",
            "great", "amazing", "good", "best", "love", "helpful", "awesome",
            "intuitive", "concise", "masterpiece", "detailed"
        ]

        for item in res.json().get("items", []):
            snippet = item["snippet"]["topLevelComment"]["snippet"]
            text = snippet.get("textOriginal", "")
            likes = int(snippet.get("likeCount", 0))

            compound = analyzer.polarity_scores(text)['compound']
            sentiment_100 = ((compound + 1) / 2) * 100.0
            has_quality = any(w in text.lower() for w in quality_words)
            quality_score = 100.0 if has_quality else 50.0

            weight = math.log(math.e + likes)
            weighted_sentiment += sentiment_100 * weight
            weighted_quality += quality_score * weight
            total_weight += weight

            if likes >= 3:
                if compound > 0.6 and len(pros) < 2:
                    pros.append("Praised for clarity & depth")
                elif compound < -0.4 and len(cons) < 2:
                    cons.append("Mixed or critical viewer notes")

        if total_weight == 0:
            return {"id": video_id, "H": 50.0, "S": 50.0, "pros": [], "cons": []}

        return {
            "id": video_id,
            "H": weighted_quality / total_weight,
            "S": weighted_sentiment / total_weight,
            "pros": list(set(pros)),
            "cons": list(set(cons))
        }
    except Exception:
        return {"id": video_id, "H": 50.0, "S": 50.0, "pros": [], "cons": []}

def calculate_composite(vid: str, channel: str, details: dict, comment_data: dict, dislikes: int, query: str) -> RankedVideo:
    views = details["views"]
    duration = details["duration_sec"]

    R = calc_relevance(query, details["title"], details["description"], details["tags"])
    C = (0.60 * comment_data["H"]) + (0.40 * comment_data["S"])
    L = min(100.0, ((details["likes"] + 50) / (views + 1000)) * 10000)
    D = 100.0 - min(100.0, ((dislikes + 50) / (views + 1000)) * 10000)
    N = min(100.0, ((details["commentCount"] + 10) / (views + 1000)) * 50000)
    G = 100.0 if "en" in details["language"].lower() else 60.0

    try:
        pub_date = datetime.fromisoformat(details["publishedAt"].replace("Z", "+00:00"))
        age_days = max(1, (datetime.now(timezone.utc) - pub_date).days)
    except Exception:
        age_days = 365

    V = min(100.0, (math.log(1 + (views / age_days)) / 10) * 100)
    F = 100.0 * math.exp(-0.0008 * age_days)

    score = (0.40 * R) + (0.20 * C) + (0.10 * L) + (0.10 * D) + (0.10 * N) + (0.05 * G) + (0.03 * V) + (0.02 * F)

    breakdown = {
        "Relevance": round(R, 1),
        "Quality & Sentiment": round(C, 1),
        "Like Ratio": round(L, 1),
        "Low Dislike Score": round(D, 1),
        "Engagement": round(N, 1),
        "Language Fit": round(G, 1),
        "View Velocity": round(V, 1),
        "Freshness": round(F, 1)
    }

    if R >= 75 and C >= 75:
        reason = "Strong topic match & high learner satisfaction"
    elif R >= 75:
        reason = "Strong topic match"
    elif comment_data["S"] >= 80:
        reason = "Overwhelmingly positive viewer sentiment"
    elif L >= 80:
        reason = "Exceptional like-to-view ratio"
    else:
        reason = "Balanced community engagement"

    return RankedVideo(
        video_id=vid,
        title=details["title"],
        channel_title=channel,
        published_at=details["publishedAt"],
        language=details["language"],
        views=views,
        likes=details["likes"],
        dislikes=dislikes,
        duration_sec=duration,
        duration_formatted=format_duration(duration),
        is_short=(duration <= 60),
        topics_covered=details["tags"],
        positive_feedback_pct=round(comment_data["S"], 1),
        relevance_score=round(R, 1),
        comment_score=round(C, 1),
        composite_score=round(min(100.0, score), 1),
        reason=reason,
        pros=comment_data.get("pros", []),
        cons=comment_data.get("cons", []),
        breakdown=breakdown
    )

@app.get("/api/suggest", response_model=List[str])
async def suggest_queries(q: str):
    clean_q = q.strip().lower()
    if not clean_q:
        return []
    if clean_q in suggest_cache:
        return suggest_cache[clean_q]

    params = {"client": "firefox", "ds": "yt", "q": clean_q}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(GOOGLE_SUGGEST_URL, params=params, timeout=3.0)
            if res.status_code == 200:
                data = json.loads(res.text)
                if isinstance(data, list) and len(data) > 1:
                    suggestions = [str(item) for item in data[1][:7]]
                    suggest_cache[clean_q] = suggestions
                    return suggestions
    except Exception:
        pass

    fallback = [
        f"{clean_q} tutorial",
        f"{clean_q} full course",
        f"{clean_q} explained simply",
        f"{clean_q} lecture",
        f"{clean_q} for beginners"
    ]
    return fallback

@app.get("/api/rank", response_model=RankResponse)
async def get_ranked_videos(query: str, page_token: Optional[str] = None):
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=401, detail="YOUTUBE_API_KEY missing in backend/.env")

    cache_key = f"{query.lower().strip()}_{page_token}"
    if cache_key in query_cache:
        return query_cache[cache_key]

    async with httpx.AsyncClient() as client:
        search_results, next_token = await fetch_search_results(query, page_token, client)
        if not search_results:
            return RankResponse(videos=[], next_page_token=None)

        video_ids = [v["id"] for v in search_results]
        details_map, *external = await asyncio.gather(
            fetch_video_details(video_ids, client),
            *[fetch_ryd_dislikes(vid, client) for vid in video_ids],
            *[analyze_comments(vid, client) for vid in video_ids]
        )

        ryd_results = external[:len(video_ids)]
        comment_results = external[len(video_ids):]

        ranked = []
        for v in search_results:
            vid = v["id"]
            if vid not in details_map:
                continue
            dislike = next((r["dislikes"] for r in ryd_results if r["id"] == vid), 0)
            c_data = next((c for c in comment_results if c["id"] == vid), {"H": 50.0, "S": 50.0, "pros": [], "cons": []})
            ranked.append(calculate_composite(vid, v["channel"], details_map[vid], c_data, dislike, query))

        ranked.sort(key=lambda x: x.composite_score, reverse=True)
        resp = RankResponse(videos=ranked, next_page_token=next_token)
        query_cache[cache_key] = resp
        return resp