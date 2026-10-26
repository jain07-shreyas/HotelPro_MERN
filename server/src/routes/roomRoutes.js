import express from "express";
import {
  getAvailableRooms,
  getRoomById,
  createRoom,
  updateRoom,
  getAllRooms,
  getRoomQuote,
  deleteRoom,
} from "../controllers/roomController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/available", getAvailableRooms);
router.get("/", protect, authorize("admin", "manager", "staff"), getAllRooms);
router.get("/:id/quote", getRoomQuote);
router.get("/:id", getRoomById);

// Protected Admin / Staff routes
router.post("/", protect, authorize("admin", "manager"), createRoom);
router.put("/:id", protect, authorize("admin", "manager", "staff"), updateRoom);

router.delete("/:id", protect, authorize("admin", "manager"), deleteRoom);

export default router;