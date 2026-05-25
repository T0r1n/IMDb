import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Star, ExternalLink, Film, AlertCircle } from 'lucide-react';
import './App.css';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const GenresTopPage = () => {
  const [array, setArray] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posterUrls, setPosterUrls] = useState({});
  const loadedIds = useRef(new Set());
  const excludedGenres = ['Adult'];

  useEffect(() => {
    const loadPosters = async () => {
      if (!array || Object.keys(array).length === 0) return;
      const allMovies = Object.values(array).flat();
      const newPosterUrls = {};
      await Promise.all(
        allMovies.map(async (movie) => {
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
  }, [array]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/top_rated_by_genre');
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
          setArray(response.data);
        } else {
          setError('Invalid data format from server');
          setArray({});
        }
      } catch (err) {
        setError(err.message || 'Error loading data');
        setArray({});
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Top Films by Genre</h1></div>
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading top films...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Top Films by Genre</h1></div>
        <div className="error-message">
          <AlertCircle size={32} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
          <h2>Loading error</h2>
          <p>{error}</p>
          <p>Check that the server is running and data.csv exists.</p>
        </div>
      </div>
    );
  }

  if (!array || Object.keys(array).length === 0) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Top Films by Genre</h1></div>
        <div className="empty-state">
          <Film size={48} />
          <p>No data found. Check that the server is running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1>Top Films by Genre</h1>
        <p>Highest-rated films across all genres</p>
      </motion.div>

      {Object.keys(array).map((genre, genreIndex) => {
        if (excludedGenres.includes(genre)) return null;
        if (!array[genre]?.length) return null;

        return (
          <motion.div
            className="genre-section"
            key={genre}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: genreIndex * 0.05 }}
          >
            <div className="genre-section-header">
              <h2>Top {genre}</h2>
              <div className="genre-section-header-line" />
            </div>
            <motion.div className="movies-grid" variants={stagger} initial="hidden" animate="show">
              {array[genre].map((item) => {
                if (!item?.id || !item?.title) return null;
                return (
                  <motion.div
                    className="movie-card"
                    key={item.id}
                    variants={fadeUp}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="movie-poster">
                      {posterUrls[item.id] ? (
                        <img
                          src={posterUrls[item.id]}
                          alt={item.title}
                          loading="lazy"
                          onError={(e) => handleImageError(e, item.id)}
                        />
                      ) : (
                        <div className="movie-poster-placeholder">
                          <Film size={32} />
                          <span className="movie-poster-placeholder-title">{item.title}</span>
                        </div>
                      )}
                      <div className="movie-poster-overlay" />
                      <div className="movie-rating-badge">
                        <Star />
                        {item.averageRating?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="movie-info">
                      <h3 className="movie-title">{item.title}</h3>
                      <div className="movie-meta">
                        <div className="movie-rating">
                          <Star />
                          {item.averageRating?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="movie-votes">
                          {item.numVotes?.toLocaleString() || 0} votes
                        </div>
                      </div>
                      {item.genres?.length > 0 && (
                        <div className="movie-genres">
                          {item.genres.slice(0, 3).map((g) => (
                            <span className="movie-genre-tag" key={g}>{g}</span>
                          ))}
                        </div>
                      )}
                      <button className="view-button" onClick={() => openIMDb(item.id, item.genres || [])}>
                        <ExternalLink size={14} />
                        Open in IMDb
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default GenresTopPage;
