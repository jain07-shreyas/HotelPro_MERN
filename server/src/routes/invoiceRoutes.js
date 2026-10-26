import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { downloadInvoice } from "../controllers/invoiceController.js";

const router = express.Router();

router.get("/:bookingId", protect, downloadInvoice);

export default router;
