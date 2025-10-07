// app.js - full replacement (safe: back up your old file first)
const express = require("express");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

// memory storage (no temp files on disk)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));

// Basic pages
app.get("/", (req, res) => res.render("index"));
app.get("/home", (req, res) => res.render("home"));
app.get("/details", (req, res) => res.render("details"));
app.get("/account", (req, res) => res.render("account"));

// ---- New route: receive image from home.ejs, forward to CLIP service ----
app.post("/get-embedding", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).send("No image uploaded");

  try {
    // Build multipart form with the uploaded file buffer
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname || "upload.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    // CLIP server address (default to localhost:8000)
    const CLIP_URL = process.env.CLIP_URL || "http://127.0.0.1:8000/embed";

    // Post to CLIP server
    const resp = await axios.post(CLIP_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60_000
    });

    const embedding = resp.data.embedding; // should be an array of numbers

    // render details page and pass embedding
    return res.render("details", { embedding });
  } catch (err) {
    console.error("Error forwarding to CLIP:", err?.response?.data || err.message || err);
    return res.status(500).send("Server error creating embedding");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
