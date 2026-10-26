import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { updateProfile, changePassword } from "../controllers/profileController.js";

const router = express.Router();

router.put("/", protect, updateProfile);
router.put("/password", protect, changePassword);

export default router;
