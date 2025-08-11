import React, { useState, useMemo } from "react";
import "./UploadPhotoForm.css"; // 确保有样式文件

const ALLOW_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 15;

// 建议复用你的 API_BASE
const API_BASE = process.env.REACT_APP_API_BASE || "/api";

export default function UploadPhotoForm({ tripId, dayIndex, onUpload }) {
  const [files, setFiles] = useState([]);
  const [placeName, setPlaceName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public"); // 只用于落库权限，不影响桶
  const [uploading, setUploading] = useState(false);

  const userId = useMemo(() => Number(localStorage.getItem("userId")), []);

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    const bad = [];
    const ok = picked.filter((f) => {
      const validType = ALLOW_TYPES.includes(f.type);
      const validSize = f.size <= MAX_MB * 1024 * 1024;
      if (!validType || !validSize) bad.push(f.name);
      return validType && validSize;
    });
    if (bad.length) {
      alert(`以下文件不符合要求（JPG/PNG/WebP，≤ ${MAX_MB}MB）：\n` + bad.join("\n"));
    }
    setFiles(ok);
  };

  // 👉 只传 kind:"photo"，让后端统一放到“照片私有桶”
  async function getSignedUrl(file, { userId, tripId }) {
    const r = await fetch(`${API_BASE}/upload/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        userId,
        tripId,
        kind: "photo",     // ✅ 固定使用 photo；不再传 visibility
        size: file.size,
      }),
    });
    if (!r.ok) throw new Error("获取签名失败：" + (await r.text().catch(() => "")));
    return r.json(); // { uploadUrl, key, bucket }
  }

  const handleUpload = async () => {
    if (!userId || !tripId || dayIndex == null) {
      alert("缺少必要信息（userId / tripId / dayIndex）");
      return;
    }
    if (!files.length) return alert("请选择照片");

    setUploading(true);
    try {
      for (const file of files) {
        // 1) 取 PUT 预签名（进入私有桶）
        const { uploadUrl, key } = await getSignedUrl(file, { userId, tripId });

        // 2) 直传 S3（Content-Type 必须一致）
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error(`上传到 S3 失败：${file.name} — ` + (await putRes.text().catch(() => "")));
        }

        // 3) 落库 —— 这里才区分 public/private
        //    因为都在私有桶里，所以 imageUrl 一律 null（展示时用 GET 预签名）
        const metaRes = await fetch(`${API_BASE}/photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId: Number(tripId),
            uploadedBy: Number(userId),
            dayIndex: Number(dayIndex),
            placeName: placeName || null,
            description: description || null,
            visibility,          // ✅ 权限控制在库里
            imageKey: key,       // ✅ 必须
            imageUrl: null,      // ✅ 统一私有桶，不写直链
          }),
        });
        if (!metaRes.ok) {
          throw new Error(`保存元数据失败：${file.name} — ` + (await metaRes.text().catch(() => "")));
        }
      }

      setFiles([]);
      setPlaceName("");
      setDescription("");
      alert("✅ 全部照片上传成功");
      onUpload?.();
    } catch (err) {
      console.error("❌ 上传失败:", err);
      alert(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-form-card">
      <h4 style={{ textAlign: "center" }}>Upload New Photo</h4>

      <input type="file" multiple accept={ALLOW_TYPES.join(",")} onChange={handlePick} />

      <input
        type="text"
        placeholder="Place Name"
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
      />

      <input
        type="text"
        placeholder="Photo Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* 仅影响落库后的访问权限，不影响 S3 桶 */}
      <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
        <option value="public">Public (Trip Member)</option>
        <option value="private">Private (Only Uploader)</option>
      </select>

      <button onClick={handleUpload} disabled={!files.length || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {!!files.length && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          Choose {files.length} photos; only support JPG/PNG/WebP, single ≤ {MAX_MB}MB
        </div>
      )}
    </div>
  );
}
