// Strips MongoDB operator injection ("$ne", "$gt", dotted keys) and null bytes from user input.
export function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeObject(val);
    }
    return clean;
  }
  if (typeof value === "string") return value.replace(/\0/g, "");
  return value;
}

// Express 5 makes req.query read-only (and its default parser never builds nested objects),
// so only the JSON body needs cleaning.
export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") req.body = sanitizeObject(req.body);
  next();
};
