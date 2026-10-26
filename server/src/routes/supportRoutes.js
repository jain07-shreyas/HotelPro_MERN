import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createTicket, listTickets, getTicket, addMessage, closeTicket } from "../controllers/supportController.js";

const router = express.Router();
router.use(protect);

router.post("/", createTicket);
router.get("/", listTickets);
router.get("/:id", getTicket);
router.post("/:id/messages", addMessage);
router.patch("/:id/close", closeTicket);

export default router;
