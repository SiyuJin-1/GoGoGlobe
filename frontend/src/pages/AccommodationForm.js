import React, { useState } from "react";
import "./AccommodationForm.css";

export default function AccommodationForm({ tripList, selectedTripId, setSelectedTripId, onSuccess }) {
  const [form, setForm] = useState({ name: "", address: "", checkIn: "", checkOut: "", bookingUrl: "" });
  const [imageFile, setImageFile] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleFileChange = (e) => setImageFile(e.target.files[0]);

  const handleSubmit = async () => {
  if (!form.name || !form.checkIn || !form.checkOut)
    return alert("请填写完整信息");

  const formData = new FormData();
  formData.append("tripId", selectedTripId);
  formData.append("name", form.name);
  formData.append("address", form.address);
  formData.append("checkIn", form.checkIn);
  formData.append("checkOut", form.checkOut);
  formData.append("bookingUrl", form.bookingUrl);
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await fetch("http://localhost:3001/api/accommodations", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.id) {
    alert("✅ 上传成功");
    setForm({ name: "", address: "", checkIn: "", checkOut: "", bookingUrl: "" });
    setImageFile(null);
    onSuccess && onSuccess();
  } else {
    alert("❌ 上传失败");
  }
};


  return (
    <div className="form-card">
      <h3 className="accommodation-title">Add New Accommodation</h3>
      <input name="name" value={form.name} onChange={handleChange} placeholder="🏨 Accommodation Name" />
      <input name="address" value={form.address} onChange={handleChange} placeholder="📍 Address" />
      <input name="checkIn" type="date" value={form.checkIn} onChange={handleChange} />
      <input name="checkOut" type="date" value={form.checkOut} onChange={handleChange} />
      <input name="bookingUrl" value={form.bookingUrl} onChange={handleChange} placeholder="🔗 Link" />
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleSubmit}>Upload</button>
    </div>
  );
}
