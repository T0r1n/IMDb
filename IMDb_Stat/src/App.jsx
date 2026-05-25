import { BrowserRouter as Router, Route, Routes, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Film, Home, Tv } from 'lucide-react';
import './App.css';
import Statistic from './Statistic';
import GenresTop from './GenreTop';
import MainPage from './MainPage';
import SeriesGraph from './SeriesGraph';
import InteractiveBackground from './InteractiveBackground';

function AppContent() {
  const location = useLocation();

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="nav-brand">
          <Film size={22} />
          IMDb<span className="nav-brand-accent">Stat</span>
        </NavLink>
        <ul className="nav-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <Home size={16} />
              <span className="nav-label">Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/topfilms" className={({ isActive }) => isActive ? 'active' : ''}>
              <Film size={16} />
              <span className="nav-label">Top Films</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/series" className={({ isActive }) => isActive ? 'active' : ''}>
              <Tv size={16} />
              <span className="nav-label">Series</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/stat" className={({ isActive }) => isActive ? 'active' : ''}>
              <BarChart3 size={16} />
              <span className="nav-label">Statistics</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/topfilms" element={<GenresTop />} />
          <Route path="/series" element={<SeriesGraph />} />
          <Route path="/stat" element={<Statistic />} />
        </Routes>
      </motion.div>
    </>
  );
}

function App() {
  return (
    <Router>
      <InteractiveBackground />
      <AppContent />
    </Router>
  );
}

export default App;
