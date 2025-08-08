import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./Splitwise.css";

export default function SplitwisePage() {
  const { id } = useParams();
  const [tripData, setTripData] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [memberData, setMemberData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [userTotals, setUserTotals] = useState({});

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/trip/user/${id}`);
        const trips = await res.json();
        if (Array.isArray(trips) && trips.length > 0) {
          setTripData(trips);
          setSelectedTripId(trips[0].id);
        }
      } catch (err) {
        console.error("❌ 获取行程失败:", err);
      }
    };
    fetchTrips();
  }, [id]);

  useEffect(() => {
    if (!selectedTripId) return;

    const fetchMembers = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/members?tripId=${selectedTripId}`);
        const members = await res.json();
        setMemberData(members);
      } catch (err) {
        console.error("❌ 获取成员失败:", err);
      }
    };

    const fetchExpenses = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/expenses?tripId=${selectedTripId}`);
        const data = await res.json();
        setExpenses(data);
        calculateTotals(data);
      } catch (err) {
        console.error("❌ 获取费用失败:", err);
      }
    };

    fetchMembers();
    fetchExpenses();
  }, [selectedTripId]);

  const calculateTotals = (data) => {
    const totals = {};
    for (const item of data) {
      const id = item.payerId;
      if (!totals[id]) totals[id] = 0;
      totals[id] += parseFloat(item.amount);
    }
    setUserTotals(totals);
  };

  const calculateBalances = () => {
    if (memberData.length === 0) return [];
    const numMembers = memberData.length;
    const total = Object.values(userTotals).reduce((sum, val) => sum + val, 0);
    const avg = total / numMembers;

    const balances = memberData.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      balance: (userTotals[m.user.id] || 0) - avg,
    }));

    const payables = [];
    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.balance, creditor.balance);

      payables.push({
        from: debtor.email,
        to: creditor.email,
        amount: amount.toFixed(2),
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }
    return payables;
  };

  const handleAddExpense = () => {
    const newItem = { note: "", amount: 0, payerId: null };
    const updated = [...expenses, newItem];
    setExpenses(updated);
    saveExpenses(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...expenses];
    updated[index][field] = field === "payerId" ? Number(value) : value;
    setExpenses(updated);
    saveExpenses(updated);
  };

  const saveExpenses = async (updated) => {
    try {
      const res = await fetch("http://localhost:3001/api/expenses/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          expenses: updated.map((e) => ({
            ...e,
            amount: parseFloat(e.amount) || 0,
            payerId: e.payerId ? Number(e.payerId) : null,
          })),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("❌ 自动保存失败:", text);
      } else {
        calculateTotals(updated);
      }
    } catch (err) {
      console.error("❌ 自动保存失败:", err);
    }
  };

  const currentUser = memberData.find((m) => m.user.id === Number(id));
  const currentUserEmail = currentUser?.user?.email || "";
  const currentUserTotal = userTotals[currentUser?.user?.id] || 0;
  const balances = calculateBalances();

  return (
    <>
      <Navbar />
      <SubNavBar />

      <div className="trip-selector center">
        <label htmlFor="tripSelect">选择行程：</label>
        <select
          id="tripSelect"
          value={selectedTripId ?? ""}
          onChange={(e) => setSelectedTripId(Number(e.target.value))}
        >
          <option value="">选择行程</option>
          {tripData.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.fromCity} → {trip.destination}
            </option>
          ))}
        </select>
      </div>

      <div className="splitwise-grid">
        {/* 左侧总支出卡片 */}
        <div className="splitwise-card left">
          <h4>每人总支出</h4>

          {memberData.map((m) => (
            <div className="user-finance-entry" key={m.user.id}>
              <span>{m.user.email}</span>
              <span className="amount-positive" style={{fontWeight: "bold" }}>${(userTotals[m.user.id] || 0).toFixed(2)}</span>
            </div>
          ))}

          {memberData.length > 0 && (
            <div className="user-finance-entry" style={{ marginTop: "0.8rem", fontWeight: "bold", borderTop: "1px solid #eee", paddingTop: "0.5rem" }}>
              <span>人均支出</span>
              <span>
                ${(Object.values(userTotals).reduce((sum, val) => sum + val, 0) / memberData.length).toFixed(2)}
              </span>
            </div>
          )}
            <div className="avg-spending-separator"></div>

          {/* 👇 所有人账单汇总提前放上来 */}
          <h4 style={{ marginTop: "2rem" }}>所有人账单汇总</h4>
          {memberData.map((member) => {
            const from = member.user.email;
            const userPayments = balances.filter((b) => b.from === from);

            return (
              <div key={from} className="user-balance-block">
                <strong>{from} 需要支付：</strong>
                {userPayments.length === 0 ? (
                  <div className="no-payment">无需支付任何人</div>
                ) : (
                  userPayments.map((p, idx) => (
                    <div key={idx} className="user-finance-entry">
                      <span>➜ {p.to}</span> 
                      <span className="amount-negative" style={{fontWeight: "bold" }}>${p.amount}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        <div className="avg-spending-separator"></div>
          <h4 style={{ marginTop: "2rem" }}>你的账单</h4>
          
          <div className="user-finance-entry">
            <span style={{ marginTop: "1.2rem", fontWeight: "bold" }}>你的总支出</span>
            <span className="amount-positive" style={{ marginTop: "1.2rem", fontWeight: "bold" }}>${currentUserTotal.toFixed(2)}</span>
          </div>
          <div className="user-finance-entry">
            <span style={{ marginTop: "1.2rem", fontWeight: "bold" }}>你需要支付：</span>
          </div>
          {balances.filter((b) => b.from === currentUserEmail).length > 0 ? (
  <>
    {/* <h5 style={{ marginTop: "0.5rem" }}>🔻 你需要支付：</h5> */}
    {balances
      .filter((b) => b.from === currentUserEmail)
      .map((p, idx) => (
        <div className="user-finance-entry" key={idx}>
          <span>你 ➜ {p.to}</span>
          <span className="amount-negative" style={{fontWeight: "bold" }}>${p.amount}</span>
        </div>
      ))}
  </>
) : (
  <div className="no-payment">无需支付任何人</div>
)}
<div className="user-finance-entry"></div>

          {balances.filter((b) => b.to === currentUserEmail).length > 0 && (
            <>
              <h5 style={{ marginTop: "1.2rem", fontWeight: "bold" }}>别人需要付给你：</h5>
              {balances
                .filter((b) => b.to === currentUserEmail)
                .map((p, idx) => (
                  <div className="user-finance-entry" key={idx}>
                    <span>{p.from} ➜ 你</span>
                    <span className="amount-positive" style={{fontWeight: "bold" }}>${p.amount}</span>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* 右侧费用分摊卡片 */}
        <div className="splitwise-card right">
          <h3>费用分摊</h3>
          {expenses.map((item, index) => (
            <div className="budget-item" key={index}>
              <input
                value={item.note}
                onChange={(e) => handleChange(index, "note", e.target.value)}
                placeholder="项目名称"
              />
              <input
                type="number"
                step="0.01"
                value={item.amount}
                onChange={(e) => handleChange(index, "amount", e.target.value)}
                placeholder="金额"
              />
              <select
                value={item.payerId ?? ""}
                onChange={(e) => handleChange(index, "payerId", e.target.value)}
              >
                <option value="">选择付款人</option>
                {memberData.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user?.email || "未知用户"}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button className="add-btn" onClick={handleAddExpense}>
            ➕ 添加费用
          </button>
        </div>
      </div>
    </>
  );
}