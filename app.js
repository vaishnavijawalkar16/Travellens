const express = require("express");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const User = require("./models/User");
const Bookmark = require("./models/Bookmark");
const RecentSearch = require("./models/RecentSearch");
const authRoutes = require("./routes/auth");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false
  })
);

// Routes
app.use("/auth", authRoutes);

// **Mount userDataRoutes after session**
const userDataRoutes = require("./routes/userData");
app.use("/user", userDataRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));

// Page routes
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/details", (req, res) => res.render("details"));
app.get("/account", (req, res) => res.render("account"));

app.get('/home', async (req, res) => {
  const userName = req.session?.username || "Traveler";
  const recentSearches = await RecentSearch.find({ userId: req.session.userId }).sort({ createdAt: -1 }).limit(5);
  res.render('home', { userName, recentSearches });
});

// Temporary test route
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
