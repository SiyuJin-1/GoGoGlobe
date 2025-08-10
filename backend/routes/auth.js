const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const passport = require('passport');

const prisma = new PrismaClient();

// 前端地址（端口 3000），以及成功/失败回跳路径
const CLIENT_URL = (process.env.CLIENT_URL?.replace(/\/+$/, '')) || 'http://localhost:3000';
const SUCCESS_PATH = process.env.SUCCESS_PATH || '/';       // ← 你也可以改成 '/dashboard' 等
const FAILURE_PATH = process.env.FAILURE_PATH || '/login';

/* ========== 本地注册/登录 ========== */

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash } });

    req.login({ id: user.id, email: user.email }, (err) => {
      if (err) return res.status(500).json({ error: 'login error' });
      req.session.user = { id: user.id, email: user.email };
      return res.json({ message: 'User registered', userId: user.id });
    });
  } catch {
    return res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.login({ id: user.id, email: user.email }, (err) => {
      if (err) return next(err);
      req.session.user = { id: user.id, email: user.email };
      return res.json({ message: 'Login successful', userId: user.id });
    });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

/* ========== Google OAuth 登录 ========== */

// 发起 Google 登录
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

// Google 回调


// router.get('/google/callback', (req, res, next) => {
//   passport.authenticate('google', { session: true }, (err, user, info) => {
//     // 诊断输出到终端
//     console.log('--- /google/callback DIAG ---');
//     console.log('err:', err && (err.stack || err.message || err));
//     console.log('info:', info);
//     console.log('user:', user);

//     // 直接把结果回给浏览器看
//     return res
//       .status(err ? 500 : (user ? 200 : 401))
//       .json({ ok: !!user && !err, err: err?.message, info, user });
//   })(req, res, next);
// });
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: true }, (err, user) => {
    if (err) {
      console.error('OAuth exchange error:', err);
      return res.redirect(`${CLIENT_URL}/login?err=oauth_exchange`);
    }
    if (!user) {
      return res.redirect(`${CLIENT_URL}/login?err=no_user`);
    }

    req.logIn(user, (e) => {
      if (e) {
        console.error('req.logIn error:', e);
        return res.redirect(`${CLIENT_URL}/login?err=login`);
      }

      // 可选：写一份精简会话，给 /api/auth/me 用
      req.session.user = { id: user.id, email: user.email };

      req.session.save(() => {
        // ✅ 成功：回到前端首页，并把 userId 带过去
        res.redirect(`${CLIENT_URL}/?userId=${user.id}`);
      });
    });
  })(req, res, next);
});


/* ========== 会话相关接口 ========== */

router.get('/me', (req, res) => {
  if (req.user?.id) return res.json({ user: { id: req.user.id, email: req.user.email } });
  if (req.session?.user?.id) return res.json({ user: req.session.user });
  return res.json({ user: null });
});

router.get('/user', (req, res) => {
  if (req.user?.id) return res.json(req.user);
  if (req.session?.user?.id) return res.json(req.session.user);
  return res.status(401).json({ error: "Not logged in" });
});

router.post('/logout', (req, res) => {
  req.logout?.((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
