import express from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Stricter limit on endpoints that can be brute-forced or used to spam emails
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { success: false, message: "Too many attempts, please try again in a few minutes." },
});

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/logout", protect, logoutUser);
router.get("/me", protect, getUserProfile);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);
router.post("/verify-email/:token", authLimiter, verifyEmail);
router.post("/resend-verification", protect, authLimiter, resendVerification);

export default router;
