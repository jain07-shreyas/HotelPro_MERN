import SupportTicket from "../models/supportTicketModel.js";
import { notify, notifyStaff } from "../utils/notify.js";
import { getPagination, pageMeta } from "../utils/pagination.js";

const isStaff = (user) => ["staff", "manager", "admin"].includes(user.role);
const ownerId = (ticket) => (ticket.guest?._id ?? ticket.guest).toString();
const canAccess = (ticket, user) => isStaff(user) || ownerId(ticket) === user._id.toString();

// @route POST /api/v1/support   body: { subject, message }
export const createTicket = async (req, res, next) => {
  try {
    const subject = String(req.body.subject ?? "").trim();
    const text = String(req.body.message ?? "").trim();
    if (!subject || subject.length > 100 || !text || text.length > 1000) {
      res.status(400);
      return next(new Error("A subject (max 100 characters) and a message (max 1000 characters) are required"));
    }
    const ticket = await SupportTicket.create({
      guest: req.user._id,
      subject,
      messages: [{ sender: req.user._id, senderName: req.user.name, senderRole: req.user.role, text }],
    });
    notifyStaff({ title: "New support ticket", message: `${req.user.name}: ${subject}`, type: "support", link: "/admin?tab=support" });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/v1/support?status=&page=   (guests see their own, staff see all)
export const listTickets = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const filter = isStaff(req.user) ? {} : { guest: req.user._id };
    if (["open", "closed"].includes(req.query.status)) filter.status = req.query.status;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter, { subject: 1, status: 1, guest: 1, lastMessageAt: 1, messages: { $slice: -1 } })
        .populate("guest", "name")
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      SupportTicket.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: tickets, pagination: pageMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/v1/support/:id
export const getTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate("guest", "name email");
    if (!ticket || !canAccess(ticket, req.user)) {
      res.status(404);
      return next(new Error("Ticket not found"));
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/v1/support/:id/messages   body: { text }
export const addMessage = async (req, res, next) => {
  try {
    const text = String(req.body.text ?? "").trim();
    if (!text || text.length > 1000) {
      res.status(400);
      return next(new Error("A message (max 1000 characters) is required"));
    }
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket || !canAccess(ticket, req.user)) {
      res.status(404);
      return next(new Error("Ticket not found"));
    }
    ticket.messages.push({ sender: req.user._id, senderName: req.user.name, senderRole: req.user.role, text });
    ticket.status = "open"; // a new message reopens a closed ticket
    ticket.lastMessageAt = new Date();
    await ticket.save();

    if (isStaff(req.user) && ownerId(ticket) !== req.user._id.toString()) {
      notify(ticket.guest, { title: "Support replied", message: `New reply on: ${ticket.subject}`, type: "support", link: "/support" });
    } else {
      notifyStaff({ title: "Support ticket reply", message: `${req.user.name}: ${ticket.subject}`, type: "support", link: "/admin?tab=support" });
    }
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/v1/support/:id/close
export const closeTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket || !canAccess(ticket, req.user)) {
      res.status(404);
      return next(new Error("Ticket not found"));
    }
    ticket.status = "closed";
    await ticket.save();
    if (isStaff(req.user) && ownerId(ticket) !== req.user._id.toString()) {
      notify(ticket.guest, { title: "Ticket closed", message: ticket.subject, type: "support", link: "/support" });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};
