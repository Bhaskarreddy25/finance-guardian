const express = require("express");
const cors = require("cors");
const db = require("./database");

const analyzeRouter = require("./routes/analyze");


const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  express.json({
    limit: "15mb"
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", analyzeRouter);

app.use((err, _req, res, _next) => {
  // Generic error handler to prevent crashes on unexpected errors
  console.error("Unhandled error in request:", err);
  res.status(500).json({ error: "Internal server error" });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

app.listen(PORT, () => {
  console.log(`Invoice Auditor backend running on port ${PORT}`);
});

