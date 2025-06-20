import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import interpretPrompt from "../helper/interpretPrompt.js";

export const sendCouponAndEmail = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    // Gemini client (text‑only) ------------------------------------
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
     const campaign = await interpretPrompt(prompt, model);
     console.log(campaign,)
   

    const { amount, target, minPurchase } = campaign;
    console.log(amount, target, minPurchase);

    // 2. Find recipients ---------------------------------------
    let match = {};
    if (target === "NEW_CUSTOMERS") {
      match.isNew = true;
    } else if (target === "TOTAL_SPENT_MIN") {
      match.totalSpent = { $gte: minPurchase };
    } else {
      throw new Error("Invalid target returned by Gemini");
    }
    const recipients = await Customer.find(match).exec();

    // 3. Credit wallet & send emails (bulk) ---------------------
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const bulk = Customer.collection.initializeUnorderedBulkOp();
      for (const c of recipients) {
        bulk
          .find({ _id: c._id })
          .updateOne({ $inc: { walletBalance: amount } });
      }
      if (recipients.length) await bulk.execute({ session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // 4. Emails (non‑blocking) ----------------------------------
    // for (const c of recipients) {
    //   sendCouponEmail(c.email, amount).catch(console.error);
    // }

    res.json({ success: true, credited: recipients.length });
  } catch (err) {
    console.error("[dispatch‑error]", err);
    res.status(500).json({ error: err.message });
  }
};
