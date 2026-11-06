import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Compass, BookOpen, Info, Play, CheckCircle, Clock, Globe,
  Bookmark, BookmarkCheck, BarChart2, ThumbsUp, ThumbsDown, Home as HomeIcon,
  User, Sun, Moon, History, Trash2, Sparkles, TrendingUp, ShieldCheck,
  SlidersHorizontal, FolderPlus, LogOut, Mail, Award, Layers
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- STATIC CURATED DATA FOR HOME & EXPLORE ---
const TRENDING_SUGGESTED_TOPICS = [
  "Neural Networks & Backpropagation",
  "FastAPI Python Full Course",
  "Linear Algebra 3Blue1Brown",
  "System Design Interview Guide",
  "Dynamic Programming Patterns",
  "Quantum Computing Explained",
  "World History Documentary",
  "React 19 & Tailwind CSS"
];

const EXPLORE_CATEGORIES = {
  "Artificial Intelligence": ["Neural Networks", "Large Language Models", "Computer Vision", "Reinforcement Learning"],
  "Programming": ["Python Full Course", "Data Structures & Algorithms", "C++ Memory Management", "Full Stack Web Development"],
  "Mathematics": ["Calculus Integration", "Linear Algebra", "Probability & Statistics", "Discrete Mathematics"],
  "Science": ["Quantum Physics", "Organic Chemistry", "Astrophysics", "Molecular Biology"],
  "Data Science": ["Machine Learning Regression", "SQL Data Analysis", "Pandas & NumPy", "Time Series Forecasting"],
  "Business & Humanities": ["Macroeconomics", "Financial Markets", "World History", "Philosophy & Logic"]
};

const FALLBACK_DICTIONARY = [
  "neural networks", "neural network backpropagation", "neural networks from scratch",
  "machine learning", "machine learning regression", "linear regression", "logistic regression",
  "integration calculus", "integration by parts", "python tutorial", "fastapi tutorial",
  "react tutorial", "system design", "data structures and algorithms", "history of the world",
  "deep learning", "transformers in ai", "computer vision yolo", "sql full course"
];

// --- AUTOCOMPLETE SEARCH BAR COMPONENT ---
const PredictiveSearchBar = ({
  initialQuery = "",
  onSearch,
  loading = false,
  theme = "dark",
  size = "large"
}) => {
  const [inputVal, setInputVal] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputVal(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = inputVal.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/suggest?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setSuggestions(data);
            return;
          }
        }
      } catch {
        // Fallback to local predictive dictionary if backend is offline
      }
      const localMatches = FALLBACK_DICTIONARY.filter(item =>
        item.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 6);
      setSuggestions(localMatches.length > 0 ? localMatches : [`${trimmed} tutorial`, `${trimmed} explained`, `${trimmed} full course`]);
    }, 180);

    return () => clearTimeout(timer);
  }, [inputVal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setShowDropdown(false);
    onSearch(inputVal.trim());
  };

  const handleSelectSuggestion = (text) => {
    setInputVal(text);
    setShowDropdown(false);
    onSearch(text);
  };

  const isDark = theme === "dark";

  return (
    <div ref={wrapperRef} className="relative w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={inputVal}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setInputVal(e.target.value);
              setShowDropdown(true);
            }}
            placeholder="Search any topic: Neural Networks, Regression, Integration, History..."
            className={`w-full pl-12 pr-10 ${size === "large" ? "py-4 text-base" : "py-3 text-sm"} rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              isDark
                ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm"
            }`}
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => { setInputVal(""); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`bg-gradient-to-r from-purple-600 to-pink-600 px-8 ${size === "large" ? "py-4" : "py-3"} rounded-xl font-bold text-white hover:opacity-95 transition disabled:opacity-50 shrink-0 shadow-lg shadow-purple-900/20 cursor-pointer`}
        >
          {loading ? "Analyzing..." : "Rank Videos ⚡"}
        </button>
      </form>

      {/* Autocomplete Predictions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className={`absolute left-0 right-0 sm:right-40 mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-b ${
            isDark ? "bg-slate-950/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
          }`}>
            Suggested Search Predictions
          </div>
          <ul>
            {suggestions.map((item, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition ${
                    isDark ? "hover:bg-slate-800" : "hover:bg-purple-50"
                  }`}
                >
                  <Search size={14} className="text-purple-400 shrink-0" />
                  <span>{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- TOP NAVIGATION BAR ---
const Navigation = ({ activeQuery, user, theme, onToggleTheme }) => {
  const loc = useLocation();
  const isDark = theme === "dark";

  const navItem = (path, icon, label, badge = null) => {
    const isActive = loc.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
          isActive
            ? "bg-purple-600 text-white shadow-sm"
            : isDark
              ? "text-slate-300 hover:text-white hover:bg-slate-800"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
        }`}
      >
        {icon}
        <span>{label}</span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            isActive ? "bg-white text-purple-700" : "bg-purple-500/20 text-purple-400"
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className={`border-b sticky top-0 z-40 backdrop-blur-md px-4 sm:px-8 py-3 transition-colors ${
      isDark ? "border-slate-800 bg-slate-950/85" : "border-slate-200 bg-white/85"
    }`}>
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
        <Link to="/" className="font-black text-xl tracking-tight flex items-center gap-2">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-1.5 rounded-lg text-white">
            <Play size={20} fill="currentColor" />
          </div>
          <span className={isDark ? "text-white" : "text-slate-900"}>
            Video<span className="text-purple-500">Ranker</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {navItem("/", <HomeIcon size={17} />, "Home")}
          {navItem("/search", <Search size={17} />, "Search", activeQuery ? "Active" : null)}
          {navItem("/explore", <Compass size={17} />, "Explore")}
          {navItem("/library", <BookOpen size={17} />, "My Library")}
          {navItem("/how-it-works", <Info size={17} />, "How Ranking Works")}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            title="Toggle Light/Dark Theme"
            className={`p-2 rounded-full border transition cursor-pointer ${
              isDark
                ? "bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800"
                : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            to="/profile"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition ${
              loc.pathname === "/profile"
                ? "border-purple-500 bg-purple-500/10 text-purple-400"
                : isDark
                  ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            <User size={16} className="text-purple-400" />
            <span className="hidden sm:inline">{user ? user.name.split(" ")[0] : "Sign In"}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

// --- 1. HOME PAGE (ALWAYS FRESH LANDING PAGE) ---
const Home = ({ onTriggerSearch, loading, theme }) => {
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const handleHomeSearch = (targetQuery) => {
    onTriggerSearch(targetQuery);
    navigate("/search");
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-8 space-y-20">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-6">
          <Sparkles size={14} /> AI-Powered Video Discovery Engine
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Find Better Videos to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500">
            Learn & Explore Anything
          </span>
        </h1>
        <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          YouTube sorts by watch-time and clickbait. We re-rank videos using semantic query relevance, VADER comment sentiment analysis, hidden dislike ratios, and mathematical engagement depth.
        </p>

        {/* Prominent Predictive Search Bar */}
        <PredictiveSearchBar
          initialQuery=""
          onSearch={handleHomeSearch}
          loading={loading}
          theme={theme}
          size="large"
        />

        {/* Trending & Suggested Quick Topics */}
        <div className="mt-8">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            <TrendingUp size={14} className="text-purple-400" /> Trending & Suggested Searches
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {TRENDING_SUGGESTED_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleHomeSearch(topic)}
                className={`text-xs px-3.5 py-2 rounded-full border font-medium transition cursor-pointer ${
                  isDark
                    ? "bg-slate-900/90 hover:bg-purple-950/60 text-slate-300 hover:text-purple-300 border-slate-800 hover:border-purple-700"
                    : "bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border-slate-200 shadow-2xs"
                }`}
              >
                ⚡ {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Why Popularity != Quality (Platform Highlights) */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Why Raw View Counts Mislead You</h2>
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            A viral video with 2M views can still have outdated code or confusing explanations. Here is how our engine fixes discovery:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 font-bold text-xl">
              🎯
            </div>
            <h3 className="font-bold text-lg mb-2">40% Semantic Relevance</h3>
            <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              We compare your exact search terms against the video Title (60%), Description (25%), and Creator Tags (15%) so broad clickbait never outranks focused tutorials.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 font-bold text-xl">
              🧠
            </div>
            <h3 className="font-bold text-lg mb-2">20% NLP Comment Consensus</h3>
            <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Our VADER sentiment engine evaluates top viewer comments weighted logarithmically by upvotes—distinguishing real learning outcomes from generic praise.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 font-bold text-xl">
              🛡️
            </div>
            <h3 className="font-bold text-lg mb-2">Hidden Dislike & Ratio Math</h3>
            <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              We query the Return YouTube Dislike API concurrently and apply Bayesian smoothing so hidden dislikes penalize low-quality videos fairly.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works in 3 Steps */}
      <div className={`p-8 rounded-3xl border ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-100/80 border-slate-200"}`}>
        <h2 className="text-2xl font-extrabold text-center mb-8">How the Ranking Pipeline Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-4">
            <span className="w-10 h-10 rounded-full bg-purple-600 text-white font-black flex items-center justify-center mb-3">1</span>
            <h4 className="font-bold mb-1">Enter Any Topic or Question</h4>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Use natural language or our live predictive autocomplete to search academic lectures, coding guides, history, or DIY skills.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <span className="w-10 h-10 rounded-full bg-pink-600 text-white font-black flex items-center justify-center mb-3">2</span>
            <h4 className="font-bold mb-1">Concurrent Multi-API Analysis</h4>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Our FastAPI backend fetches YouTube metadata, RYD hidden dislikes, and comment threads simultaneously in milliseconds.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center mb-3">3</span>
            <h4 className="font-bold mb-1">Filter, Compare & Save</h4>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Slice results by granular duration intervals, inspect 8-parameter bar charts, compare videos side-by-side, and save to your library.
            </p>
          </div>
        </div>
      </div>

      {/* Browse Subject Categories */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-extrabold">Explore Popular Subject Domains</h2>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>Click any subtopic to jump straight into ranked results.</p>
          </div>
          <Link to="/explore" className="text-sm font-bold text-purple-400 hover:underline">View All Categories →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(EXPLORE_CATEGORIES).map(([category, items]) => (
            <div key={category} className={`p-5 rounded-2xl border ${isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200 shadow-2xs"}`}>
              <h3 className="font-bold text-base mb-3 text-purple-400">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((sub, i) => (
                  <button
                    key={i}
                    onClick={() => handleHomeSearch(sub)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-purple-500 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-500 hover:text-purple-700"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 2. SEARCH RESULTS PAGE (PRESERVES STATE ACROSS TABS) ---
const SearchResults = ({
  searchState,
  onTriggerSearch,
  onLoadMore,
  onUpdateFilterSort,
  savedLibrary,
  onToggleSave,
  compareList,
  onToggleCompare,
  onClearCompare,
  theme
}) => {
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const {
    query,
    results,
    loading,
    error,
    pageToken,
    videoType,
    sortMode,
    filterDuration,
    filterLang,
    filterDate
  } = searchState;

  // Filter by Detailed vs Shorts (< 60s) and Granular Duration Intervals
  let displayed = results.filter((v) => {
    if (videoType === "short" && !v.is_short) return false;
    if (videoType === "long" && v.is_short) return false;

    // 5-Interval Duration Filtering
    if (filterDuration === "under2" && v.duration_sec >= 120) return false;
    if (filterDuration === "2to5" && (v.duration_sec < 120 || v.duration_sec > 300)) return false;
    if (filterDuration === "5to10" && (v.duration_sec < 300 || v.duration_sec > 600)) return false;
    if (filterDuration === "10to30" && (v.duration_sec < 600 || v.duration_sec > 1800)) return false;
    if (filterDuration === "over30" && v.duration_sec <= 1800) return false;

    if (filterLang === "en" && !v.language.toLowerCase().includes("en")) return false;
    if (filterLang === "hi" && !v.language.toLowerCase().includes("hi")) return false;

    if (filterDate !== "any") {
      const pubTime = new Date(v.published_at).getTime();
      const daysOld = (Date.now() - pubTime) / (1000 * 3600 * 24);
      if (filterDate === "month" && daysOld > 30) return false;
      if (filterDate === "year" && daysOld > 365) return false;
    }
    return true;
  });

  // 6 Sorting Modes
  displayed = [...displayed].sort((a, b) => {
    if (sortMode === "relevance") return b.relevance_score - a.relevance_score;
    if (sortMode === "newest") return new Date(b.published_at) - new Date(a.published_at);
    if (sortMode === "sentiment") return b.positive_feedback_pct - a.positive_feedback_pct;
    if (sortMode === "views") return b.views - a.views;
    if (sortMode === "likes") return b.likes - a.likes;
    return b.composite_score - a.composite_score; // default: Best Overall
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-8">
      {/* Persistent Top Search Bar */}
      <div className="mb-8">
        <PredictiveSearchBar
          initialQuery={query}
          onSearch={(newQ) => onTriggerSearch(newQ)}
          loading={loading}
          theme={theme}
          size="normal"
        />
      </div>

      {/* Empty initial state if user clicked Search tab before searching */}
      {!query && !loading && (
        <div className={`text-center py-16 rounded-2xl border ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"}`}>
          <Search size={40} className="mx-auto text-purple-400 mb-3" />
          <h2 className="text-xl font-bold mb-2">Ready to Rank Videos</h2>
          <p className={`text-sm max-w-md mx-auto mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Type any topic above or pick a popular subject below to run the ranking engine.
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-4">
            {TRENDING_SUGGESTED_TOPICS.slice(0, 6).map((t, idx) => (
              <button
                key={idx}
                onClick={() => onTriggerSearch(t)}
                className="text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full hover:bg-purple-600 hover:text-white transition cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {(query || results.length > 0) && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Filter Sidebar */}
          <div className={`w-full lg:w-64 shrink-0 p-5 rounded-2xl border h-fit space-y-6 ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-2xs"
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-sm flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-purple-400" /> Filters
              </span>
              <button
                onClick={() => onUpdateFilterSort({ filterDuration: "any", filterLang: "any", filterDate: "any", videoType: "long" })}
                className="text-xs text-purple-400 hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Granular Duration Intervals */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Clock size={14} /> Duration Intervals
              </h3>
              <div className="space-y-1.5 text-sm">
                {[
                  { id: "any", label: "Any Duration" },
                  { id: "under2", label: "Less than 2 min (< 2m)" },
                  { id: "2to5", label: "2 to 5 minutes (2m – 5m)" },
                  { id: "5to10", label: "5 to 10 minutes (5m – 10m)" },
                  { id: "10to30", label: "10 to 30 minutes (10m – 30m)" },
                  { id: "over30", label: "Over 30 minutes (> 30m)" }
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="durationInterval"
                      checked={filterDuration === opt.id}
                      onChange={() => onUpdateFilterSort({ filterDuration: opt.id })}
                      className="accent-purple-500"
                    />
                    <span className={filterDuration === opt.id ? "font-bold text-purple-400" : isDark ? "text-slate-300" : "text-slate-700"}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language Suitability Filter */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Globe size={14} /> Audio/Metadata Language
              </h3>
              <select
                value={filterLang}
                onChange={(e) => onUpdateFilterSort({ filterLang: e.target.value })}
                className={`w-full rounded-lg p-2.5 text-sm border ${
                  isDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              >
                <option value="any">All Languages</option>
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
              </select>
            </div>

            {/* Upload Date Filter */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Upload Recency</h3>
              <select
                value={filterDate}
                onChange={(e) => onUpdateFilterSort({ filterDate: e.target.value })}
                className={`w-full rounded-lg p-2.5 text-sm border ${
                  isDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              >
                <option value="any">Any Time</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>
          </div>

          {/* Right Main Video Results List */}
          <div className="flex-1 pb-24">
            {/* Category Tabs (Detailed Videos vs Shorts) & 6 Sorting Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateFilterSort({ videoType: "long" })}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                    videoType === "long"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                      : isDark ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  Detailed Videos ({results.filter(v => !v.is_short).length})
                </button>
                <button
                  onClick={() => onUpdateFilterSort({ videoType: "short" })}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                    videoType === "short"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                      : isDark ? "bg-slate-900 text-slate-400 hover:bg-slate-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  Shorts &lt; 60s ({results.filter(v => v.is_short).length})
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-semibold shrink-0">Sort by:</span>
                <select
                  value={sortMode}
                  onChange={(e) => onUpdateFilterSort({ sortMode: e.target.value })}
                  className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold border ${
                    isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="composite">🏆 Best Overall (Composite Score)</option>
                  <option value="relevance">🎯 Most Relevant (Query Match %)</option>
                  <option value="sentiment">💬 Top Sentiment (% Positive)</option>
                  <option value="views">👁️ Most Viewed</option>
                  <option value="likes">👍 Most Liked</option>
                  <option value="newest">🕒 Recently Uploaded</option>
                </select>
              </div>
            </div>

            <div className="mb-4 text-xs text-slate-400 flex justify-between items-center">
              <span>
                Showing <strong className={isDark ? "text-white" : "text-slate-900"}>{displayed.length}</strong> ranked videos for <strong className="text-purple-400">"{query}"</strong>
              </span>
            </div>

            {/* Ranked Video Cards */}
            <div className="space-y-4">
              {!loading && displayed.length === 0 && (
                <div className={`text-center py-12 rounded-2xl border ${isDark ? "bg-slate-900/30 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                  No videos match the current duration or language filter. Try switching to "Any Duration" or "Detailed Videos".
                </div>
              )}

              {displayed.map((video, idx) => {
                const isSaved = savedLibrary.some((v) => v.video_id === video.video_id);
                const isComparing = compareList.some((v) => v.video_id === video.video_id);

                return (
                  <div
                    key={video.video_id}
                    className={`border p-5 rounded-2xl flex flex-col md:flex-row gap-6 transition ${
                      isDark
                        ? "bg-slate-900/75 border-slate-800 hover:border-slate-700"
                        : "bg-white border-slate-200 hover:border-purple-300 shadow-xs"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => navigate(`/video/${video.video_id}`, { state: { video } })}
                      className="relative shrink-0 w-full md:w-64 rounded-xl overflow-hidden group cursor-pointer self-start"
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-auto object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-bold px-2 py-0.5 rounded">
                        {video.duration_formatted}
                      </div>
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                          Inspect Breakdown →
                        </span>
                      </div>
                    </div>

                    {/* Content & Metrics */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div
                          onClick={() => navigate(`/video/${video.video_id}`, { state: { video } })}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold shrink-0 ${
                            idx === 0 ? "bg-amber-400 text-black" : "bg-purple-600/20 text-purple-400"
                          }`}>
                            #{idx + 1}
                          </span>
                          <h2 className="font-bold text-lg leading-snug line-clamp-2 hover:text-purple-400 transition">
                            {video.title}
                          </h2>
                        </div>
                        <button
                          onClick={() => onToggleSave(video)}
                          title={isSaved ? "Remove from Library" : "Save to My Library"}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 cursor-pointer shrink-0"
                        >
                          {isSaved ? <BookmarkCheck className="text-purple-400" size={20} /> : <Bookmark size={20} />}
                        </button>
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        <span className="font-semibold text-slate-300">{video.channel_title}</span> • Published {new Date(video.published_at).toLocaleDateString()}
                      </div>

                      {/* Evidence-based Reason Badge */}
                      <div className="mt-2.5 inline-flex items-center gap-1.5 bg-purple-950/40 text-purple-300 border border-purple-800/50 px-3 py-1 rounded-md text-xs font-medium">
                        <CheckCircle size={13} className="text-purple-400" /> {video.reason}
                      </div>

                      {/* Topics Covered (Creator Metadata Tags) */}
                      {video.topics_covered && video.topics_covered.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Covers:</span>
                          {video.topics_covered.map((tag, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Key Metrics Bar (With Restored Relevance % & Positive Sentiment %) */}
                      <div className="flex flex-wrap gap-3 text-xs mt-3 pt-3 border-t border-slate-800/60 items-center">
                        <span className="text-slate-400">👁️ {video.views.toLocaleString()}</span>
                        <span className="text-emerald-400 font-medium">👍 {video.likes.toLocaleString()}</span>
                        <span className="text-rose-400 font-medium">👎 {video.dislikes.toLocaleString()}</span>
                        <span className="bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded font-bold">
                          🎯 {video.relevance_score}% Relevance
                        </span>
                        <span className="bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded font-bold">
                          💬 {video.positive_feedback_pct}% Positive
                        </span>

                        <div className="ml-auto flex items-center gap-3">
                          <a
                            href={`https://www.youtube.com/watch?v=${video.video_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-400 hover:underline font-semibold"
                          >
                            Watch ↗
                          </a>
                          <label className="flex items-center gap-1 cursor-pointer text-slate-400 hover:text-purple-300">
                            <input
                              type="checkbox"
                              checked={isComparing}
                              onChange={() => onToggleCompare(video)}
                              disabled={!isComparing && compareList.length >= 3}
                              className="accent-purple-500"
                            />
                            Compare
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Overall Quality Score Box */}
                    <div
                      onClick={() => navigate(`/video/${video.video_id}`, { state: { video } })}
                      className={`border rounded-xl p-4 text-center shrink-0 w-full md:w-32 flex flex-col justify-center cursor-pointer transition ${
                        isDark ? "bg-slate-950 border-slate-800 hover:border-purple-500" : "bg-slate-50 border-slate-200 hover:border-purple-500"
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Quality Score</div>
                      <div className="text-3xl font-black text-purple-400">{video.composite_score}</div>
                      <div className="text-[10px] text-purple-400 mt-1 font-semibold">View Chart →</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {loading && (
              <div className="text-center py-12 text-purple-400 animate-pulse font-bold">
                Fetching candidate videos, hidden dislikes & running VADER sentiment analysis...
              </div>
            )}

            {!loading && pageToken && (
              <button
                onClick={onLoadMore}
                className="w-full py-4 mt-6 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 font-bold text-slate-200 transition cursor-pointer"
              >
                Load More Ranked Videos ↓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Comparison Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-purple-500/40 p-4 flex justify-center items-center gap-4 z-50 shadow-2xl">
          <span className="font-bold text-sm text-slate-200">
            {compareList.length} / 3 videos selected for side-by-side comparison
          </span>
          <button
            onClick={() => navigate("/compare")}
            className="bg-purple-600 px-5 py-2 rounded-lg font-bold text-sm text-white hover:bg-purple-700 cursor-pointer"
          >
            Compare Now
          </button>
          <button onClick={onClearCompare} className="text-slate-400 hover:text-white text-xs cursor-pointer">
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

// --- 3. VIDEO DETAILS & PARAMETER BREAKDOWN PAGE ---
const VideoDetails = ({ onSaveFeedback, userFeedbackMap, savedLibrary, onToggleSave, theme }) => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const video = state?.video;
  const isDark = theme === "dark";

  if (!video) {
    return (
      <div className="text-center py-20">
        <p className="mb-4 text-slate-400">Video details not loaded.</p>
        <button onClick={() => navigate("/search")} className="bg-purple-600 px-5 py-2 rounded-lg font-bold text-white">
          Return to Search
        </button>
      </div>
    );
  }

  const existingFeedback = userFeedbackMap[video.video_id] || {};
  const isSaved = savedLibrary.some((v) => v.video_id === video.video_id);
  const chartData = Object.entries(video.breakdown || {}).map(([name, val]) => ({ name, score: val }));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
      <button onClick={() => navigate(-1)} className="text-sm text-purple-400 font-bold mb-6 hover:underline cursor-pointer">
        ← Back to Search Results
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${video.video_id}`}
              title={video.title}
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="font-semibold text-purple-400">{video.channel_title}</span>
                <span>👁️ {video.views.toLocaleString()} views</span>
                <span className="text-emerald-400">👍 {video.likes.toLocaleString()}</span>
                <span className="text-rose-400">👎 {video.dislikes.toLocaleString()}</span>
                <span>🎯 {video.relevance_score}% Relevance</span>
                <span className="text-cyan-400">💬 {video.positive_feedback_pct}% Positive</span>
              </div>
            </div>
            <button
              onClick={() => onToggleSave(video)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm font-bold hover:border-purple-500 cursor-pointer shrink-0"
            >
              {isSaved ? <BookmarkCheck size={16} className="text-purple-400" /> : <Bookmark size={16} />}
              {isSaved ? "Saved" : "Save"}
            </button>
          </div>

          {/* Learner Feedback Widget */}
          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className="font-bold text-lg mb-1">Submit Learner Feedback</h3>
            <p className="text-xs text-slate-400 mb-4">
              Your feedback is saved to your Profile and helps calibrate personal learning recommendations.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { id: "Helpful", icon: <ThumbsUp size={15} />, label: "Yes, Helpful" },
                { id: "Partially Helpful", icon: <Award size={15} />, label: "Partially Helpful" },
                { id: "Not Helpful", icon: <ThumbsDown size={15} />, label: "Not Helpful" }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => onSaveFeedback(video, btn.id, existingFeedback.difficulty || "Appropriate")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    existingFeedback.rating === btn.id
                      ? "bg-purple-600 text-white border-purple-500"
                      : isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>
            {existingFeedback.rating && (
              <div className="text-xs text-emerald-400 font-semibold">
                ✓ Recorded as "{existingFeedback.rating}". You can review all your rated videos in the Profile tab.
              </div>
            )}
          </div>
        </div>

        {/* Right Parameter Breakdown Sidebar */}
        <div className="w-full lg:w-96 space-y-6">
          <div className={`p-6 rounded-2xl border text-center ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Composite Quality Score</div>
            <div className="text-6xl font-black text-purple-400 my-2">{video.composite_score}</div>
            <div className="text-xs text-purple-300 font-medium">{video.reason}</div>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-purple-400" /> 8-Parameter Score Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 10, left: 35, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={110} />
                  <Tooltip
                    cursor={{ fill: "#1e293b" }}
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                  />
                  <Bar dataKey="score" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Formula: 40% Query Relevance + 20% NLP Comment Quality + 10% Like Ratio + 10% Low-Dislike Score + 10% Engagement + 5% Language + 3% View Velocity + 2% Freshness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. COMPARE VIDEOS PAGE ---
const Compare = ({ compareList, theme }) => {
  const navigate = useNavigate();
  const isDark = theme === "dark";

  if (!compareList || compareList.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">Select up to 3 videos using the "Compare" checkbox on the Search page.</p>
        <button onClick={() => navigate("/search")} className="bg-purple-600 px-5 py-2.5 rounded-xl font-bold text-white cursor-pointer">
          Go to Search
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold">Side-by-Side Video Comparison</h1>
        <button onClick={() => navigate("/search")} className="text-sm text-purple-400 font-bold hover:underline cursor-pointer">
          ← Back to Search Results
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {compareList.map((video) => (
          <div key={video.video_id} className={`rounded-2xl border p-6 flex flex-col ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <img src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} alt={video.title} className="w-full rounded-xl mb-4" />
            <h2 className="font-bold text-base mb-1 line-clamp-2">{video.title}</h2>
            <p className="text-xs text-slate-400 mb-4">{video.channel_title}</p>
            <div className="text-4xl font-black text-purple-400 text-center py-4 border-y border-slate-800 my-2">
              {video.composite_score} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="space-y-2.5 text-xs mt-4">
              <div className="flex justify-between"><span>Relevance Match</span><strong className="text-purple-300">{video.relevance_score}%</strong></div>
              <div className="flex justify-between"><span>Positive Sentiment</span><strong className="text-cyan-400">{video.positive_feedback_pct}%</strong></div>
              <div className="flex justify-between"><span>Duration</span><strong>{video.duration_formatted}</strong></div>
              <div className="flex justify-between"><span>Views</span><strong>{video.views.toLocaleString()}</strong></div>
              <div className="flex justify-between"><span>Likes / Dislikes</span><strong className="text-emerald-400">{video.likes.toLocaleString()} / <span className="text-rose-400">{video.dislikes.toLocaleString()}</span></strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 5. EXPLORE PAGE ---
const Explore = ({ onTriggerSearch, theme }) => {
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const handleTopicClick = (topic) => {
    onTriggerSearch(topic);
    navigate("/search");
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-8">
      <h1 className="text-3xl font-extrabold mb-2">Explore Subject Directories</h1>
      <p className="text-sm text-slate-400 mb-8">Select any curated domain below to immediately rank the best tutorials and lectures.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(EXPLORE_CATEGORIES).map(([subject, topics]) => (
          <div key={subject} className={`rounded-2xl border p-6 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <h2 className="text-lg font-bold text-purple-400 mb-4">{subject}</h2>
            <ul className="space-y-2.5">
              {topics.map((t) => (
                <li key={t}>
                  <button
                    onClick={() => handleTopicClick(t)}
                    className="w-full text-left text-sm text-slate-300 hover:text-purple-400 flex justify-between items-center py-1 group cursor-pointer"
                  >
                    <span>{t}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition text-purple-400 font-bold">Rank →</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 6. MY LIBRARY PAGE (SAVED VIDEOS, COLLECTIONS & SEARCH HISTORY) ---
const Library = ({
  savedLibrary,
  onToggleSave,
  searchHistory,
  onClearHistory,
  onTriggerSearch,
  collections,
  onCreateCollection,
  onAddVideoToCollection,
  theme
}) => {
  const navigate = useNavigate();
  const [newColName, setNewColName] = useState("");
  const isDark = theme === "dark";

  const handleCreateCol = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onCreateCollection(newColName.trim());
    setNewColName("");
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-8 space-y-12">
      {/* Saved Videos Section */}
      <div>
        <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
          <BookmarkCheck className="text-purple-500" /> Saved Videos ({savedLibrary.length})
        </h1>
        <p className="text-sm text-slate-400 mb-6">Videos you bookmarked across your searches are preserved here.</p>

        {savedLibrary.length === 0 ? (
          <div className={`text-center py-12 border border-dashed rounded-2xl ${isDark ? "border-slate-800 text-slate-500" : "border-slate-300 text-slate-500"}`}>
            No saved videos yet. Click the bookmark icon on any ranked video in the Search tab.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedLibrary.map((video) => (
              <div key={video.video_id} className={`rounded-2xl border p-4 flex flex-col justify-between ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <div>
                  <div
                    onClick={() => navigate(`/video/${video.video_id}`, { state: { video } })}
                    className="relative rounded-xl overflow-hidden mb-3 cursor-pointer"
                  >
                    <img src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`} alt={video.title} className="w-full" />
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                      {video.duration_formatted}
                    </span>
                  </div>
                  <h2 className="font-bold text-sm line-clamp-2 mb-1">{video.title}</h2>
                  <p className="text-xs text-slate-400">{video.channel_title}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-purple-400 font-extrabold">Score: {video.composite_score}</span>
                  {collections.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) onAddVideoToCollection(e.target.value, video);
                      }}
                      defaultValue=""
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300"
                    >
                      <option value="" disabled>+ Collection</option>
                      {collections.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => onToggleSave(video)} className="text-rose-400 hover:underline cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom User Collections */}
      <div>
        <h2 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <Layers className="text-purple-400" size={22} /> Custom Study Collections
        </h2>
        <form onSubmit={handleCreateCol} className="flex gap-3 max-w-md mb-6">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="New collection name (e.g., Semester Exams)..."
            className={`flex-1 px-4 py-2 rounded-xl border text-sm ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"}`}
          />
          <button type="submit" className="bg-purple-600 px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 cursor-pointer">
            <FolderPlus size={16} /> Create
          </button>
        </form>
        {collections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map((col) => (
              <div key={col.name} className={`p-4 rounded-xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
                <h3 className="font-bold text-purple-400 mb-2">{col.name} ({col.videos.length} videos)</h3>
                {col.videos.length === 0 ? (
                  <p className="text-xs text-slate-500">Use the "+ Collection" dropdown on any saved video above to add it here.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {col.videos.map((v) => <li key={v.video_id} className="truncate">{v.title}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search History Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <History className="text-purple-400" size={22} /> Your Search History
          </h2>
          {searchHistory.length > 0 && (
            <button onClick={onClearHistory} className="text-xs text-rose-400 flex items-center gap-1 hover:underline cursor-pointer">
              <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>
        {searchHistory.length === 0 ? (
          <p className="text-sm text-slate-500">Your search history is empty.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => { onTriggerSearch(item.query); navigate("/search"); }}
                className={`px-4 py-2 rounded-xl border text-xs flex items-center gap-2 transition cursor-pointer ${
                  isDark ? "bg-slate-900 border-slate-800 hover:border-purple-500 text-slate-200" : "bg-white border-slate-200 hover:border-purple-500"
                }`}
              >
                <span>🕒 {item.query}</span>
                <span className="text-[10px] text-slate-500">{item.time}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 7. PROFILE & GOOGLE ACCOUNT SETTINGS PAGE ---
const Profile = ({
  user,
  onSignIn,
  onSignOut,
  theme,
  onToggleTheme,
  preferredLang,
  onChangeLang,
  searchHistory,
  onClearHistory,
  savedLibrary,
  userFeedbackMap,
  onTriggerSearch
}) => {
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const isDark = theme === "dark";

  const handleGoogleSignIn = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const finalName = nameInput.trim() || emailInput.split("@")[0];
    onSignIn({
      name: finalName,
      email: emailInput.trim().toLowerCase(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=9333ea&color=fff&bold=true`
    });
  };

  const feedbackEntries = Object.entries(userFeedbackMap);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 space-y-8">
      <h1 className="text-3xl font-extrabold">Profile & Account Settings</h1>

      {/* Google Account Authentication Card */}
      <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
        {!user ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Mail className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold">Sign in with your Google / Gmail Account</h2>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Link your Gmail address to persist your Saved Videos, Custom Collections, Search History, and Learner Feedback under your personal profile.
            </p>
            <form onSubmit={handleGoogleSignIn} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your Full Name"
                className={`px-4 py-3 rounded-xl border text-sm ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300"}`}
              />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="yourname@gmail.com"
                className={`px-4 py-3 rounded-xl border text-sm ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300"}`}
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl px-6 py-3 text-sm hover:opacity-95 transition cursor-pointer"
              >
                Continue with Google →
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border-2 border-purple-500" />
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full mb-1">
                  <ShieldCheck size={12} /> Google Profile Active & Synced
                </div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-800/60 bg-rose-950/30 text-rose-300 text-xs font-bold hover:bg-rose-900/50 cursor-pointer"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Preferences: Theme & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <h3 className="font-bold text-base mb-1">Appearance & Theme</h3>
          <p className="text-xs text-slate-400 mb-4">Switch between Dark Slate and Daylight Mode.</p>
          <button
            onClick={onToggleTheme}
            className="w-full py-3 px-4 rounded-xl border border-purple-500/40 bg-purple-600/10 text-purple-400 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            Current: {isDark ? "Dark Slate Mode (Click for Light)" : "Light Mode (Click for Dark)"}
          </button>
        </div>

        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <h3 className="font-bold text-base mb-1">Preferred Lecture Language</h3>
          <p className="text-xs text-slate-400 mb-4">Used as the default filter for Language Suitability (5% weight).</p>
          <select
            value={preferredLang}
            onChange={(e) => onChangeLang(e.target.value)}
            className={`w-full p-3 rounded-xl border text-sm ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300"}`}
          >
            <option value="any">All Languages (No restriction)</option>
            <option value="en">English (en)</option>
            <option value="hi">Hindi (hi)</option>
          </select>
        </div>
      </div>

      {/* Learner Feedback Log */}
      <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <h3 className="font-bold text-lg mb-1">Your Learner Feedback Log ({feedbackEntries.length})</h3>
        <p className="text-xs text-slate-400 mb-4">Videos you rated on the Video Details page appear here.</p>
        {feedbackEntries.length === 0 ? (
          <p className="text-xs text-slate-500">You have not rated any videos yet. Open any video’s detail page to mark it as Helpful or Not Helpful.</p>
        ) : (
          <div className="space-y-2">
            {feedbackEntries.map(([vid, item]) => (
              <div key={vid} className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                <span className="font-medium truncate max-w-md">{item.title}</span>
                <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold">{item.rating}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Activity Summary & Search History */}
      <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-lg">Account Search History ({searchHistory.length})</h3>
            <p className="text-xs text-slate-400">Click any past query to re-open its ranked results.</p>
          </div>
          {searchHistory.length > 0 && (
            <button onClick={onClearHistory} className="text-xs text-rose-400 hover:underline cursor-pointer">
              Clear All History
            </button>
          )}
        </div>
        {searchHistory.length === 0 ? (
          <p className="text-xs text-slate-500">No searches recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((h, i) => (
              <button
                key={i}
                onClick={() => { onTriggerSearch(h.query); navigate("/search"); }}
                className="text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:border-purple-500 cursor-pointer"
              >
                🔍 {h.query} <span className="text-[10px] text-slate-500 ml-1">({h.time})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 8. HOW RANKING WORKS PAGE ---
const HowItWorks = ({ theme }) => {
  const isDark = theme === "dark";
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-8 space-y-6">
      <h1 className="text-3xl font-extrabold mb-2">How the Ranking Algorithm Works</h1>
      <p className="text-sm text-slate-400">
        Our platform evaluates candidate videos on a 0–100 scale using the Extended Public-Data Formula:
      </p>
      {/* <div className={`p-5 rounded-2xl border font-mono text-sm text-purple-400 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        Final Score = 0.40(R) + 0.20(C) + 0.10(L) + 0.10(D) + 0.10(N) + 0.05(G) + 0.03(V) + 0.02(F)
      </div> */}
      <div className="grid grid-cols-1 gap-4 text-sm">
        <div className={`p-5 rounded-xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
          <h3 className="font-bold text-purple-400 mb-1">1. Query Relevance (R — 40%)</h3>
          <p className="text-xs text-slate-400">Measures exact and token overlap across Title (60%), Description (25%), and Tags (15%).</p>
        </div>
        <div className={`p-5 rounded-xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
          <h3 className="font-bold text-purple-400 mb-1">2. Comment Quality & Sentiment (C — 20%)</h3>
          <p className="text-xs text-slate-400">Combines educational/quality keyword detection (60%) with upvote-weighted VADER NLP sentiment (40%).</p>
        </div>
        <div className={`p-5 rounded-xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
          <h3 className="font-bold text-purple-400 mb-1">3. Smoothed Like & Dislike Ratios (L & D — 20%)</h3>
          <p className="text-xs text-slate-400">10% rewards Bayesian-smoothed like-to-view ratios; 10% penalizes hidden dislikes via the RYD API.</p>
        </div>
        <div className={`p-5 rounded-xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
          <h3 className="font-bold text-purple-400 mb-1">4. Engagement, Language, Velocity & Freshness (20%)</h3>
          <p className="text-xs text-slate-400">10% comment interaction rate, 5% language match, 3% age-adjusted view velocity, and 2% recency decay.</p>
        </div>
      </div>
    </div>
  );
};

// --- ROOT APPLICATION (GLOBAL STATE PRESERVATION) ---
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("yt_theme") || "dark");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("yt_user");
    return saved ? JSON.parse(saved) : null;
  });

  const storagePrefix = user ? `yt_${user.email}_` : "yt_guest_";

  const [savedLibrary, setSavedLibrary] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [collections, setCollections] = useState([]);
  const [userFeedbackMap, setUserFeedbackMap] = useState({});
  const [preferredLang, setPreferredLang] = useState("any");
  const [compareList, setCompareList] = useState([]);

  // Persistent Search State (Preserved when switching between Search, Library, Explore, Profile)
  const [searchState, setSearchState] = useState({
    query: "",
    results: [],
    loading: false,
    error: "",
    pageToken: null,
    videoType: "long",
    sortMode: "composite",
    filterDuration: "any",
    filterLang: "any",
    filterDate: "any"
  });

  // Load user-specific data whenever account changes
  useEffect(() => {
    setSavedLibrary(JSON.parse(localStorage.getItem(`${storagePrefix}library`) || "[]"));
    setSearchHistory(JSON.parse(localStorage.getItem(`${storagePrefix}history`) || "[]"));
    setCollections(JSON.parse(localStorage.getItem(`${storagePrefix}collections`) || "[]"));
    setUserFeedbackMap(JSON.parse(localStorage.getItem(`${storagePrefix}feedback`) || "{}"));
  }, [storagePrefix]);

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("yt_theme", next);
  };

  const handleSignIn = (userData) => {
    setUser(userData);
    localStorage.setItem("yt_user", JSON.stringify(userData));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem("yt_user");
  };

  const executeSearch = async (targetQuery, token = null) => {
    const cleanQ = targetQuery.trim();
    if (!cleanQ) return;

    setSearchState((prev) => ({
      ...prev,
      query: cleanQ,
      loading: true,
      error: "",
      results: token ? prev.results : []
    }));

    // Record to Search History
    if (!token) {
      const entry = { query: cleanQ, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      const updatedHistory = [entry, ...searchHistory.filter((h) => h.query.toLowerCase() !== cleanQ.toLowerCase())].slice(0, 15);
      setSearchHistory(updatedHistory);
      localStorage.setItem(`${storagePrefix}history`, JSON.stringify(updatedHistory));
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/rank?query=${encodeURIComponent(cleanQ)}${token ? `&page_token=${token}` : ""}`
      );
      if (!res.ok) throw new Error("Backend API error. Make sure uvicorn is running on port 8000.");
      const data = await res.json();
      setSearchState((prev) => ({
        ...prev,
        results: token ? [...prev.results, ...data.videos] : data.videos,
        pageToken: data.next_page_token,
        loading: false
      }));
    } catch (err) {
      setSearchState((prev) => ({
        ...prev,
        error: err.message,
        loading: false
      }));
    }
  };

  const handleUpdateFilterSort = (updates) => {
    setSearchState((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleSave = (video) => {
    const exists = savedLibrary.some((v) => v.video_id === video.video_id);
    const updated = exists
      ? savedLibrary.filter((v) => v.video_id !== video.video_id)
      : [video, ...savedLibrary];
    setSavedLibrary(updated);
    localStorage.setItem(`${storagePrefix}library`, JSON.stringify(updated));
  };

  const handleCreateCollection = (name) => {
    if (collections.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const updated = [...collections, { name, videos: [] }];
    setCollections(updated);
    localStorage.setItem(`${storagePrefix}collections`, JSON.stringify(updated));
  };

  const handleAddVideoToCollection = (colName, video) => {
    const updated = collections.map((c) => {
      if (c.name !== colName) return c;
      if (c.videos.some((v) => v.video_id === video.video_id)) return c;
      return { ...c, videos: [...c.videos, video] };
    });
    setCollections(updated);
    localStorage.setItem(`${storagePrefix}collections`, JSON.stringify(updated));
  };

  const handleSaveFeedback = (video, rating, difficulty) => {
    const updated = {
      ...userFeedbackMap,
      [video.video_id]: { title: video.title, rating, difficulty, date: new Date().toLocaleDateString() }
    };
    setUserFeedbackMap(updated);
    localStorage.setItem(`${storagePrefix}feedback`, JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(`${storagePrefix}history`);
  };

  const handleToggleCompare = (video) => {
    const exists = compareList.some((v) => v.video_id === video.video_id);
    if (exists) setCompareList(compareList.filter((v) => v.video_id !== video.video_id));
    else if (compareList.length < 3) setCompareList([...compareList, video]);
  };

  const isDark = theme === "dark";

  return (
    <Router>
      <div className={`min-h-screen font-sans transition-colors ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <Navigation
          activeQuery={searchState.query}
          user={user}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <Routes>
          <Route
            path="/"
            element={<Home onTriggerSearch={(q) => executeSearch(q)} loading={searchState.loading} theme={theme} />}
          />
          <Route
            path="/search"
            element={
              <SearchResults
                searchState={searchState}
                onTriggerSearch={(q) => executeSearch(q)}
                onLoadMore={() => executeSearch(searchState.query, searchState.pageToken)}
                onUpdateFilterSort={handleUpdateFilterSort}
                savedLibrary={savedLibrary}
                onToggleSave={handleToggleSave}
                compareList={compareList}
                onToggleCompare={handleToggleCompare}
                onClearCompare={() => setCompareList([])}
                theme={theme}
              />
            }
          />
          <Route
            path="/video/:id"
            element={
              <VideoDetails
                onSaveFeedback={handleSaveFeedback}
                userFeedbackMap={userFeedbackMap}
                savedLibrary={savedLibrary}
                onToggleSave={handleToggleSave}
                theme={theme}
              />
            }
          />
          <Route path="/compare" element={<Compare compareList={compareList} theme={theme} />} />
          <Route path="/explore" element={<Explore onTriggerSearch={(q) => executeSearch(q)} theme={theme} />} />
          <Route
            path="/library"
            element={
              <Library
                savedLibrary={savedLibrary}
                onToggleSave={handleToggleSave}
                searchHistory={searchHistory}
                onClearHistory={handleClearHistory}
                onTriggerSearch={(q) => executeSearch(q)}
                collections={collections}
                onCreateCollection={handleCreateCollection}
                onAddVideoToCollection={handleAddVideoToCollection}
                theme={theme}
              />
            }
          />
          <Route path="/how-it-works" element={<HowItWorks theme={theme} />} />
          <Route
            path="/profile"
            element={
              <Profile
                user={user}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                preferredLang={preferredLang}
                onChangeLang={(lang) => {
                  setPreferredLang(lang);
                  handleUpdateFilterSort({ filterLang: lang });
                }}
                searchHistory={searchHistory}
                onClearHistory={handleClearHistory}
                savedLibrary={savedLibrary}
                userFeedbackMap={userFeedbackMap}
                onTriggerSearch={(q) => executeSearch(q)}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}