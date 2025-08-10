// backend/utils/rabbitmq.js
const amqp = require("amqplib");

let conn;
let ch;
let ready = false;
let connecting = null;

const QUEUE = process.env.RABBITMQ_QUEUE || "notifications";
const URL = process.env.RABBITMQ_URL;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function onConnError(err) {
  console.error("[RMQ] connection error:", err?.message || err);
  ready = false;
}
function onConnClose() {
  console.warn("[RMQ] connection closed, will reconnect…");
  ready = false;
  setTimeout(() => initRabbit().catch(() => {}), 3000);
}

async function initRabbit(retries = 10, delayMs = 3000) {
  if (connecting) return connecting; // 避免并发重复连
  connecting = (async () => {
    if (!URL) throw new Error("RABBITMQ_URL is empty");
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`[RMQ] connecting (${i}/${retries}) → ${URL} queue=${QUEUE}`);
        conn = await amqp.connect(URL);
        conn.on("error", onConnError);
        conn.on("close", onConnClose);

        ch = await conn.createChannel();
        await ch.assertQueue(QUEUE, { durable: true }); // ✅ 持久队列
        ready = true;
        console.log("[RMQ] connected");
        return ch;
      } catch (e) {
        console.error("[RMQ] connect failed:", e?.message || e);
        await sleep(delayMs);
      }
    }
    ready = false;
    throw new Error("RabbitMQ connect failed after retries");
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

async function ensureConnected() {
  if (ready && ch) return ch;
  return initRabbit();
}

async function sendToQueue(messageObj) {
  const channel = await ensureConnected();
  const payload = JSON.stringify(messageObj);
  const ok = channel.sendToQueue(QUEUE, Buffer.from(payload), { persistent: true }); // ✅ 持久消息
  console.log("[RMQ] sent:", ok, payload);
  return ok;
}

module.exports = { initRabbit, sendToQueue };
