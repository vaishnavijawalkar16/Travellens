const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const RecentSearch = require("../models/RecentSearch");
const User = require("../models/User");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000/search";

/* Middleware */
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect("/login");
}

/* POST /search/image */
router.post("/image", isLoggedIn, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).send("No image uploaded");
    }

    const imageFile = req.files.image;
    const form = new FormData();
    form.append("file", imageFile.data, {
      filename: imageFile.name || "upload.jpg",
      contentType: imageFile.mimetype || "image/jpeg",
    });

    // Send image to AWS AI for recognition
    const fastRes = await axios.post(AI_SERVICE_URL, form, {
      headers: { ...form.getHeaders() },
      timeout: 60000, // Increased to 60s for slow first-run inference on t2.micro
    });

    const landmark = fastRes.data || {};
    const landmarkName = (landmark.landmarkName || landmark.name || "").trim();
    const wikiLink = (landmark.wikiLink || landmark.wikipedialink || "").trim();

    // Validation: Ensure we actually found a landmark
    if (!landmarkName || landmarkName === "" || landmarkName.toLowerCase() === "unknown") {
      console.warn(`[Search] AI Service could not recognize this image (Score: ${landmark.score || 'N/A'})`);
      return res.status(404).render("404", { 
        title: "Landmark Not Recognized",
        message: "We couldn't identify a specific landmark in this image. Please try a clearer photo!" 
      });
    }

    let imageUrl =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/No_image_available.svg/600px-No_image_available.svg.png";
    let description = "No description available.";
    let location = "Unknown location";

    // Fetch Wikipedia info if available
    if (wikiLink && wikiLink.includes("wikipedia.org/wiki/")) {
      try {
        const pageTitle = encodeURIComponent(wikiLink.split("/wiki/")[1]);
        const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
        const wikiResp = await axios.get(wikiApiUrl, {
          headers: { "User-Agent": "TravelLens/1.0" },
        });

        if (wikiResp?.data?.thumbnail?.source)
          imageUrl = wikiResp.data.thumbnail.source;
        if (wikiResp?.data?.extract)
          description = wikiResp.data.extract;
        if (wikiResp?.data?.coordinates) {
          const c = wikiResp.data.coordinates;
          if (c.latitude && c.longitude)
            location = `Lat: ${c.latitude}, Lon: ${c.longitude}`;
        }
      } catch (e) {
        console.warn("Wikipedia fetch failed:", e.message);
      }
    }

    const userId = req.session.userId;

    // Prevent duplicate recent search (update time instead)
    const existing = await RecentSearch.findOne({
      user: userId,
      landmarkName: { $regex: new RegExp(`^${landmarkName}$`, "i") },
    });

    if (existing) {
      existing.createdAt = new Date();
      await existing.save();

      // Move updated search to the top
      await User.findByIdAndUpdate(userId, { $pull: { recentSearches: existing._id } });
      await User.findByIdAndUpdate(userId, {
        $push: { recentSearches: { $each: [existing._id], $position: 0 } },
      });

      console.log(`Updated existing recent search: ${landmarkName}`);
      return res.redirect(`/details/${existing._id}`);
    }

    // Add new recent search
    const newSearch = new RecentSearch({
      user: userId,
      landmarkName,
      wikiLink,
      imageUrl,
      description,
      location,
    });

    await newSearch.save();
    await User.findByIdAndUpdate(userId, { $push: { recentSearches: newSearch._id } });

    // Keep only last 10
    const searches = await RecentSearch.find({ user: userId }).sort({ createdAt: -1 });
    if (searches.length > 10) {
      const idsToKeep = searches.slice(0, 10).map((s) => s._id);
      const idsToDelete = searches.slice(10).map((s) => s._id);
      await RecentSearch.deleteMany({ _id: { $in: idsToDelete } });
      await User.findByIdAndUpdate(userId, { $set: { recentSearches: idsToKeep } });
    }

    console.log(`Added new recent search: ${landmarkName}`);
    return res.redirect(`/details/${newSearch._id}`);
  } catch (err) {
    if (err.response) {
      console.error(`[Search Error] AI Service returned error ${err.response.status}:`, err.response.data);
    } else if (err.code === 'ECONNABORTED') {
      console.error("[Search Error] AI Service timed out. The first run on AWS can be slow (Wait 30s-60s).");
    } else {
      console.error("[Search Error] Could not connect to AWS AI Service. Check your FASTAPI_URL.");
      console.error("Details:", err.message);
    }
    return res.status(503).render("error", { 
      message: "AI Search Service is currently busy or offline. Please try again in 1 minute." 
    });
  }
});

module.exports = router;
