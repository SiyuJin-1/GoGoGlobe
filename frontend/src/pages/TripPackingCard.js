import React, { useState } from "react";
import "./PackingList.css";

export default function PackingListGroupCard({ groupTitle, items, onUpdate }) {
  const [newItem, setNewItem] = useState("");

  const handleToggle = (i) => {
    const updated = [...items];
    updated[i].packed = !updated[i].packed;
    onUpdate(updated);
  };

  const handleDelete = (i) => {
    const updated = items.filter((_, idx) => idx !== i);
    onUpdate(updated);
  };

  const handleAdd = () => {
    if (!newItem.trim()) return;
    const updated = [...items, { name: newItem, packed: false }];
    onUpdate(updated);
    setNewItem("");
  };

  return (
    <div className="packing-group-card">
      <div className="group-title">
        <span>{groupTitle}</span>
        <span className="count">({items.length})</span>
      </div>

      <ul className="packing-item-list">
        {items.map((item, i) => (
          <li key={i} className="packing-item">
            <input
              type="checkbox"
              checked={item.packed}
              onChange={() => handleToggle(i)}
            />
            <span className={`item-name ${item.packed ? "checked" : ""}`}>
              {item.name}
            </span>
            <button className="edit-btn">✏️</button>
            <button className="delete-btn" onClick={() => handleDelete(i)}>
              🗑
            </button>
          </li>
        ))}
      </ul>

      <div className="add-new-item">
        <input
          type="text"
          placeholder="添加新物品..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <button onClick={handleAdd}>添加</button>
      </div>
    </div>
  );
}
