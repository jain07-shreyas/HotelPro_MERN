import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// Authenticated User Check
export const protect = async (req, res, next) => {
  let token = req.cookies.jwt;

  // Header fallback (Bearer token for Postman or mobile clients)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    return next(new Error("Not authorized, access token missing"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      res.status(401);
      return next(new Error("User belonging to this token no longer exists"));
    }

    if (req.user.isActive === false) {
      res.status(403);
      return next(new Error("Your account has been deactivated. Please contact support."));
    }

    next();
  } catch (error) {
    res.status(401);
    return next(new Error("Not authorized, token invalid or expired"));
  }
};

// Role-Based Authorization Check
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`User role '${req.user.role}' is unauthorized to access this route`)
      );
    }
    next();
  };
};