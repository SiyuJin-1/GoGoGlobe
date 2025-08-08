import React, { useState } from "react";

export default function UploadPhotoForm({ tripId, dayIndex, onUpload }) {
  const [files, setFiles] = useState([]);
  const [placeName, setPlaceName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public"); // 默认是 public
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId || !tripId || !dayIndex || files.length === 0) {
      alert("请填写完整信息并选择照片");
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("tripId", tripId);
        formData.append("uploadedBy", userId);
        formData.append("dayIndex", dayIndex);
        formData.append("placeName", placeName);
        formData.append("description", description);
        formData.append("visibility", visibility); // 👈 可选 public/private

        const res = await fetch("http://localhost:3001/api/photo", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(await res.text());
      }

      setFiles([]);
      setPlaceName("");
      setDescription("");
      alert("✅ 上传成功！");
      onUpload(); // 通知父组件刷新
    } catch (err) {
      console.error("❌ 上传失败:", err);
      alert("上传失败：" + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-form-card">
      <h4>📤 Upload New Photo</h4>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />

      <input
        type="text"
        placeholder="📍 Place Name"
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
      />

      <input
        type="text"
        placeholder="📝 Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <select
        value={visibility}
        onChange={(e) => setVisibility(e.target.value)}
      >
        <option value="public">🌍 Public</option>
        <option value="private">🔒 Private</option>
      </select>

      <button onClick={handleUpload} disabled={!files.length || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
