// redisClient.js
import Redis from "ioredis";

const redis = new Redis(); // default: localhost:6379

export const getCache = async (key) => {
  const result = await redis.get(key);
  return result ? JSON.parse(result) : null;
};

export const setCache = async (key, value, ttl = 3600) => {
  await redis.set(key, JSON.stringify(value), "EX", ttl); // expires in 1 hr
};
