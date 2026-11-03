import { useState } from 'react';

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState("composite");

  const quickTopics = [
    "Machine Learning Course",
    "System Design Roadmap",
    "FastAPI Tutorial",
    "React 19 Tutorial"
  ];

  const handleSearch = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const targetQuery = directQuery || query;
    if (!targetQuery.trim()) return;

    if (directQuery) setQuery(directQuery);

    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`http://localhost:8000/api/rank?query=${encodeURIComponent(targetQuery)}`);
      if (response.status === 401) {
        throw new Error("Missing YouTube API Key. Add YOUTUBE_API_KEY to backend/.env and restart backend.");
      }
      if (!response.ok) throw new Error("Failed to rank videos. Check backend terminal for details.");
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortMode === "sentiment") return b.sentiment_score - a.sentiment_score;
    if (sortMode === "views") return b.views - a.views;
    return b.composite_score - a.composite_score;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Rank YouTube by <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">True Satisfaction</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Bypass clickbait and view counts. Ranked with Return YouTube Dislikes, engagement math, and VADER comment sentiment.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'Machine Learning Course'..."
            className="flex-1 px-5 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-xl font-bold hover:opacity-95 transition disabled:opacity-50 text-white shrink-0 shadow-lg shadow-purple-900/20"
          >
            {loading ? "Analyzing..." : "Rank Videos ⚡"}
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <span className="text-xs text-slate-500 self-center mr-1">Suggestions:</span>
          {quickTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => handleSearch(null, topic)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg transition"
            >
              {topic}
            </button>
          ))}
        </div>

        {error && (
          <div className="max-w-3xl mx-auto bg-amber-950/40 border border-amber-800/60 text-amber-200 p-4 rounded-xl mb-8 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-sm">{error}</div>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <div className="text-sm text-slate-400">Showing <span className="text-white font-semibold">{results.length}</span> ranked videos</div>
            <div className="flex gap-2">
              <button onClick={() => setSortMode("composite")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sortMode === 'composite' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Overall Rank</button>
              <button onClick={() => setSortMode("sentiment")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sortMode === 'sentiment' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Top Sentiment</button>
              <button onClick={() => setSortMode("views")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sortMode === 'views' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Most Viewed</button>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 animate-pulse flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-60 h-36 bg-slate-800 rounded-xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {sortedResults.map((video, idx) => (
              <div key={video.video_id} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition p-5 rounded-2xl flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                
                <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noreferrer" className="relative group shrink-0 w-full lg:w-64 overflow-hidden rounded-xl">
                  <img 
                    src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} 
                    alt={video.title} 
                    className="w-full h-auto object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">Watch on YouTube ↗</span>
                  </div>
                </a>

                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${idx === 0 ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                      #{idx + 1}
                    </span>
                    <h2 className="text-lg font-bold text-slate-100 line-clamp-2">{video.title}</h2>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 my-3">
                    <span>👁️ {video.views.toLocaleString()} views</span>
                    <span className="text-emerald-400">👍 {video.likes.toLocaleString()}</span>
                    <span className="text-rose-400">👎 {video.dislikes.toLocaleString()} hidden dislikes</span>
                    <span className="text-cyan-300">💬 {video.sentiment_score}% Positive Consensus</span>
                  </div>

                  {(video.pros.length > 0 || video.cons.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {video.pros.map((pro, i) => (
                        <span key={i} className="text-[11px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-2 py-0.5 rounded-md">
                          ✨ {pro}
                        </span>
                      ))}
                      {video.cons.map((con, i) => (
                        <span key={i} className="text-[11px] bg-rose-950/60 border border-rose-800/40 text-rose-300 px-2 py-0.5 rounded-md">
                          ⚠️ {con}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center min-w-[130px] w-full lg:w-auto shrink-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Rank Score</div>
                  <div className="text-3xl font-black text-purple-400">{video.composite_score}</div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}