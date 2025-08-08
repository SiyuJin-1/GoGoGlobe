import React, { useRef, useState } from "react";
import "./AccommodationForm.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:3001";

export default function AccommodationForm({
  userId,
  tripList,
  selectedTripId,
  setSelectedTripId,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    checkIn: "",
    checkOut: "",
    bookingUrl: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 约束
  const MAX_MB = 10;
  const ALLOW_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOW_TYPES.includes(f.type)) return alert("仅支持 JPG / PNG / WebP");
    if (f.size > MAX_MB * 1024 * 1024) return alert(`文件不得超过 ${MAX_MB}MB`);
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // 直传 S3（住宿图 -> 公开桶）
  async function uploadToS3(file, { userId, tripId }) {
    // 1) 取预签名（注意 kind）
    const r1 = await fetch(`${API_BASE}/api/upload/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        userId,
        tripId,
        kind: "accommodation", // 👈 住宿图用公开桶；以后“照片”用 "photo"
        size: file.size,
      }),
    });
    if (!r1.ok) {
      const msg = await r1.text().catch(() => "");
      throw new Error("获取签名失败：" + msg);
    }
    const { uploadUrl, publicUrl, key } = await r1.json();

    // 2) PUT 到 S3（Content-Type 必须和签名一致）
    const r2 = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!r2.ok) {
      const msg = await r2.text().catch(() => "");
      throw new Error("上传到 S3 失败：" + msg);
    }

    return { publicUrl, key };
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();

    if (!selectedTripId) return alert("请选择行程");
    if (!form.name || !form.checkIn || !form.checkOut) {
      return alert("请填写完整信息（名称、入住、退房）");
    }
    // 简单日期校验：checkIn <= checkOut
    if (form.checkIn && form.checkOut) {
      const inD = new Date(form.checkIn);
      const outD = new Date(form.checkOut);
      if (inD > outD) return alert("退房日期必须晚于或等于入住日期");
    }

    try {
      setLoading(true);

      // ① 可选：先直传 S3（公开桶）
      let imageUrl = "";
      let imageKey = "";
      if (imageFile) {
        const { publicUrl, key } = await uploadToS3(imageFile, {
          userId,
          tripId: selectedTripId,
        });
        imageUrl = publicUrl; // 公开 URL，可直接展示
        imageKey = key;       // 也存 key，方便后续删除/迁移
      }

      // ② 保存到数据库
      const res = await fetch(`${API_BASE}/api/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          name: form.name,
          address: form.address,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          bookingUrl: form.bookingUrl,
          imageUrl,  // S3 直链（公开）
          imageKey,  // S3 key
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) throw new Error(data?.message || "保存失败");

      alert("✅ 添加成功");
      // 重置表单
      setForm({ name: "", address: "", checkIn: "", checkOut: "", bookingUrl: "" });
      setImageFile(null);
      setPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("❌ 失败：" + (err.message || "未知错误"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h3 className="accommodation-title">Add New Accommodation</h3>

      {/* 如需在表单里切换行程，放开下方注释 */}
      {/* {tripList?.length > 0 && setSelectedTripId && (
        <select
          value={selectedTripId ?? ""}
          onChange={(e) => setSelectedTripId(Number(e.target.value))}
          style={{ marginBottom: 8 }}
        >
          {tripList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fromCity} ➝ {t.destination}
            </option>
          ))}
        </select>
      )} */}

      <input
        name="name"
        value={form.name}
        onChange={onChange}
        placeholder="🏨 Accommodation Name"
      />
      <input
        name="address"
        value={form.address}
        onChange={onChange}
        placeholder="📍 Address"
      />
      <input
        name="checkIn"
        type="date"
        value={form.checkIn}
        onChange={onChange}
      />
      <input
        name="checkOut"
        type="date"
        value={form.checkOut}
        onChange={onChange}
      />
      <input
        name="bookingUrl"
        value={form.bookingUrl}
        onChange={onChange}
        placeholder="🔗 Link"
      />

      <div style={{ display: "grid", gap: 6 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOW_TYPES.join(",")}
          onChange={onPickFile}
        />
        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{ width: 240, height: 160, objectFit: "cover", borderRadius: 8 }}
          />
        )}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "上传中..." : "Upload"}
      </button>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
        支持类型：JPG/PNG/WebP，最大 {MAX_MB}MB
      </div>
    </form>
  );
}
