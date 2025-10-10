const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Bookmark = require("../models/Bookmark");
const RecentSearch = require("../models/RecentSearch");

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send("You must be logged in!");
  }
  next();
}

// --- ADD BOOKMARK ---
router.post("/bookmark", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, imageUrl, location, wikiLink } = req.body;

    const bookmark = new Bookmark({
      user: req.session.userId,
      landmarkName,
      imageUrl,
      location,
      wikiLink,
    });

    await bookmark.save();

    await User.findByIdAndUpdate(req.session.userId, {
      $push: { bookmarks: bookmark._id },
    });

    res.send("✅ Landmark bookmarked successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error bookmarking landmark");
  }
});

// --- GET ALL BOOKMARKS ---
router.get("/bookmarks", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate("bookmarks");
    res.json(user.bookmarks);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching bookmarks");
  }
});

// --- ADD RECENT SEARCH ---
router.post("/recent", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, imageUrl } = req.body;

    const recent = new RecentSearch({
      user: req.session.userId,
      landmarkName,
      imageUrl,
    });

    await recent.save();

    // Add to user recent list, and limit to 8
    await User.findByIdAndUpdate(req.session.userId, {
      $push: { recentSearches: { $each: [recent._id], $position: 0 } },
    });

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

// --- GET RECENT SEARCHES ---
router.get("/recent", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate("recentSearches");
    res.json(user.recentSearches);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching recent searches");
  }
});

module.exports = router;
