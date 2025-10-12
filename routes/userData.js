const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Bookmark = require("../models/Bookmark");
const RecentSearch = require("../models/RecentSearch");

// Middleware to check login
function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.status(401).send("You must be logged in!");
  next();
}

// --- ADD BOOKMARK ---
router.post("/bookmark", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, wikipediaLink, imageUrl } = req.body;
    if (!landmarkName || !wikipediaLink) return res.status(400).send("Missing required fields");

    const bookmark = new Bookmark({
      user: req.session.userId,
      landmarkName,
      wikipediaLink,
      imageUrl
    });

    await bookmark.save();
    await User.findByIdAndUpdate(req.session.userId, { $push: { bookmarks: bookmark._id } });

    res.send("✅ Landmark bookmarked successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error bookmarking landmark");
  }
});

// --- ADD RECENT SEARCH ---
router.post("/recent", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, wikipediaLink } = req.body;
    if (!landmarkName || !wikipediaLink) return res.status(400).send("Missing required fields");

    const recent = new RecentSearch({
      user: req.session.userId,
      landmarkName,
      wikipediaLink
    });

    await recent.save();

    await User.findByIdAndUpdate(req.session.userId, {
      $push: { recentSearches: { $each: [recent._id], $position: 0 } }
    });

    // Limit to 8 recent searches
    const user = await User.findById(req.session.userId);
    if (user.recentSearches.length > 8) {
      user.recentSearches = user.recentSearches.slice(0, 8);
      await user.save();
    }

    res.send("✅ Recent search added successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error adding recent search");
  }
});

module.exports = router;
