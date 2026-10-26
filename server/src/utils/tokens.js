import crypto from "crypto";

export const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// The raw token goes in the email link; only its hash is stored in the database.
export const createToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hashed: hashToken(raw) };
};
