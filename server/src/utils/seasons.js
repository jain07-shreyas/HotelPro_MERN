import SeasonalPrice from "../models/seasonalPriceModel.js";

// Active seasonal prices that overlap the stay [from, to]
export const getSeasonsFor = (from, to) =>
  SeasonalPrice.find({ isActive: true, startDate: { $lte: to }, endDate: { $gte: from } }).lean();
