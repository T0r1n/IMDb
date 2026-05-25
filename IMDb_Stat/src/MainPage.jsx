import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Star, ExternalLink, Film, TrendingUp, Sparkles } from 'lucide-react';
import './App.css';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const MainPage = () => {
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [voteRange, setVoteRange] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [errorMargin, setErrorMargin] = useState(null);
  const [mae, setMae] = useState(null);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posterUrls, setPosterUrls] = useState({});
  const loadedIds = useRef(new Set());

  const genres = ['Action','Adventure','Animation','Biography','Comedy','Crime','Documentary','Drama','Family','Fantasy','Film-Noir','Game-Show','History','Horror','Music','Musical','Romance','Mystery','News','Reality-TV','Sci-Fi','Short','Sport','Talk-Show','Thriller','War','Western','Adult'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 106 }, (_, i) => currentYear - 100 + i).reverse();

  useEffect(() => {
    const loadPosters = async () => {
      if (recommendedMovies.length === 0) return;
      const newPosterUrls = {};
      await Promise.all(
        recommendedMovies.slice(0, 20).map(async (movie) => {
          if (movie.id && !loadedIds.current.has(movie.id)) {
            loadedIds.current.add(movie.id);
            try {
              const response = await axios.get(`/get_poster/${movie.id}`);
              let posterUrl = response.data.poster_url;
              if (response.data.fallback_urls?.length > 0) {
                if (!posterUrl || posterUrl.includes('placeholder') || posterUrl.includes('N/A')) {
                  posterUrl = response.data.fallback_urls[0];
                }
              }
              if (!posterUrl || posterUrl.includes('N/A')) {
                posterUrl = response.data.placeholder_url;
              }
              newPosterUrls[movie.id] = posterUrl;
            } catch {
              newPosterUrls[movie.id] = null;
            }
          }
        })
      );
      if (Object.keys(newPosterUrls).length > 0) {
        setPosterUrls(prev => ({ ...prev, ...newPosterUrls }));
      }
    };
    loadPosters();
  }, [recommendedMovies]);

  useEffect(() => {
    const fetchRecommendedMovies = async () => {
      const userGenres = JSON.parse(localStorage.getItem('userGenres')) || [];
      if (userGenres.length > 0) {
        try {
          const response = await axios.post('/get_movies_by_local_genres', { genres: userGenres });
          setRecommendedMovies(response.data || []);
        } catch (error) {
          console.error('Error loading recommended movies:', error);
        }
      }
      setLoading(false);
    };
    fetchRecommendedMovies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/predict_rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, genre, voteRange }),
      });
      const data = await response.json();
      setPrediction(data.averageRating);
      setErrorMargin(data.errorMargin);
      setMae(data.mae);
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  const openIMDb = (movieId, movieGenres) => {
    const existingGenres = JSON.parse(localStorage.getItem('userGenres')) || [];
    const updatedGenres = Array.from(new Set([...existingGenres, ...movieGenres]));
    if (updatedGenres.length > 5) updatedGenres.shift();
    localStorage.setItem('userGenres', JSON.stringify(updatedGenres));
    window.open(`https://www.imdb.com/title/${movieId}/`, '_blank');
  };

  const handleImageError = useCallback((e, movieId) => {
    const img = e.target;
    if (img.dataset.retried === 'true') {
      img.style.display = 'none';
      return;
    }
    img.dataset.retried = 'true';
    axios.get(`/get_poster/${movieId}`)
      .then(response => {
        const newUrl = response.data.poster_url || response.data.placeholder_url;
        if (newUrl && !newUrl.includes('N/A')) {
          img.src = newUrl;
        } else {
          img.style.display = 'none';
        }
      })
      .catch(() => {
        img.style.display = 'none';
      });
  }, []);

  return (
    <div className="page-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1>IMDb Statistics</h1>
        <p>Movie rating prediction and personalized recommendations</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="prediction-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <label className="prediction-form-label">Year</label>
        <select value={year} onChange={(e) => setYear(e.target.value)} required>
          <option value="">Select year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <label className="prediction-form-label">Genre</label>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} required>
          <option value="">Select genre</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <label className="prediction-form-label">Vote range</label>
        <select value={voteRange} onChange={(e) => setVoteRange(e.target.value)} required>
          <option value="">Select vote range</option>
          <option value="0-100">0 - 100</option>
          <option value="101-500">101 - 500</option>
          <option value="501-1000">501 - 1 000</option>
          <option value="1001-5000">1 001 - 5 000</option>
          <option value="5001-10000">5 001 - 10 000</option>
        </select>

        <button type="submit">
          <TrendingUp size={16} />
          Predict rating
        </button>
      </motion.form>

      <AnimatePresence>
        {prediction && (
          <motion.div
            className="prediction-results"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <h2>Prediction results</h2>
            <div className="prediction-result-item">
              <span className="prediction-result-label">Average rating</span>
              <span className="prediction-result-value accent">{prediction}</span>
            </div>
            <div className="prediction-result-item">
              <span className="prediction-result-label">Standard deviation</span>
              <span className="prediction-result-value">{errorMargin}</span>
            </div>
            <div className="prediction-result-item">
              <span className="prediction-result-label">Mean absolute error</span>
              <span className="prediction-result-value">{mae}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="section-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2>Recommended for you</h2>
      </motion.div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading movies...</div>
        </div>
      ) : recommendedMovies.length === 0 ? (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Sparkles size={48} />
          <p>No recommendations yet. Browse top films to get personalized picks.</p>
        </motion.div>
      ) : (
        <motion.div className="movies-grid" variants={stagger} initial="hidden" animate="show">
          {recommendedMovies.slice(0, 20).map((movie) => (
            <motion.div
              className="movie-card"
              key={movie.id}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="movie-poster">
                {posterUrls[movie.id] ? (
                  <img
                    src={posterUrls[movie.id]}
                    alt={movie.title}
                    loading="lazy"
                    onError={(e) => handleImageError(e, movie.id)}
                  />
                ) : (
                  <div className="movie-poster-placeholder">
                    <Film size={32} />
                    <span className="movie-poster-placeholder-title">{movie.title}</span>
                  </div>
                )}
                <div className="movie-poster-overlay" />
                <div className="movie-rating-badge">
                  <Star />
                  {movie.averageRating?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div className="movie-info">
                <h3 className="movie-title">{movie.title}</h3>
                <div className="movie-meta">
                  <div className="movie-rating">
                    <Star />
                    {movie.averageRating?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="movie-votes">
                    {movie.numVotes?.toLocaleString() || 0} votes
                  </div>
                </div>
                {movie.genres?.length > 0 && (
                  <div className="movie-genres">
                    {movie.genres.slice(0, 3).map((g) => (
                      <span className="movie-genre-tag" key={g}>{g}</span>
                    ))}
                  </div>
                )}
                <button className="view-button" onClick={() => openIMDb(movie.id, movie.genres || [])}>
                  <ExternalLink size={14} />
                  Open in IMDb
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default MainPage;
