const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// SIGNUP ROUTE
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.render("login");
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Error signing up user");
  }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid credentials");

    // Store session
    req.session.userId = user._id;
    res.render("home");
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Error logging in");
  }
});

// LOGOUT ROUTE
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("👋 Logged out successfully!");
});

module.exports = router;
