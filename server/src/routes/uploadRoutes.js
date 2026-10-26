import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { uploadSingleImage, uploadToCloudinary, cloudinaryEnabled } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// @route POST /api/v1/uploads/room-image   (admin / manager)  form-data field: "image"
router.post(
  "/room-image",
  protect,
  authorize("admin", "manager"),
  (req, res, next) =>
    uploadSingleImage(req, res, (err) => {
      if (err) {
        res.status(400);
        return next(err.code === "LIMIT_FILE_SIZE" ? new Error("Image must be 5 MB or smaller") : err);
      }
      next();
    }),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400);
        return next(new Error("No image uploaded"));
      }
      if (cloudinaryEnabled()) {
        return res.status(201).json({ success: true, url: await uploadToCloudinary(req.file) });
      }
      const base = process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;
      res.status(201).json({ success: true, url: `${base}/uploads/${req.file.filename}` });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
