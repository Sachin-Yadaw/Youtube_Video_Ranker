import asyncio
import httpx
import math
import os
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
    bayesian_ratio: float
    engagement_rate: float
    sentiment_score: float
    composite_score: float
    pros: List[str]
    cons: List[str]

async def fetch_search_results(query: str, client: httpx.AsyncClient) -> List[dict]:
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 12,
        "key": YOUTUBE_API_KEY
    }
    response = await client.get(YOUTUBE_SEARCH_URL, params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="YouTube API error or invalid API key.")
    
    unique_items = {}
    for item in response.json().get("items", []):
        vid = item["id"]["videoId"]
        unique_items[vid] = {"id": vid, "title": item["snippet"]["title"]}
    return list(unique_items.values())

async def fetch_official_stats(video_ids: List[str], client: httpx.AsyncClient) -> dict:
    params = {"part": "statistics", "id": ",".join(video_ids), "key": YOUTUBE_API_KEY}
    response = await client.get(YOUTUBE_STATS_URL, params=params)
    stats = {}
    for item in response.json().get("items", []):
        stats[item["id"]] = {
            "views": int(item["statistics"].get("viewCount", 0)),
            "likes": int(item["statistics"].get("likeCount", 0))
        }
    return stats

async def fetch_ryd_dislikes(video_id: str, client: httpx.AsyncClient) -> dict:
    try:
        response = await client.get(f"{RYD_API_URL}?videoId={video_id}", timeout=5.0)
        if response.status_code == 200:
            return {"id": video_id, "dislikes": response.json().get("dislikes", 0)}
    except Exception:
        pass
    return {"id": video_id, "dislikes": 0}

async def analyze_comments(video_id: str, client: httpx.AsyncClient) -> dict:
    params = {
        "part": "snippet",
        "videoId": video_id,
        "maxResults": 20,
        "order": "relevance",
        "key": YOUTUBE_API_KEY
    }
    try:
        response = await client.get(YOUTUBE_COMMENTS_URL, params=params, timeout=5.0)
        if response.status_code != 200:
            return {"id": video_id, "sentiment_score": 50.0, "pros": [], "cons": []}
            
        comments = response.json().get("items", [])
        total_weight = 0.0
        weighted_sentiment = 0.0
        pros, cons = [], []
        
        for item in comments:
            top_comment = item["snippet"]["topLevelComment"]["snippet"]
            text = top_comment.get("textOriginal", "")
            likes = int(top_comment.get("likeCount", 0))
            
            compound = analyzer.polarity_scores(text)['compound']
            weight = math.log(math.e + likes)
            weighted_sentiment += (compound * weight)
            total_weight += weight
            
            if likes >= 3:
                if compound >= 0.5 and len(pros) < 2:
                    pros.append("High praise from viewers")
                elif compound <= -0.3 and len(cons) < 2:
                    cons.append("Viewer concerns noted")
                    
        if total_weight == 0:
            return {"id": video_id, "sentiment_score": 50.0, "pros": [], "cons": []}
            
        final_sentiment = ((weighted_sentiment / total_weight) + 1) / 2 * 100
        return {
            "id": video_id,
            "sentiment_score": final_sentiment,
            "pros": list(set(pros)),
            "cons": list(set(cons))
        }
    except Exception:
        return {"id": video_id, "sentiment_score": 50.0, "pros": [], "cons": []}

def calculate_composite(data: dict) -> RankedVideo:
    views, likes, dislikes = data["views"], data["likes"], data["dislikes"]
    sentiment = data["sentiment_score"]
    
    C, m = 50, 0.95
    total_votes = likes + dislikes
    bayesian_ratio = (likes + (C * m)) / (total_votes + C) if total_votes > 0 else 0.0
    engagement_rate = math.log(1 + likes) / math.log(1 + views) if views > 0 else 0.0
    
    score = (0.45 * bayesian_ratio * 100) + (0.25 * engagement_rate * 100) + (0.30 * sentiment)
    
    return RankedVideo(
        video_id=data["id"],
        title=data["title"],
        views=views,
        likes=likes,
        dislikes=dislikes,
        bayesian_ratio=round(bayesian_ratio, 4),
        engagement_rate=round(engagement_rate, 4),
        sentiment_score=round(sentiment, 1),
        composite_score=round(min(100.0, score), 1),
        pros=data["pros"],
        cons=data["cons"]
    )

@app.get("/api/rank", response_model=List[RankedVideo])
async def get_ranked_videos(query: str):
    cache_key = query.lower().strip()
    if cache_key in query_cache:
        return query_cache[cache_key]
        
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=401, detail="YOUTUBE_API_KEY missing in backend/.env")

    async with httpx.AsyncClient() as client:
        search_results = await fetch_search_results(query, client)
        if not search_results:
            return []
            
        video_ids = [v["id"] for v in search_results]
        
        stats_task = fetch_official_stats(video_ids, client)
        ryd_tasks = [fetch_ryd_dislikes(vid, client) for vid in video_ids]
        comment_tasks = [analyze_comments(vid, client) for vid in video_ids]
        
        official_stats, *external_results = await asyncio.gather(
            stats_task, *ryd_tasks, *comment_tasks
        )
        
        ryd_results = external_results[:len(video_ids)]
        comment_results = external_results[len(video_ids):]
        
        merged_data = []
        for v in search_results:
            vid = v["id"]
            stat = official_stats.get(vid, {"views": 0, "likes": 0})
            dislike = next((r["dislikes"] for r in ryd_results if r["id"] == vid), 0)
            comment = next((r for r in comment_results if r["id"] == vid), {"sentiment_score": 50.0, "pros": [], "cons": []})
            
            merged_data.append({
                "id": vid,
                "title": v["title"],
                "views": stat["views"],
                "likes": stat["likes"],
                "dislikes": dislike,
                "sentiment_score": comment["sentiment_score"],
                "pros": comment["pros"],
                "cons": comment["cons"]
            })
            
        ranked = [calculate_composite(data) for data in merged_data]
        ranked.sort(key=lambda x: x.composite_score, reverse=True)
        query_cache[cache_key] = ranked
        return ranked