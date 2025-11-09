// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const fileUpload = require("express-fileupload");
const axios = require("axios");

const authRoutes = require("./routes/auth");
const searchRoutes = require("./routes/search");
const userDataRoutes = require("./routes/userData");

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/travellens";

// ---------- Connect to MongoDB ----------
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------- Middleware (single registration, before routes) ----------
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  })
);

// enable file uploads
app.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  })
);

// ---------- View engine + static ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ---------- Routes ----------
app.use("/auth", authRoutes);
app.use("/search", searchRoutes);
app.use("/user", userDataRoutes);

// Simple pages
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/details", (req, res) => res.render("details"));
app.get("/account", (req, res) => res.render("account"));

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
