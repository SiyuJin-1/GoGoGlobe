console.log("✅ passport.js 已加载");

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

// 序列化/反序列化：只存 id
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return done(null, false);
    return done(null, { id: u.id, email: u.email });
  } catch (e) {
    return done(e);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // http://localhost:3001/api/auth/google/callback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1) 防守：确保有邮箱
        const email = profile?.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email returned from Google profile'));
        }

        // 2) 绑定 googleId；如果已有账号，补上 googleId；没有则创建
        const googleId = profile.id;
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              googleId,              // 如果 schema 可选也没问题
              password: '',          // 仅占位，别验证本地密码
            //   name: profile.displayName || null,
            },
          });
        } else if (!user.googleId) {
          // 老用户首次用 Google 登录，补齐 googleId
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId },
          });
        }

        // 3) 返回精简对象
        return done(null, { id: user.id, email: user.email });
      } catch (err) {
        // 让错误进入你的全局错误中间件并在控制台打印
        return done(err);
      }
    }
  )
);
