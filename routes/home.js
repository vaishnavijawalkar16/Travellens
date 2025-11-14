router.get("/home", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .populate("recentSearches")
      .lean();

    let recentSearches = (user?.recentSearches || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // 🔹 Remove duplicates by landmarkName
    const seen = new Set();
    recentSearches = recentSearches.filter((s) => {
      const key = s.landmarkName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.render("home", {
      userName: user?.name || "Traveler",
      recentSearches,
    });
  } catch (err) {
    console.error("Error loading home:", err);
    res.status(500).send("Failed to load home page");
  }
});
