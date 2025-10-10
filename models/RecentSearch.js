const mongoose = require("mongoose");

const recentSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  landmarkName: String,
  imageUrl: String,
  searchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RecentSearch", recentSearchSchema);
