require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const fetch = require("node-fetch"); // ✅ Add node-fetch
const FormData = require("form-data"); // ✅ Required for image POST

// ... other requires
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/search"; // make sure this matches your ngrok URL + /search

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🔍 Mongo URI:", process.env.MONGODB_URI); // debug line

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false
  })
);

// enable file uploads
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}));

// Routes
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const userDataRoutes = require("./routes/userData");
app.use("/user", userDataRoutes);

const searchRoutes = require("./routes/search");
app.use("/search", searchRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Pages
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/details", (req, res) => res.render("details"));
app.get("/account", (req, res) => res.render("account"));

// Home page
app.get("/home", async (req, res) => {
  const userName = req.session?.username || "Traveler";
  const recentSearches = await RecentSearch.find({ userId: req.session.userId })
    .sort({ createdAt: -1 })
    .limit(5);
  res.render("home", { userName, recentSearches, nearbyLandmark: "Gateway of India" });
});

// ✅ New route to handle image upload & call FastAPI
app.post("/search/image", async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).send("No image uploaded");
    }

    const imageFile = req.files.image;

    const formData = new FormData();
    formData.append("file", imageFile.data, imageFile.name);

    const response = await fetch(FASTAPI_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.error) {
      return res.status(500).send("Search error: " + result.error);
    }

    // Render details page with FastAPI result
    res.render("details", {
      landmarkName: result.landmarkName,
      gps: result.gps,
      wikiLink: result.wikiLink,
      imageUrl: result.imageUrl || ""
    });

  } catch (err) {
    console.error("Error processing image search", err);
    res.status(500).send("Search error: " + err.message);
  }
});

// Test DB
app.get("/test-db", async (req, res) => {
  try {
    const testUser = new User({
      username: "john_doe",
      email: "john@example.com",
      password: "12345"
    });
    await testUser.save();
    res.send("✅ User saved successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error saving user");
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
