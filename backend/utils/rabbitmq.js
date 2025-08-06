const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect("amqps://cboogfql:lTYHsnCR8cPmUmoUerTJyDEwKalI3fAO@gull.rmq.cloudamqp.com/cboogfql");
    channel = await connection.createChannel();
    await channel.assertQueue("notifications");
    console.log("✅ Connected to RabbitMQ");
  } catch (error) {
    console.error("❌ Failed to connect RabbitMQ:", error);
  }
}

function sendToQueue(message) {
  if (!channel) {
    console.error("❌ RabbitMQ channel not initialized");
    return;
  }
  console.log("📤 Sending to queue:", message);
  channel.sendToQueue("notifications", Buffer.from(JSON.stringify(message)));
}

module.exports = {
  connectRabbitMQ,
  sendToQueue,
};
