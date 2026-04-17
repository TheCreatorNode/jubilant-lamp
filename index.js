const express = require("express");
const {
  createProfile,
  getProfile,
  listProfiles,
  deleteProfile,
} = require("./src/routes");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send();
  next();
});

app.post("/api/profiles", createProfile);
app.get("/api/profiles", listProfiles);
app.get("/api/profiles/:id", getProfile);
app.delete("/api/profiles/:id", deleteProfile);

app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ status: "error", message: "Internal server error" });
});

const PORT = 3300;
app.listen(PORT, () => {
  console.log(`Profile API running on port ${PORT}`);
});

module.exports = app;
