import HousekeepingTask from "../models/housekeepingTaskModel.js";
import Room from "../models/roomModel.js";
import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/audit.js";

const TYPES = ["cleaning", "maintenance", "inspection"];
const STATUSES = ["pending", "in_progress", "done"];
const PRIORITIES = ["low", "normal", "high"];

// After a task is finished/removed, put the room in the right state again
const settleRoomStatus = async (roomId) => {
  if (await HousekeepingTask.exists({ room: roomId, type: "maintenance", status: { $ne: "done" } })) {
    return Room.findByIdAndUpdate(roomId, { status: "maintenance" });
  }
  if (await HousekeepingTask.exists({ room: roomId, type: "cleaning", status: { $ne: "done" } })) {
    return Room.findByIdAndUpdate(roomId, { status: "cleaning" });
  }
  const inHouse = await Booking.exists({ room: roomId, status: "checked_in" });
  return Room.findByIdAndUpdate(roomId, { status: inHouse ? "occupied" : "available" });
};

const assertAssignee = async (userId) => {
  const user = await User.findOne({ _id: userId, role: { $in: ["staff", "manager", "admin"] }, isActive: { $ne: false } });
  if (!user) throw Object.assign(new Error("Assignee must be an active staff member"), { statusCode: 400 });
  return user;
};

// @route GET /api/v1/housekeeping?status=&mine=true
export const listTasks = async (req, res, next) => {
  try {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.mine === "true") filter.assignedTo = req.user._id;
    const tasks = await HousekeepingTask.find(filter)
      .populate("room", "roomNumber category floor status")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/v1/housekeeping   body: { roomId, type, priority, notes, assignedTo? }
export const createTask = async (req, res, next) => {
  try {
    const { roomId, type = "cleaning", priority = "normal", notes = "", assignedTo } = req.body;
    if (!TYPES.includes(type) || !PRIORITIES.includes(priority)) {
      res.status(400);
      return next(new Error("Invalid task type or priority"));
    }
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404);
      return next(new Error("Room not found"));
    }
    const isManager = ["admin", "manager"].includes(req.user.role);
    let assignee = null;
    if (assignedTo && isManager) assignee = await assertAssignee(assignedTo);

    const task = await HousekeepingTask.create({
      room: room._id,
      type,
      priority,
      notes: String(notes).slice(0, 300),
      assignedTo: assignee?._id,
      createdBy: req.user._id,
    });

    if (type === "maintenance") await Room.findByIdAndUpdate(room._id, { status: "maintenance" });
    else if (type === "cleaning" && room.status === "available") await Room.findByIdAndUpdate(room._id, { status: "cleaning" });

    if (assignee && assignee._id.toString() !== req.user._id.toString()) {
      notify(assignee._id, { title: "New task assigned", message: `${type} - Room ${room.roomNumber}`, type: "housekeeping", link: "/admin?tab=housekeeping" });
    }
    if (type === "maintenance") logActivity({ req, action: "maintenance_task_created", targetType: "room", targetId: room._id, details: { roomNumber: room.roomNumber } });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @route PATCH /api/v1/housekeeping/:id   body: { status?, priority?, notes?, claim?, assignedTo? }
export const updateTask = async (req, res, next) => {
  try {
    const task = await HousekeepingTask.findById(req.params.id);
    if (!task) {
      res.status(404);
      return next(new Error("Task not found"));
    }
    const isManager = ["admin", "manager"].includes(req.user.role);
    const { status, priority, notes, claim, assignedTo } = req.body;
    let newAssignee = null;

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        res.status(400);
        return next(new Error(`Status must be one of: ${STATUSES.join(", ")}`));
      }
      if (task.status === "done" && status !== "done") {
        res.status(400);
        return next(new Error("A completed task cannot be reopened"));
      }
      task.status = status;
      if (status === "done") task.completedAt = new Date();
      if (status === "in_progress" && !task.assignedTo) task.assignedTo = req.user._id; // whoever starts it owns it
    }
    if (claim) task.assignedTo = req.user._id;
    if (assignedTo !== undefined) {
      if (!isManager) {
        res.status(403);
        return next(new Error("Only a manager or admin can assign tasks to others"));
      }
      if (assignedTo) {
        newAssignee = await assertAssignee(assignedTo);
        task.assignedTo = newAssignee._id;
      } else {
        task.assignedTo = undefined;
      }
    }
    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        res.status(400);
        return next(new Error("Invalid priority"));
      }
      task.priority = priority;
    }
    if (notes !== undefined) task.notes = String(notes).slice(0, 300);

    await task.save();
    if (status === "done") await settleRoomStatus(task.room);
    if (newAssignee && newAssignee._id.toString() !== req.user._id.toString()) {
      notify(newAssignee._id, { title: "Task assigned to you", message: `A ${task.type} task was assigned to you.`, type: "housekeeping", link: "/admin?tab=housekeeping" });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @route DELETE /api/v1/housekeeping/:id   (manager / admin)
export const deleteTask = async (req, res, next) => {
  try {
    const task = await HousekeepingTask.findByIdAndDelete(req.params.id);
    if (!task) {
      res.status(404);
      return next(new Error("Task not found"));
    }
    if (task.type !== "inspection") await settleRoomStatus(task.room);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
