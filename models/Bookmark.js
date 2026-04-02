const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  landmarkName: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: "" },
  location: { type: String, default: "" },
  wikiLink: { type: String, default: "" },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicates at database level too
bookmarkSchema.index({ user: 1, landmarkName: 1 }, { unique: true });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
