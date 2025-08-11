// App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AIPlan from './pages/AIPlan';
import CreatePlan from './pages/CreatePlan';
import MyItinerary from './pages/MyItinerary';
import SummaryCard from './pages/SummaryCard';
import './App.css'; // 引入全局样式
import PlanSummary from './pages/PlanSummary';
import PackList from './pages/PackList';
import Member from './pages/Member';
import Accommodation from './pages/Accommodation';
import Splitwise from './pages/Splitwise';
import NotificationList from './pages/NotificationList';
import TripPhoto from './pages/TripPhoto';
import ManualPlan from './pages/MyItinerary';

const API_BASE = process.env.REACT_APP_API_BASE || "/api";
function App() {
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { user: null })
      .then(data => {
        const id = data?.user?.id;
        if (id) {
          localStorage.setItem('userId', String(id));
        } else {
          localStorage.removeItem('userId');
        }
      })
      .catch(() => {
        // 静默忽略网络错误
      });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePlan />} />
        <Route path="/aiplan" element={<AIPlan />} />
        <Route path="/my-itinerary" element={<ManualPlan />} />
        <Route path="/my-itinerary" element={<MyItinerary />} />
        <Route path="/plan-summary/:id" element={<PlanSummary />} />
        <Route path="/packing/:id" element={<PackList />} />
        <Route path="/members/:id" element={<Member />} />
        <Route path="/notifications/:id" element={<NotificationList />} />
        {/* <Route path="/budget" element={<PlanSummary />} /> */}
        <Route path="/accommodation/:id" element={<Accommodation />} />
        <Route path="/splitwise/:id" element={<Splitwise />} />
        <Route path="/photo/:id" element={<TripPhoto />} />

        <Route path="/summary-card" element={<SummaryCard />} />
        <Route path="/itinerary" element={<MyItinerary />} />

      </Routes>
    </Router>
  );
}

export default App;
