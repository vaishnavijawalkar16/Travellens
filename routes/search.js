const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/search";

// Middleware: ensure user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/auth/login");
  }
  next();
}

// POST /search/image
router.post("/image", isLoggedIn, async (req, res) => {
  try {
    // 🖼️ Check if image uploaded
    if (!req.files || !req.files.image) {
      return res.status(400).send("No image uploaded");
    }

    const imageFile = req.files.image;

    // 🔁 Send image to FastAPI
    const form = new FormData();
    form.append("file", imageFile.data, {
      filename: imageFile.name,
      contentType: imageFile.mimetype,
      knownLength: imageFile.data.length,
    });

    const fastRes = await axios.post(FASTAPI_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const landmark = fastRes.data;
    console.log("📦 FastAPI Response:", landmark);

    // 🧠 Validate response
    if (!landmark || !landmark.landmarkName) {
      console.error("⚠️ Invalid FastAPI response:", landmark);
      return res.status(500).send("Invalid FastAPI response");
    }

    // ✅ Standardize Wikipedia link
    const wikipediaLink =
      landmark.wikipedialink && landmark.wikipedialink.trim() !== ""
        ? landmark.wikipedialink.trim()
        : null;

    // Default placeholders
    let imageUrl =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/No_image_available.svg/600px-No_image_available.svg.png";
    let description = "No description available.";

    // 📚 Fetch Wikipedia description and image
    if (wikipediaLink && wikipediaLink.includes("wikipedia.org/wiki/")) {
      try {
        const pageTitle = encodeURIComponent(
          wikipediaLink.split("/wiki/")[1]
        );
        const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
        const wikiResp = await axios.get(wikiApiUrl);

        if (wikiResp.data.thumbnail?.source)
          imageUrl = wikiResp.data.thumbnail.source;
        if (wikiResp.data.extract) description = wikiResp.data.extract;
      } catch (e) {
        console.warn("⚠️ Wikipedia fetch failed:", e.message);
      }
    }

    // 🕒 Save recent search
    try {
      await axios.post(
        `${req.protocol}://${req.get("host")}/user/recent`,
        {
          landmarkName: landmark.landmarkName,
          wikipedialink: wikipediaLink, // ✅ match DB + FastAPI key
        },
        {
          headers: {
            cookie: req.headers.cookie || "",
            "Content-Type": "application/json",
          },
        }
      );
    } catch (e) {
      console.error("❌ Failed to add recent search:", e.message);
    }

    // ✅ Render details page
    res.render("details", {
      landmarkName: landmark.landmarkName,
      wikipediaLink: wikipediaLink,
      imageUrl: imageUrl,
      description: description,
    });
  } catch (err) {
    console.error(
      "❌ Search error:",
      err.response ? err.response.data : err.message
    );
    res.status(500).send("Error processing image search");
  }
});

module.exports = router;
