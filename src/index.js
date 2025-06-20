import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/connectDB.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
// import couponRoutes from "./routes/couponController.js";
import userRoutes from "./routes/userRoutes.js";

/* ----------  Runtime Setup  ---------- */

const app = express();
dotenv.config();
app.use(express.json());

// Gemini client (text‑only) ------------------------------------
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const PORT = process.env.PORT ?? 3000;
app.use(
  cors({
    origin: "*", // Replace '*' with your client domain if needed for security
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);
connectDB();
// app.use("/api", couponRoutes);
app.use("/api/user", userRoutes);
app.get("/", (_, res) => {
  res.json({ message: "Hello from Node 22" });
});

app.listen(PORT, () => {
  console.log(`API up at http://localhost:${PORT}`);
});
