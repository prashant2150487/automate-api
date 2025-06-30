import express from "express";

import { queryUsers } from "../controllers/promptController.js";
import { queryShopifyProducts } from "../controllers/queryShopifyProducts.js";
import { handleChat } from "../controllers/chatController.js";

const router = express.Router();
router.post("/prompt", queryUsers);
router.post("/chat",handleChat)
router.post("/products", queryShopifyProducts )
export default router;
