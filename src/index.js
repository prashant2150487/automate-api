import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/connectDB.js";
import couponsRoutes from "./routes/couponRoutes.js";

/* ----------  Runtime Setup  ---------- */

const app = express();
dotenv.config();
app.use(express.json());



const PORT = process.env.PORT ?? 3000;
app.use(cors());
// connectDB();
app.use("/api", couponsRoutes);
app.get("/", (_, res) => {
  res.json({ message: "Hello from Node 22" });
});

app.listen(PORT, () => {
  console.log(`API up at http://localhost:${PORT}`);
});
