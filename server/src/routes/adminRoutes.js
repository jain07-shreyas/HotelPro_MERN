import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  listUsers,
  updateUser,
  createStaff,
  listStaff,
  listPayments,
  getReports,
  getSystemStatus,
  getLogs,
} from "../controllers/adminController.js";

const router = express.Router();
router.use(protect);

router.get("/users", authorize("admin"), listUsers);
router.patch("/users/:id", authorize("admin"), updateUser);
router.post("/staff", authorize("admin"), createStaff);
router.get("/staff", authorize("admin", "manager"), listStaff);
router.get("/payments", authorize("admin", "manager"), listPayments);
router.get("/reports", authorize("admin", "manager"), getReports);
router.get("/system", authorize("admin"), getSystemStatus);
router.get("/logs", authorize("admin"), getLogs);

export default router;
