const express = require("express");
const router = express.Router();
const RecentSearch = require("../models/RecentSearch");
const Bookmark = require("../models/Bookmark");

function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect("/login");
}

router.get("/details/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    let record = await RecentSearch.findById(id).lean();
    if (!record) record = await Bookmark.findById(id).lean();
    if (!record) return res.status(404).render("error", { message: "Not found" });

    return res.render("details", {
      landmarkName: record.landmarkName,
      wikipediaLink: record.wikiLink,
      imageUrl: record.imageUrl || "",
      description: record.description || "",
      location: record.location || ""
    });
  } catch (err) {
    console.error(err);
    return res.status(500).render("error", { message: "Failed to load details" });
  }
});

module.exports = router;
