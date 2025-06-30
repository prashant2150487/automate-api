import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

let chatSession = null;

export const sendChatMessage = async (message) => {
  if (!chatSession) {
    chatSession = chatModel.startChat({
      history: [],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
    });
  }

  const result = await chatSession.sendMessage(message);
  const response = await result.response;
  return response.text();
};
