const amqp = require("amqplib");
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = process.env.RABBITMQ_QUEUE || "notifications";

async function sendToQueue(messageObj) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    const message = JSON.stringify(messageObj);
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });

    console.log("📤 Sent to queue:", QUEUE_NAME, message);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("❌ Failed to send message:", error);
  }
}

module.exports = sendToQueue;
