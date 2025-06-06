import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './CreatePlan.css';
import Navbar from './Navbar';

function CreatePlan() {
  const [planMode, setPlanMode] = useState(""); // 默认选择 AI 模式
  
  const [fromCity, setFromCity] = useState('');

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
//   const [participants, setParticipants] = useState("");
  const navigate = useNavigate();
  const isDateValid = new Date(startDate) <= new Date(endDate);
  const isFormValid =
  fromCity && destination && startDate && endDate && isDateValid && planMode;


  const handleSubmit = (e) => {
    e.preventDefault();

    const planData = {
    destination,
    startDate,
    fromCity,
    endDate,
    // participants,
    planMode,
    };
    localStorage.setItem("planData", JSON.stringify(planData));

    if (planMode === "ai") {
        navigate("/aiplan", { state: planData });
    } else {
        navigate("/manualplan", { state: planData });
    }
  };

  return (
    <>
    <Navbar />
      <div className="create-plan-container">
        <div className="text-wrapper">
        <h1>Create Your Trip Plan </h1>

        <form className="create-form" onSubmit={handleSubmit}>

    <div className="form-row">
        <label>From:</label>
        <input type="text" 
               placeholder="e.g., San Francisco" 
               value={fromCity} 
               onChange={(e) => setFromCity(e.target.value)}  />
    </div>
  
    <div className="form-row">
        <label>To:</label>
        <input type="text" 
            placeholder="e.g., Paris" 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}/>
    </div>

    <div className="form-row">
        <label>Start Date:</label>
        <input type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}/>
    </div>

    <div className="form-row">
        <label>End Date:</label>
        <input type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}/>
    </div>

    {/* <div className="form-row">
        <label>Who’s joining?</label>
        <input type="text" placeholder="Enter emails or names" 
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}/>
    </div> */}

    <div className="form-row">
        <label>Plan Mode:</label>
        <div className="radio-group">
        <label>
        <input
            type="radio"
            name="planMode"
            value="ai"
            checked={planMode === "ai"}
            onChange={() => setPlanMode("ai")}
        />
            Use AI to help plan
        </label>

        <label>
        <input
            type="radio"
            name="planMode"
            value="manual"
            checked={planMode === "manual"}
            onChange={() => setPlanMode("manual")}
        />
            I’ll plan manually
        </label>
    </div>
    </div>

    <button type="button" onClick={handleSubmit} disabled={!isFormValid}>
  Next
</button>

    </form>
    {startDate && endDate && !isDateValid && (
  <p style={{ color: 'red', fontSize: '0.9rem' }}>
    Start date must be before or equal to end date.
  </p>
)}

      </div>
    </div>
    </>
  );
}

export default CreatePlan;
