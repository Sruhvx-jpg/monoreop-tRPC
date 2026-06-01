import Redis from "ioredis";
import "dotenv/config"

const url: string = process.env.REDIS_URL!

export const redis = new Redis(url, {
  maxRetriesPerRequest: null,
});