const express = require("express");
const router = express.Router();
const RecentSearch = require("../models/RecentSearch");
const Bookmark = require("../models/Bookmark");
const User = require("../models/User");

/* middleware */
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect("/login");
}

/* ✅ POST /user/bookmark - prevents duplicate bookmarks */
router.post("/bookmark", isLoggedIn, async (req, res) => {
  try {
    const { landmarkName, imageUrl, location, wikiLink, description } = req.body || {};
    if (!landmarkName) return res.status(400).send("missing_landmarkName");

    // 🧠 check if bookmark already exists for this user and same landmark
    const existing = await Bookmark.findOne({
      user: req.session.userId,
      landmarkName: { $regex: new RegExp(`^${landmarkName}$`, "i") } // case-insensitive match
    });

    if (existing) {
      console.log("⚠️ Duplicate bookmark prevented:", landmarkName);
      // You can flash a message or just redirect silently
      return res.redirect("/user/bookmarks");
    }

    // create new bookmark only if not already saved
    const bookmark = new Bookmark({
      user: req.session.userId,
      landmarkName,
      imageUrl: imageUrl || "",
      location: location || "",
      wikiLink: wikiLink || "",
      description: description || ""
    });

    const saved = await bookmark.save();
    await User.findByIdAndUpdate(req.session.userId, { $push: { bookmarks: saved._id } });

    return res.redirect("/user/bookmarks");
  } catch (err) {
    console.error("Error saving bookmark:", err);
    return res.status(500).send("Failed to save bookmark");
  }
});

/* GET /user/bookmarks */
router.get("/bookmarks", isLoggedIn, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.session.userId }).sort({ createdAt: -1 }).lean();
    return res.render("bookmarks", { bookmarks });
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return res.status(500).send("Failed to load bookmarks");
  }
});

/* DELETE /user/bookmark/delete/:id */
router.post("/bookmark/delete/:id", isLoggedIn, async (req, res) => {
  try {
    const bookmarkId = req.params.id;
    const deleted = await Bookmark.findOneAndDelete({ _id: bookmarkId, user: req.session.userId });
    if (deleted) {
      await User.findByIdAndUpdate(req.session.userId, { $pull: { bookmarks: bookmarkId } });
      console.log("✅ Bookmark deleted:", bookmarkId);
    } else {
      console.warn("⚠️ Bookmark not found or unauthorized:", bookmarkId);
    }
    return res.redirect("/user/bookmarks");
  } catch (err) {
    console.error("Error deleting bookmark:", err);
    return res.status(500).send("Failed to delete bookmark");
  }
});

module.exports = router;
