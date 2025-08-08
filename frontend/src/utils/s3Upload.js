export async function uploadToS3(file, { userId, tripId }) {
  // 1. 向后端要预签名 URL
  const r = await fetch("http://localhost:3001/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, userId, tripId })
  });
  if (!r.ok) throw new Error("获取签名失败");
  const { uploadUrl, publicUrl, key } = await r.json();

  // 2. 直接 PUT 到 S3（注意带 Content-Type）
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });
  if (!put.ok) throw new Error("上传到 S3 失败");

  // 3. 把 S3 的地址返回，用于存数据库
  return { url: publicUrl, key };
}
