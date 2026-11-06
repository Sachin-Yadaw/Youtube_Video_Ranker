import { useState } from 'react';

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoType, setVideoType] = useState("long"); 
  const [sortMode, setSortMode] = useState("composite");

  const handleSearch = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const targetQuery = directQuery || query;
    if (!targetQuery.trim()) return;

    if (directQuery) setQuery(directQuery);
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`http://localhost:8000/api/rank?query=${encodeURIComponent(targetQuery)}`);
      if (!response.ok) throw new Error("Failed to rank videos.");
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(v => videoType === "short" ? v.is_short : !v.is_short);
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortMode === "sentiment") return b.comment_score - a.comment_score;
    if (sortMode === "views") return b.views - a.views;
    return b.composite_score - a.composite_score;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Youtube <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Video Ranker</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Ranked by usefulness, language suitability, hidden dislikes, and real feedback.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 mb-10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'Linear Regression in Machine Learning'..."
            className="flex-1 px-5 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button type="submit" disabled={loading} className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-xl font-bold hover:opacity-95 text-white">
            {loading ? "Analyzing..." : "Rank Videos ⚡"}
          </button>
        </form>

        {results.length > 0 && !loading && (
          <>
            {/* Category Tabs */}
            <div className="flex justify-center gap-4 mb-6">
              <button onClick={() => setVideoType("long")} className={`px-6 py-2 rounded-full font-bold transition ${videoType === "long" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                Detailed Lectures
              </button>
              <button onClick={() => setVideoType("short")} className={`px-6 py-2 rounded-full font-bold transition ${videoType === "short" ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                Shorts (&lt; 60s)
              </button>
            </div>

            {/* Sorting Controls */}
            <div className="flex justify-end gap-2 mb-6 border-b border-slate-800 pb-4">
              <button onClick={() => setSortMode("composite")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sortMode === 'composite' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Overall Rank</button>
              <button onClick={() => setSortMode("sentiment")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sortMode === 'sentiment' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Top Edu Quality</button>
              <button onClick={() => setSortMode("views")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sortMode === 'views' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Most Viewed</button>
            </div>
          </>
        )}

        {loading && <div className="text-center text-purple-400 animate-pulse">Running NLP and fetching data...</div>}

        {!loading && (
          <div className="space-y-4">
            {sortedResults.length === 0 && results.length > 0 && (
              <div className="text-center text-slate-500 py-10">No {videoType} videos found for this search.</div>
            )}
            
            {sortedResults.map((video, idx) => (
              <div key={video.video_id} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                
                <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noreferrer" className="relative group shrink-0 w-full lg:w-64 overflow-hidden rounded-xl"> <img src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} alt={video.title} className="w-full h-auto object-cover" />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                    {video.duration_formatted}
                  </div>
                </a>

                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded-md text-xs font-extrabold">#{idx + 1}</span>
                    <h2 className="text-lg font-bold text-slate-100 line-clamp-2">{video.title}</h2>
                  </div>

                  {video.summary_phrase && (
                    <div className="my-3 inline-block bg-indigo-950 border border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-lg text-sm italic">
                      💬 "{video.summary_phrase}"
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2 mb-3">
                    <span>👁️ {video.views.toLocaleString()} views</span>
                    <span className="text-emerald-400">👍 {video.likes.toLocaleString()}</span>
                    <span className="text-rose-400">👎 {video.dislikes.toLocaleString()}</span>
                    <span className="text-purple-300">🎯 {video.relevance_score}% Relevance</span>
                    <span className="text-cyan-300">🎓 {video.comment_score}% Edu Quality</span>
                  </div>

                  {/* Restored Pros/Cons */}
                  {(video.pros.length > 0 || video.cons.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {video.pros.map((pro, i) => (
                        <span key={i} className="text-[11px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-2 py-0.5 rounded-md">✨ {pro}</span>
                      ))}
                      {video.cons.map((con, i) => (
                        <span key={i} className="text-[11px] bg-rose-950/60 border border-rose-800/40 text-rose-300 px-2 py-0.5 rounded-md">⚠️ {con}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center min-w-[130px]">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1"> Score</div>
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