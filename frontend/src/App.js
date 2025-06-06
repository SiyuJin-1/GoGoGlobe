// App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AIPlan from './pages/AIPlan';
import CreatePlan from './pages/CreatePlan';
import MyItinerary from './pages/MyItinerary';
import SummaryCard from './pages/SummaryCard';
import './App.css'; // 引入全局样式
import PlanSummary from './pages/PlanSummary';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/create" element={<CreatePlan />} />
        <Route path="/aiplan" element={<AIPlan />} />
        {/* <Route path="/manualplan" element={<ManualPlan />} /> */}
        <Route path="/my-itinerary" element={<MyItinerary />} />
        <Route path="/plan-summary/:id" element={<PlanSummary />} />

        <Route path="/summary-card" element={<SummaryCard />} />
        <Route path="/itinerary" element={<MyItinerary />} />

      </Routes>
    </Router>
  );
}

export default App;
