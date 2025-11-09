// models/RecentSearch.js
const mongoose = require("mongoose");

const RecentSearchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  landmarkName: { type: String, required: true },
  wikiLink: { type: String, default: "" },
  score: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RecentSearch", RecentSearchSchema);
