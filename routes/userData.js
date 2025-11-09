// routes/userData.js
const express = require("express");
const router = express.Router();
const RecentSearch = require("../models/RecentSearch");

/**
 * Simple isLoggedIn middleware (API-friendly)
 */
function isLoggedIn(req, res, next) {
  try {
    if (req.session && req.session.userId) return next();

    const acceptsJson =
      req.xhr ||
      (req.headers["accept"] && req.headers["accept"].includes("application/json")) ||
      req.headers["content-type"] === "application/json";

    if (acceptsJson) return res.status(401).json({ error: "not_authenticated" });
    return res.redirect("/login");
  } catch (e) {
    console.error("isLoggedIn middleware error:", e);
    return res.status(500).json({ error: "auth_middleware_error" });
  }
}

/**
 * POST /user/add-recent
 * Allows adding a recent search (accepts different key spellings)
 */
router.post("/add-recent", isLoggedIn, async (req, res) => {
  try {
    const payload = (req.body && Object.keys(req.body).length) ? req.body
      : (Object.keys(req.query).length ? req.query : (req.params || {}));
    const data = (payload.data && typeof payload.data === "object") ? payload.data : payload;

    const landmarkName = data.landmarkName || data.landmark_name || data.name || null;
    const wikiLink = data.wikiLink || data.wikipedialink || data.wiki_link || null;
    const score = data.score !== undefined ? Number(data.score) : null;

    if (!landmarkName) return res.status(400).json({ error: "missing_landmarkName" });

    const doc = new RecentSearch({
      userId: req.session.userId || null,
      landmarkName,
      wikiLink,
      score
    });
    await doc.save();

    return res.status(200).json({ ok: true, saved: doc });
  } catch (err) {
    console.error("❌ Error in /add-recent:", err);
    return res.status(500).json({ error: "server_error", details: err.message });
  }
});

/**
 * GET /user/recent
 * Returns last N recent searches for the logged-in user
 */
router.get("/recent", isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.userId;
    const recent = await RecentSearch.find({ userId }).sort({ createdAt: -1 }).limit(10);
    return res.status(200).json({ ok: true, recent });
  } catch (err) {
    console.error("❌ Error fetching recent:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
