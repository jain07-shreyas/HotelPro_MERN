import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { listTasks, createTask, updateTask, deleteTask } from "../controllers/housekeepingController.js";

const router = express.Router();
router.use(protect, authorize("staff", "manager", "admin"));

router.get("/", listTasks);
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", authorize("manager", "admin"), deleteTask);

export default router;
