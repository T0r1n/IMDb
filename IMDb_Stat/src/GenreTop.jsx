import React, { useState, useEffect } from 'react';
import axios from 'axios'
import './App.css'

const GenresTopPage = () => {
  const [array, setArray] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  const excludedGenres = ['Adult'];

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

  // Функция для получения URL постера
  const getPosterUrl = (movieId) => {
    if (!movieId) {
      const colors = ['667eea', '764ba2', 'f093fb'];
      return `https://via.placeholder.com/300x400/${colors[0]}/ffffff?text=🎬`;
    }

    // Если уже загружен, используем из кэша
    if (posterUrls[movieId]) {
      return posterUrls[movieId];
    }

    // Пробуем IMDb CDN URL
    const imdbUrl = `https://m.media-amazon.com/images/M/MV5B${movieId}._V1_SX300.jpg`;
    
    // Placeholder с градиентом на основе ID
    const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe', '43e97b', 'fa709a'];
    const colorIndex = Math.abs(hashCode(movieId)) % colors.length;
    const placeholderUrl = `https://via.placeholder.com/300x400/${colors[colorIndex]}/ffffff?text=🎬`;

    return imdbUrl;
  };

  // Загружаем постеры через бэкенд при получении данных
  useEffect(() => {
    const loadPosters = async () => {
      if (!array || Object.keys(array).length === 0) return;

      const newPosterUrls = {};
      const allMovies = Object.values(array).flat();
      
      await Promise.all(
        allMovies.map(async (movie) => {
          if (movie.id && !posterUrls[movie.id]) {
            try {
              const response = await axios.get(`http://127.0.0.1:5000/get_poster/${movie.id}`);
              console.log(`Постер для ${movie.id}:`, response.data);
              
              let posterUrl = response.data.poster_url;
              
              if (response.data.fallback_urls && response.data.fallback_urls.length > 0) {
                if (!posterUrl || posterUrl.includes('placeholder') || posterUrl.includes('N/A')) {
                  posterUrl = response.data.fallback_urls[0];
                }
              }
              
              if (!posterUrl || posterUrl.includes('N/A')) {
                posterUrl = response.data.placeholder_url;
              }
              
              newPosterUrls[movie.id] = posterUrl;
            } catch (error) {
              console.error(`Ошибка при загрузке постера для ${movie.id}:`, error);
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
  }, [array]);

  const top_rated_by_genre = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/top_rated_by_genre");
      console.log("Ответ от сервера:", response.data);
      
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        setArray(response.data);
      } else {
        console.error("Неверный формат данных:", response.data);
        setError("Неверный формат данных от сервера");
        setArray({});
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      setError(error.message || "Ошибка при загрузке данных");
      setArray({});
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => {
    top_rated_by_genre();
  },[]);

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
      <h1>🏆 Топовые фильмы по жанрам</h1>
      {loading ? (
        <div className="loading">Загрузка фильмов</div>
      ) : error ? (
        <div className="error-message">
          <h2>Ошибка загрузки данных</h2>
          <p>{error}</p>
          <p>Проверьте консоль браузера и логи сервера для подробностей.</p>
        </div>
      ) : !array || Object.keys(array).length === 0 ? (
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
            Данные не найдены. Проверьте, что сервер запущен и файл data.csv существует.
          </p>
        </div>
      ) : (
        Object.keys(array).map((genre, genreIndex) => {
          if (excludedGenres.includes(genre)) {
            return null; 
          }
          if (!array[genre] || !Array.isArray(array[genre]) || array[genre].length === 0) {
            return null;
          }
          return (
            <div className="genre-section" key={genre} style={{ animationDelay: `${genreIndex * 0.1}s` }}>
              <h2>🎬 Top {genre} Films</h2>
              <div className="movies-grid">
                {array[genre].map((item, index) => {
                  if (!item || !item.id || !item.title) {
                    console.warn("Пропущен невалидный элемент:", item);
                    return null;
                  }
                  return (
                    <div 
                      className="movie-card" 
                      key={item.id || index}
                      style={{ animationDelay: `${(genreIndex * 0.1) + (index * 0.05)}s` }}
                    >
                      <div className="movie-poster">
                        <img 
                          src={posterUrls[item.id] || getPosterUrl(item.id)} 
                          alt={item.title}
                          loading="lazy"
                          onError={(e) => {
                            const img = e.target;
                            const currentSrc = img.src;
                            
                            if (currentSrc.includes('placeholder') || img.dataset.retried === 'true') {
                              const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe'];
                              const colorIndex = Math.abs(hashCode(item.id || '')) % colors.length;
                              img.style.display = 'none';
                              img.parentElement.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-size: 18px; text-align: center; padding: 20px; background: linear-gradient(135deg, #${colors[colorIndex]} 0%, #764ba2 100%);">${item.title}</div>`;
                              return;
                            }
                            
                            img.dataset.retried = 'true';
                            axios.get(`http://127.0.0.1:5000/get_poster/${item.id}`)
                              .then(response => {
                                const newUrl = response.data.poster_url || response.data.placeholder_url;
                                if (newUrl && !newUrl.includes('N/A')) {
                                  img.src = newUrl;
                                } else {
                                  throw new Error('No valid poster URL');
                                }
                              })
                              .catch(() => {
                                const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '00f2fe'];
                                const colorIndex = Math.abs(hashCode(item.id || '')) % colors.length;
                                img.src = `https://via.placeholder.com/300x400/${colors[colorIndex]}/ffffff?text=🎬`;
                              });
                          }}
                        />
                      </div>
                      <div className="movie-info">
                        <h3 className="movie-title">{item.title}</h3>
                        <div className="movie-meta">
                          <div className="movie-rating">
                            <span className="star">⭐</span>
                            <span>{item.averageRating?.toFixed(1) || 'N/A'}</span>
                          </div>
                          <div className="movie-votes">
                            {item.numVotes || 0} голосов
                          </div>
                        </div>
                        <div className="movie-actions">
                          <button 
                            className="view-button" 
                            onClick={() => openIMDb(item.id, item.genres || [])}
                          >
                            <span>👁️</span>
                            <span>Открыть в IMDb</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default GenresTopPage;
