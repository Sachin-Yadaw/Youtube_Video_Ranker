import asyncio
import httpx
import math
import os
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from cachetools import TTLCache
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()

app = FastAPI(title="The Honest YouTube Ranker")

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

query_cache = TTLCache(maxsize=100, ttl=1800)
analyzer = SentimentIntensityAnalyzer()

class RankedVideo(BaseModel):
    video_id: str
    title: str
    views: int
    likes: int
    dislikes: int
    duration_formatted: str
    is_short: bool
    summary_phrase: str
    relevance_score: float
    comment_score: float
    composite_score: float
    pros: List[str]
    cons: List[str]

def parse_duration(pt_str: str) -> int:
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', pt_str)
    if not match: return 0
    h, m, s = match.groups()
    return int(h or 0) * 3600 + int(m or 0) * 60 + int(s or 0)

def format_duration(seconds: int) -> str:
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0: return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def calc_relevance(query: str, title: str, desc: str, tags: List[str]) -> float:
    q_tokens = set(query.lower().split())
    if not q_tokens: return 0.0
    
    def overlap(text: str) -> float:
        if not text: return 0.0
        text_tokens = set(text.lower().split())
        if not text_tokens: return 0.0
        return (len(q_tokens.intersection(text_tokens)) / len(q_tokens)) * 100

    T = overlap(title)
    D = overlap(desc)
    G = overlap(" ".join(tags))
    
    return (0.60 * T) + (0.25 * D) + (0.15 * G)

async def fetch_search_results(query: str, client: httpx.AsyncClient) -> List[dict]:
    params = {"part": "snippet", "q": query, "type": "video", "maxResults": 15, "key": YOUTUBE_API_KEY}
    response = await client.get(YOUTUBE_SEARCH_URL, params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="YouTube API error.")
    
    results = {}
    for item in response.json().get("items", []):
        vid = item["id"]["videoId"]
        results[vid] = {"id": vid}
    return list(results.values())

async def fetch_video_details(video_ids: List[str], client: httpx.AsyncClient) -> dict:
    params = {"part": "snippet,contentDetails,statistics", "id": ",".join(video_ids), "key": YOUTUBE_API_KEY}
    response = await client.get(YOUTUBE_STATS_URL, params=params)
    
    details = {}
    for item in response.json().get("items", []):
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content = item.get("contentDetails", {})
        
        details[item["id"]] = {
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "tags": snippet.get("tags", []),
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
        response = await client.get(f"{RYD_API_URL}?videoId={video_id}", timeout=5.0)
        if response.status_code == 200:
            return {"id": video_id, "dislikes": response.json().get("dislikes", 0)}
    except Exception:
        pass
    return {"id": video_id, "dislikes": 0}

async def analyze_comments(video_id: str, client: httpx.AsyncClient) -> dict:
    params = {"part": "snippet", "videoId": video_id, "maxResults": 20, "order": "relevance", "key": YOUTUBE_API_KEY}
    try:
        response = await client.get(YOUTUBE_COMMENTS_URL, params=params, timeout=5.0)
        if response.status_code != 200:
            return {"id": video_id, "H": 50, "S": 50, "summary": "", "pros": [], "cons": []}
            
        comments = response.json().get("items", [])
        total_weight, weighted_sentiment, weighted_edu = 0.0, 0.0, 0.0
        pros, cons, candidates = [], [], []
        learning_words = ["explain", "clear", "understand", "learned", "helped", "easy", "thank", "concept"]
        
        for item in comments:
            text = item["snippet"]["topLevelComment"]["snippet"].get("textOriginal", "")
            likes = int(item["snippet"]["topLevelComment"]["snippet"].get("likeCount", 0))
            
            compound = analyzer.polarity_scores(text)['compound']
            sentiment_100 = ((compound + 1) / 2) * 100 
            edu_score = 100 if any(w in text.lower() for w in learning_words) else 50
            
            weight = math.log(math.e + likes)
            weighted_sentiment += (sentiment_100 * weight)
            weighted_edu += (edu_score * weight)
            total_weight += weight
            
            # Phrase Extraction
            if likes >= 2 and compound >= 0.5 and edu_score == 100:
                clean_text = text.replace('\n', ' ').strip()
                if len(clean_text) < 100: candidates.append(clean_text)
                    
            # Pros/Cons Extraction
            if likes > 5:
                if compound > 0.6 and len(pros) < 2: pros.append("Highly praised explanation")
                elif compound < -0.4 and len(cons) < 2: cons.append("Viewers found it confusing")

        if total_weight == 0:
            return {"id": video_id, "H": 50, "S": 50, "summary": "", "pros": [], "cons": []}
            
        best_summary = f"Viewer says: '{sorted(candidates, key=len)[0]}'" if candidates else "Highly educational feedback"
            
        return {
            "id": video_id,
            "H": weighted_edu / total_weight,
            "S": weighted_sentiment / total_weight,
            "summary": best_summary,
            "pros": list(set(pros)),
            "cons": list(set(cons))
        }
    except Exception:
        return {"id": video_id, "H": 50, "S": 50, "summary": "", "pros": [], "cons": []}

def calculate_composite(vid: str, details: dict, comment_data: dict, dislikes: int, query: str) -> RankedVideo:
    views = details["views"]
    
    # 1. Relevance (40%)
    R = calc_relevance(query, details["title"], details["description"], details["tags"])
    
    # 2. Comment Quality (20%)
    C = (0.60 * comment_data["H"]) + (0.40 * comment_data["S"])
    
    # 3. Like Rate (10%)
    L = min(100.0, ((details["likes"] + 50) / (views + 1000)) * 10000)
    
    # 4. Dislike Penalty Rate (10%) - Reverse score
    dislike_rate = min(100.0, ((dislikes + 50) / (views + 1000)) * 10000)
    D = 100.0 - dislike_rate 
    
    # 5. Normalized Engagement (10%)
    N = min(100.0, ((details["commentCount"] + 10) / (views + 1000)) * 50000)
    
    # 6. Language Suitability (5%)
    G = 100.0 if "en" in details["language"].lower() else 50.0
    
    # Time Data
    try:
        pub_date = datetime.fromisoformat(details["publishedAt"].replace("Z", "+00:00"))
        age_days = max(1, (datetime.now(timezone.utc) - pub_date).days)
    except:
        age_days = 365

    # 7. Age-Adjusted Views (3%)
    velocity = views / age_days
    V = min(100.0, (math.log(1 + velocity) / 10) * 100)
    
    # 8. Freshness (2%)
    F = 100 * math.exp(-0.001 * age_days)
    
    # Extended Formula
    score = (0.40 * R) + (0.20 * C) + (0.10 * L) + (0.10 * D) + (0.10 * N) + (0.05 * G) + (0.03 * V) + (0.02 * F)
    
    return RankedVideo(
        video_id=vid,
        title=details["title"],
        views=views,
        likes=details["likes"],
        dislikes=dislikes,
        duration_formatted=format_duration(details["duration_sec"]),
        is_short=(details["duration_sec"] <= 120),
        summary_phrase=comment_data["summary"],
        relevance_score=round(R, 1),
        comment_score=round(C, 1),
        composite_score=round(min(100.0, score), 1),
        pros=comment_data["pros"],
        cons=comment_data["cons"]
    )

@app.get("/api/rank", response_model=List[RankedVideo])
async def get_ranked_videos(query: str):
    cache_key = query.lower().strip()
    if cache_key in query_cache:
        return query_cache[cache_key]

    async with httpx.AsyncClient() as client:
        search_results = await fetch_search_results(query, client)
        if not search_results: return []
            
        video_ids = [v["id"] for v in search_results]
        
        details_task = fetch_video_details(video_ids, client)
        ryd_tasks = [fetch_ryd_dislikes(vid, client) for vid in video_ids]
        comment_tasks = [analyze_comments(vid, client) for vid in video_ids]
        
        details_map, *external_results = await asyncio.gather(details_task, *ryd_tasks, *comment_tasks)
        
        ryd_results = external_results[:len(video_ids)]
        comment_results = external_results[len(video_ids):]
        
        ranked = []
        for vid in video_ids:
            if vid not in details_map: continue
            dislike = next((r["dislikes"] for r in ryd_results if r["id"] == vid), 0)
            c_data = next((c for c in comment_results if c["id"] == vid), {"H":50, "S":50, "summary":"", "pros":[], "cons":[]})
            
            ranked.append(calculate_composite(vid, details_map[vid], c_data, dislike, query))
            
        ranked.sort(key=lambda x: x.composite_score, reverse=True)
        query_cache[cache_key] = ranked
        return ranked