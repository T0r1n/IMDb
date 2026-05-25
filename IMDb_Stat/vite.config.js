import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/data': 'http://127.0.0.1:5000',
      '/filtered_data': 'http://127.0.0.1:5000',
      '/top_rated_by_genre': 'http://127.0.0.1:5000',
      '/average_rating_per_year': 'http://127.0.0.1:5000',
      '/genre_distribution': 'http://127.0.0.1:5000',
      '/votes_per_year': 'http://127.0.0.1:5000',
      '/rating_distribution': 'http://127.0.0.1:5000',
      '/votes_rating_correlation': 'http://127.0.0.1:5000',
      '/average_rating_by_genre': 'http://127.0.0.1:5000',
      '/movies_per_year': 'http://127.0.0.1:5000',
      '/top_20_movies': 'http://127.0.0.1:5000',
      '/data_missing': 'http://127.0.0.1:5000',
      '/predict_rating': 'http://127.0.0.1:5000',
      '/get_movies_by_local_genres': 'http://127.0.0.1:5000',
      '/get_poster': 'http://127.0.0.1:5000',
      '/search_series': 'http://127.0.0.1:5000',
      '/series_episodes': 'http://127.0.0.1:5000',
    },
  },
})
