const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bookmark" }],
  recentSearches: [{ type: mongoose.Schema.Types.ObjectId, ref: "RecentSearch" }]
});

module.exports = mongoose.model("User", userSchema);
