const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.render("index"); 
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});
app.get("/home", (req, res) => {
  res.render("home");
});
app.get("/details", (req, res) => {
  res.render("details");
});
app.get("/account",(req,res)=>{
  res.render("account");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
