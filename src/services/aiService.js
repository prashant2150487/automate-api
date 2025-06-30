import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create a shared cache (reduce cost)
const cache = await genAI.caches.createCache({
  id: "shopify-query-cache-v1",
});

// Optional: use chat object to retain context
const chatMap = new Map(); // key: userId, value: chat object

export const handleAIRequest = async (req, res) => {
  try {
    const { message, userId = "anonymous" } = req.body;

    const genModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      cache,
    });

    // Heuristic: if message looks like query, handle differently
    const isQueryLike = /give|list|show|get/i.test(message) && /product/i.test(message);

    if (isQueryLike) {
      const prompt = `
You are a Shopify GraphQL API expert. 
Convert the following request into a valid Shopify Admin GraphQL query. 
Only return the query code block. No explanation.

User Request: "${message}"
`;

      const result = await genModel.generateContent(prompt);
      const query = result.response.text();
      return res.json({ type: "graphql", query });
    }

    // Use chat with memory for conversation
    let chat = chatMap.get(userId);
    if (!chat) {
      chat = genModel.startChat({
        history: [], // optionally keep messages
      });
      chatMap.set(userId, chat);
    }

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ type: "chat", reply: text });
  } catch (err) {
    console.error("AI Handler Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
