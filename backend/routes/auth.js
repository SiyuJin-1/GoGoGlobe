const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const passport = require('passport');

const prisma = new PrismaClient();

// ✅ 注册
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash }
    });
    res.json({ message: 'User registered', userId: user.id });
  } catch (err) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// ✅ 登录
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // ✅ 使用 passport 内置的 req.login() 来创建 session
    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ message: 'Login successful', userId: user.id });
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});



// ✅ Google 登录入口：重定向到 Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account' 
}));

// ✅ Google 登录回调：Google 成功认证后跳回这里
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res, next) => {
    // 手动将用户写入 session
    req.login(req.user, (err) => {
      if (err) return next(err);
      console.log("✅ Google 登录成功，已写入 session:", req.user);
      // 🔥 返回 JSON 而不是直接跳转
    //   res.json({ message: 'Login successful', user: req.user });
      res.redirect('http://localhost:3000/home'); // 或你的前端主页

    });
  }
);



// ✅ 获取当前登录状态（可选）
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// backend/routes/auth.js

router.get("/user", (req, res) => {
    console.log("👀 Session ID:", req.sessionID);
  console.log("👀 Session content:", req.session);
  console.log("👀 User in session:", req.user);
  console.log("👀 isAuthenticated():", req.isAuthenticated());

  if (req.isAuthenticated()) {
    res.json(req.user);  // 通常包含 id, email, name 等
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

// ✅ 登出路由：销毁 session
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });

    // 可选：销毁 session 数据
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // 默认的 session cookie 名称
      res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
