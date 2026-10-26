import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import housekeepingRoutes from "./routes/housekeepingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { sanitizeInput } from "./utils/sanitize.js";
import mongoose from "mongoose";
import { uploadDir } from "./middleware/uploadMiddleware.js";
import { stripeWebhook } from "./controllers/paymentController.js";

const app = express();

// Behind a hosting proxy (Render, Railway...) the real client IP comes from the proxy header
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

// Security Headers
app.use(helmet());

// Rate Limiting (300 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", (req, res, next) => (req.path === "/v1/payments/webhook" ? next() : limiter(req, res, next)));

// CORS configuration
// CORS: CLIENT_URL can hold several comma-separated origins. In development any localhost port is
// allowed, so it still works when Vite starts on 5174 or you open the site via 127.0.0.1.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((o) => o.trim().replace(/\/+$/, ""));
const isLocalDevOrigin = (o) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o);
app.use(
  cors({
    origin: (origin, callback) => {
      const ok = !origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin));
      callback(null, ok);
    },
    credentials: true,
  })
);

// Uploaded room images. helmet sets Cross-Origin-Resource-Policy: same-origin, which would stop the
// React app (a different origin) from displaying them, so it is relaxed for this folder only.
app.use(
  "/uploads",
  express.static(uploadDir, { maxAge: "7d", setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin") })
);

// Stripe webhook needs the raw body, so it is mounted before express.json()
app.post("/api/v1/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Parsers & Logging
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeInput); // strips $-operators / dotted keys from request bodies (NoSQL injection)

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health Check Route
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/pricing", pricingRoutes);
app.use("/api/v1/housekeeping", housekeepingRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;