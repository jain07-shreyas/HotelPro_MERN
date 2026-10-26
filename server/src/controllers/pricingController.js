import SeasonalPrice from "../models/seasonalPriceModel.js";
import Room from "../models/roomModel.js";
import { logActivity } from "../utils/audit.js";

const validate = (body, { partial = false } = {}) => {
  const out = {};
  const errors = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 60) errors.push("Name is required (max 60 characters)");
    out.name = name;
  }
  for (const key of ["startDate", "endDate"]) {
    if (!partial || has(key)) {
      const d = new Date(body[key]);
      if (Number.isNaN(d.getTime())) errors.push(`A valid ${key} is required`);
      out[key] = d;
    }
  }
  if (!partial || has("multiplier")) {
    const m = Number(body.multiplier);
    if (!Number.isFinite(m) || m < 0.1 || m > 5) errors.push("Multiplier must be between 0.1 and 5 (e.g. 1.25 for +25%)");
    out.multiplier = m;
  }
  if (has("categories")) {
    const allowed = Room.schema.path("category").enumValues;
    const cats = Array.isArray(body.categories) ? body.categories : [];
    if (cats.some((c) => !allowed.includes(c))) errors.push(`Categories must be from: ${allowed.join(", ")}`);
    out.categories = cats;
  }
  if (has("isActive")) out.isActive = Boolean(body.isActive);
  return { out, errors };
};

// @route GET /api/v1/pricing/seasons
export const listSeasons = async (req, res, next) => {
  try {
    const seasons = await SeasonalPrice.find().sort({ startDate: -1 });
    res.status(200).json({ success: true, data: seasons });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/v1/pricing/seasons
export const createSeason = async (req, res, next) => {
  try {
    const { out, errors } = validate(req.body);
    if (!errors.length && out.endDate < out.startDate) errors.push("End date cannot be before the start date");
    if (errors.length) {
      res.status(400);
      return next(new Error(errors.join(". ")));
    }
    const season = await SeasonalPrice.create({ ...out, createdBy: req.user._id });
    logActivity({ req, action: "season_created", targetType: "season", targetId: season._id, details: { name: season.name, multiplier: season.multiplier } });
    res.status(201).json({ success: true, data: season });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/v1/pricing/seasons/:id
export const updateSeason = async (req, res, next) => {
  try {
    const season = await SeasonalPrice.findById(req.params.id);
    if (!season) {
      res.status(404);
      return next(new Error("Season not found"));
    }
    const { out, errors } = validate(req.body, { partial: true });
    const start = out.startDate ?? season.startDate;
    const end = out.endDate ?? season.endDate;
    if (!errors.length && end < start) errors.push("End date cannot be before the start date");
    if (errors.length) {
      res.status(400);
      return next(new Error(errors.join(". ")));
    }
    Object.assign(season, out);
    await season.save();
    logActivity({ req, action: "season_updated", targetType: "season", targetId: season._id, details: { name: season.name, fields: Object.keys(out) } });
    res.status(200).json({ success: true, data: season });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/v1/pricing/seasons/:id
export const deleteSeason = async (req, res, next) => {
  try {
    const season = await SeasonalPrice.findByIdAndDelete(req.params.id);
    if (!season) {
      res.status(404);
      return next(new Error("Season not found"));
    }
    logActivity({ req, action: "season_deleted", targetType: "season", targetId: season._id, details: { name: season.name } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
