// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// -----------------------------
// SIGNUP ROUTE
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).send("Missing fields");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).send("User already exists");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();

    console.log("✅ User registered:", newUser.username);

    // Redirect to login page after successful signup
    return res.redirect("/login");
  } catch (error) {
    console.error("❌ Signup error:", error);
    return res.status(500).send("Error signing up user");
  }
});

// -----------------------------
// LOGIN ROUTE (fixed session save + redirect)
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).send("Missing credentials");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid credentials");

    // ✅ Store user info in session
    req.session.userId = user._id;
    req.session.username = user.username;

    // ✅ Force save session before redirecting to /home
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).send("Error creating session");
      }
      console.log("✅ Login successful:", user.username);
      return res.redirect("/home"); // <-- Let /home route render home properly
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).send("Error logging in");
  }
});

// -----------------------------
// LOGOUT ROUTE
// -----------------------------
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Session destroy error:", err);
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});

// -----------------------------
// UPDATE PROFILE
// -----------------------------
router.post("/update-profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const { username, password } = req.body;

    const updateData = { username };

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.userId,
      updateData,
      { new: true }
    );

    // Update session username
    req.session.username = updatedUser.username;

    return res.redirect("/account");
  } catch (err) {
    console.error("❌ Update profile error:", err);
    return res.status(500).send("Error updating profile");
  }
});

// -----------------------------
// DELETE ACCOUNT PERMANENTLY
// -----------------------------
router.post("/delete-account", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const userId = req.session.userId;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Destroy session
    req.session.destroy(() => {
      return res.redirect("/");
    });

  } catch (err) {
    console.error("❌ Delete account error:", err);
    return res.status(500).send("Error deleting account");
  }
});


module.exports = router;
