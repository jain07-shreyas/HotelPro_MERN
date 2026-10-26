import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Local storage: <server folder>/uploads (the server must be started from the server folder, as `npm run dev` does)
export const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const EXT_BY_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const limits = { fileSize: 5 * 1024 * 1024 }; // 5 MB
const fileFilter = (req, file, cb) =>
  EXT_BY_MIME[file.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG or WebP images are allowed"));

const diskUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    // Random name + extension derived from the verified mime type, never from the user's filename
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT_BY_MIME[file.mimetype]}`),
  }),
  limits,
  fileFilter,
});
const memoryUpload = multer({ storage: multer.memoryStorage(), limits, fileFilter });

// Checked per request (not at import time) because .env is loaded after the imports run
export const cloudinaryEnabled = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export const uploadSingleImage = (req, res, next) =>
  (cloudinaryEnabled() ? memoryUpload : diskUpload).single("image")(req, res, next);

// Signed upload to Cloudinary with plain fetch (no SDK). Returns the https URL of the stored image.
export const uploadToCloudinary = async (file) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "hotelpro/rooms";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
    .digest("hex");

  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: file.mimetype }), "upload");
  form.append("api_key", process.env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Image upload to Cloudinary failed");
  return data.secure_url;
};
