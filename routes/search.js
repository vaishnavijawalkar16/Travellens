const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const RecentSearch = require("../models/RecentSearch");
const User = require("../models/User");

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/search";

/* middleware */
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  // for non-AJAX requests redirect
  return res.redirect("/login");
}

/* POST /search/image */
router.post("/image", isLoggedIn, async (req, res) => {
  try {
    if (!req.files || !req.files.image) return res.status(400).send("No image uploaded");

    const imageFile = req.files.image;
    const form = new FormData();
    form.append("file", imageFile.data, {
      filename: imageFile.name || "upload.jpg",
      contentType: imageFile.mimetype || "image/jpeg"
    });

    // call FastAPI (embedding/model) to recognize landmark
    const fastRes = await axios.post(FASTAPI_URL, form, {
      headers: { ...form.getHeaders() },
      timeout: 20000
    });

    const landmark = fastRes.data || {};
    const landmarkName = (landmark.landmarkName || landmark.name || "").toString().trim();
    const wikiLink = (landmark.wikiLink || landmark.wikipedialink || landmark.wiki_link || "").toString().trim();
    const score = landmark.score !== undefined ? Number(landmark.score) : null;

    // defaults
    let imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/No_image_available.svg/600px-No_image_available.svg.png";
    let description = "No description available.";
    let location = "";

    // fetch wiki summary if wikiLink present
    if (wikiLink && wikiLink.includes("wikipedia.org/wiki/")) {
      try {
        const pageTitle = encodeURIComponent(wikiLink.split("/wiki/")[1]);
        const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
        const wikiResp = await axios.get(wikiApiUrl, {
          headers: { "User-Agent": "TravelLens/1.0 (contact: travellens@example.com)" }
        });
        if (wikiResp?.data?.thumbnail?.source) imageUrl = wikiResp.data.thumbnail.source;
        if (wikiResp?.data?.extract) description = wikiResp.data.extract;
        if (wikiResp?.data?.coordinates) {
          const c = wikiResp.data.coordinates;
          if (c.latitude && c.longitude) location = `Lat: ${c.latitude}, Lon: ${c.longitude}`;
        }
      } catch (e) {
        console.warn("Wikipedia fetch failed:", e.message || e);
      }
    }

    // Save recent search
    const newSearch = new RecentSearch({
      userId: req.session.userId,
      landmarkName,
      wikiLink,
      imageUrl,
      description,
      location,
      score
    });

    await newSearch.save();

    // add to user's recentSearches array and trim to last 10 in DB code (later cleanup)
    if (req.session.userId) {
      await User.findByIdAndUpdate(req.session.userId, { $push: { recentSearches: newSearch._id } });
      // optional trimming: remove older than 10 in /user/add-recent or periodically
    }

    // redirect to details page for the newly created RecentSearch
    return res.redirect(`/details/${newSearch._id}`);
  } catch (err) {
    console.error("Search error:", err.response ? err.response.data : err.message || err);
    return res.status(500).send("Error processing image search");
  }
});

module.exports = router;
