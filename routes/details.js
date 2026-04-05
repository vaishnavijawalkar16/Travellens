const express = require("express");
const router = express.Router();
const axios = require("axios");
const RecentSearch = require("../models/RecentSearch");
const Bookmark = require("../models/Bookmark");

function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect("/login");
}

/* GET /details/:id */
router.get("/details/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    let record = await RecentSearch.findById(id).lean();
    if (!record) record = await Bookmark.findById(id).lean();
    if (!record) return res.status(404).render("404", { title: "Landmark Not Found" });

    const landmarkName = record.landmarkName;
    const wikiLink = record.wikiLink || "";
    let sections = [];
    let detailedWikiLink = "";
    let wikiTitle = "";

    if (wikiLink && wikiLink.includes("/wiki/")) {
      wikiTitle = wikiLink.split("/wiki/")[1];
      detailedWikiLink = wikiLink;
    } else if (landmarkName && landmarkName !== "Unknown") {
      wikiTitle = landmarkName.replace(/ /g, "_");
      detailedWikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`;
    }

    // Try to fetch sections from Wikipedia if title exists
    if (wikiTitle && landmarkName !== "Unknown") {
      try {
        const wikiApiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${wikiTitle}&prop=sections&format=json&origin=*&redirects=1`;
        const wikiResp = await axios.get(wikiApiUrl, {
          headers: { "User-Agent": "TravelLens/1.0" },
          timeout: 5000,
        });

        if (wikiResp.data && wikiResp.data.parse && wikiResp.data.parse.sections) {
          const unwantedHeadings = ["References", "External links", "See also", "Notes", "Further reading", "Sources", "Bibliography"];
          sections = wikiResp.data.parse.sections
            .filter(s => !unwantedHeadings.some(u => s.line.includes(u)))
            .map(s => ({
              index: s.index,
              title: s.line,
              level: s.level,
              anchor: s.anchor
            }));
        }
      } catch (e) {
        console.warn(`Detailed Wikipedia fetch failed for ${landmarkName}:`, e.message);
      }
    }

    return res.render("details", {
      id: id,
      landmarkName: record.landmarkName,
      wikipediaLink: record.wikiLink,
      detailedWikiLink: detailedWikiLink,
      imageUrl: record.imageUrl || "",
      description: record.description || "",
      location: record.location || "",
      sections: sections,
      wikiTitle: wikiTitle,
      chatHistory: record.chatHistory || []
    });
  } catch (err) {
    console.error(err);
    return res.status(500).render("error", { message: "Failed to load details" });
  }
});

/* GET /api/wiki/section - Fetch specific Wikipedia section content */
router.get("/api/wiki/section", isLoggedIn, async (req, res) => {
  const { title, index } = req.query;
  if (!title || !index) return res.status(400).json({ error: "Title and section index required" });

  try {
    const wikiApiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${index}&format=json&disableeditsection=1&origin=*&redirects=1`;
    const wikiResp = await axios.get(wikiApiUrl, {
      headers: { "User-Agent": "TravelLens/1.0" },
    });

    if (wikiResp.data && wikiResp.data.parse && wikiResp.data.parse.text) {
      let content = wikiResp.data.parse.text["*"];
      // Basic cleanup (optional)
      res.json({ content: content });
    } else {
      res.status(404).json({ error: "Section not found" });
    }
  } catch (err) {
    console.error("Wiki section fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch section content" });
  }
});

// -----------------------------
// AI CHAT PROXY + PERSISTENCE
// -----------------------------
router.post("/api/chat", isLoggedIn, async (req, res) => {
  try {
    const { id, message, context } = req.body;
    if (!id || !message) return res.status(400).json({ error: "ID and message required" });

    // 1. Fetch comprehensive landmark info from DB
    let record = await RecentSearch.findById(id);
    if (!record) record = await Bookmark.findById(id);

    let ragContext = context || "";

    // 2. Enhance Context from Wikipedia if needed
    if (record && record.wikiLink && record.wikiLink.includes("/wiki/")) {
      try {
        const wikiTitle = record.wikiLink.split("/wiki/")[1];
        const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`;
        const wikiResp = await axios.get(wikiApiUrl, {
          headers: { "User-Agent": "TravelLens/1.0" },
          timeout: 4000
        });

        if (wikiResp.data && wikiResp.data.extract) {
          // Add Wikipedia summary to ensure core facts are present
          ragContext = `Knowledge Base (Wikipedia): ${wikiResp.data.extract}\n\nUser Session Context: ${ragContext}`;
        }
      } catch (e) {
        console.warn("[Chat RAG] Wikipedia fetch failed, using frontend context only.");
      }
    }

    // 3. Get AI response from Groq Backend
    let fullUrl = process.env.AI_SERVICE_URL || "http://localhost:8000/search";
    const baseUrl = fullUrl.trim().replace(/\/(search|predict|embed)?\/?$/, '');
    
    let botReply = "I'm sorry, I'm having trouble reaching my knowledge base right now.";
    
    try {
      const aiResponse = await axios.post(`${baseUrl}/chat`, { 
        message, 
        context: ragContext.substring(0, 4000) // Increased for better accuracy
      }, { timeout: 60000 });
      botReply = aiResponse.data.response;
    } catch (aiErr) {
      console.error("[Chat Error] AWS AI Backend unreachable:", aiErr.message);
    }

    // 4. Save both messages to DB (Persistent History)
    if (record) {
      record.chatHistory.push({ role: "user", content: message });
      record.chatHistory.push({ role: "bot", content: botReply });
      await record.save();
    }

    res.json({ response: botReply });
  } catch (error) {
    console.error("[Chat Error] Proxy failed:", error.message);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// -----------------------------
// TTS PROXY ROUTE
// -----------------------------
router.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    // Detect base URL from AI_SERVICE_URL or fallback
    let fullUrl = process.env.AI_SERVICE_URL || "http://localhost:8000/search";
    
    // Safety check: if fullUrl was just added to .env without quotes or contains spaces
    fullUrl = fullUrl.trim();

    // Strip any path like /search, /predict, or /embed to get the root AI URL
    const baseUrl = fullUrl.replace(/\/(search|predict|embed)?\/?$/, '');

    console.log(`[TTS Proxy] Requesting speech from: ${baseUrl}/tts`);

    const response = await axios.post(`${baseUrl}/tts`, { text }, {
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000 // Increased to 60s for long sections
    });

    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error("[TTS Error] AI Service returned 404. Ensure your AWS ai_service.py has the /tts route.");
      res.status(404).json({ error: "AI Service 404: TTS function not found in your AWS service." });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error("[TTS Error] Could not connect to AWS AI Service. Check your FASTAPI_URL.");
      res.status(503).json({ error: "AI Service Offline: Ensure your AWS instance is running." });
    } else {
      console.error("[TTS Error] Proxy failed:", error.message);
      res.status(500).json({ error: "Failed to generate speech", details: error.message });
    }
  }
});

module.exports = router;
