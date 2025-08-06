const amqp = require("amqplib");
const { PrismaClient } = require("../generated/prisma");
require("dotenv").config();

const prisma = new PrismaClient();
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = process.env.RABBITMQ_QUEUE || "notifications";

async function startConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log("📥 Waiting for messages in queue:", QUEUE_NAME);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        console.log("📨 Received:", data);

        try {
          await prisma.notification.create({
            data: {
              userId: Number(data.userId),
              tripId: data.tripId || null,
              type: data.type ?? null,
              message: data.message,
              isRead: false,
            }
          });
          console.log("✅ Notification saved to DB");
          channel.ack(msg);
        } catch (err) {
          console.error("❌ Failed to save notification:", err);
        }
      }
    });
  } catch (err) {
    console.error("❌ Consumer startup failed:", err);
  }
}

startConsumer();
