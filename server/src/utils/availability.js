export const PENDING_HOLD_MINUTES = 30;

// Bookings that currently block a room: confirmed / checked-in, or recent unpaid "pending" holds.
// Abandoned pending bookings stop blocking the room after PENDING_HOLD_MINUTES.
export const blockingBookingFilter = () => ({
  $or: [
    { status: { $in: ["confirmed", "checked_in"] } },
    { status: "pending", createdAt: { $gt: new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000) } },
  ],
});
