const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");

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

const PORT = process.env.PORT || 3001;

// ✅ NEW: 启动时先连 RabbitMQ（失败会打日志，成功会打印 [RMQ] connected）
initRabbit().catch(err => {
  console.error("[RMQ] init failed:", err?.message || err);
});

app.listen(PORT, '0.0.0.0', () => console.log(`listening on ${PORT}`));
