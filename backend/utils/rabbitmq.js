const amqp = require("amqplib");

let channel;
let connection;
let isConnected = false;
let queueName = "notifications";
let pendingMessages = [];

// ✅ 自动重连机制
async function connectRabbitMQWithRetry(retries = 5, delay = 3000) {
  while (retries > 0) {
    try {
      connection = await amqp.connect("amqps://cboogfql:lTYHsnCR8cPmUmoUerTJyDEwKalI3fAO@gull.rmq.cloudamqp.com/cboogfql");
      connection.on("error", (err) => {
        console.error("⚠️ RabbitMQ connection error:", err.message);
        isConnected = false;
      });

      connection.on("close", () => {
        console.warn("⚠️ RabbitMQ connection closed. Reconnecting...");
        isConnected = false;
        setTimeout(() => connectRabbitMQWithRetry(), 5000);
      });

      channel = await connection.createChannel();
      await channel.assertQueue(queueName);
      isConnected = true;
      console.log("✅ Connected to RabbitMQ");

      // ✅ 如果之前有未发送的消息，重新发送
      while (pendingMessages.length > 0) {
        const msg = pendingMessages.shift();
        sendToQueue(msg);
      }

      break; // 连接成功后退出 retry 循环
    } catch (error) {
      console.error(`❌ Failed to connect RabbitMQ (${6 - retries}/5):`, error.message);
      retries--;
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  if (!isConnected) {
    console.error("🚨 Unable to connect to RabbitMQ after multiple retries.");
  }
}

function sendToQueue(message) {
  const msgBuffer = Buffer.from(JSON.stringify(message));

  if (isConnected && channel) {
    try {
      channel.sendToQueue(queueName, msgBuffer);
      console.log("📤 Sent to queue:", message);
    } catch (err) {
      console.error("❌ Failed to send to queue:", err.message);
      pendingMessages.push(message);
    }
  } else {
    console.warn("⚠️ RabbitMQ not connected. Queuing message...");
    pendingMessages.push(message);
  }
}

module.exports = {
  connectRabbitMQ: connectRabbitMQWithRetry,
  sendToQueue,
};
