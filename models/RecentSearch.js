const mongoose = require("mongoose");

const recentSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  landmarkName: { type: String, required: true, trim: true },
  wikiLink: { type: String, default: "" },
  location: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  description: { type: String, default: "" },
  score: { type: Number, default: null },
  chatHistory: [
    {
      role: { type: String, enum: ["user", "bot"] },
      content: { type: String },
      timestamp: { type: Date, default: Date.now },
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

//update createdAt automatically
recentSearchSchema.pre("save", function (next) {
  this.createdAt = new Date();
  next();
});

module.exports = mongoose.model("RecentSearch", recentSearchSchema);
