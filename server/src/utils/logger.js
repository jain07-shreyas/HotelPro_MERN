import fs from "fs";
import path from "path";

export const logDir = path.join(process.cwd(), "logs");

// Appends one JSON line per server error to logs/error.log. Never throws.
export const logError = (err, req) => {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const line =
      JSON.stringify({
        time: new Date().toISOString(),
        message: err.message,
        stack: err.stack,
        method: req?.method,
        url: req?.originalUrl,
        user: req?.user?._id,
      }) + "\n";
    fs.appendFile(path.join(logDir, "error.log"), line, () => {});
  } catch {
    /* logging must never crash the app */
  }
};
