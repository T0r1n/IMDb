import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'

const MainPage = () => {
  const [date, setDate] = useState('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [voteRange, setVoteRange] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [errorMargin, setErrorMargin] = useState(null); 
  const [mae, setMae] = useState(null);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const genres = ['Action','Adventure','Animation','Biography', 'Comedy','Crime','Documentary', 'Drama','Family','Fantasy','Film-Noir','Game-Show','History', 'Horror','Music','Musical', 'Romance','Mystery','News','Reality-TV', 'Sci-Fi','Short','Sport','Talk-Show', 'Thriller','War','Western', 'Adult'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 106 }, (v, i) => currentYear - 100 + i).reverse();
  
  // Состояние для хранения URL постеров
  const [posterUrls, setPosterUrls] = useState({});

  // Простая хеш-функция для генерации цвета
  const hashCode = (str) => {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // Функция для получения URL постера (синхронная версия с fallback)
  const getPosterUrl = (movieId) => {
    if (!movieId) {
      const colors = ['667eea', '764ba2', 'f093fb'];
      return `https://via.placeholder.com/300x400/${colors[0]}/ffffff?text=🎬`;
    }

    // Если уже загружен, используем из кэша
    if (posterUrls[movieId]) {
      return posterUrls[movieId];
    }

    // Пробуем IMDb CDN URL (может не работать из-за CORS, но браузер попробует)
    const imdbUrl = `https://m.media-amazon.com/images/M/MV5B${movieId}._V1_SX300.jpg`;
    
    // Placeholder с градиентом на основе ID
    const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe', '43e97b', 'fa709a'];
    const colorIndex = Math.abs(hashCode(movieId)) % colors.length;
    const placeholderUrl = `https://via.placeholder.com/300x400/${colors[colorIndex]}/ffffff?text=🎬`;

    // Возвращаем IMDb URL, если не загрузится - сработает onError
    return imdbUrl;
  };

  // Загружаем постеры через бэкенд при получении фильмов
  useEffect(() => {
    const loadPosters = async () => {
      if (recommendedMovies.length === 0) return;

      const newPosterUrls = {};
      await Promise.all(
        recommendedMovies.slice(0, 20).map(async (movie) => {
          if (movie.id && !posterUrls[movie.id]) {
            try {
              const response = await axios.get(`http://127.0.0.1:5000/get_poster/${movie.id}`);
              console.log(`Постер для ${movie.id}:`, response.data);
              
              // Используем poster_url если он есть и валидный
              let posterUrl = response.data.poster_url;
              
              // Если есть fallback_urls, пробуем их
              if (response.data.fallback_urls && response.data.fallback_urls.length > 0) {
                // Проверяем, не является ли текущий URL placeholder'ом
                if (!posterUrl || posterUrl.includes('placeholder') || posterUrl.includes('N/A')) {
                  posterUrl = response.data.fallback_urls[0];
                }
              }
              
              // Если все еще нет валидного URL, используем placeholder
              if (!posterUrl || posterUrl.includes('N/A')) {
                posterUrl = response.data.placeholder_url;
              }
              
              newPosterUrls[movie.id] = posterUrl;
            } catch (error) {
              console.error(`Ошибка при загрузке постера для ${movie.id}:`, error);
              // Используем placeholder
              const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe'];
              const colorIndex = Math.abs(hashCode(movie.id)) % colors.length;
              newPosterUrls[movie.id] = `https://via.placeholder.com/300x400/${colors[colorIndex]}/ffffff?text=🎬`;
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
          const response = await axios.post("http://127.0.0.1:5000/get_movies_by_local_genres", {
            genres: userGenres
          });
          setRecommendedMovies(response.data || []); 
        } catch (error) {
          console.error("Ошибка при загрузке рекомендованных фильмов:", error);
        }
      }
      setLoading(false);
    };

    fetchRecommendedMovies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:5000/predict_rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, genre, voteRange }),
      });
      const data = await response.json();
      setPrediction(data.averageRating);
      setErrorMargin(data.errorMargin);
      setMae(data.mae);
    } catch (error) {
      console.error("Ошибка при прогнозировании:", error);
    }
  };

  const openIMDb = (movieId, genres) => {
    const existingGenres = JSON.parse(localStorage.getItem('userGenres')) || [];
  
    const updatedGenres = Array.from(new Set([...existingGenres, ...genres]));
  
    if (updatedGenres.length > 5) {
      updatedGenres.shift(); 
    }
    localStorage.setItem('userGenres', JSON.stringify(updatedGenres));

    const url = `https://www.imdb.com/title/${movieId}/`; 
    window.open(url, "_blank"); 
  };

  return (
    <div>
      <h1>🎬 IMDb Statistics</h1>
      
      <form onSubmit={handleSubmit} className="prediction-form">
        <select value={year} onChange={(e) => setYear(e.target.value)} required>
          <option value="">Выберите год</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} required>
          <option value="">Выберите жанр</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select value={voteRange} onChange={(e) => setVoteRange(e.target.value)} required>
          <option value="">Выберите интервал оценок</option>
          <option value="0-100">0 - 100</option>
          <option value="101-500">101 - 500</option>
          <option value="501-1000">501 - 1000</option>
          <option value="1001-5000">1001 - 5000</option>
          <option value="5001-10000">5001 - 10000</option>
        </select>
        <button type="submit">Прогнозировать рейтинг</button>
      </form>

      {prediction && (
        <div className="prediction-results">
          <h2>Результаты прогнозирования</h2>
          <p><strong>Средняя оценка:</strong> {prediction}</p>
          <p><strong>Погрешность:</strong> {errorMargin}</p>
          <p><strong>Абсолютная погрешность:</strong> {mae}</p>
        </div>
      )}

      <h2>Рекомендованные фильмы</h2>
      {loading ? (
        <div className="loading">Загрузка фильмов</div>
      ) : recommendedMovies.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <p style={{ fontSize: '1.2em', fontWeight: '500', margin: 0 }}>
            Нет рекомендованных фильмов. Выберите фильмы, чтобы получить рекомендации!
          </p>
        </div>
      ) : (
        <div className="movies-grid">
          {recommendedMovies.slice(0, 20).map((movie, index) => (
            <div 
              className="movie-card" 
              key={movie.id || index}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="movie-poster">
                <img 
                  src={posterUrls[movie.id] || getPosterUrl(movie.id)} 
                  alt={movie.title}
                  loading="lazy"
                  onError={(e) => {
                    const img = e.target;
                    const currentSrc = img.src;
                    
                    // Если это уже placeholder или повторная ошибка, показываем текст
                    if (currentSrc.includes('placeholder') || img.dataset.retried === 'true') {
                      const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe'];
                      const colorIndex = Math.abs(hashCode(movie.id || '')) % colors.length;
                      img.style.display = 'none';
                      img.parentElement.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-size: 18px; text-align: center; padding: 20px; background: linear-gradient(135deg, #${colors[colorIndex]} 0%, #764ba2 100%);">${movie.title}</div>`;
                      return;
                    }
                    
                    // Пробуем загрузить через бэкенд еще раз
                    img.dataset.retried = 'true';
                    axios.get(`http://127.0.0.1:5000/get_poster/${movie.id}`)
                      .then(response => {
                        const newUrl = response.data.poster_url || response.data.placeholder_url;
                        if (newUrl && !newUrl.includes('N/A')) {
                          img.src = newUrl;
                        } else {
                          throw new Error('No valid poster URL');
                        }
                      })
                      .catch(() => {
                        // Используем placeholder
                        const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe'];
                        const colorIndex = Math.abs(hashCode(movie.id || '')) % colors.length;
                        img.src = `https://via.placeholder.com/300x400/${colors[colorIndex]}/ffffff?text=🎬`;
                      });
                  }}
                />
              </div>
              <div className="movie-info">
                <h3 className="movie-title">{movie.title}</h3>
                <div className="movie-meta">
                  <div className="movie-rating">
                    <span className="star">⭐</span>
                    <span>{movie.averageRating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="movie-votes">
                    {movie.numVotes || 0} голосов
                  </div>
                </div>
                <div className="movie-actions">
                  <button 
                    className="view-button" 
                    onClick={() => openIMDb(movie.id, movie.genres || [])}
                  >
                    <span>👁️</span>
                    <span>Открыть в IMDb</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MainPage;
