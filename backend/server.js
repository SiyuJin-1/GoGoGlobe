const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const rateLimit = require('express-rate-limit');

// ✅ NEW: 引入我们写好的 MQ 初始化函数
const { initRabbit } = require("./utils/rabbitmq");

dotenv.config();
const app = express();

/* ---------- CORS（带凭证） ---------- */
const ALLOWED_ORIGINS = ['http://localhost', 'http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
}));

/* ---------- Passport ---------- */
require("./passport");
app.use(passport.initialize());
app.use(passport.session());

app.use("/uploads", express.static("uploads"));

/* ---------- 登录态接口 ---------- */
app.get("/api/auth/me", (req, res) => {
  if (req.user?.id) return res.json({ user: { id: req.user.id, email: req.user.email } });
  if (req.session?.user?.id) return res.json({ user: req.session.user });
  return res.json({ user: null });
});

app.post("/api/dev/login-as/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "bad id" });
  req.session.user = { id };
  res.json({ ok: true, user: req.session.user });
});

/* ---------- 业务路由 ---------- */
app.use("/api/plan", require("./routes/plan.route"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/trip", require("./routes/trip"));
app.use("/api/members", require("./routes/member"));
app.use("/api/accommodations", require("./routes/accommodation"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("/api/photo", require("./routes/photo"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api", require("./routes/debug"));

app.get('/api/auth/debug/set', (req, res) => {
  req.session.user = { id: 999, email: 'debug@local' };
  req.session.save(() => res.json({ ok: true, sid: req.sessionID }));
});

app.get('/api/auth/debug/get', (req, res) => {
  res.json({ sid: req.sessionID, user: req.session?.user || null });
});

/* 在业务路由注册附近，加这个“反向代理”路由 —— 注意在 app.listen 之前 */
const geocodeLimiter = rateLimit({ windowMs: 1000, max: 1 }); // 1 req / sec

app.get("/api/geocode/reverse", geocodeLimiter, async (req, res) => {
  try {
    const { lat, lon, lang = "en" } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "lat/lon required" });

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("accept-language", lang);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("namedetails", "1");
    // 官方允许提供 email，建议加上
    if (process.env.CONTACT_EMAIL) url.searchParams.set("email", process.env.CONTACT_EMAIL);

    const r = await fetch(url.toString(), {
      headers: {
        // 按使用政策标识应用和联系人
        "User-Agent": `gogoglobe/1.0 (${process.env.CONTACT_EMAIL || "contact@example.com"})`
      }
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text || r.statusText });
    }

    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error("reverse geocode proxy error:", e);
    res.status(500).json({ error: "proxy failed" });
  }
});

// 正向地理（新增）
app.get('/api/geocode/search', geocodeLimiter, async (req, res) => {
  try {
    const { q, limit = 5, lang = 'en', country } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('accept-language', lang);
    if (country) url.searchParams.set('countrycodes', country);
    if (process.env.CONTACT_EMAIL) url.searchParams.set('email', process.env.CONTACT_EMAIL);

    const r = await fetch(url.toString(), {
      headers: { 'User-Agent': `gogoglobe/1.0 (${process.env.CONTACT_EMAIL || 'contact@example.com'})` }
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() || r.statusText });
    res.json(await r.json());
  } catch (e) {
    console.error('search geocode proxy error:', e);
    res.status(500).json({ error: 'proxy failed' });
  }
});
const PORT = process.env.PORT || 3001;

// ✅ NEW: 启动时先连 RabbitMQ（失败会打日志，成功会打印 [RMQ] connected）
initRabbit().catch(err => {
  console.error("[RMQ] init failed:", err?.message || err);
});

app.listen(PORT, '0.0.0.0', () => console.log(`listening on ${PORT}`));
