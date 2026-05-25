import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CustomChart from './Widgets/CustomChart';
import axios from 'axios';
import './App.css';

const Statistic = () => {
  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [voteData, setVoteData] = useState([]);
  const [ratingDistributionData, setRatingDistributionData] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [movieYearData, setMovieYearData] = useState([]);
  const [missingData, setMissingData] = useState([]);
  const [correlationData, setCorrelationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          lineRes, barRes, voteRes, ratingDistRes,
          ratingByGenreRes, movieYearRes, missingRes, correlationRes
        ] = await Promise.all([
          axios.get('/average_rating_per_year'),
          axios.get('/genre_distribution'),
          axios.get('/votes_per_year'),
          axios.get('/rating_distribution'),
          axios.get('/average_rating_by_genre'),
          axios.get('/movies_per_year'),
          axios.get('/data_missing'),
          axios.get('/votes_rating_correlation'),
        ]);

        setLineData(lineRes.data);
        setBarData(barRes.data);
        setVoteData(voteRes.data);
        setRatingDistributionData(ratingDistRes.data);
        setRatingData(ratingByGenreRes.data);
        setMovieYearData(movieYearRes.data);
        setMissingData(missingRes.data.data);
        setCorrelationData(correlationRes.data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1>Statistics</h1>
        </motion.div>
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading statistics...</div>
        </div>
      </div>
    );
  }

  const charts = [
    lineData?.length > 0 && { data: lineData, dataKey: 'averageRating', xAxisKey: 'releaseYear', title: 'Average rating per year', chartType: 'line' },
    barData?.length > 0 && { data: barData, dataKey: 'count', xAxisKey: 'genre', title: 'Films by genre', chartType: 'bar', fontSize: 1 },
    voteData?.length > 0 && { data: voteData, dataKey: 'totalVotes', xAxisKey: 'year', title: 'Votes per year', chartType: 'line' },
    ratingDistributionData?.length > 0 && { data: ratingDistributionData, dataKey: 'count', xAxisKey: 'rating_range', title: 'Rating distribution', chartType: 'bar', customFrontSize: 15 },
    ratingData?.length > 0 && { data: ratingData, dataKey: 'averageRating', xAxisKey: 'genres', title: 'Average rating by genre', chartType: 'bar' },
    movieYearData?.length > 0 && { data: movieYearData, dataKey: 'count', xAxisKey: 'releaseYear', title: 'Films released per year', chartType: 'bar', customInterval: 4 },
    missingData?.length > 0 && { data: missingData, dataKey: 'percentage', xAxisKey: 'status', title: 'Data completeness', chartType: 'pie' },
    correlationData?.length > 0 && { data: correlationData, dataKey: 'averageRating', xAxisKey: 'numVotes', title: 'Votes vs. rating correlation', chartType: 'scatter' },
  ].filter(Boolean);

  return (
    <div className="page-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1>Statistics</h1>
        <p>Data-driven insights from the IMDb dataset</p>
      </motion.div>

      <div className="statistic-container">
        {charts.map((chart, index) => (
          <motion.div
            key={chart.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <CustomChart {...chart} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Statistic;
