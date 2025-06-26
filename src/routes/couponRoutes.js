import express from "express";

import { queryUsers } from "../controllers/promptController.js";
import { chatBot } from "../controllers/chatController.js";
import { queryShopifyProducts } from "../controllers/queryShopifyProducts.js";

const router = express.Router();
router.post("/prompt", queryUsers);
router.post("/chat",chatBot)
router.post("/products", queryShopifyProducts )
export default router;
