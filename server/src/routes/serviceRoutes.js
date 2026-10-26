import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createRequest, listMine, listAll, updateRequest, cancelRequest } from "../controllers/serviceController.js";

const router = express.Router();
router.use(protect);

router.post("/", createRequest);
router.get("/mine", listMine);
router.get("/", authorize("staff", "manager", "admin"), listAll);
router.patch("/:id/cancel", cancelRequest);
router.patch("/:id", authorize("staff", "manager", "admin"), updateRequest);

export default router;
