import express from "express";

import { queryUsers } from "../controllers/promptController.js";

const router = express.Router();
router.post("/prompt", queryUsers);
export default router;
