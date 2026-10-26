import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Room from "./models/roomModel.js";
import User from "./models/userModel.js";
import SeasonalPrice from "./models/seasonalPriceModel.js";

const categories = [
  ["Standard", 90, 2, 0],
  ["Deluxe", 140, 3, 1],
  ["Executive Suite", 230, 4, 2],
  ["Presidential Suite", 480, 4, 2],
];

const photos = [
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
];

const rooms = [];
for (let floor = 1; floor <= 4; floor++) {
  const [category, pricePerNight, adults, children] = categories[floor - 1];
  for (let n = 1; n <= 3; n++) {
    rooms.push({
      roomNumber: `${floor}0${n}`,
      category,
      pricePerNight,
      capacity: { adults, children },
      floor,
      description: `${category} room on floor ${floor}.`,
      images: [{ url: photos[(floor + n) % photos.length] }],
    });
  }
}

// Seeding deletes ALL rooms. Refuse to do that against a production database unless explicitly forced.
if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Refusing to seed: NODE_ENV is production. Run `node src/seed.js --force` if you really mean it.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
await Room.deleteMany();
await Room.insertMany(rooms);

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
  await User.deleteOne({ email: adminEmail });
  await User.create({ name: "Admin", email: adminEmail, password: adminPassword, role: "admin", isVerified: true });
  console.log(`Admin user ready: ${adminEmail}`);
}

// Optional demo staff account
const staffEmail = process.env.STAFF_EMAIL;
const staffPassword = process.env.STAFF_PASSWORD;
if (staffEmail && staffPassword) {
  await User.deleteOne({ email: staffEmail });
  await User.create({ name: "Front Desk", email: staffEmail, password: staffPassword, role: "staff", isVerified: true });
  console.log(`Staff user ready: ${staffEmail}`);
}

// One sample seasonal price (peak season) so the pricing feature is visible straight away
if (!(await SeasonalPrice.exists({ name: "Winter Peak" }))) {
  const year = new Date().getFullYear();
  await SeasonalPrice.create({ name: "Winter Peak", startDate: new Date(`${year}-12-20`), endDate: new Date(`${year + 1}-01-05`), multiplier: 1.3 });
  console.log("Added sample season: Winter Peak (+30%)");
}

console.log(`Seeded ${rooms.length} rooms`);
await mongoose.disconnect();
