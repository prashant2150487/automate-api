import { GoogleGenerativeAI } from "@google/generative-ai";
import chatInterpretPrompt from "../helper/chatInterpretPrompt.js";

export const chatBot = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const reply = await chatInterpretPrompt(prompt, model);

    res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error("Chatbot error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
