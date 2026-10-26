import User from "../models/userModel.js";
import { generateToken } from "../utils/generateToken.js";
import { createToken, hashToken } from "../utils/tokens.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";
import { logActivity } from "../utils/audit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/+$/, "");
const normalizeEmail = (v) => String(v ?? "").toLowerCase().trim();

const userPayload = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isVerified: user.isVerified,
  token,
});

const issueVerification = async (user) => {
  const { raw, hashed } = createToken();
  user.emailVerificationToken = hashed;
  user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, `${clientUrl()}/verify-email/${raw}`);
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const phone = String(req.body.phone ?? "").trim();

    if (!name || name.length > 50) {
      res.status(400);
      return next(new Error("Name is required and must be at most 50 characters"));
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400);
      return next(new Error("Please provide a valid email address"));
    }
    if (password.length < 8 || password.length > 72) {
      res.status(400);
      return next(new Error("Password must be between 8 and 72 characters"));
    }

    if (await User.findOne({ email })) {
      res.status(400);
      return next(new Error("User already exists with this email"));
    }

    // Public registration always creates a 'guest'. Staff/admin accounts are created by an admin.
    const user = await User.create({ name, email, password, phone, role: "guest" });
    const token = generateToken(res, user._id);

    issueVerification(user).catch((err) => console.error("[Verification email]", err.message));
    logActivity({ req, actor: user, action: "register", targetType: "user", targetId: user._id });

    res.status(201).json({ success: true, data: userPayload(user, token) });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");

    if (!email || !password) {
      res.status(400);
      return next(new Error("Please provide email and password"));
    }

    const user = await User.findOne({ email }).select("+password");

    if (user && user.isActive === false) {
      logActivity({ req, actor: user, action: "login_blocked", targetType: "user", targetId: user._id });
      res.status(403);
      return next(new Error("Your account has been deactivated. Please contact support."));
    }

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(res, user._id);
      await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
      logActivity({ req, actor: user, action: "login", targetType: "user", targetId: user._id });
      return res.status(200).json({ success: true, data: userPayload(user, token) });
    }

    logActivity({ req, actor: { name: email }, action: "login_failed", details: { email } });
    res.status(401);
    return next(new Error("Invalid email or password"));
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
export const logoutUser = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
export const getUserProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

// @desc    Send a password reset link
// @route   POST /api/v1/auth/forgot-password
// @access  Public (always answers the same, so it can't be used to discover which emails exist)
export const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = EMAIL_RE.test(email) ? await User.findOne({ email }) : null;

    if (user && user.isActive !== false) {
      const { raw, hashed } = createToken();
      user.resetPasswordToken = hashed;
      user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
      await sendPasswordResetEmail(user, `${clientUrl()}/reset-password/${raw}`);
      logActivity({ req, actor: user, action: "password_reset_requested", targetType: "user", targetId: user._id });
    }

    res.status(200).json({ success: true, message: "If that email is registered, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
};

// @desc    Set a new password using the emailed token
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const password = String(req.body.password ?? "");
    if (password.length < 8 || password.length > 72) {
      res.status(400);
      return next(new Error("Password must be between 8 and 72 characters"));
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(req.params.token)),
      resetPasswordExpire: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpire");

    if (!user) {
      res.status(400);
      return next(new Error("This reset link is invalid or has expired"));
    }

    user.password = password; // hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    logActivity({ req, actor: user, action: "password_reset_completed", targetType: "user", targetId: user._id });
    const token = generateToken(res, user._id);
    res.status(200).json({ success: true, message: "Password updated", data: userPayload(user, token) });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm an email address using the emailed token
// @route   POST /api/v1/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: hashToken(String(req.params.token)),
      emailVerificationExpire: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpire");

    if (!user) {
      res.status(400);
      return next(new Error("This verification link is invalid or has expired"));
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: "Email verified" });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a fresh verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.isVerified) {
      return res.status(200).json({ success: true, message: "Your email is already verified" });
    }
    await issueVerification(user);
    res.status(200).json({ success: true, message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};
