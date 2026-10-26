import PDFDocument from "pdfkit";
import Booking from "../models/bookingModel.js";
import Payment from "../models/paymentModel.js";

const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// @desc    Download invoice PDF for a paid booking
// @route   GET /api/v1/invoices/:bookingId
// @access  Private (booking owner or staff)
export const downloadInvoice = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("guest", "name email phone")
      .populate("room", "roomNumber category pricePerNight");

    const isStaff = ["staff", "manager", "admin"].includes(req.user.role);
    if (!booking || (!isStaff && booking.guest._id.toString() !== req.user._id.toString())) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    if (booking.paymentStatus !== "paid") {
      res.status(400);
      return next(new Error("An invoice is available only for paid bookings"));
    }

    const payment = await Payment.findOne({ booking: booking._id, status: "succeeded" });
    const invoiceNo = `INV-${booking._id.toString().slice(-8).toUpperCase()}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceNo}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor("#0f172a").text("HotelPro", 50, 50);
    doc.fontSize(10).fillColor("#64748b").text("Hotel Management System", 50, 78);
    doc.fontSize(20).fillColor("#0f172a").text("INVOICE", 350, 50, { align: "right", width: 195 });
    doc.fontSize(10).fillColor("#64748b")
      .text(invoiceNo, 350, 78, { align: "right", width: 195 })
      .text(`Date: ${fmt(payment?.createdAt || booking.updatedAt)}`, 350, 92, { align: "right", width: 195 });

    // Bill to
    doc.moveTo(50, 125).lineTo(545, 125).strokeColor("#e2e8f0").stroke();
    doc.fontSize(10).fillColor("#64748b").text("BILL TO", 50, 140);
    doc.fontSize(12).fillColor("#0f172a").text(booking.guest.name, 50, 156);
    doc.fontSize(10).fillColor("#475569").text(booking.guest.email, 50, 173);
    if (booking.guest.phone) doc.text(booking.guest.phone, 50, 187);

    // Stay details
    doc.fontSize(10).fillColor("#64748b").text("STAY", 350, 140);
    doc.fontSize(10).fillColor("#0f172a")
      .text(`Room ${booking.room.roomNumber} (${booking.room.category})`, 350, 156)
      .text(`Check-in: ${fmt(booking.checkInDate)}`, 350, 171)
      .text(`Check-out: ${fmt(booking.checkOutDate)}`, 350, 186);

    // Line items
    const top = 240;
    doc.rect(50, top, 495, 24).fill("#0f172a");
    doc.fillColor("#ffffff").fontSize(10)
      .text("Description", 60, top + 7)
      .text("Nights", 300, top + 7, { width: 50, align: "right" })
      .text("Rate", 360, top + 7, { width: 70, align: "right" })
      .text("Amount", 440, top + 7, { width: 95, align: "right" });

    const rate = booking.totalAmount / booking.nights;
    doc.fillColor("#0f172a")
      .text(`Room ${booking.room.roomNumber} - ${booking.room.category}`, 60, top + 38)
      .text(String(booking.nights), 300, top + 38, { width: 50, align: "right" })
      .text(`$${rate.toFixed(2)}`, 360, top + 38, { width: 70, align: "right" })
      .text(`$${booking.totalAmount.toFixed(2)}`, 440, top + 38, { width: 95, align: "right" });

    doc.moveTo(50, top + 62).lineTo(545, top + 62).strokeColor("#e2e8f0").stroke();
    doc.fontSize(12).fillColor("#0f172a")
      .text("Total paid", 300, top + 78, { width: 130, align: "right" })
      .font("Helvetica-Bold").text(`$${booking.totalAmount.toFixed(2)}`, 440, top + 78, { width: 95, align: "right" })
      .font("Helvetica");

    // Footer
    doc.fontSize(9).fillColor("#64748b");
    if (payment) doc.text(`Payment reference: ${payment.transactionId} (${payment.gateway})`, 50, top + 130);
    doc.text("Thank you for staying with HotelPro.", 50, top + 146);

    doc.end();
  } catch (error) {
    next(error);
  }
};
