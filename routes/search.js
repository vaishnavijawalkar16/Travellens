// routes/search.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const RecentSearch = require("../models/RecentSearch");

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/search";

/**
 * Middleware: require login but respond with 401 JSON for XHR/server calls
 */
function isLoggedIn(req, res, next) {
  try {
    if (req.session && req.session.userId) return next();

    const acceptsJson =
      req.xhr ||
      (req.headers["accept"] && req.headers["accept"].includes("application/json")) ||
      (req.headers["content-type"] && req.headers["content-type"].includes("application/json"));

    if (acceptsJson) return res.status(401).json({ error: "not_authenticated" });
    return res.redirect("/login");
  } catch (e) {
    console.error("isLoggedIn error:", e);
    return res.status(500).json({ error: "auth_middleware_error" });
  }
}

/**
 * POST /search/image
 * Accepts: a multipart form upload (field 'image')
 * Flow:
 *  - send image to FASTAPI_URL (as form-data field 'file')
 *  - receive { landmarkName, wikipedialink or wikiLink, score }
 *  - fetch Wikipedia summary via Wikipedia REST API (page/summary)
 *  - save recent search to DB (if user logged in)
 *  - render details view
 */
router.post("/image", isLoggedIn, async (req, res) => {
  try {
    // validate upload (express-fileupload must be configured in app.js)
    if (!req.files || !req.files.image) {
      return res.status(400).send("No image uploaded");
    }
    const imageFile = req.files.image;

    // Build form-data for FastAPI
    const form = new FormData();
    form.append("file", imageFile.data, {
      filename: imageFile.name || "upload.jpg",
      contentType: imageFile.mimetype || "image/jpeg"
    });

    // POST to FastAPI (embedding service)
    const fastRes = await axios.post(FASTAPI_URL, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 20000
    });

    const landmark = fastRes.data;
    console.log("📦 FastAPI Response:", landmark);

    // Validate expected keys from FastAPI
    if (!landmark || (!landmark.landmarkName && !landmark.name)) {
      console.error("⚠️ Invalid FastAPI response:", landmark);
      return res.status(500).send("Invalid FastAPI response");
    }

    // Accept multiple key spellings from FastAPI, normalize safely to strings
    const landmarkName = (landmark.landmarkName || landmark.name || "").toString().trim();

    const wikiLink = (
      (landmark.wikiLink || landmark.wikipedialink || landmark.wiki_link || "")
    ).toString().trim();

    const score = landmark.score !== undefined ? Number(landmark.score) : null;

    // Set default values
    let imageUrl =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/No_image_available.svg/600px-No_image_available.svg.png";
    let description = "No description available.";

    // Fetch Wikipedia summary if wiki link is provided & well-formed
    if (wikiLink && wikiLink.includes("wikipedia.org/wiki/")) {
      try {
        const pageTitle = encodeURIComponent(wikiLink.split("/wiki/")[1]);
        const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
        const wikiResp = await axios.get(wikiApiUrl, { timeout: 10000 });

        if (wikiResp && wikiResp.data) {
          if (wikiResp.data.thumbnail && wikiResp.data.thumbnail.source) {
            imageUrl = wikiResp.data.thumbnail.source;
          }
          if (wikiResp.data.extract) {
            description = wikiResp.data.extract;
          }
        }
      } catch (e) {
        console.warn("⚠️ Wikipedia fetch failed:", e.message || e);
      }
    }

    // Save recent search to DB (if session user exists)
    try {
      const doc = new RecentSearch({
        userId: req.session.userId || null,
        landmarkName,
        wikiLink,
        score
      });
      await doc.save();
    } catch (e) {
      console.error("❌ Failed to save recent search:", e);
    }

    // Render the details template with consistent variable names
    return res.render("details", {
      landmarkName,
      wikipediaLink: wikiLink,
      imageUrl,
      description
    });
  } catch (err) {
    console.error("❌ Search error:", err.response ? err.response.data : err.message || err);
    return res.status(500).send("Error processing image search");
  }
});

module.exports = router;
