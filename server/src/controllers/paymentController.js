import Stripe from "stripe";
import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";
import { sendBookingConfirmation } from "../utils/sendEmail.js";
import { notify } from "../utils/notify.js";

// Created lazily so the server can still boot without a Stripe key (e.g. during local dev)
let stripeClient;
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Payments are not configured: STRIPE_SECRET_KEY is missing");
  }
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

const canAccess = (booking, user) =>
  booking.guest.toString() === user._id.toString() || ["staff", "manager", "admin"].includes(user.role);


// Shared by /verify (browser) and the webhook (Stripe): idempotently records the payment and confirms the booking.
const finalizePayment = async (booking, paymentIntent) => {
  if (
    paymentIntent.metadata?.bookingId !== booking._id.toString() ||
    paymentIntent.amount !== Math.round(booking.totalAmount * 100)
  ) {
    throw Object.assign(new Error("Payment does not match this booking"), { statusCode: 400 });
  }

  let payment = await Payment.findOne({ transactionId: paymentIntent.id });
  if (!payment) {
    const charge = typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
    payment = await Payment.create({
      booking: booking._id,
      guest: booking.guest,
      gateway: "stripe",
      transactionId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: "succeeded",
      receiptUrl: charge?.receipt_url || "",
    });
  }

  if (booking.paymentStatus !== "paid") {
    booking.paymentStatus = "paid";
    if (booking.status === "pending") booking.status = "confirmed";
    await booking.save();

    notify(booking.guest, { title: "Payment received", message: "Your booking is confirmed. See you soon!", type: "payment", link: "/my-bookings" });

    // Confirmation email (fire-and-forget: sendEmail never throws)
    Booking.findById(booking._id)
      .populate("guest", "name email")
      .populate("room", "roomNumber category")
      .then((b) => b && sendBookingConfirmation(b));
  }
  return payment;
};

// @desc    Create Stripe Payment Intent
// @route   POST /api/v1/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking || !canAccess(booking, req.user)) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    if (booking.paymentStatus === "paid") {
      res.status(400);
      return next(new Error("This booking has already been paid for"));
    }
    if (booking.status === "cancelled") {
      res.status(400);
      return next(new Error("Cannot pay for a cancelled booking"));
    }

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(booking.totalAmount * 100), // cents
      currency: "usd",
      metadata: { bookingId: booking._id.toString(), userId: req.user._id.toString() },
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: booking.totalAmount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify and finalize payment
// @route   POST /api/v1/payments/verify
// @access  Private
export const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentIntentId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking || !canAccess(booking, req.user)) {
      res.status(404);
      return next(new Error("Booking not found"));
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    if (paymentIntent.status !== "succeeded") {
      res.status(400);
      return next(new Error("Payment was not completed or failed"));
    }
    let payment;
    try {
      payment = await finalizePayment(booking, paymentIntent);
    } catch (err) {
      res.status(err.statusCode || 500);
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and booking confirmed",
      data: { payment, booking },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stripe webhook (confirms bookings even if the browser closes before /verify)
// @route   POST /api/v1/payments/webhook
// @access  Public (verified by Stripe signature)
export const stripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send("Webhook not configured");
  }
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body, // raw Buffer (see app.js)
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const booking = await Booking.findById(intent.metadata?.bookingId);
      if (booking) await finalizePayment(booking, intent);
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[Webhook]", err.message);
    res.status(500).send("Webhook handler failed");
  }
};

// Full refund for a paid booking (used when it is cancelled). Mutates the booking; caller saves it.
export const refundBookingPayment = async (booking) => {
  if (booking.paymentStatus !== "paid") return;
  const payment = await Payment.findOne({ booking: booking._id, status: "succeeded" });
  if (!payment) return;
  await getStripe().refunds.create({ payment_intent: payment.transactionId });
  payment.status = "refunded";
  await payment.save();
  booking.paymentStatus = "refunded";
};
