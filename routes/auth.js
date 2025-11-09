// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// SIGNUP ROUTE
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).send("Missing fields");
    }

    // check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).send("User already exists");

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();

    // Redirect to login page after signup
    return res.redirect("/login");
  } catch (error) {
    console.error("signup error:", error);
    return res.status(500).send("❌ Error signing up user");
  }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).send("Missing credentials");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid credentials");

    // Store session info
    req.session.userId = user._id;
    req.session.username = user.username;

    // Render home with username and placeholder recentSearches (frontend will fetch actual)
    return res.render("home", { userName: user.username, recentSearches: [] });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).send("❌ Error logging in");
  }
});

// LOGOUT ROUTE
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("session destroy error:", err);
    res.redirect("/");
  });
});

module.exports = router;
