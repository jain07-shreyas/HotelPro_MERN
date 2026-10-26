import express from "express";
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelMyBooking,
  getBookingById,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/my-bookings", protect, getMyBookings);
router.get("/:id", protect, getBookingById);
router.patch("/:id/cancel", protect, cancelMyBooking);
router.get("/", protect, authorize("staff", "manager", "admin"), getAllBookings);
router.patch("/:id/status", protect, authorize("staff", "manager", "admin"), updateBookingStatus);

export default router;