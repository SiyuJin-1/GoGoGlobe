const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require('cookie-parser');
const { connectRabbitMQ } = require("./utils/rabbitmq");
connectRabbitMQ();

require("./passport"); // 👈 加载 passport 设置

dotenv.config();

const app = express();

// CORS 设置（允许前端访问并携带 cookie）
app.use(cors({
  origin: ['http://localhost:3000',"http://localhost:3001"],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// 🧠 添加 session 支持
app.use(session({
  secret: process.env.SESSION_SECRET || "default_secret", // 你自己定义的 secret
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // 本地开发必须为 false，HTTPS 部署才为 true
    sameSite: 'none' // 或 'none'，但 'lax' 已足够应对 Google 登录回跳
  }
}));

// 🧠 启用 passport
app.use(passport.initialize());
app.use(passport.session());
app.use("/uploads", express.static("uploads")); // 图片可访问

// ✅ 接入 plan 接口
console.log("About to load plan routes...");
app.use("/api/plan", require("./routes/plan.route"));
console.log("Plan routes loaded successfully");

// ✅ 接入 auth 路由（包括 Google 登录）
console.log("About to load auth routes...");
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
console.log("Auth routes loaded successfully");

console.log("About to load trip routes...");
const tripRoutes = require('./routes/trip');
app.use('/api/trip', tripRoutes);
console.log("Trip routes loaded successfully");

const memberRoutes = require('./routes/member');
app.use("/api/members", memberRoutes);
console.log("Members routes loaded successfully");

const accommodationRoutes = require('./routes/accommodation');
app.use("/api/accommodations", accommodationRoutes);
console.log("Accommodation routes loaded successfully");

const expensesRoutes = require("./routes/expenses");
app.use("/api/expenses", expensesRoutes);
console.log("Expenses routes loaded successfully");

const notificationRoutes = require("./routes/notificationRoutes");
console.log("🚨 notificationRoutes 类型：", typeof notificationRoutes); // 👈 加这句
app.use("/api/notification", notificationRoutes);


// ✅ 基础测试接口
// console.log("About to load AI routes...");
// app.get("/", (req, res) => {
//   res.send("🌍 The AI travel backend has been launched");
// });
// console.log("AI routes loaded successfully");

// const path = require("path");
// app.use(express.static(path.resolve(__dirname, "../frontend/build")));
// // const fullPath = path.join(__dirname, "../frontend/build");
// // console.log("Static files path:", fullPath);
// // console.log("Index.html path:", path.join(fullPath, "index.html"));
// // console.log("Directory exists:", require('fs').existsSync(fullPath));

// const frontendRoutes = [
//   "/", "/login", "/register", "/my-itinerary", "/summary-card", 
//   "/create-plan", "/home"
// ];

// // 逐个绑定这些前端路由，返回 index.html
// frontendRoutes.forEach(route => {
//   app.get(route, (req, res) => {
//     res.sendFile(path.resolve(__dirname, "../frontend/build/index.html"));
//   });
// });


// ✅ 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
