// backend/utils/redisClient.js
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`
});

client.on('error', (err) => console.error('❌ Redis Client Error', err));

(async () => {
  await client.connect(); // 异步连接
})();

module.exports = client;
