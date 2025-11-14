const express = require("express");
const router = express.Router();
const RecentSearch = require("../models/RecentSearch");
const Bookmark = require("../models/Bookmark");
const User = require("../models/User");

/* Middleware */
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect("/login");
}

/* 🕒 Add or Update Recent Search (no duplicates) */
router.post("/recent", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, imageUrl, location, wikiLink, description } = req.body || {};
    if (!landmarkName) return res.status(400).send("Missing landmarkName");

    const normalized = landmarkName.trim().toLowerCase();
    const userId = req.session.userId;

    const existing = await RecentSearch.findOne({
      user: userId,
      landmarkName: { $regex: new RegExp(`^${normalized}$`, "i") },
    });

    if (existing) {
      await RecentSearch.updateOne(
        { _id: existing._id },
        {
          $set: {
            createdAt: new Date(),
            imageUrl: imageUrl || existing.imageUrl,
            location: location || existing.location,
            wikiLink: wikiLink || existing.wikiLink,
            description: description || existing.description,
          },
        }
      );

      await User.findByIdAndUpdate(userId, { $pull: { recentSearches: existing._id } });
      await User.findByIdAndUpdate(userId, {
        $push: { recentSearches: { $each: [existing._id], $position: 0 } },
      });

      console.log("🔁 Updated timestamp for existing recent search:", landmarkName);
      return res.status(200).send("Recent search updated");
    }

    const newRecent = new RecentSearch({
      user: userId,
      landmarkName: landmarkName.trim(),
      imageUrl,
      location,
      wikiLink,
      description,
    });

    const saved = await newRecent.save();
    await User.findByIdAndUpdate(userId, {
      $push: { recentSearches: { $each: [saved._id], $position: 0 } },
    });

    // Keep only 10 latest searches
    const searches = await RecentSearch.find({ user: userId }).sort({ createdAt: -1 });
    if (searches.length > 10) {
      const idsToKeep = searches.slice(0, 10).map((s) => s._id);
      const idsToDelete = searches.slice(10).map((s) => s._id);
      await RecentSearch.deleteMany({ _id: { $in: idsToDelete } });
      await User.findByIdAndUpdate(userId, { $set: { recentSearches: idsToKeep } });
    }

    console.log("✅ Added new recent search:", landmarkName);
    res.status(200).send("New recent search added");
  } catch (err) {
    console.error("Error saving recent search:", err);
    res.status(500).send("Failed to save recent search");
  }
});

/* 💾 Add Bookmark (no duplicates, updates timestamp) */
router.post("/bookmark", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, imageUrl, location, wikiLink, description } = req.body || {};
    if (!landmarkName) return res.status(400).send("Missing landmarkName");

    const normalized = landmarkName.trim().toLowerCase();
    const userId = req.session.userId;

    const existing = await Bookmark.findOne({
      user: userId,
      landmarkName: { $regex: new RegExp(`^${normalized}$`, "i") },
    });

    if (existing) {
      await Bookmark.updateOne({ _id: existing._id }, { $set: { createdAt: new Date() } });
      console.log("⚠️ Duplicate prevented — timestamp updated:", landmarkName);
      return res.redirect("/user/bookmarks");
    }

    const bookmark = new Bookmark({
      user: userId,
      landmarkName: landmarkName.trim(),
      imageUrl,
      location,
      wikiLink,
      description,
    });

    const saved = await bookmark.save();
    await User.findByIdAndUpdate(userId, { $push: { bookmarks: saved._id } });

    console.log("✅ New bookmark added:", landmarkName);
    res.redirect("/user/bookmarks");
  } catch (err) {
    console.error("Error saving bookmark:", err);
    res.status(500).send("Failed to save bookmark");
  }
});

/* 📚 Fetch Bookmarks (remove duplicates before sending) */
router.get("/bookmarks", isLoggedIn, async (req, res) => {
  try {
    let bookmarks = await Bookmark.find({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();

    // 🔹 Remove duplicates by landmarkName
    const seen = new Set();
    bookmarks = bookmarks.filter((b) => {
      const key = b.landmarkName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.render("bookmarks", { bookmarks });
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    res.status(500).send("Failed to load bookmarks");
  }
});

/* 🗑️ Delete Bookmark */
router.post("/bookmark/delete/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Bookmark.findOneAndDelete({
      _id: id,
      user: req.session.userId,
    });

    if (deleted) {
      await User.findByIdAndUpdate(req.session.userId, { $pull: { bookmarks: id } });
      console.log("🗑️ Bookmark deleted:", id);
    }

    res.redirect("/user/bookmarks");
  } catch (err) {
    console.error("Error deleting bookmark:", err);
    res.status(500).send("Failed to delete bookmark");
  }
});

module.exports = router;
