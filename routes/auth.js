const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// -----------------------------
// HELPER: Send Response
// -----------------------------
const sendResponse = (req, res, status, message, redirectUrl) => {
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"))) {
    return res.status(status).json({ message, redirectUrl });
  }
  if (status >= 400) {
    return res.status(status).send(message);
  }
  return res.redirect(redirectUrl);
};

// -----------------------------
// PASSWORD VALIDATION REGEX
// -----------------------------
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// -----------------------------
// VALIDATION: CHECK IF EXISTS
// -----------------------------
router.post("/check-exists", async (req, res) => {
  try {
    const { field, value } = req.body;
    if (!field || !value) return res.status(400).json({ error: "Invalid request" });

    const query = {};
    if (field === "email") {
      query.email = value.toLowerCase().trim();
    } else if (field === "username") {
      query.username = value.trim();
    } else {
      return res.status(400).json({ error: "Invalid field" });
    }

    const user = await User.findOne(query);
    return res.json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------
// SIGNUP ROUTE
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return sendResponse(req, res, 400, "Missing fields");
    }

    const trimmedPassword = password.trim();

    // Password validation
    if (!passwordRegex.test(trimmedPassword)) {
      return sendResponse(req, res, 400, "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character");
    }

    // Check if user already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return sendResponse(req, res, 400, "Email already exists");
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return sendResponse(req, res, 400, "Username already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    await newUser.save();
    console.log("User registered:", newUser.username);

    return sendResponse(req, res, 201, "Registration successful", "/login");
  } catch (error) {
    console.error("Signup error:", error);
    return sendResponse(req, res, 500, "Error signing up user");
  }
});

// -----------------------------
// LOGIN ROUTE
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return sendResponse(req, res, 400, "Missing credentials");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return sendResponse(req, res, 404, "User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendResponse(req, res, 400, "Incorrect password");
    }

    // Store session
    req.session.userId = user._id;
    req.session.username = user.username;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return sendResponse(req, res, 500, "Error creating session");
      }
      console.log("Login successful:", user.username);
      return sendResponse(req, res, 200, "Login successful", "/home");
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendResponse(req, res, 500, "Error logging in");
  }
});

// -----------------------------
// LOGOUT ROUTE
// -----------------------------
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});

// -----------------------------
// UPDATE PROFILE (USERNAME + PASSWORD)
// -----------------------------
router.post("/update-profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const { username, password } = req.body;
    const updateData = {};

    if (username) {
      const trimmedUsername = username.trim();
      // Check if username taken by someone else
      const existing = await User.findOne({ username: trimmedUsername, _id: { $ne: req.session.userId } });
      if (existing) {
        return sendResponse(req, res, 400, "Username already exists");
      }
      updateData.username = trimmedUsername;
    }

    // Only validate if password is being changed
    if (password && password.trim() !== "") {
      const trimmedPassword = password.trim();

      if (!passwordRegex.test(trimmedPassword)) {
        return sendResponse(req, res, 400, "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character");
      }

      updateData.password = await bcrypt.hash(trimmedPassword, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.userId,
      updateData,
      { new: true }
    );

    // Update session username
    if (updatedUser) req.session.username = updatedUser.username;

    return sendResponse(req, res, 200, "Profile updated", "/account");
  } catch (err) {
    console.error("Update profile error:", err);
    return sendResponse(req, res, 500, "Error updating profile");
  }
});

// -----------------------------
// DELETE ACCOUNT PERMANENTLY
// -----------------------------
router.post("/delete-account", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const userId = req.session.userId;
    await User.findByIdAndDelete(userId);

    req.session.destroy(() => {
      return res.redirect("/");
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).send("Error deleting account");
  }
});

module.exports = router;
