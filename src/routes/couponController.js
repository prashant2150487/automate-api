import express from "express";

import { sendCouponAndEmail } from "../controllers/couponController.js";


const router = express.Router();
router.post("/coupons", sendCouponAndEmail);
export default router;
