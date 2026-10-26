import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Room from "../models/roomModel.js";
import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";
import AdminLog from "../models/adminLogModel.js";
import SupportTicket from "../models/supportTicketModel.js";
import { getPagination, pageMeta } from "../utils/pagination.js";
import { logActivity } from "../utils/audit.js";
import { logDir } from "../utils/logger.js";
import { cloudinaryEnabled } from "../middleware/uploadMiddleware.js";

const ROLES = ["guest", "staff", "manager", "admin"];
const round2 = (n) => Math.round(n * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Users ----------
// @route GET /api/v1/admin/users?page=&limit=&role=&search=
export const listUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
    const filter = {};
    if (ROLES.includes(req.query.role)) filter.role = req.query.role;
    if (req.query.search) {
      const q = escapeRegex(String(req.query.search).slice(0, 50));
      filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: users, pagination: pageMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/v1/admin/users/:id   body: { role?, isActive? }
export const updateUser = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    if (req.params.id === req.user._id.toString()) {
      res.status(400);
      return next(new Error("You cannot change your own role or deactivate your own account"));
    }
    const changes = {};
    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        res.status(400);
        return next(new Error(`Role must be one of: ${ROLES.join(", ")}`));
      }
      changes.role = role;
    }
    if (isActive !== undefined) changes.isActive = Boolean(isActive);
    if (Object.keys(changes).length === 0) {
      res.status(400);
      return next(new Error("Nothing to update"));
    }

    const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }
    logActivity({ req, action: "user_updated", targetType: "user", targetId: user._id, details: { email: user.email, ...changes } });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ---------- Staff ----------
// @route POST /api/v1/admin/staff   body: { name, email, password, role: staff|manager, phone? }
export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role = "staff", phone = "" } = req.body;
    if (!["staff", "manager"].includes(role)) {
      res.status(400);
      return next(new Error("Role must be staff or manager"));
    }
    if (!name || !email || !password || String(password).length < 8) {
      res.status(400);
      return next(new Error("Name, email and a password of at least 8 characters are required"));
    }
    const emailNorm = String(email).toLowerCase().trim();
    if (await User.findOne({ email: emailNorm })) {
      res.status(400);
      return next(new Error("A user with this email already exists"));
    }
    const user = await User.create({ name: String(name).trim(), email: emailNorm, password: String(password), role, phone, isVerified: true });
    logActivity({ req, action: "staff_created", targetType: "user", targetId: user._id, details: { email: user.email, role } });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/v1/admin/staff   (for assigning tasks)
export const listStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ["staff", "manager", "admin"] }, isActive: { $ne: false } })
      .select("name email role")
      .sort({ name: 1 });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

// ---------- Payments ----------
// @route GET /api/v1/admin/payments?page=&limit=&status=
export const listPayments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
    const filter = {};
    if (["pending", "succeeded", "failed", "refunded"].includes(req.query.status)) filter.status = req.query.status;

    const [payments, total, summaryRows] = await Promise.all([
      Payment.find(filter)
        .populate("guest", "name email")
        .populate({ path: "booking", select: "checkInDate checkOutDate nights room", populate: { path: "room", select: "roomNumber category" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
      Payment.aggregate([{ $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    ]);

    const summary = { succeeded: { total: 0, count: 0 }, refunded: { total: 0, count: 0 } };
    summaryRows.forEach((r) => {
      if (summary[r._id]) summary[r._id] = { total: round2(r.total), count: r.count };
    });

    res.status(200).json({ success: true, data: payments, summary, pagination: pageMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// ---------- Reports ----------
// @route GET /api/v1/admin/reports
export const getReports = async (req, res, next) => {
  try {
    const now = new Date();
    const monthsBack = 5; // this month + 5 previous
    const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const DAYS = 14;
    const windowEnd = new Date(today.getTime() + DAYS * 86400000);

    const [revenueRows, statusRows, categoryRows, totalRow, sellableRooms, activeBookings] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "succeeded", createdAt: { $gte: startMonth } } },
        { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, revenue: { $sum: "$amount" }, payments: { $sum: 1 } } },
      ]),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { status: "succeeded" } },
        { $lookup: { from: "bookings", localField: "booking", foreignField: "_id", as: "b" } },
        { $unwind: "$b" },
        { $lookup: { from: "rooms", localField: "b.room", foreignField: "_id", as: "r" } },
        { $unwind: "$r" },
        { $group: { _id: "$r.category", revenue: { $sum: "$amount" }, bookings: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
      ]),
      Payment.aggregate([{ $match: { status: "succeeded" } }, { $group: { _id: null, revenue: { $sum: "$amount" } } }]),
      Room.countDocuments({ status: { $ne: "maintenance" } }),
      Booking.find({ status: { $in: ["confirmed", "checked_in"] }, checkInDate: { $lt: windowEnd }, checkOutDate: { $gt: today } }).select("checkInDate checkOutDate"),
    ]);

    const monthlyRevenue = [];
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const row = revenueRows.find((r) => r._id.y === d.getUTCFullYear() && r._id.m === d.getUTCMonth() + 1);
      monthlyRevenue.push({
        month: d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
        revenue: round2(row?.revenue || 0),
        payments: row?.payments || 0,
      });
    }

    // Occupancy for today + the next 13 nights
    const occupancy = [];
    for (let i = 0; i < DAYS; i++) {
      const day = new Date(today.getTime() + i * 86400000);
      const occupied = activeBookings.filter((b) => b.checkInDate <= day && b.checkOutDate > day).length;
      occupancy.push({
        date: day.toISOString().slice(5, 10),
        occupied,
        percent: sellableRooms ? Math.min(100, Math.round((occupied / sellableRooms) * 100)) : 0,
      });
    }

    const byStatus = statusRows.map((r) => ({ status: r._id, count: r.count }));
    const totalBookings = byStatus.reduce((sum, r) => sum + r.count, 0);
    const cancelled = byStatus.find((r) => r.status === "cancelled")?.count || 0;

    res.status(200).json({
      success: true,
      data: {
        totals: {
          revenue: round2(totalRow[0]?.revenue || 0),
          bookings: totalBookings,
          inHouseGuests: byStatus.find((r) => r.status === "checked_in")?.count || 0,
          cancellationRate: totalBookings ? Math.round((cancelled / totalBookings) * 100) : 0,
          occupancyToday: occupancy[0]?.percent || 0,
          sellableRooms,
        },
        monthlyRevenue,
        occupancy,
        bookingsByStatus: byStatus,
        revenueByCategory: categoryRows.map((r) => ({ category: r._id, revenue: round2(r.revenue), bookings: r.bookings })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- System health + security ----------
// @route GET /api/v1/admin/system
export const getSystemStatus = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [users, rooms, bookings, openTickets, failedLogins24h, deactivated, recentFailed] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Booking.countDocuments(),
      SupportTicket.countDocuments({ status: "open" }),
      AdminLog.countDocuments({ action: "login_failed", createdAt: { $gte: since } }),
      User.countDocuments({ isActive: false }),
      AdminLog.find({ action: "login_failed" }).sort({ createdAt: -1 }).limit(8).select("details ip createdAt"),
    ]);

    let errorLog = { exists: false, sizeKB: 0 };
    try {
      const stat = fs.statSync(path.join(logDir, "error.log"));
      errorLog = { exists: true, sizeKB: Math.round(stat.size / 1024) };
    } catch {
      /* no errors logged yet */
    }

    res.status(200).json({
      success: true,
      data: {
        uptimeSeconds: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1048576),
        node: process.version,
        environment: process.env.NODE_ENV,
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        counts: { users, rooms, bookings, openTickets },
        services: {
          email: Boolean(process.env.SMTP_HOST),
          stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_xxx"),
          cloudinary: cloudinaryEnabled(),
          emailVerificationRequired: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
        },
        security: { failedLogins24h, deactivatedUsers: deactivated, recentFailed },
        errorLog,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Activity / audit log ----------
// @route GET /api/v1/admin/logs?page=&limit=&action=
export const getLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const filter = {};
    if (req.query.action) filter.action = String(req.query.action).slice(0, 50);
    const [logs, total, actions] = await Promise.all([
      AdminLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AdminLog.countDocuments(filter),
      AdminLog.distinct("action"),
    ]);
    res.status(200).json({ success: true, data: logs, actions: actions.sort(), pagination: pageMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};
