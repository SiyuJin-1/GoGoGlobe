// src/pages/Splitwise.js
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./Splitwise.css";

const API_BASE = process.env.REACT_APP_API_BASE || "/api";


export default function SplitwisePage() {
  const { id: idFromRoute } = useParams();

  const [uid, setUid] = useState(null);
  const [tripData, setTripData] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [memberData, setMemberData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [userTotals, setUserTotals] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Small helper: fetch JSON and guard against HTML responses
  const getJSON = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const body = await res.text();
      throw new Error(`Expected JSON, got ${ct}: ${body.slice(0, 120)}…`);
    }
    if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
    return res.json();
  };

  // Resolve userId: route param -> localStorage -> /api/auth/me
  useEffect(() => {
    (async () => {
      let id = idFromRoute || localStorage.getItem("userId");
      if (!id) {
        try {
          const me = await getJSON("/auth/me");
          if (me?.user?.id) {
            id = String(me.user.id);
            localStorage.setItem("userId", id);
          }
        } catch {}
      }
      if (id) setUid(Number(id));
    })();
  }, [idFromRoute]);

  // Fetch trips for current user
  useEffect(() => {
    if (uid == null) return;
    (async () => {
      try {
        const trips = await getJSON(`/trip/user/${uid}`);
        if (Array.isArray(trips) && trips.length > 0) {
          setTripData(trips);
          setSelectedTripId(trips[0].id);
        } else {
          setTripData([]);
          setSelectedTripId(null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch trips:", err);
        setTripData([]);
      }
    })();
  }, [uid]);

  // Fetch members & expenses for the selected trip
  useEffect(() => {
    if (!selectedTripId) return;

    (async () => {
      try {
        const members = await getJSON(`/members?tripId=${selectedTripId}`);
        setMemberData(Array.isArray(members) ? members : []);
      } catch (err) {
        console.error("❌ Failed to fetch members:", err);
        setMemberData([]);
      }

      try {
        const data = await getJSON(`/expenses?tripId=${selectedTripId}`);
        const list = Array.isArray(data) ? data : [];
        setExpenses(list);
        calculateTotals(list);
        setDirty(false);
      } catch (err) {
        console.error("❌ Failed to fetch expenses:", err);
        setExpenses([]);
        setUserTotals({});
        setDirty(false);
      }
    })();
  }, [selectedTripId]);

  // Build per-user totals
  const calculateTotals = (data) => {
    const totals = {};
    for (const item of data) {
      const pid = Number(item.payerId);
      if (!Number.isFinite(pid)) continue;
      if (!totals[pid]) totals[pid] = 0;
      totals[pid] += parseFloat(item.amount) || 0;
    }
    setUserTotals(totals);
  };

  // Compute settlement: who pays whom
  const calculateBalances = () => {
    if (!memberData.length) return [];
    const total = Object.values(userTotals).reduce((s, v) => s + v, 0);
    const avg = memberData.length ? total / memberData.length : 0;

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

      payables.push({ from: debtor.email, to: creditor.email, amount: amount.toFixed(2) });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }
    return payables;
  };

  // Is a row ready to save?
  const isCompleteRow = (e) =>
    String(e.note || "").trim().length > 0 &&
    Number.isFinite(Number(e.amount)) &&
    Number(e.amount) > 0 &&
    Number.isInteger(Number(e.payerId)) &&
    Number(e.payerId) > 0;

  // UI actions
  const handleAddExpense = () => {
    if (!selectedTripId) {
      alert("Please select a trip first.");
      return;
    }
    setExpenses((prev) => [...prev, { note: "", amount: "", payerId: "" }]);
    setDirty(true);
  };

  const handleChange = (index, field, value) => {
    const updated = [...expenses];
    updated[index][field] = field === "payerId" ? (value === "" ? "" : Number(value)) : value;
    setExpenses(updated);
    setDirty(true);
  };

  const removeRow = (idx) => {
    const updated = expenses.filter((_, i) => i !== idx);
    setExpenses(updated);
    setDirty(true);
  };

  const handleSave = async () => {
    const payload = expenses.filter(isCompleteRow);
    if (payload.length === 0) {
      alert("No complete expense rows to save.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/expenses/save`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          expenses: payload.map((e) => ({
            note: String(e.note || "").trim(),
            amount: Number(e.amount),
            payerId: Number(e.payerId),
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      calculateTotals(expenses);
      setDirty(false);
      alert("✅ Saved");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("❌ Save failed. Please check amount and payer.");
    } finally {
      setSaving(false);
    }
  };

  const balances = calculateBalances();
  const currentUser = memberData.find((m) => m.user.id === uid);
  const currentUserEmail = currentUser?.user?.email || "";
  const currentUserTotal = userTotals[uid] || 0;

  return (
    <>
      <Navbar />
      <SubNavBar />

      <div className="trip-selector center">
        <label htmlFor="tripSelect">Select Trip:</label>
        <select
          id="tripSelect"
          value={selectedTripId ?? ""}
          onChange={(e) => setSelectedTripId(Number(e.target.value))}
        >
          <option value="">Select a trip</option>
          {tripData.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.fromCity} → {trip.destination}
            </option>
          ))}
        </select>
      </div>

      <div className="splitwise-grid">
        {/* Left: summary */}
        <div className="splitwise-card left">
          <h4 style={{ fontWeight: "bold", textAlign: "center" }}>Total Spent per Person</h4>
          {memberData.map((m) => (
            <div className="user-finance-entry" key={m.user.id}>
              <span>{m.user.email}</span>
              <span className="amount-positive" style={{ fontWeight: "bold" }}>
                ${(userTotals[m.user.id] || 0).toFixed(2)}
              </span>
            </div>
          ))}

          {memberData.length > 0 && (
            <div
              className="user-finance-entry"
              style={{ marginTop: "0.8rem", fontWeight: "bold", borderTop: "1px solid #eee", paddingTop: "0.5rem" }}
            >
              <span>Average per Person</span>
              <span>
                $
                {(
                  Object.values(userTotals).reduce((sum, val) => sum + val, 0) /
                  memberData.length
                ).toFixed(2)}
              </span>
            </div>
          )}

          <div className="avg-spending-separator"></div>

          <h4 style={{ marginTop: "2rem", fontWeight: "bold", textAlign: "center" }}>Who Pays Whom</h4>
          {memberData.map((member) => {
            const from = member.user.email;
            const userPayments = balances.filter((b) => b.from === from);
            return (
              <div key={from} className="user-balance-block">
                <strong>{from} should pay:</strong>
                {userPayments.length === 0 ? (
                  <div className="no-payment">No payments needed</div>
                ) : (
                  userPayments.map((p, idx) => (
                    <div key={idx} className="user-finance-entry">
                      <span>➜ {p.to}</span>
                      <span className="amount-negative" style={{ fontWeight: "bold" }}>
                        ${p.amount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            );
          })}

          <div className="avg-spending-separator"></div>

          <h4 style={{ marginTop: "2rem", fontWeight: "bold", textAlign: "center" }}>Your Summary</h4>
          <div className="user-finance-entry">
            <span style={{ marginTop: "1.2rem", fontWeight: "bold" }}>Your total spending</span>
            <span className="amount-positive" style={{ marginTop: "1.2rem", fontWeight: "bold" }}>
              ${currentUserTotal.toFixed(2)}
            </span>
          </div>

          <div className="user-finance-entry">
            <span style={{ marginTop: "1.2rem", fontWeight: "bold" }}>You should pay:</span>
          </div>

          {balances.filter((b) => b.from === currentUserEmail).length > 0 ? (
            balances
              .filter((b) => b.from === currentUserEmail)
              .map((p, idx) => (
                <div className="user-finance-entry" key={idx}>
                  <span>You ➜ {p.to}</span>
                  <span className="amount-negative" style={{ fontWeight: "bold" }}>
                    ${p.amount}
                  </span>
                </div>
              ))
          ) : (
            <div className="no-payment">No payments needed</div>
          )}

          {balances.filter((b) => b.to === currentUserEmail).length > 0 && (
            <>
              <h5 style={{ marginTop: "1.2rem", fontWeight: "bold" }}>Others owe you:</h5>
              {balances
                .filter((b) => b.to === currentUserEmail)
                .map((p, idx) => (
                  <div className="user-finance-entry" key={idx}>
                    <span>{p.from} ➜ You</span>
                    <span className="amount-positive" style={{ fontWeight: "bold" }}>
                      ${p.amount}
                    </span>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Right: editor */}
        <div className="splitwise-card right">
          <h3 style={{ marginTop: "2rem", marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold", textAlign: "center" }}>Expenses</h3>

          {expenses.map((item, index) => (
            <div className="budget-item budget-row" key={index}>
              <input
                value={item.note}
                onChange={(e) => handleChange(index, "note", e.target.value)}
                placeholder="Item name"
              />
              <input
                type="number"
                step="0.01"
                value={item.amount}
                onChange={(e) => handleChange(index, "amount", e.target.value)}
                placeholder="Amount"
              />
              <select
                value={item.payerId === "" ? "" : item.payerId ?? ""}
                onChange={(e) => handleChange(index, "payerId", e.target.value)}
              >
                <option value="">Select payer</option>
                {memberData.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user?.email || "Unknown user"}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="icon-btn trash"
                aria-label="Delete"
                title="Delete this row"
                onClick={() => removeRow(index)}
              >
                {/* Trash icon */}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}

          {/* Bottom actions */}
          <div className="actions-bottom">
            <button className="add-btn" onClick={handleAddExpense}>
            Add Expense
            </button>
            <button
              className="add-btn"
              onClick={handleSave}
              disabled={saving || !dirty || !expenses.some(isCompleteRow)}
              style={{ opacity: saving || !dirty ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
