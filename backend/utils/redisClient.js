// backend/utils/redisClient.js
const redis = require('redis');

const client = redis.createClient({
  url: 'redis://localhost:6379', // 你本地装的 Redis 就是跑在这个地址上
});

client.on('error', (err) => console.error('❌ Redis Client Error', err));

(async () => {
  await client.connect(); // 异步连接
})();

module.exports = client;
