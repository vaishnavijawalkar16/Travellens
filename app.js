require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const fileUpload = require("express-fileupload");

const authRoutes = require("./routes/auth");
const searchRoutes = require("./routes/search");
const userDataRoutes = require("./routes/userData");
const detailsRoutes = require("./routes/details"); // optional, if you created it

const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/travellens";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change_this_secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, ttl: 14 * 24 * 60 * 60 }),
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }
}));
app.use(fileUpload({ createParentPath: true, limits: { fileSize: 10 * 1024 * 1024 } }));

// make session available in views
app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  res.locals.username = req.session.username || null;
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// routes
app.use("/auth", authRoutes);
app.use("/search", searchRoutes);
app.use("/user", userDataRoutes);
app.use("/", detailsRoutes); // so /details/:id works at root

// home route (show top 10 recent)
app.get("/home", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const user = await User.findById(req.session.userId).populate({
      path: "recentSearches",
      options: { sort: { createdAt: -1 }, limit: 10 }
    });

    return res.render("home", { userName: user ? user.username : "Traveler", recentSearches: user ? user.recentSearches : [] });
  } catch (err) {
    console.error("Error loading home:", err);
    return res.status(500).render("error", { message: "Error loading home page" });
  }
});

// simple pages
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/account", (req, res) => res.render("account"));

// 404 & error handlers
app.use((req, res) => res.status(404).render("404", { title: "Not found" }));
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).render("error", { message: "Something went wrong" });
});

app.listen(PORT, () => console.log(`✅ Server listening on http://localhost:${PORT}`));
