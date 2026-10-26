import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getRoomReviews, getEligibleBooking, createReview, deleteReview } from "../controllers/reviewController.js";

const router = express.Router();

router.get("/room/:roomId", getRoomReviews);
router.get("/eligible/:roomId", protect, getEligibleBooking);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;
