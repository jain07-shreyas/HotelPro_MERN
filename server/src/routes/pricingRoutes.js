import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { listSeasons, createSeason, updateSeason, deleteSeason } from "../controllers/pricingController.js";

const router = express.Router();
router.use(protect, authorize("admin", "manager"));

router.get("/seasons", listSeasons);
router.post("/seasons", createSeason);
router.put("/seasons/:id", updateSeason);
router.delete("/seasons/:id", deleteSeason);

export default router;
