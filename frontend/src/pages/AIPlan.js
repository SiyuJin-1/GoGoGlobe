import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import './AIPlan.css';
import Navbar from './Navbar';

function AIPlan() {
  const navigate = useNavigate(); // 初始化导航
  const location = useLocation();
  const planData = location.state || JSON.parse(localStorage.getItem("planData")) || {};
  const [plan, setPlan] = useState('');
  const [preference, setPreference] = useState('');
  const [structuredSchedule, setStructuredSchedule] = useState([]);

  const generatePlan = async () => {
    const days = calculateDays(planData.startDate, planData.endDate);
    try {
      const response = await fetch('http://localhost:3001/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCity: planData.fromCity,
          toCity: planData.destination,
          days,
          startDate: planData.startDate,
          endDate: planData.endDate,
          preferences: preference,
        }),
      });
      
      const data = await response.json();
      
      console.log("🐛 AI 返回的数据：", data);
          setPlan(data.markdown);
    setStructuredSchedule(data.schedule);

        if (data.schedule.length < days || data.schedule.some(day => day.items.length < 3)) {
      alert("⚠️ AI 行程结构可能不完整，可点击 Generate Plan 再试一次！也可以直接应用该行程并手动添加内容。");
    }
    } catch (err) {
      console.error('Error generating plan:', err);
    }
  };

  const handleApplyPlan = () => {
    localStorage.setItem("myPlan", JSON.stringify({ schedule: structuredSchedule }));
    navigate('/my-itinerary', { state: { markdown: plan, schedule: structuredSchedule } });
  };

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max((e - s) / (1000 * 60 * 60 * 24) + 1, 1);
  };

  return (
    <>
      <Navbar />
      <div className="app-container">
        <h1>AI Travel Planner</h1>
        <p>
          <strong>{planData.fromCity} → {planData.destination}</strong><br />
          Dates: <strong>{planData.startDate} → {planData.endDate}</strong>
        </p>

        <select value={preference} onChange={(e) => setPreference(e.target.value)}>
          <option value="">Select Preference</option>
          <option value="nature">Nature</option>
          <option value="history">History</option>
          <option value="food">Food</option>
        </select>
        <button onClick={generatePlan}>Generate Plan</button>

        {plan && (
          <div className="plan-layout">
            <div className="markdown-detail">
              <ReactMarkdown
            components={{
    h1: ({ node, ...props }) => <h1 className="md-h1" {...props} />,
    h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
    h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
    p: ({ node, ...props }) => <p className="md-p" {...props} />,
    li: ({ node, ...props }) => <li className="md-li" {...props} />,
    strong: ({ node, ...props }) => <strong className="md-strong" {...props} />,
        }}
    >
    {plan}
    </ReactMarkdown>

            </div>
            <div className="sidebar-card-view">
              <ScheduleCards schedule={structuredSchedule} />
            </div>
            
          </div>
        )}
        
      </div>
      <button className="apply-btn" onClick={handleApplyPlan}>Apply This Plan</button>
    </>
  );
}

function ScheduleCards({ schedule = [] }) {
  return (
    <div className="card-schedule-wrapper">
      {schedule.map((day, i) => (
        <div className="day-block" key={i}>
          <h3 className="day-title">{day.date}</h3>
          <div className="item-list">
            {day.items.map((item, j) => (
              <div className="schedule-item-card" key={j}>
                <div className="item-time">{item.timeRange.split("–")[0]}</div>

                {item.activities && item.activities.map((act, k) => (
                  <div className="item-details" key={k}>
                    <div className="item-title">{act.title}</div>
                    <div className="item-desc">
                      {act.description || act.highlights || act.tips || "No details provided."}
                    </div>
                    {act.duration && <div className="item-duration">⏱ {act.duration}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}





export default AIPlan;
