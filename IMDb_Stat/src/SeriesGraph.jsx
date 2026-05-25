import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Search, Tv, Star, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import './App.css';

function getRatingColor(rating) {
  if (rating === null || rating === undefined) return 'var(--bg-tertiary)';
  if (rating >= 9) return '#166534';
  if (rating >= 8) return '#15803d';
  if (rating >= 7) return '#65a30d';
  if (rating >= 6) return '#ca8a04';
  if (rating >= 5) return '#d97706';
  if (rating >= 4) return '#ea580c';
  if (rating >= 3) return '#dc2626';
  if (rating >= 2) return '#991b1b';
  return '#7f1d1d';
}

function getRatingTextColor(rating) {
  if (rating === null || rating === undefined) return 'var(--text-muted)';
  return rating >= 6 ? '#fafafa' : '#fecaca';
}

function SeasonHeatmap({ seasons, maxEpisodes, seriesInfo }) {
  const seasonKeys = Object.keys(seasons).sort((a, b) => Number(a) - Number(b));
  if (!seasonKeys.length) return null;

  const avgRating = (eps) => {
    const valid = eps.map(e => e.rating).filter(r => r !== null);
    return valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  };

  const allAvg = seasonKeys.reduce((acc, s) => {
    const avg = avgRating(seasons[s]);
    if (avg !== null) acc.push(avg);
    return acc;
  }, []);
  const overallAvg = allAvg.length ? (allAvg.reduce((a, b) => a + b, 0) / allAvg.length) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        gap: 28,
        alignItems: 'flex-start',
      }}
    >
      <div style={{
        flexShrink: 0,
        width: 220,
        position: 'sticky',
        top: 80,
      }}>
        {seriesInfo.poster ? (
          <img
            src={seriesInfo.poster}
            alt={seriesInfo.title}
            style={{
              width: '100%',
              aspectRatio: '2/3',
              objectFit: 'cover',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '2/3',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Tv size={48} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 6px',
            lineHeight: 1.3,
          }}>
            {seriesInfo.title}
          </h2>
          {seriesInfo.year && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              {seriesInfo.year}
            </div>
          )}
          {seriesInfo.genres && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {seriesInfo.genres}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {seriesInfo.rating && seriesInfo.rating !== 'N/A' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--rating)',
              }}>
                <Star size={14} fill="var(--rating)" />
                {seriesInfo.rating}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {seasonKeys.length} season{seasonKeys.length > 1 ? 's' : ''}
            </span>
          </div>
          {overallAvg !== null && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Avg episode rating: </span>
              <span style={{ fontWeight: 700, color: 'var(--rating)' }}>{overallAvg.toFixed(1)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 14,
          }}>
            {[2, 4, 6, 8, 10].map(v => (
              <div key={v} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: 'var(--text-muted)',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: getRatingColor(v - 0.5),
                }} />
                {v - 1}-{v}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        minWidth: 0,
        overflowX: 'auto',
        paddingBottom: 8,
      }}>
        <table style={{
          borderCollapse: 'separate',
          borderSpacing: 2,
          width: 'auto',
        }}>
          <thead>
            <tr>
              <th style={{
                position: 'sticky',
                left: 0,
                zIndex: 2,
                background: 'var(--bg-primary)',
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textAlign: 'right',
                borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>
                Ep
              </th>
              {seasonKeys.map(s => {
                const sEps = seasons[s];
                const avg = avgRating(sEps);
                return (
                  <th key={s} style={{
                    padding: '3px 0',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    <div>S{s}</div>
                    {avg !== null && (
                      <div style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'var(--rating)',
                        marginTop: 1,
                      }}>
                        {avg.toFixed(1)}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxEpisodes }, (_, epIdx) => {
              const epNum = epIdx + 1;
              const hasAny = seasonKeys.some(s => seasons[s]?.some(e => e.episode === epNum));
              if (!hasAny) return null;

              return (
                <tr key={epNum}>
                  <td style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    background: 'var(--bg-primary)',
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}>
                    {epNum}
                  </td>
                  {seasonKeys.map(s => {
                    const ep = seasons[s]?.find(e => e.episode === epNum);
                    if (!ep) {
                      return (
                        <td key={s} style={{ padding: 0, width: 32, height: 28 }} />
                      );
                    }

                    return (
                      <td
                        key={s}
                        title={`S${s}E${epNum} - ${ep.title}${ep.rating !== null ? ` (${ep.rating})` : ''}`}
                        style={{
                          padding: 0,
                          width: 32,
                          height: 28,
                          background: getRatingColor(ep.rating),
                          borderRadius: 3,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          cursor: 'default',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.zIndex = '5';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.zIndex = '1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: getRatingTextColor(ep.rating),
                          lineHeight: '28px',
                        }}>
                          {ep.rating !== null ? ep.rating.toFixed(1) : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

SeasonHeatmap.displayName = 'SeasonHeatmap';

const SeriesGraph = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await axios.get('/search_series', {
        params: { q: searchQuery.trim() },
      });
      setSearchResults(response.data.results || []);
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const onInputChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 400);
  }, [handleSearch]);

  const selectSeries = useCallback(async (series) => {
    setSelectedSeries(series);
    setEpisodeData(null);
    setEpisodeError(null);
    setEpisodeLoading(true);
    setSearchResults([]);

    try {
      const response = await axios.get(`/series_episodes/${series.id}`);
      setEpisodeData(response.data);
    } catch (err) {
      setEpisodeError(err.response?.data?.error || 'Failed to load episode data');
    } finally {
      setEpisodeLoading(false);
    }
  }, []);

  return (
    <div className="page-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1>Series Graph</h1>
        <p>Episode ratings heatmap for TV series</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          position: 'relative',
          maxWidth: 560,
          margin: '0 auto 32px',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          transition: 'border-color 0.15s',
        }}>
          <Search size={18} style={{ marginLeft: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={onInputChange}
            placeholder="Search for a TV series..."
            style={{
              flex: 1,
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 15,
              fontWeight: 500,
            }}
            onFocus={(e) => {
              e.currentTarget.parentElement.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.parentElement.style.borderColor = 'var(--border)';
            }}
          />
          {searchLoading && (
            <Loader2 size={18} style={{ marginRight: 14, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
          )}
        </div>

        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderTop: 'none',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectSeries(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt=""
                      style={{
                        width: 36,
                        height: 54,
                        objectFit: 'cover',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 36,
                      height: 54,
                      background: 'var(--bg-tertiary)',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Tv size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}>
                      {item.year}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {searchError && (
          <div style={{
            marginTop: 8,
            fontSize: 13,
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <AlertCircle size={14} />
            {searchError}
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {episodeLoading && (
          <motion.div
            key="loading"
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loading-spinner" />
            <div className="loading-text">Loading episode data...</div>
          </motion.div>
        )}

        {episodeError && !episodeLoading && (
          <motion.div
            key="error"
            className="error-message"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={32} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
            <h2>Loading error</h2>
            <p>{episodeError}</p>
          </motion.div>
        )}

        {episodeData && !episodeLoading && !episodeError && (
          <motion.div
            key={episodeData.series.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SeasonHeatmap
              seasons={episodeData.seasons}
              maxEpisodes={episodeData.maxEpisodes}
              seriesInfo={episodeData.series}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedSeries && !episodeLoading && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Tv size={48} />
          <p>Search for a TV series to see episode ratings heatmap</p>
        </motion.div>
      )}
    </div>
  );
};

export default SeriesGraph;
